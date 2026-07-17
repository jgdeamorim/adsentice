#!/usr/bin/env node
/**
 * adsentice · CNPJ Crawler — extração batch de CNPJs de websites
 * ════════════════════════════════════════════════════════════════
 * Usa axios + cheerio (rápido, $0) para extrair CNPJ, email e telefone
 * do footer e páginas de contato de sites brasileiros.
 *
 * Uso:
 *   node tools/cnpj-crawler.js                          # usa urls hardcoded
 *   node tools/cnpj-crawler.js urls.txt                 # lê URLs de arquivo
 *   node tools/cnpj-crawler.js --supabase               # busca URLs do Supabase
 *   node tools/cnpj-crawler.js --output resultados.json # salva em JSON
 *
 * Requer: npm install axios cheerio (já instalado no monorepo)
 * medido=verdade · 2026-07-16 · adsentice
 */

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// ─── Config ───────────────────────────────────────────────────

const CNPJ_REGEX = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_REGEX = /(?:\(?\d{2}\)?\s?)?(?:\d{4,5}-?\d{4}|9\d{4}-?\d{4})/g;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
];

const CONCURRENCY = 10;

// ─── CNPJ Validation ──────────────────────────────────────────

function isValidCNPJ(cnpj) {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (base) => {
    const weights = base === 0
      ? [5,4,3,2,9,8,7,6,5,4,3,2]
      : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(digits[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  return calc(0) === parseInt(digits[12]) && calc(1) === parseInt(digits[13]);
}

// ─── Core: Extract from URL ───────────────────────────────────

async function crawl(url) {
  const result = { url, cnpjs: [], emails: [], phones: [], error: null, source: "cheerio", ms: 0 };
  const t0 = Date.now();

  try {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": ua, "Accept-Language": "pt-BR,pt;q=0.9" },
      maxRedirects: 5,
    });

    const $ = cheerio.load(data);

    // Priority 1: footer
    const footerText = $("footer").text();
    extractAll(footerText, result);

    // Priority 2: footer classes + contact page
    if (result.cnpjs.length === 0) {
      const extraFooter = $(".footer, .rodape, #footer, [class*=footer], [class*=rodape]").text();
      extractAll(extraFooter, result);
    }

    // Priority 3: crawl contact links
    if (result.cnpjs.length === 0) {
      const contactUrls = [];
      $("a").each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().toLowerCase();
        if (/contato|contact|fale|sobre|about|quem-somos|institucional/.test(href + text)) {
          try {
            const full = href.startsWith("http") ? href : new URL(href, url).href;
            contactUrls.push(full);
          } catch {}
        }
      });

      for (const cUrl of contactUrls.slice(0, 2)) {
        try {
          const { data: cData } = await axios.get(cUrl, {
            timeout: 5000,
            headers: { "User-Agent": ua },
            maxRedirects: 3,
          });
          extractAll(cData, result);
          if (result.cnpjs.length > 0) break;
        } catch {}
      }
    }

    // Priority 4: full page (scripts removed to reduce noise)
    if (result.cnpjs.length === 0) {
      $("script, style, noscript, iframe, svg, nav, header").remove();
      extractAll($("body").text(), result);
    }

    // Clean & dedup
    result.cnpjs = [...new Set(result.cnpjs.map(c => c.replace(/\D/g, "")))].filter(isValidCNPJ);
    result.emails = [...new Set(result.emails.map(e => e.toLowerCase().trim()))]
      .filter(e => !e.includes("example") && !e.includes("test"))
      .slice(0, 10);
    result.phones = [...new Set(result.phones.map(p => p.replace(/\D/g, "")))]
      .filter(p => p.length >= 10 && p.length <= 11)
      .slice(0, 10);

  } catch (err) {
    result.error = err.code || err.message?.slice(0, 150);
  }

  result.ms = Date.now() - t0;
  return result;
}

