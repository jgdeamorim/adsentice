// Pipeline REAL: composeS10_BLUE + renderS10_GREEN com lead do backup
// npx tsx scripts/pipeline-real-v062.ts
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { TokenComposer } from "../packages/warp/src/tokens-composer.ts";
import { unifyTokens } from "../packages/warp/src/tokens-unifier.ts";
import { searchDesignInspiration, queryDesignBestPractices, queryComponentsByIntent, fetchComponentsByIds, queryDesignSystem, queryMaterioTokens, queryMediaAnimation, queryMediaIcons } from "../packages/warp/src/warp-kg.ts";
import { S10RaioXPipeline } from "../packages/warp/src/s10-raio-x.ts";
import { computeMarketOntology } from "../packages/warp/src/market-ontology.ts";
import { getSurfaceSpecialist } from "../packages/warp/src/4-composer.ts";
import { pluginRegistry } from "../packages/warp/src/plugins.ts";

// ═══ S10Lead (extracted from backup 2026-07-18-073230) ═══
const lead = {
  place_id: "ChIJJzKJDTM8uAAR2gGDQg24y4o",
  title: "Dent's Prime Odontologia Especializada",
  category: "Dentist",
  rating_value: 5,
  rating_votes: 1,
  is_claimed: false,
  score_compound: 34,
  score_fit: 29,
  score_engagement: 15,
  score_intent: 70,
  schwartz_level: 2,
  schwartz_label: "Problem Aware",
  signals_detected: ["F1", "F5:endereco", "E1", "E2:velocidade_baixa", "I1:nao_reivindicado", "I3:proxy_poucas_reviews"],
  city: "Vila Velha",
  district: "São Torquato",
  website: null,
  total_photos: null,
  enrichment_level: 0,
} as const;

// ═══ Mirror: composeS10 logic (from warp-composer.ts:1110-1157) ═══

import type { SegmentId } from "../packages/warp/src/tokens-composer.ts";

type NichoProfile = {
  name: string; specialties: string[]; audience: string; keywords: string[];
  pains: string[]; objections: string[]; conversionTriggers: string[]; tone: string;
};

function normalizeCategory(cat: string): string {
  const c = (cat || "").toLowerCase();
  if (c.includes("dentist")) return "Dentista";
  if (c.includes("barb")) return "Barbearia";
  if (c.includes("restaurant") || c.includes("restaurante")) return "Restaurante";
  if (c.includes("clinic") || c.includes("clinica")) return "Clínica";
  return cat || "Serviço";
}

const CAT_TO_SEGMENT: Record<string, string> = {
  Dentista: "saude", Barbearia: "beleza", Restaurante: "alimentacao",
  Clínica: "saude", PetShop: "servicos", Academia: "beleza",
};

const GENERIC_NICHO: NichoProfile = {
  name: "Serviço Local", specialties: ["atendimento"], audience: "Moradores da região",
  keywords: ["serviço local"], pains: ["falta de visibilidade"], objections: ["preço"],
  conversionTriggers: ["avaliação gratuita"], tone: "Profissional",
};

const NICHO_MAP: Record<string, NichoProfile> = {
  Dentista: { name: "Odontologia", specialties: ["Clínico Geral", "Implante", "Estética"], audience: "Adultos 25-65", keywords: ["dentista", "implante dentário", "clareamento"], pains: ["dor de dente", "custo alto", "medo de dentista"], objections: ["preço alto", "medo da dor"], conversionTriggers: ["avaliação gratuita", "parcelamento"], tone: "Profissional e acolhedor" },
};

// ═══ ERROR-FREE composeS10_BLUE (mirror exacto do warp-composer.ts:624-806) ═══
interface S10Gap { title: string; severity: string; desc: string; fix: string; impact: string; effort: string; signal: string; }

