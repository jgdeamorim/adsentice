#!/usr/bin/env node
/**
 * adsentice · CNPJ Crawler SPA — extração de CNPJs de sites React/Vue/Angular
 * ════════════════════════════════════════════════════════════════════════════
 * Usa Playwright para renderizar JavaScript antes de extrair CNPJ.
 * Para sites que não expõem CNPJ no HTML estático (SPA, CSR).
 *
 * REQUER:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Uso:
 *   node tools/cnpj-crawler-spa.js                            # urls de teste
 *   node tools/cnpj-crawler-spa.js urls.txt                   # arquivo de URLs
 *   node tools/cnpj-crawler-spa.js --url https://site.com.br  # URL única
 *
 * Pipeline recomendado:
 *   1. cnpj-crawler.js (cheerio, rápido) → 80%+ dos sites
 *   2. cnpj-crawler-spa.js (playwright) → sites que falharam no passo 1
 *
 * medido=verdade · 2026-07-16 · adsentice
 */

const { chromium } = require("playwright");
const fs = require("fs");

// ─── Config ───────────────────────────────────────────────────

const CNPJ_REGEX = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const CONCURRENCY = 3; // Playwright é pesado — poucos paralelos

// ─── Core ─────────────────────────────────────────────────────

async function crawlSPA(url) {
  const result = { url, cnpjs: [], source: "playwright", error: null, ms: 0 };
  const t0 = Date.now();

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "pt-BR,pt;q=0.9" });

    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });

    // Estratégia: footer → body → inner pages
    let text = "";

    try {
      text = await page.locator("footer").first().innerText({ timeout: 3000 });
    } catch {
      text = await page.locator("body").innerText();
    }

    const matches = text.match(CNPJ_REGEX);
    if (matches) {
      result.cnpjs = [...new Set(matches.map(c => c.replace(/\D/g, "")))];
    }

    await page.close();
  } catch (err) {
    result.error = err.message?.slice(0, 200);
  } finally {
    if (browser) await browser.close();
  }

  result.ms = Date.now() - t0;
  return result;
}

function loadURLs(filepath) {
  if (!fs.existsSync(filepath)) return [];
  return fs.readFileSync(filepath, "utf-8")
    .split("\n").map(l => l.trim())
    .filter(l => l.startsWith("http"));
}

// ─── Main ─────────────────────────────────────────────────────

(async () => {
  const args = process.argv.slice(2);
  let urls = [];
  let singleUrl = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) singleUrl = args[++i];
    else if (fs.existsSync(args[i])) urls = loadURLs(args[i]);
  }

  if (singleUrl) urls = [singleUrl];
  if (urls.length === 0) urls = ["https://odontoclinic.com.br/"];

  console.log(`🎭 CNPJ Crawler SPA — ${urls.length} URLs · Playwright\n`);

  const results = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const chunk = urls.slice(i, i + CONCURRENCY);
    const batch = await Promise.all(chunk.map(crawlSPA));
    results.push(...batch);
    process.stdout.write(`\r  ${Math.min(i + CONCURRENCY, urls.length)}/${urls.length} · ${results.filter(r => r.cnpjs.length > 0).length} com CNPJ`);
  }

  console.log("\n\n📊 Resultados:");
  const comCNPJ = results.filter(r => r.cnpjs.length > 0);
  console.log(`   CNPJ: ${comCNPJ.length}/${results.length} (${(comCNPJ.length / results.length * 100).toFixed(0)}%)`);
  console.log(`   Tempo: ${(results.reduce((s, r) => s + r.ms, 0) / 1000).toFixed(1)}s`);

  for (const r of comCNPJ) {
    console.log(`\n   ${r.url}`);
    r.cnpjs.forEach(c => console.log(`     → ${c}`));
  }
})();