function extractAll(text, result) {
  for (const m of text.matchAll(CNPJ_REGEX)) result.cnpjs.push(m[0]);
  for (const m of text.matchAll(EMAIL_REGEX)) result.emails.push(m[0]);
  for (const m of text.matchAll(PHONE_REGEX)) result.phones.push(m[0]);
}

// ─── Batch ───────────────────────────────────────────────────

async function crawlBatch(urls, concurrency = CONCURRENCY) {
  const results = [];
  let done = 0;
  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(crawl));
    results.push(...chunkResults);
    done += chunk.length;
    const found = results.filter(r => r.cnpjs.length > 0).length;
    process.stdout.write(`\r  ${done}/${urls.length} URLs · ${found} com CNPJ · ${(found/done*100).toFixed(0)}%`);
  }
  console.log("");
  return results;
}

// ─── Load URLs ────────────────────────────────────────────────

function loadURLsFromFile(filepath) {
  if (!fs.existsSync(filepath)) return [];
  return fs.readFileSync(filepath, "utf-8")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && (l.startsWith("http://") || l.startsWith("https://")));
}

async function loadURLsFromSupabase() {
  const dotenvPath = path.join(__dirname, "..", "apps", "web", ".env");
  if (!fs.existsSync(dotenvPath)) { console.log("❌ .env não encontrado"); return []; }

  const env = {};
  fs.readFileSync(dotenvPath, "utf-8").split("\n").forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });

  const url = "https://tdigauruusdhnpvppixb.supabase.co/rest/v1/discovery_listings?select=title,website&website=not.is.null&limit=100";
  try {
    const { data } = await axios.get(url, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
      timeout: 10000,
    });
    console.log(`📦 ${data.length} URLs do Supabase`);
    return data.map(l => l.website).filter(Boolean);
  } catch (err) {
    console.log(`❌ Supabase: ${err.message}`);
    return [];
  }
}

// ─── Main ──────────────────────────────────────────────────────

(async () => {
  const args = process.argv.slice(2);
  let urls = [];
  let outputFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--supabase") {
      urls = await loadURLsFromSupabase();
    } else if (args[i] === "--output" && args[i + 1]) {
      outputFile = args[++i];
    } else if (fs.existsSync(args[i])) {
      urls = loadURLsFromFile(args[i]);
    }
  }

  // Default: test URLs if none provided
  if (urls.length === 0) {
    urls = [
      "https://odontoclinic.com.br/",
      "https://www.sempreodonto.com.br/",
      "https://nordodontologia.com.br/",
    ];
    console.log("📋 Usando URLs de teste\n");
  }

  console.log(`🔍 CNPJ Crawler — ${urls.length} URLs · ${CONCURRENCY} concorrentes\n`);

  const results = await crawlBatch(urls, CONCURRENCY);

  // ─── Report ──────────────────────────────────────────
  const comCNPJ = results.filter(r => r.cnpjs.length > 0);
  const comEmail = results.filter(r => r.emails.length > 0);
  const comPhone = results.filter(r => r.phones.length > 0);
  const erros = results.filter(r => r.error);
  const totalMs = results.reduce((s, r) => s + r.ms, 0);

  console.log(`\n📊 Resultados:`);
  console.log(`   CNPJ:    ${comCNPJ.length}/${results.length} (${(comCNPJ.length/results.length*100).toFixed(1)}%)`);
  console.log(`   Email:   ${comEmail.length}/${results.length} (${(comEmail.length/results.length*100).toFixed(1)}%)`);
  console.log(`   Telefone: ${comPhone.length}/${results.length}`);
  console.log(`   Erros:   ${erros.length}`);
  console.log(`   Tempo:   ${(totalMs/1000).toFixed(1)}s (${(totalMs/results.length).toFixed(0)}ms/URL)`);

  if (comCNPJ.length) {
    console.log(`\n✅ CNPJs encontrados:`);
    for (const r of comCNPJ.slice(0, 10)) {
      console.log(`   ${r.url}`);
      for (const c of r.cnpjs) console.log(`     → ${c}`);
    }
  }

  // ─── Save output ──────────────────────────────────────
  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Salvo em ${outputFile}`);
  }
})();