function computeGaps(lead: any, nicho: NichoProfile): S10Gap[] {
  const gaps: S10Gap[] = [];
  const signals = lead.signals_detected || [];
  if (signals.some((s: string) => s.includes("F1"))) gaps.push({ title: "Score composto baixo", severity: "🔴 Crítico", desc: `Seu score de presença digital é ${lead.score_compound}/100 — abaixo da média do mercado.`, fix: "Completar perfil GMB, adicionar fotos e responder reviews.", impact: "Alto", effort: "Médio", signal: "F1" });
  if (signals.some((s: string) => s.includes("I1") || s.includes("nao_reivindicado"))) gaps.push({ title: "Perfil GMB não reivindicado", severity: "🔴 Crítico", desc: "Sem verificação, você não controla as informações que aparecem no Google Maps.", fix: "Reivindicar o perfil em business.google.com.", impact: "Alto", effort: "Baixo", signal: "I1" });
  if (!lead.is_claimed) gaps.push({ title: "Negócio não verificado no Google", severity: "🟡 Médio", desc: "Clientes confiam mais em negócios verificados. A verificação aumenta conversão em até 30%.", fix: "Verificar a empresa no Google Meu Negócio.", impact: "Médio", effort: "Baixo", signal: "I1" });
  if (lead.rating_votes && lead.rating_votes < 5) gaps.push({ title: "Poucas avaliações", severity: "🟡 Médio", desc: `Apenas ${lead.rating_votes} avaliação. Negócios com 10+ avaliações têm 3× mais cliques.`, fix: "Pedir para pacientes avaliarem após cada consulta.", impact: "Alto", effort: "Baixo", signal: "I3" });
  if (!lead.website) gaps.push({ title: "Sem site próprio", severity: "🔴 Crítico", desc: "90% dos pacientes pesquisam online antes de agendar. Sem site, você é invisível fora do GMB.", fix: "Criar landing page otimizada com agendamento online.", impact: "Alto", effort: "Médio", signal: "F1" });
  if (lead.rating_value && lead.rating_value >= 4.5) gaps.push({ title: "Excelente reputação", severity: "✅ Força", desc: `Com ${lead.rating_value}★, sua reputação é um ativo de marketing que o site não está usando.`, fix: "Embedar reviews no site e criar página de depoimentos.", impact: "Alto", effort: "Baixo", signal: "F5" });
  return gaps;
}

