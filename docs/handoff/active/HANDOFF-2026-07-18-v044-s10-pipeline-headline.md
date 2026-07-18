# HANDOFF v044 · 2026-07-18 · S10RaioXPipeline headline via intent + deepseek fix

**Selos:** v043 (`d2b16da`) → v044 · **Commit:** `b6599a4`

## Pipeline de copy refatorado

Antes: `generateCopy()` → DeepSeek gera headline do zero com prompt inline

Agora: `S10RaioXPipeline.compute()` → PERSONA_MAP por Schwartz → dados reais
(competitors, local, niche, skills) → DeepSeek REFINA (não gera)

Validado BBC: headline="Barbearia BBC: 5★ no Google, mas invisível?
42% dos concorrentes já estão à frente."

## Estado vivo
BOA 0.9276 · BOA Composition 91.9 · :3000 · corpus 18.465 pts
HTML: docs/preview/warp-s10-v043-final.html
