// Generate S10 Raio-X with slot-driven render v062
// Usage: npx tsx apps/web/test/ray-x-v062.mjs
import { TokenComposer } from "../../../packages/warp/src/tokens-composer.ts";
import { unifyTokens } from "../../../packages/warp/src/tokens-unifier.ts";
import { renderS10_GREEN } from "../src/lib/warp-composer.ts";
import { writeFileSync } from "fs";

async function main() {
  const seg = "saude";
  const m9 = new TokenComposer();
  const m9Result = await m9.compose({ intent: "diagnostico raio-x dentista", segment: seg, plan: "raio-x", surface: "S10" });
  const p = m9Result.tokens.palette.primary;
  const s = m9Result.tokens.palette.secondary;
  const a = m9Result.tokens.palette.accent;
  const p15 = p.replace(/\)$/, " / 6%)");
  const p12 = p.replace(/\)$/, " / 5%)");

  const T = unifyTokens(seg, { primary: p, secondary: s, accent: a }, null, null);

  const blue = {
    name: "Dra. Karina Santos Oliveira", category: "Dentista", seg, score: 73,
    fit: 72, eng: 68, ints: 79,
    rating: 4.7, reviews: 134, photos: 28,
    website: "https://dra-karina-periodontia.com.br", claimed: "✅ Sim", city: "Vitória", district: "Praia do Canto",
    level: "Problem Aware", nichoName: "Periodontia", offer: "Diagnóstico Gratuito", competitors: 12,
    local: "Praia do Canto, Vitória",
    headline: "Dra. Karina: 4.7★ e site sem agendamento — está perdendo pacientes",
    subtitle: "Análise de presença digital baseada em Google Meu Negócio, website e mercado local.",
    cta: "Quero meu diagnóstico gratuito", copyModel: "deepseek-refine",
    p, s, a, p15, p12, T,
    gaps: [
      { title: "Sem agendamento online", severity: "🔴 Crítico", desc: "90% dos pacientes pesquisam online antes de agendar. Seu site não tem booking — você perde o paciente no clique final.", fix: "Adicionar botão de agendamento (Doctoralia ou similar) na home e no GMB.", impact: "Alto", effort: "Baixo", signal: "F1" },
      { title: "Schema.org ausente", severity: "🟡 Médio", desc: "Google não entende sua clínica como LocalBusiness. Rich results (estrelas, endereço) não aparecem nas buscas.", fix: "Adicionar JSON-LD LocalBusiness com avaliações, endereço e telefone.", impact: "Médio", effort: "Baixo", signal: "F2" },
      { title: "Blog desatualizado", severity: "🟡 Médio", desc: "Último post de 2024. Google penaliza conteúdo estagnado. Clínicas com blog ativo têm 55% mais visitas.", fix: "Publicar 2 posts/mês sobre dúvidas frequentes (implante, gengiva, clareamento).", impact: "Alto", effort: "Médio", signal: "F3" },
      { title: "Reputação forte (4.7★)", severity: "✅ Força", desc: "Com 4.7★ e 134 avaliações, sua reputação é um ativo de marketing. Use isso no site e redes sociais.", fix: "Embedar widget de reviews no site e criar stories no Instagram com depoimentos.", impact: "Alto", effort: "Baixo", signal: "F5" },
      { title: "Concorrência digital", severity: "🔵 Oportunidade", desc: "12 clínicas na região — só 3 têm agendamento online. Seu site + booking = vantagem imediata.", fix: "Landing page com SEO local + agendamento integrado. Custo: ~R$500/mês.", impact: "Alto", effort: "Médio", signal: "F7" },
    ],
    graphComps: [], cardComp: null, btnComp: null, ringComp: null, chipComp: null,
    usedComponents: [], graph: new Map(),
    critique: { composite: 8.5, passed: true, feedback: [], devloopIter: 0 },
    tracedLayout: {
      id: "layout.s10", type: "s10-raio-x",
      slots: {
        hero: { type: "hero-section", component: "hero-badge", badge: "badge" },
        score: { type: "score-card", ring: "score-ring", card: "score-card", info: "score-info", bars: { count: 3 } },
        info_grid: { type: "info-grid", columns: 3, cards: [{ slot: "gmb" }, { slot: "website" }, { slot: "competition" }] },
        gaps: { type: "gap-list", component: "gap-card", severity_colors: true, fix_section: true },
        cta: { type: "cta-section", component: "cta-button", style: "pill" },
        footer: { type: "footer", component: "footer" },
      },
      critique: { composite: 8.5, passed: true, feedback: [], devloopIter: 0 },
      graph: [],
    },
    designSystem: "warp-default", mediaAnim: null,
    specialistActive: true, grammarType: "s10-raio-x",
    ontology: {
      persona: { who: "Pacientes buscam confiança e resultados visíveis", approach: "Análise baseada em dados reais do Google Meu Negócio e do mercado local de Vitória.", offer: "Diagnóstico gratuito em 30 segundos", urgency: "Não espere o concorrente abrir um site antes de você" },
      psychology: { primaryEmotion: "Confiança + Urgência", colorPsychology: "Azul clínico remete a higiene, profissionalismo e calma", toneOfVoice: "Profissional e acolhedor", triggers: ["medo de perder paciente", "desejo de crescimento"] },
      designSystem: { atmosphere: "clean clinical professional", spacingStyle: "default" },
      niche: { name: "Periodontia", specialties: ["Implante", "Gengiva"], audience: "Adultos 30-60", keywords: ["dentista vitória", "implante dentário"], pains: ["dor", "custo"], objections: ["preço", "medo"], conversionTriggers: ["avaliação gratuita"] },
    },
    icons: {},
  };

  const html = renderS10_GREEN(blue);
  const outPath = "docs/preview/warp-s10-v062-slot-driven-dra-karina.html";
  writeFileSync(outPath, html);
  console.log(`\n📄 HTML saved: file://${process.cwd()}/${outPath}`);
  console.log(`✅ HTML saved: ${path} (${html.length} bytes)`);

  // Validation
  const checks = {
    "schema.org + LocalBusiness": html.includes("LocalBusiness"),
    "a11y role=": html.includes("role="),
    "oklch tokens": html.includes("oklch("),
    "hero slot": html.includes("hero"),
    "score slot": html.includes("score-card"),
    "info_grid slot": html.includes("info-grid"),
    "gaps slot": html.includes("gap-header"),
    "cta slot": html.includes("cta-btn"),
    "footer slot": html.includes("<footer>"),
    "M9 palette oklch": html.includes("oklch("),
    "json-ld schema": html.includes("application/ld+json"),
    "no hardcoded I.search": !html.includes("circle cx=\"11\""),
    "og:image (has website)": html.includes("og:image"),
  };
  for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? "✅" : "❌"} ${k}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
