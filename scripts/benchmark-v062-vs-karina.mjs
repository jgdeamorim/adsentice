// Twin Benchmark v2: UI/UX fidelity vs Karina 7310 reference
// Measures visual design parity (NOT copy quality — that's data-dependent)
// Run: npx tsx scripts/benchmark-v062-vs-karina.mjs
import { readFileSync } from "fs";

const REF = readFileSync("docs/preview/warp-s10-dra-karina-santos-oliveira---periodonti-s10_7310.html", "utf-8");
const V062 = readFileSync("docs/preview/warp-s10-v062-pipeline-kamilla-scalzer.html", "utf-8");

function extractCSS(html) {
  const style = (html.match(/<style>([\s\S]*?)<\/style>/) || ["",""])[1];
  const rules = {};
  const re = /\.([a-z][a-z-]+)\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(style)) !== null) {
    rules[m[1]] = m[2];
  }
  return rules;
}

function propVal(rule, prop) {
  const m = rule?.match(new RegExp(`${prop}:([^;]+)`));
  return m ? m[1].trim() : null;
}

// ═══ DIMENSIONS: element-by-element CSS fidelity ═══
const refCSS = extractCSS(REF);
const v062CSS = extractCSS(V062);

const ELEMENTS = {
  hero:        ["background", "color", "min-height", "padding", "text-align"],
  heroBadge:   ["display", "padding", "border-radius", "backdrop-filter"],
  "hero h1":   ["font-size", "font-weight"],
  container:   ["max-width", "padding"],
  section:     ["padding"],
  scoreCard:   ["padding", "border-radius", "display", "gap", "margin-top"],
  scoreRing:   ["width", "height", "border-radius"],
  scoreValue:  ["font-size", "font-weight"],
  infoCard:    ["padding", "border-radius", "box-shadow"],
  gap:         ["padding", "border-radius", "margin-bottom"],
  gapBefore:   ["width", "border-radius"],
  gapFix:      ["padding", "border-radius", "font-size"],
  cta:         ["padding", "border-radius", "background"],
  ctaBtn:      ["display", "padding", "border-radius", "font-weight"],
  footer:      ["padding", "text-align"],
};

// Score: % of CSS properties that match the reference (within tolerance)
let totalProps = 0, matchProps = 0;
const details = {};

for (const [elem, props] of Object.entries(ELEMENTS)) {
  const refRule = refCSS[elem] || "";
  const v062Rule = v062CSS[elem] || "";
  let elemTotal = 0, elemMatch = 0;
  for (const prop of props) {
    const rv = propVal(refRule, prop);
    const vv = propVal(v062Rule, prop);
    if (rv === null && vv === null) continue; // neither has it
    elemTotal++;
    totalProps++;
    if (rv && vv) {
      // Simple match: same value, or within tolerance for spacing
      const rClean = rv.replace(/var\([^)]+\)/g, "V");
      const vClean = vv.replace(/var\([^)]+\)/g, "V");
      if (rClean === vClean) { elemMatch++; matchProps++; }
    }
  }
  details[elem] = `${elemMatch}/${elemTotal}`;
}

const fidelity = Math.round(matchProps / Math.max(totalProps, 1) * 100);

// ═══ STRUCTURE (section order match) ═══
const refSections = [...REF.matchAll(/class="([a-z][a-z-]+)"/g)].map(m => m[1]).filter((v,i,a) => a.indexOf(v)===i);
const v062Sections = [...V062.matchAll(/class="([a-z][a-z-]+)"/g)].map(m => m[1]).filter((v,i,a) => a.indexOf(v)===i);
const structMatch = refSections.filter(s => v062Sections.includes(s)).length;
const structure = Math.round(structMatch / Math.max(refSections.length, 1) * 100);

// ═══ TOKENS (CSS variables parity) ═══
const refVars = [...new Set([...REF.matchAll(/--([a-z-]+):/g)].map(m => m[1]))];
const v062Vars = [...new Set([...V062.matchAll(/--([a-z-]+):/g)].map(m => m[1]))];
const varMatch = refVars.filter(v => v062Vars.includes(v)).length;
const tokens = Math.round(varMatch / Math.max(refVars.length, 1) * 100);

// ═══ COMPOSITE ═══
const composite = Math.round(fidelity * 0.50 + structure * 0.25 + tokens * 0.25);

console.log("═══ TWIN BENCHMARK v2: UI/UX Fidelity ═══\n");
console.log(`REF classes: ${Object.keys(refCSS).length} | V062 classes: ${Object.keys(v062CSS).length}`);
console.log(`REF sections: ${refSections.length} | V062 sections: ${v062Sections.length}\n`);

console.log(`📐 CSS Fidelity:  ${fidelity}% (${matchProps}/${totalProps} properties)   x0.50 = ${Math.round(fidelity*0.50)}`);
console.log(`🏗️  Structure:     ${structure}% (${structMatch}/${refSections.length} sections)     x0.25 = ${Math.round(structure*0.25)}`);
console.log(`🎨 Tokens:        ${tokens}% (${varMatch}/${refVars.length} variables)        x0.25 = ${Math.round(tokens*0.25)}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`📊 COMPOSITE:     ${composite}/100`);
console.log(`🎯 OODA:          ${composite >= 90 ? '✅ PASS (90%+)' : composite >= 80 ? '🔄 ITERATE (80-89%)' : '🔴 REFACTOR (<80%)'}`);

console.log("\n═══ Element Details ═══");
for (const [elem, score] of Object.entries(details)) {
  const [m, t] = score.split("/").map(Number);
  const emoji = m === t ? '🟢' : m >= t * 0.6 ? '🟡' : '🔴';
  console.log(`  ${emoji} ${elem}: ${score}`);
}