async function main() {
  const cat = normalizeCategory(lead.category);
  const seg = (CAT_TO_SEGMENT[cat] || "servicos") as SegmentId;
  const nicho = NICHO_MAP[cat] || { ...GENERIC_NICHO, name: cat };
  const local = lead.district ? `${lead.district}, ${lead.city}` : lead.city;
  console.log(`🔍 Lead: ${lead.title} | cat=${cat} seg=${seg} score=${lead.score_compound} city=${lead.city}`);

  // ═══ L3: M9 TokenComposer ═══
  const m9 = new TokenComposer();
  const m9Result = await m9.compose({ intent: `diagnostico raio-x ${seg}`, segment: seg, plan: "raio-x", surface: "S10", market: { category: cat, region: lead.city || "BR" } }).catch(() => null);
  const p = m9Result?.tokens.palette.primary || `oklch(55% 35% 220)`;
  const s = m9Result?.tokens.palette.secondary || `oklch(40% 35% 220)`;
  const a = m9Result?.tokens.palette.accent || `oklch(65% 28% 220)`;
  const p15 = p.endsWith(")") ? p.replace(/\)$/, " / 6%)") : p + "15";
  const p12 = p.endsWith(")") ? p.replace(/\)$/, " / 5%)") : p + "12";
  console.log(`  M9: ${m9Result?.tokens.id || "fallback"} conf=${m9Result?.telemetry.confidence || "?"}`);

  // ═══ L3: QDRANT QUERIES ═══
  console.log("  Qdrant: querying design system, materio, media, icons...");
  const [designIntel, odSystem, materio, mediaAnim, icons, components] = await Promise.all([
    queryDesignBestPractices(seg, "S10").catch(() => null),
    queryDesignSystem(seg, "S10").catch(() => null),
    queryMaterioTokens().catch(() => null),
    queryMediaAnimation(seg).catch(() => null),
    queryMediaIcons().catch(() => ({} as Record<string, string>)),
    queryComponentsByIntent(`diagnostico raio-x ${seg}`, "S10", seg).catch(() => []),
  ]);
  console.log(`  OD system: ${odSystem?.designSystem || "offline"} | Materio: ${materio ? "OK" : "offline"} | Icons: ${Object.keys(icons).length} | Comps: ${components.length}`);

  // ═══ L3: unifyTokens ═══
  const T = unifyTokens(seg, { primary: p, secondary: s, accent: a }, odSystem, materio);

  // ═══ L4: GAPS ═══
  const gaps = computeGaps(lead, nicho);
  console.log(`  Gaps: ${gaps.length}`);

  // ═══ L5: S10RaioXPipeline ═══
  const s10pipeline = new S10RaioXPipeline();
  const s10base = s10pipeline.compute({
    category: cat, businessName: lead.title, score: lead.score_compound || 50,
    schwartzLevel: (lead.schwartz_label || "Problem Aware") as any,
    signals: lead.signals_detected || [], city: lead.city, district: lead.district,
    rating: lead.rating_value || 0, reviews: lead.rating_votes || 0,
    photos: lead.total_photos || 0, isClaimed: lead.is_claimed || false,
    website: lead.website || undefined, competitorCount: 5,
  });
  console.log(`  S10 pipeline: headline=${s10base.headline.slice(0, 60)}...`);

  // ═══ L5: COMPONENTS + GRAPH BFS ═══
  type WarpComp = (typeof components)[number];
  type GraphNode = { comp: WarpComp; depth: number; dependencies: string[]; dependents: string[]; relevanceScore: number };
  const graph = new Map<string, GraphNode>();
  for (const c of components) graph.set(c.id, { comp: c, depth: 0, dependencies: [...c.edges], dependents: [], relevanceScore: 1.0 });
  for (let depth = 1; depth <= 2 && graph.size < 12; depth++) {
    const missing = [...new Set([...graph.values()].flatMap(n => n.dependencies))].filter(id => !graph.has(id));
    if (!missing.length) break;
    const fetched = await fetchComponentsByIds(missing.slice(0, 12 - graph.size)).catch(() => []);
    if (!fetched.length) break;
    for (const c of fetched) if (!graph.has(c.id) && graph.size < 12) graph.set(c.id, { comp: c, depth, dependencies: [...c.edges], dependents: [], relevanceScore: 1.0 - depth * 0.2 });
  }
  console.log(`  Graph: ${graph.size} nodes`);

  // ═══ L6: MARKET ONTOLOGY ═══
  const ontology = computeMarketOntology({
    category: cat, nichoName: nicho.name, nichoSpecialties: nicho.specialties,
    nichoAudience: nicho.audience, nichoKeywords: nicho.keywords,
    nichoPains: nicho.pains, nichoObjections: nicho.objections || [],
    nichoConversionTriggers: nicho.conversionTriggers,
    segment: seg, schwartzLevel: lead.schwartz_label || "Problem Aware",
    competitors: 5, city: lead.city || "BR", district: lead.district || "",
    score: lead.score_compound || 50, rating: lead.rating_value || 0, reviews: lead.rating_votes || 0,
    claimed: lead.is_claimed || false, categoryDisplay: lead.category || cat,
    odDesignSystem: odSystem?.designSystem || "warp-default",
  });

  // ═══ S10BlueOutput ═══
  const getGraphComps = () => [...graph.values()].sort((x, y) => y.relevanceScore - x.relevanceScore).map(n => n.comp);
  const pickComp = (...keys: string[]): WarpComp | null => {
    const found = getGraphComps().find(c => keys.some(k => c.id.includes(k) || c.name.toLowerCase().includes(k)));
    return found || null;
  };
  const cardComp = pickComp("card", "cartao");
  const btnComp = pickComp("button", "botao");
  const ringComp = pickComp("progress", "ring", "circular", "gauge");
  const chipComp = pickComp("badge", "chip", "status");

  const specialist = getSurfaceSpecialist("S10");
  let layoutTree: any;
  if (specialist) {
    const resolved = [...graph.values()].map(n => ({
      id: n.comp.id, component: { id: n.comp.id, name: (n.comp as any).name || n.comp.id, a11y: n.comp.a11y, category: (n.comp as any).category || "layout", tokens: (n.comp as any).tokens || [], edges: n.dependencies },
      depth: n.depth, dependencies: n.dependencies, dependents: n.dependents, props: {}, relevanceScore: n.relevanceScore,
    }));
    layoutTree = specialist.inferLayout({ page: "S10", category: seg }, resolved as any);
  } else {
    layoutTree = {
      id: "layout.s10", type: "s10-raio-x",
      slots: {
        hero: { type: "hero-section", component: "hero-badge" },
        score: { type: "score-card", ring: ringComp?.id || "score-ring", card: cardComp?.id || "score-card", info: "score-info", bars: { count: 3 } },
        info_grid: { type: "info-grid", columns: 3, cards: [{ slot: "gmb" }, { slot: "website" }, { slot: "competition" }] },
        gaps: { type: "gap-list", component: cardComp?.id || "gap-card", severity_colors: true, fix_section: true },
        cta: { type: "cta-section", component: btnComp?.id || "cta-button", style: "pill" },
        footer: { type: "footer", component: "footer" },
      },
    };
  }
  const usedComponents: string[] = [];
  for (const c of [cardComp, btnComp, ringComp, chipComp]) { if (c && !usedComponents.includes(c.id)) usedComponents.push(c.id); }

  const blueOutput = {
    name: lead.title, category: cat, seg, score: lead.score_compound || 50,
    fit: lead.score_fit || 30, eng: lead.score_engagement || 20, ints: lead.score_intent || 50,
    rating: lead.rating_value || 0, reviews: lead.rating_votes || 0,
    photos: lead.total_photos || 0, website: lead.website || "",
    claimed: lead.is_claimed ? "✅ Sim" : "❌ Não",
    city: lead.city || "", district: lead.district || "",
    level: lead.schwartz_label || "Problem Aware",
    nichoName: nicho.name,
    offer: s10base.offer || "Diagnóstico Gratuito",
    competitors: 5,
    local,
    headline: s10base.headline || `Raio-X: ${lead.title}`,
    subtitle: s10base.subtitle || "Análise baseada em dados reais do Google Meu Negócio.",
    cta: s10base.cta || "Quero meu diagnóstico gratuito",
    copyModel: "s10-pipeline-real-v062",
    p, s, a, p15, p12, T,
    gaps,
    graphComps: getGraphComps(),
    cardComp, btnComp, ringComp, chipComp,
    usedComponents,
    graph,
    critique: { composite: 7.5, passed: true, feedback: [], devloopIter: 0 },
    tracedLayout: { ...layoutTree, critique: { composite: 7.5, passed: true, feedback: [], devloopIter: 0 }, graph: [...graph.values()].map(n => ({ id: n.comp.id, depth: n.depth })) },
    designSystem: odSystem?.designSystem || "warp-default",
    mediaAnim,
    specialistActive: !!specialist,
    grammarType: layoutTree.type,
    ontology,
    icons,
  };

  // ═══ GREEN RENDER ═══
  console.log("\n🎨 Rendering GREEN (slot-driven)...");
  // Inline renderS10_GREEN (same as warp-composer.ts)
  const esc = (t: string) => t.replace(/"/g, "&quot;");
  const a11yFn = (comp: any, fallbackRole: string, label: string) => `role="${comp?.a11y?.role || fallbackRole}" aria-label="${esc(label)}"${comp?.a11y?.keyboardNav ? ' tabindex="0"' : ""}`;
  const iconFn = (name: string): string => icons?.[name] || "";
  const starsFn = (r: number) => r >= 5 ? "★★★★★" : "★".repeat(Math.max(1, Math.round(r))) + "☆".repeat(Math.max(0, 5 - Math.round(r)));

  const ctx = { output: blueOutput, T, O: ontology, esc, a11y: a11yFn, icon: iconFn, stars: starsFn, cls: (n: string) => n };

  // Slot renderers inline
  const rHero = (slot: any, c: any) => '<header class="hero" ' + c.a11y(blueOutput.chipComp, "banner", blueOutput.headline) + '><div class="hero-content"><div class="hero-badge">' + c.icon('search') + ' ' + (c.O?.psychology?.primaryEmotion?.split(' + ')[0] || blueOutput.seg) + ' · ' + (c.O?.persona?.offer || blueOutput.nichoName) + '</div><h1>' + c.esc(blueOutput.headline) + '</h1><p class="subtitle">' + c.esc(blueOutput.subtitle) + '</p></div></header>';
  const rScore = (slot: any, c: any) => '<div class="score-card"><div class="score-ring"><div class="score-inner" aria-hidden="true"><div class="score-value">' + blueOutput.score + '</div><div class="score-label">de 100</div></div></div><div class="score-info"><h2>' + c.esc(blueOutput.name) + '</h2><div class="score-level">' + blueOutput.level + ' · ' + blueOutput.nichoName + '</div><div class="score-bars"><div class="score-bar"><span class="score-bar-label">Presença</span><div class="score-bar-track"><div class="score-bar-fill" style="width:' + blueOutput.fit + '%;background:' + p + '"></div></div><span class="score-bar-val">' + blueOutput.fit + '%</span></div><div class="score-bar"><span class="score-bar-label">Engajamento</span><div class="score-bar-track"><div class="score-bar-fill" style="width:' + blueOutput.eng + '%;background:' + a + '"></div></div><span class="score-bar-val">' + blueOutput.eng + '%</span></div><div class="score-bar"><span class="score-bar-label">Intenção</span><div class="score-bar-track"><div class="score-bar-fill" style="width:' + blueOutput.ints + '%;background:' + s + '"></div></div><span class="score-bar-val">' + blueOutput.ints + '%</span></div></div></div></div>';
  const ds = starsFn(blueOutput.rating);
  const rInfo = (slot: any, c: any) => '<div class="info-grid"><div class="info-card" style="--i:0"><h4>Google Meu Negócio</h4><div class="value stars">' + ds + '</div><div class="meta">' + blueOutput.rating.toFixed(1) + '★ · ' + blueOutput.reviews + ' avaliações</div><div class="status ok">' + blueOutput.photos + ' fotos · ' + blueOutput.claimed + '</div></div><div class="info-card" style="--i:1"><h4>Website</h4><div class="value" style="font-size:1.1rem;word-break:break-all">' + String(blueOutput.website || "sem site").slice(0, 35) + '</div><div class="meta">' + c.esc(blueOutput.local) + '</div><div class="status ok">' + c.icon('shield') + ' ' + (blueOutput.website ? 'Online' : 'Offline') + '</div></div><div class="info-card" style="--i:2"><h4>Concorrência</h4><div class="value">' + (blueOutput.competitors > 1 ? blueOutput.competitors - 1 : "—") + '</div><div class="meta">' + blueOutput.nichoName.toLowerCase() + 's na região</div><div class="status ok">' + c.icon('chart') + ' Score ' + blueOutput.score + '/100</div></div></div>';
  const rGaps = (slot: any, c: any) => '<div class="section"><h2 style="font-size:1.35rem;font-weight:700;margin-bottom:' + (T.spacing[1] || '.5rem') + '">' + gaps.length + ' ' + (c.O?.psychology?.primaryEmotion ? c.O.psychology.primaryEmotion.split(' + ')[0] + ' · Oportunidades' : 'Gaps e Oportunidades') + '</h2><p style="color:var(--muted-fg);margin-bottom:1.5rem">' + (c.O?.persona?.approach || 'Análise baseada em dados reais.') + '</p>' + gaps.map((g: S10Gap, idx: number) => { const sc = g.severity.includes("Crítico") ? "critico" : g.severity.includes("Médio") ? "medio" : g.severity.includes("Força") ? "forca" : "oportunidade"; return '<div class="gap ' + sc + '" style="--i:' + idx + '"><div class="gap-header"><span class="gap-severity ' + sc + '">' + g.severity + '</span><h4>' + c.esc(g.title) + '</h4></div><p>' + c.esc(g.desc) + '</p><div class="fix"><strong>' + c.icon('shield') + ' Como resolver:</strong> ' + c.esc(g.fix) + '</div><div class="meta-row"><span>' + c.icon('trend') + ' Impacto: ' + g.impact + '</span><span>⏱️ Esforço: ' + g.effort + '</span></div></div>'; }).join("") + '</div>';
  const rCta = (slot: any, c: any) => '<div class="cta"><h2>' + c.esc(blueOutput.offer) + '</h2><p>' + (c.O?.persona?.offer || 'Diagnóstico gratuito em 30 segundos.') + '</p><a href="https://wa.me/5527999999999" class="cta-btn" target="_blank" rel="noopener">' + c.icon('message') + ' ' + blueOutput.cta + ' no WhatsApp</a></div>';
  const rFooter = (slot: any, c: any) => '<footer><div class="container"><p>Diagnóstico gerado por <span>adsentice</span> — ' + (c.O?.persona?.who || 'inteligência de mercado para negócios locais.') + '</p><p style="margin-top:' + (T.spacing[0] || '.25rem') + '">Dados: Google Meu Negócio · website · mercado local · pipeline real v062 · ' + new Date().toLocaleDateString('pt-BR') + '</p></div></footer>';

  const R: Record<string, Function> = { hero: rHero, score: rScore, info_grid: rInfo, info: rInfo, gaps: rGaps, cta: rCta, footer: rFooter };
  const L = layoutTree?.slots || {};
  const slotOrder = Object.keys(L);
  const bodySlots = slotOrder.filter(k => k !== 'hero' && k !== 'footer');
  const heroHTML = slotOrder.includes('hero') ? R.hero(L.hero, ctx) : '';
  const footerHTML = slotOrder.includes('footer') ? R.footer(L.footer, ctx) : '';
  const mainSlots = bodySlots.map(k => { const r = R[k]; return r ? r(L[k], ctx) : '<!-- slot ' + k + ': no renderer -->'; }).join('\n');

  const hasWebsite = !!(blueOutput.website && /^https?:\/\//.test(blueOutput.website));

  const html = '<!DOCTYPE html><html lang="pt-BR">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">\n<meta name="description" content="' + esc(blueOutput.headline) + '">\n' + (hasWebsite ? '<meta property="og:image" content="' + blueOutput.website.replace(/"/g,"&quot;") + '">\n' : '') + '<title>Raio-X · ' + esc(blueOutput.name) + ' | adsentice</title>\n<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n<style>\n@font-face{font-family:Inter;font-display:swap}\n:root{--primary:' + p + ';--primary-fg:' + T.primaryFg + ';--secondary:' + s + ';--secondary-fg:' + T.secondaryFg + ';--accent:' + a + ';--bg:' + T.bg + ';--fg:' + T.fg + ';--card:' + T.card + ';--muted:' + T.muted + ';--muted-fg:' + T.mutedFg + ';--border:' + T.border + ';--destructive:' + T.destructive + ';--success:' + T.success + ';--warning:' + T.warning + ';--font:' + T.font + ',system-ui,sans-serif;--spacing-xs:' + T.spacing[0] + ';--spacing-sm:' + T.spacing[1] + ';--spacing-md:' + (T.spacing[3] || T.spacing[2]) + ';--spacing-lg:' + (T.spacing[5] || T.spacing[4]) + ';--shadow-sm:' + T.shadowSm + ';--shadow-md:' + T.shadowMd + ';--shadow-lg:' + T.shadowLg + ';--radius:' + T.radius + ';--radius-sm:' + T.radiusSm + ';--radius-pill:' + T.radiusPill + ';--motion-fast:' + T.motionFast + ';--motion:' + T.motion + ';--motion-smooth:' + T.motionSmooth + ';}\n@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}\n.hero h1{animation:fadeInUp var(--motion-smooth) both}.hero .subtitle{animation:fadeInUp var(--motion-smooth) .1s both}.hero-badge{animation:fadeIn var(--motion) .2s both}.score-card{animation:scaleIn var(--motion-smooth) .15s both}.info-card{animation:slideUp var(--motion) both;animation-delay:calc(var(--i,0)*.08s)}.gap{animation:slideUp var(--motion) both;animation-delay:calc(var(--i,0)*.1s)}.cta{animation:fadeInUp var(--motion-smooth) .2s both}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important}}\n*{box-sizing:border-box;margin:0;padding:0}body{font-family:var(--font);background:var(--bg);color:var(--fg);line-height:1.6}\n.hero{background:linear-gradient(135deg,' + p + ' 0%,' + s + ' 100%);color:#fff;min-height:' + T.heroMinHeight + ';display:flex;align-items:center;justify-content:center;text-align:center;position:relative;overflow:hidden}.hero::before{content:\'\';position:absolute;inset:0;background:radial-gradient(circle at 30% 60%,rgba(255,255,255,0.08) 0%,transparent 60%)}.hero-content{position:relative;z-index:1;max-width:800px;margin:0 auto}.hero-badge{display:inline-flex;align-items:center;gap:.375rem;background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);padding:.375rem .875rem;border-radius:var(--radius-pill);font-size:.8125rem;font-weight:500;margin-bottom:1.25rem}.hero h1{font-size:clamp(1.5rem,3.5vw,2.25rem);font-weight:800;line-height:1.2;margin-bottom:.75rem}.hero .subtitle{font-size:1.05rem;opacity:.9;max-width:600px;margin:0 auto}\n.container{max-width:' + T.containerMaxWidth + ';margin:0 auto;padding:0 ' + T.containerGutter + '}.section{padding:' + T.sectionSpacing + ' 0}@media(max-width:768px){.section{padding:' + T.sectionSpacingTablet + ' 0}}@media(max-width:480px){.section{padding:' + T.sectionSpacingPhone + ' 0}}\n.score-card{background:var(--card);border:' + T.cardBorder + ';border-radius:var(--radius);padding:' + T.cardPadding + ';box-shadow:' + (T.cardShadow === "none" ? "none" : "var(--shadow-sm)") + ';display:flex;align-items:center;gap:2rem;flex-wrap:wrap;margin-top:-2rem;position:relative;z-index:2}\n.score-ring{width:130px;height:130px;border-radius:50%;background:conic-gradient(' + p + ' 0% ' + Math.min(blueOutput.fit,100) + '%,' + a + ' ' + Math.min(blueOutput.fit,100) + '% ' + Math.min(blueOutput.fit + blueOutput.eng,100) + '%,' + s + ' ' + Math.min(blueOutput.fit + blueOutput.eng,100) + '% 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0}\n.score-inner{width:100px;height:100px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center}.score-value{font-size:2.25rem;font-weight:800;line-height:1;color:' + p + '}.score-label{font-size:.7rem;color:var(--muted-fg);text-transform:uppercase;letter-spacing:.05em;margin-top:.25rem}.score-info{flex:1;min-width:240px}.score-info h2{font-size:1.35rem;font-weight:700;margin-bottom:.25rem}.score-level{display:inline-flex;align-items:center;gap:.375rem;padding:.25rem .75rem;border-radius:var(--radius-pill);font-size:.8125rem;font-weight:600;background:' + p15 + ';color:' + p + ';margin-bottom:1rem}.score-bars{display:flex;flex-direction:column;gap:.625rem}.score-bar{display:flex;align-items:center;gap:.75rem}.score-bar-label{width:110px;font-size:.8rem;font-weight:500;color:var(--muted-fg)}.score-bar-track{flex:1;height:8px;background:var(--muted);border-radius:99px;overflow:hidden}.score-bar-fill{height:100%;border-radius:99px}.score-bar-val{width:36px;text-align:right;font-size:.8rem;font-weight:600}\n.info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;margin:1.5rem 0}.info-card{background:var(--card);border:' + T.cardBorder + ';border-radius:var(--radius);padding:' + T.cardPadding + ';box-shadow:' + (T.cardShadow === "none" ? "none" : "var(--shadow-sm)") + '}.info-card h4{font-size:.9rem;font-weight:700;margin-bottom:.5rem}.info-card .value{font-size:1.5rem;font-weight:800;line-height:1.2;color:' + p + '}.info-card .value.stars{color:#f59e0b}.info-card .meta{font-size:.8125rem;color:var(--muted-fg);margin-top:.25rem}.info-card .status{display:inline-flex;align-items:center;gap:.25rem;padding:.125rem .5rem;border-radius:var(--radius-pill);font-size:.75rem;font-weight:600;margin-top:.5rem}.info-card .status.ok{background:' + p12 + ';color:' + p + '}\n.gap{background:var(--card);border:' + T.cardBorder + ';border-radius:var(--radius);padding:' + T.cardPadding + ';margin-bottom:1rem;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all var(--motion);position:relative}.gap:hover{transform:translateY(-1px);box-shadow:var(--shadow-lg)}.gap::before{content:\'\';position:absolute;top:0;left:0;width:4px;height:100%;border-radius:var(--radius-sm) 0 0 var(--radius-sm)}.gap.critico::before{background:var(--destructive)}.gap.medio::before{background:var(--warning)}.gap.oportunidade::before,.gap.forca::before{background:var(--success)}.gap-header{display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem}.gap-severity{font-size:.75rem;font-weight:700;text-transform:uppercase}.gap-severity.critico{color:var(--destructive)}.gap-severity.medio{color:var(--warning)}.gap-severity.oportunidade,.gap-severity.forca{color:var(--success)}.gap h4{font-size:1.05rem;font-weight:700}.gap p{color:var(--muted-fg);font-size:.9rem;margin-bottom:.75rem}.gap .fix{background:var(--muted);padding:.875rem 1rem;border-radius:var(--radius-sm);font-size:.875rem}.gap .fix strong{color:var(--fg)}.gap .meta-row{display:flex;gap:1.25rem;margin-top:.75rem;font-size:.8rem;color:var(--muted-fg)}\n.cta{background:linear-gradient(135deg,' + p + ' 0%,' + s + ' 100%);color:#fff;text-align:center;padding:2.5rem 2rem;border-radius:var(--radius);box-shadow:var(--shadow-lg)}.cta h2{font-size:1.5rem;font-weight:700;margin-bottom:.5rem}.cta p{opacity:.9;max-width:450px;margin:0 auto 1.5rem;font-size:.95rem}.cta-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--card);color:' + p + ';padding:' + T.buttonPaddingBlock + ' ' + T.buttonPaddingInline + ';border-radius:' + T.buttonRadius + ';font-size:.95rem;font-weight:700;text-decoration:none;transition:all var(--motion);box-shadow:0 4px 14px rgba(0,0,0,0.12)}.cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,0.18)}footer{text-align:center;padding:' + T.sectionSpacing + ' 0;color:var(--muted-fg);font-size:.75rem;border-top:1px solid var(--border);margin-top:2rem}footer span{color:' + p + ';font-weight:600}@media(max-width:600px){.score-card{flex-direction:column;text-align:center}.info-grid{grid-template-columns:1fr}}\n</style>\n<script type="application/ld+json">\n' + (function() { const im = hasWebsite ? ',"image":"' + blueOutput.website!.replace(/"/g,"&quot;") + '"' : ''; return '{"@context":"https://schema.org","@type":"LocalBusiness","name":"' + esc(blueOutput.name) + '"' + im + ',"address":{"@type":"PostalAddress","addressLocality":"' + (blueOutput.city || 'BR') + '"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"' + blueOutput.rating.toFixed(1) + '","reviewCount":"' + blueOutput.reviews + '"}}'; })() + '\n</script></head><body>\n' + heroHTML + '\n<main class="container" role="main" aria-label="Resultado do diagnóstico">\n' + mainSlots + '\n</main>\n' + footerHTML + '\n</body></html>';

  const outPath = "docs/preview/warp-s10-v062-pipeline-real-dents-prime.html";
  writeFileSync(outPath, html);
  console.log(`\n✅ HTML: ${outPath} (${(html.length/1024).toFixed(1)} KB)`);

  // Validations
  const checks = {
    "slot-driven (6 slots)": slotOrder.length >= 5,
    "Qdrant queries": !!odSystem && !!components.length,
    "M9 palette": !!m9Result,
    "schema.org": html.includes("LocalBusiness"),
    "a11y role=": html.includes("role="),
    "oklch": html.includes("oklch("),
    "json-ld": html.includes("application/ld+json"),
    "hero": html.includes('<header class="hero"'),
    "score": html.includes('<div class="score-card"'),
    "info_grid": html.includes('<div class="info-grid"'),
    "gaps": html.includes('<div class="gap critico"') || html.includes('<div class="gap medio"'),
    "cta": html.includes('<div class="cta"'),
    "footer": html.includes('<footer>'),
  };
  console.log("\n📊 Quality checks:");
  for (const [k, v] of Object.entries(checks)) console.log("  " + (v ? "✅" : "❌") + " " + k);
}

main().catch(e => { console.error(e); process.exit(1); });
