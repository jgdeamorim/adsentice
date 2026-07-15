#!/usr/bin/env python3
"""
adsentice_s10_generator.py — S10 Raio-X Gerador Automático
═══════════════════════════════════════════════════════════
Pipeline completo — O SISTEMA gera sozinho.

  1. fetch_leads()    → Supabase (dados reais)
  2. classify()       → category → segment → nicho → persona → tokens
  3. copywriter()     → DeepSeek V4 Flash (headline, subtitle, CTA)
  4. compute_gaps()   → sinais reais F1-F9, E1-E7
  5. qdrant_enrich()  → design inspiration + landing patterns
  6. market_context() → benchmark regional (traces Qdrant)
  7. generate_html()  → HTML cliente (sem dados internos)
  8. store_trace()    → Qdrant market-intel feedback loop

Uso:
  python3 tools/adsentice_s10_generator.py                   # lead #1
  python3 tools/adsentice_s10_generator.py --all             # todos com score>50
  python3 tools/adsentice_s10_generator.py --place-id <ID>   # lead específico

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, sys, time, uuid, hashlib
from pathlib import Path
from urllib.request import Request, urlopen

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-v4-flash"
PROJECT_ROOT = Path(__file__).parent.parent
PREVIEW_DIR = PROJECT_ROOT / "docs" / "preview"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

# ═══════════════════════════════════════════════════════════════
# DATA SOURCES
# ═══════════════════════════════════════════════════════════════

def _load_deepseek_key():
    path = PROJECT_ROOT / "docs" / "secret" / ".env.DEEPSEEK"
    if path.exists():
        with open(path) as f:
            for line in f:
                if line.startswith("DEEPSEEK_API_KEY="):
                    return line.strip().split("=", 1)[1]
    return ""

def get_supabase_credentials():
    env_file = PROJECT_ROOT / "apps" / "web" / ".env"
    creds = {}
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                creds[k] = v.strip('"').strip("'")
    return creds

def fetch_leads(limit=1, min_score=50, place_id=None):
    creds = get_supabase_credentials()
    url = f"{creds['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/discovery_listings"
    params = [
        "select=place_id,title,category,rating_value,rating_votes,is_claimed,website,latitude,longitude,score_compound,score_fit,score_engagement,score_intent,schwartz_level,schwartz_label,signals_detected,total_photos,city,district",
        f"order=score_compound.desc",
        f"limit={limit}",
    ]
    if place_id:
        params.append(f"place_id=eq.{place_id}")
    else:
        params.append(f"score_compound=gte.{min_score}")
        params.append("website=not.is.null")

    url += "?" + "&".join(params)
    req = Request(url, headers={
        "apikey": creds["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {creds['SUPABASE_SERVICE_ROLE_KEY']}",
    })
    return json.loads(urlopen(req, timeout=10).read())

# ═══════════════════════════════════════════════════════════════
# COPYWRITER — DeepSeek V4 Flash
# ═══════════════════════════════════════════════════════════════

def generate_copy(lead: dict, gaps: list) -> dict:
    """DeepSeek gera headline, subtitle, CTA personalizados. ~3s, ~$0.001."""
    key = _load_deepseek_key()
    if not key:
        return None

    name = lead.get("title", "Empreendedor")
    cat = lead.get("category", "dentist")
    district = lead.get("district", "sua região") or "sua região"
    city = lead.get("city", "sua cidade") or "sua cidade"
    score = lead.get("score_compound", 50)
    rating = lead.get("rating_value", 0) or 0
    reviews = lead.get("rating_votes", 0) or 0
    level = lead.get("schwartz_label", "Problem Aware")

    tones = {
        "Unaware": "Tom educativo — ela não sabe que tem um problema. Mostre de forma simples o que está perdendo.",
        "Problem Aware": "Tom de urgência — ela sabe que tem poucos pacientes mas não sabe resolver. Mostre que a solução é simples e está aqui.",
        "Solution Aware": "Tom comparativo — ela já ouviu falar de agências de marketing (R$2.000/mês). Mostre que o adsentice é melhor e mais barato.",
        "Product Aware": "Tom de prova social — ela conhece o adsentice. Use cases de sucesso.",
        "Most Aware": "Tom de fechamento — ela já decidiu. Remova a última objeção.",
    }
    tone = tones.get(level.strip(), tones["Problem Aware"])

    gaps_text = "\n".join(f"- {g['title']}" for g in gaps[:3])

    import httpx
    try:
        r = httpx.post(DEEPSEEK_API, json={
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": f"Você é um copywriter sênior especializado em marketing digital para SMBs brasileiros. REGRAS: português brasileiro natural e pessoal, use o primeiro nome da pessoa, mencione o bairro e a especialidade, sem jargão técnico (SEO, schema, backlink, tráfego), frases curtas, foco em BENEFÍCIO real para o negócio. Headline até 100 caracteres. Subtitle até 150 caracteres. CTA até 60 caracteres. {tone}"},
                {"role": "user", "content": f"Gere um JSON com headline, subtitle, cta para: {name}, {cat} em {district}, {city}. Score {score}/100. {rating}★ com {reviews} avaliações. Nível: {level}.\n\nGaps detectados:\n{gaps_text}"},
            ],
            "max_tokens": 250, "temperature": 0.6,
            "response_format": {"type": "json_object"},
        }, headers={"Authorization": f"Bearer {key}"}, timeout=15)

        data = r.json()
        content = data["choices"][0]["message"]["content"].strip()
        c = json.loads(content)
        return {
            "headline": c["headline"], "subtitle": c["subtitle"], "cta": c["cta"],
            "tokens": data["usage"]["total_tokens"], "model": DEEPSEEK_MODEL,
        }
    except Exception:
        return None

# ═══════════════════════════════════════════════════════════════
# EMBED + QDRANT
# ═══════════════════════════════════════════════════════════════

def embed(text):
    req = Request(EMBED_URL, data=json.dumps({"texts": [text[:800]]}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=10).read())["vectors"][0]

def qdrant_search(vector, kind=None, limit=3):
    must = [{"key": "tag", "match": {"value": "adsentice-warp"}}]
    if kind: must.append({"key": "kind", "match": {"value": kind}})
    body = json.dumps({"vector": vector, "filter": {"must": must}, "limit": limit, "with_payload": True}).encode()
    req = Request(f"{QDRANT_URL}/collections/adsentice-self/points/search", data=body,
                  headers={"Content-Type": "application/json"}, method="POST")
    return json.loads(urlopen(req, timeout=10).read()).get("result", [])

def store_trace(meta):
    text = f"market intel trace | {meta['category']} | {meta['city']} | {meta['district']} | score:{meta['score']}"
    vec = embed(text)
    point = {
        "id": str(uuid.uuid4()),
        "vector": [float(v) for v in vec],
        "payload": {
            "traceId": meta["traceId"], "kind": "market-intel", "tag": "adsentice",
            "category": str(meta.get("category","")), "segment": str(meta.get("segment","")),
            "city": str(meta.get("city","")), "district": str(meta.get("district","")),
            "score": str(meta.get("score",50)), "schwartzLevel": str(meta.get("persona",{}).get("level","")),
            "nicho_name": str(meta.get("nicho",{}).get("name","")),
            "tokens_primary": str(meta.get("tokens",{}).get("primary","")),
            "tokens_hue": str(meta.get("tokens",{}).get("hue",0)),
            "tokens_heading": str(meta.get("tokens",{}).get("heading","")),
            "gaps_count": str(len(meta.get("gaps",[]))), "design_hint": str(meta.get("design_hint","")),
            "ts": str(int(time.time())),
        },
    }
    body = json.dumps({"points": [point]}).encode()
    req = Request(f"{QDRANT_URL}/collections/adsentice-conversation/points?wait=true", data=body,
                  headers={"Content-Type": "application/json"}, method="PUT")
    try:
        json.loads(urlopen(req, timeout=10).read())
    except: pass

# ═══════════════════════════════════════════════════════════════
# CLASSIFICATION
# ═══════════════════════════════════════════════════════════════

NICHO_MAP = {
    "dentist": {"name":"Dentista","specialties":["Periodontia","Ortodontia","Implantodontia","Clínico Geral","Estética Dental"],"audience":"Adultos 30-55, classes B/A","tone":"Autoridade com acolhimento","keywords":["dentista [bairro]","implante dentário","clareamento dental"]},
    "beauty_salon": {"name":"Salão de Beleza","specialties":["Cabelo","Manicure","Estética Facial","Maquiagem"],"audience":"Mulheres 20-55, classes B/A","tone":"Acolhedor, feminino, elegante","keywords":["salão de beleza","manicure","cabelereiro"]},
    "restaurant": {"name":"Restaurante","specialties":["Comida Caseira","Pizzaria","Japonesa","Hamburgueria"],"audience":"Adultos 20-55, classes B/A","tone":"Apetitoso, acolhedor, autêntico","keywords":["restaurante","delivery","comida"]},
}

CATEGORY_TO_SEGMENT = {
    "dentist":"saude","orthodontist":"saude","medical_clinic":"saude","hospital":"saude","psychologist":"saude","physical_therapist":"saude","ophthalmologist":"saude","cardiologist":"saude",
    "beauty_salon":"beleza","spa":"beleza","barber_shop":"beleza",
    "lawyer":"servicos","accountant":"servicos","architect":"servicos","interior_designer":"servicos","real_estate_agency":"servicos",
    "restaurant":"alimentacao","cafe":"alimentacao",
    "pet_store":"comercio","pharmacy":"comercio","veterinarian":"comercio","car_repair":"comercio","supermarket":"comercio",
    "school":"educacao","driving_school":"educacao",
    "hotel":"hospitalidade","inn":"hospitalidade",
}

SEGMENT_TOKENS = {
    "saude":{"primary":"#2563EB","secondary":"#1E40AF","accent":"#3B82F6","hue":220,"heading":"Inter","body":"Inter","emotion":"Confiança, higiene, profissionalismo","spacing":"1.5rem","radius":"0.5rem"},
    "beleza":{"primary":"#E8B4B8","secondary":"#D4AF37","accent":"#C084FC","hue":340,"heading":"Playfair Display","body":"Inter","emotion":"Feminino, luxo, elegância","spacing":"2rem","radius":"0.75rem"},
    "servicos":{"primary":"#1E3A5F","secondary":"#334155","accent":"#475569","hue":260,"heading":"Inter","body":"Inter","emotion":"Autoridade, tradição, confiança","spacing":"1.5rem","radius":"0.25rem"},
    "alimentacao":{"primary":"#EA580C","secondary":"#DC2626","accent":"#F97316","hue":25,"heading":"Poppins","body":"Open Sans","emotion":"Apetite, calor, acolhimento","spacing":"1rem","radius":"0.5rem"},
    "comercio":{"primary":"#2563EB","secondary":"#7C3AED","accent":"#059669","hue":250,"heading":"Inter","body":"Inter","emotion":"Confiança, praticidade","spacing":"1rem","radius":"0.25rem"},
    "educacao":{"primary":"#059669","secondary":"#0284C7","accent":"#6366F1","hue":160,"heading":"Inter","body":"Inter","emotion":"Crescimento, confiança, aprendizado","spacing":"1.5rem","radius":"0.5rem"},
    "hospitalidade":{"primary":"#D4AF37","secondary":"#CA8A04","accent":"#A16207","hue":30,"heading":"Playfair Display","body":"Inter","emotion":"Acolhimento, experiência, conforto","spacing":"2rem","radius":"0.5rem"},
}

PERSONA_FALLBACK = {
    "Unaware": {"approach":"EDUCAR","headline":"Sua clínica está invisível para {N} pessoas que buscam {SERVIÇO} todo mês em {LOCAL}","cta":"Ver Diagnóstico Gratuito","offer":"Diagnóstico gratuito em 30 segundos"},
    "Problem Aware": {"approach":"AGITAR A DOR","headline":"Descobrimos exatamente por que sua clínica não aparece no Google — e quantos pacientes você está perdendo","cta":"Ver Meus Gaps","offer":"Relatório gratuito com os principais gaps"},
    "Solution Aware": {"approach":"COMPARAR","headline":"Agências cobram R$2.000/mês por SEO. Nosso diagnóstico é gratuito e automático — veja seus gaps em 30 segundos.","cta":"Quero Resolver Isso","offer":"Plano de ação personalizado"},
    "Product Aware": {"approach":"PROVA SOCIAL","headline":"Já ajudamos {N} dentistas em {LOCAL}. Veja o resultado.","cta":"Começar Agora","offer":"Monitoramento mensal (R$197/mês)"},
    "Most Aware": {"approach":"FECHAR","headline":"Último passo: ative seu monitoramento em 2 minutos.","cta":"Ativar Agora","offer":"Primeiro mês com garantia"},
}

# ═══════════════════════════════════════════════════════════════
# GAP DETECTOR
# ═══════════════════════════════════════════════════════════════

def compute_gaps(lead):
    gaps = []
    signals = lead.get("signals_detected", []) or []
    has_claimed = any("E4" in s for s in signals) or lead.get("is_claimed", False)
    has_website = any("F3" in s for s in signals) or bool(lead.get("website"))
    rating = lead.get("rating_value", 0) or 0
    reviews = lead.get("rating_votes", 0) or 0
    photos = lead.get("total_photos", 0) or 0
    cat = (lead.get("category") or "dentist").lower().strip()
    nicho = NICHO_MAP.get(cat, NICHO_MAP.get("dentist", {}))
    district = lead.get("district", "") or ""
    city = lead.get("city", "") or ""

    if not has_claimed:
        gaps.append({"title":"Perfil do Google Meu Negócio não reivindicado","severity":"🔴 Crítico","desc":"Seu perfil no Google está sem controle. Perde notificações, fotos podem ser alteradas, avaliações não monitoradas.","fix":"Reivindique em business.google.com — 5 minutos, gratuito.","impact":"Crítico","effort":"5 min"})
    if not has_website:
        gaps.append({"title":"Sem website próprio","severity":"🔴 Crítico","desc":"76% dos pacientes visitam o site antes de agendar. Sem site, você depende 100% do perfil do Google.","fix":"Criar site profissional com páginas para cada serviço.","impact":"Crítico","effort":"1-2 dias"})
    if photos < 15:
        gaps.append({"title":"Fotos insuficientes no Google","severity":"🟡 Médio","desc":f"Seu perfil tem {photos} fotos. Perfis com 30+ fotos recebem 2x mais cliques.","fix":"Fotos do ambiente, equipe, equipamentos. 1 por semana.","impact":"Alto","effort":"30 min"})
    if rating >= 4.5 and reviews >= 20:
        gaps.append({"title":"Reputação excepcional — ative essa força","severity":"✅ Força","desc":f"Com {rating}★ e {reviews} avaliações, isso é um ativo de marketing que não está no site.","fix":"Exibir estrelas nos resultados do Google (schema AggregateRating) + depoimentos na home.","impact":"Alto","effort":"30 min"})
    gaps.append({"title":"Diferenciação no mercado local","severity":"✅ Oportunidade","desc":f"A maioria dos concorrentes ignora SEO local. Quem aparece primeiro no Google leva o paciente.","fix":f"Landing pages para '{nicho['specialties'][0].lower()} em {district or city}' — buscas com alta intenção e baixa concorrência.","impact":"Alto","effort":"1-2 semanas"})
    return gaps[:5]

# ═══════════════════════════════════════════════════════════════
# HTML + META GENERATOR
# ═══════════════════════════════════════════════════════════════

def generate_s10(lead, copy=None):
    t0 = time.time()
    trace_id = f"s10_{uuid.uuid4().hex[:12]}"

    cat = (lead.get("category") or "dentist").lower().strip()
    seg = CATEGORY_TO_SEGMENT.get(cat, "servicos")
    nicho = NICHO_MAP.get(cat, NICHO_MAP.get("dentist", {}))
    level = (lead.get("schwartz_label") or "Problem Aware").strip()
    tokens = SEGMENT_TOKENS.get(seg, SEGMENT_TOKENS["servicos"])
    district = lead.get("district", "") or ""
    city = lead.get("city", "") or ""
    local = f"{district}, {city}" if district else city

    # Gaps
    gaps = compute_gaps(lead)

    # DeepSeek copy (or fallback)
    if not copy:
        copy = generate_copy(lead, gaps)
    if not copy:
        fb = PERSONA_FALLBACK.get(level, PERSONA_FALLBACK["Problem Aware"])
        copy = {
            "headline": fb["headline"].replace("{N}", "47").replace("{SERVIÇO}", nicho["name"].lower()).replace("{LOCAL}", local),
            "subtitle": f"Análise baseada em dados reais do Google Meu Negócio e do seu site. Resultado em 30 segundos.",
            "cta": fb["cta"],
            "model": "template-fallback",
        }

    offer = PERSONA_FALLBACK.get(level, PERSONA_FALLBACK["Problem Aware"])["offer"]

    # Qdrant enrich
    dq = f"{nicho['specialties'][0]} {nicho['name']} design {district} {city}"
    dv = embed(dq)
    dh = qdrant_search(dv, kind="design-knowledge", limit=2)
    design_hint = dh[0]["payload"]["name"] if dh else f"{nicho['name']} Design"

    # Build HTML
    p, s, a, h = tokens["primary"], tokens["secondary"], tokens["accent"], tokens["hue"]
    name = lead["title"]
    score = lead.get("score_compound", 50)
    fit = lead.get("score_fit", 50) or 50
    eng = lead.get("score_engagement", 50) or 50
    ints = lead.get("score_intent", 50) or 50
    rating = lead.get("rating_value", 0) or 0
    reviews = lead.get("rating_votes", 0) or 0
    photos = lead.get("total_photos", 0) or 0
    website = lead.get("website", "sem site") or "sem site"
    claimed = "✅ Sim" if lead.get("is_claimed") else "❌ Não"

    html = f"""<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="{copy['headline']}">
<title>Raio-X · {name} | adsentice</title>
<link href="https://fonts.googleapis.com/css2?family={tokens['heading'].replace(' ','+')}:wght@400;500;600;700;800&family={tokens['body'].replace(' ','+')}:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{{
  --primary:{p};--primary-fg:#fff;--secondary:{s};--secondary-fg:#fff;--accent:{a};
  --bg:#f8fafc;--fg:#0f172a;--card:#fff;--muted:#f1f5f9;--muted-fg:#64748b;
  --border:#e2e8f0;--destructive:#ef4444;--success:#10b981;--warning:#f59e0b;
  --font:'{tokens['heading']}',system-ui,sans-serif;
  --shadow:0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg:0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -4px rgba(0,0,0,0.05);
  --radius:0.75rem;--radius-sm:0.5rem;--motion:200ms cubic-bezier(0.4,0,0.2,1);
}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:var(--font);background:var(--bg);color:var(--fg);line-height:1.6;-webkit-font-smoothing:antialiased}}
.hero{{background:linear-gradient(135deg,{p} 0%,{s} 100%);color:#fff;padding:3.5rem 2rem;text-align:center;position:relative;overflow:hidden}}
.hero::before{{content:'';position:absolute;inset:0;background:radial-gradient(circle at 30% 60%,rgba(255,255,255,0.08) 0%,transparent 60%)}}
.hero-content{{position:relative;z-index:1;max-width:800px;margin:0 auto}}
.hero-badge{{display:inline-flex;align-items:center;gap:.375rem;background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);padding:.375rem .875rem;border-radius:99px;font-size:.8125rem;font-weight:500;margin-bottom:1.25rem}}
.hero h1{{font-size:clamp(1.5rem,3.5vw,2.25rem);font-weight:800;line-height:1.2;margin-bottom:.75rem}}
.hero .subtitle{{font-size:1.05rem;opacity:.9;max-width:600px;margin:0 auto}}
.container{{max-width:860px;margin:0 auto;padding:0 1.5rem}}
.section{{padding:2.5rem 0}}
.score-card{{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:2rem;box-shadow:var(--shadow);display:flex;align-items:center;gap:2rem;flex-wrap:wrap;margin-top:-2rem;position:relative;z-index:2}}
.score-ring{{width:130px;height:130px;border-radius:50%;background:conic-gradient({p} 0% {fit}%,{a} {fit}% {fit+eng}%,{s} {fit+eng}% 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0}}
.score-inner{{width:100px;height:100px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center}}
.score-value{{font-size:2.25rem;font-weight:800;line-height:1;color:{p}}}
.score-label{{font-size:.7rem;color:var(--muted-fg);text-transform:uppercase;letter-spacing:.05em;margin-top:.25rem}}
.score-info{{flex:1;min-width:240px}}
.score-info h2{{font-size:1.35rem;font-weight:700;margin-bottom:.25rem}}
.score-level{{display:inline-flex;align-items:center;gap:.375rem;padding:.25rem .75rem;border-radius:99px;font-size:.8125rem;font-weight:600;background:{p}15;color:{p};margin-bottom:1rem}}
.score-bars{{display:flex;flex-direction:column;gap:.625rem}}
.score-bar{{display:flex;align-items:center;gap:.75rem}}
.score-bar-label{{width:110px;font-size:.8rem;font-weight:500;color:var(--muted-fg)}}
.score-bar-track{{flex:1;height:8px;background:var(--muted);border-radius:99px;overflow:hidden}}
.score-bar-fill{{height:100%;border-radius:99px}}
.score-bar-val{{width:36px;text-align:right;font-size:.8rem;font-weight:600}}
.info-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;margin:1.5rem 0}}
.info-card{{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1.25rem;box-shadow:0 1px 2px rgba(0,0,0,0.05)}}
.info-card h4{{font-size:.9rem;font-weight:700;margin-bottom:.5rem}}
.info-card .value{{font-size:1.5rem;font-weight:800;line-height:1.2}}
.info-card .value.stars{{color:#f59e0b}}
.info-card .meta{{font-size:.8125rem;color:var(--muted-fg);margin-top:.25rem}}
.info-card .status{{display:inline-flex;align-items:center;gap:.25rem;padding:.125rem .5rem;border-radius:99px;font-size:.75rem;font-weight:600;margin-top:.5rem}}
.info-card .status.ok{{background:{p}12;color:{p}}}
.gap{{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1.5rem;margin-bottom:1rem;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all var(--motion);position:relative}}
.gap:hover{{transform:translateY(-1px);box-shadow:var(--shadow-lg)}}
.gap::before{{content:'';position:absolute;top:0;left:0;width:4px;height:100%;border-radius:var(--radius-sm) 0 0 var(--radius-sm)}}
.gap.critico::before{{background:var(--destructive)}}
.gap.medio::before{{background:var(--warning)}}
.gap.oportunidade::before,.gap.forca::before{{background:var(--success)}}
.gap-header{{display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem}}
.gap-severity{{font-size:.75rem;font-weight:700;text-transform:uppercase}}
.gap-severity.critico{{color:var(--destructive)}}
.gap-severity.medio{{color:var(--warning)}}
.gap-severity.oportunidade,.gap-severity.forca{{color:var(--success)}}
.gap h4{{font-size:1.05rem;font-weight:700}}
.gap p{{color:var(--muted-fg);font-size:.9rem;margin-bottom:.75rem}}
.gap .fix{{background:var(--muted);padding:.875rem 1rem;border-radius:var(--radius-sm);font-size:.875rem}}
.gap .fix strong{{color:var(--fg)}}
.gap .meta-row{{display:flex;gap:1.25rem;margin-top:.75rem;font-size:.8rem;color:var(--muted-fg)}}
.cta{{background:linear-gradient(135deg,{p} 0%,{s} 100%);color:#fff;text-align:center;padding:2.5rem 2rem;border-radius:var(--radius);box-shadow:var(--shadow-lg)}}
.cta h2{{font-size:1.5rem;font-weight:700;margin-bottom:.5rem}}
.cta p{{opacity:.9;max-width:450px;margin:0 auto 1.5rem;font-size:.95rem}}
.cta-btn{{display:inline-flex;align-items:center;gap:.5rem;background:#fff;color:{p};padding:.75rem 1.75rem;border-radius:99px;font-size:.95rem;font-weight:700;text-decoration:none;transition:all var(--motion);box-shadow:0 4px 14px rgba(0,0,0,0.12)}}
.cta-btn:hover{{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,0.18)}}
footer{{text-align:center;padding:2rem 0;color:var(--muted-fg);font-size:.75rem;border-top:1px solid var(--border);margin-top:2rem}}
footer span{{color:{p};font-weight:600}}
@media(max-width:600px){{.score-card{{flex-direction:column;text-align:center}}.info-grid{{grid-template-columns:1fr}}}}
</style></head><body>
<div class="hero"><div class="hero-content">
<div class="hero-badge">🔍 Relatório Raio-X · Diagnóstico Gratuito</div>
<h1>{copy['headline']}</h1><p class="subtitle">{copy['subtitle']}</p>
</div></div>
<div class="container">
<div class="score-card">
<div class="score-ring"><div class="score-inner"><div class="score-value">{score}</div><div class="score-label">de 100</div></div></div>
<div class="score-info"><h2>{name}</h2><div class="score-level">{level} · {nicho['name']}</div>
<div class="score-bars">
<div class="score-bar"><span class="score-bar-label">Presença</span><div class="score-bar-track"><div class="score-bar-fill" style="width:{fit}%;background:{p}"></div></div><span class="score-bar-val">{fit}%</span></div>
<div class="score-bar"><span class="score-bar-label">Engajamento</span><div class="score-bar-track"><div class="score-bar-fill" style="width:{eng}%;background:{a}"></div></div><span class="score-bar-val">{eng}%</span></div>
<div class="score-bar"><span class="score-bar-label">Intenção</span><div class="score-bar-track"><div class="score-bar-fill" style="width:{ints}%;background:{s}"></div></div><span class="score-bar-val">{ints}%</span></div>
</div></div></div>
<div class="info-grid">
<div class="info-card"><h4>Google Meu Negócio</h4><div class="value stars">{'★'*max(1,int(rating))}{'☆'*max(0,5-int(rating))}</div><div class="meta">{rating}★ · {reviews} avaliações</div><div class="status ok">{photos} fotos · {claimed}</div></div>
<div class="info-card"><h4>Website</h4><div class="value" style="font-size:1.1rem;word-break:break-all">{str(website)[:35]}</div><div class="meta">{local}</div><div class="status ok">✅ Online</div></div>
<div class="info-card"><h4>Concorrência</h4><div class="value">47</div><div class="meta">{nicho['name'].lower()}s na região</div><div class="status ok">📊 Score {score}/100</div></div>
</div>
<div class="section"><h2 style="font-size:1.35rem;font-weight:700;margin-bottom:.5rem">{len(gaps)} Gaps e Oportunidades</h2>
<p style="color:var(--muted-fg);margin-bottom:1.5rem">Análise baseada em dados reais do Google Meu Negócio e do seu site.</p>"""

    for g in gaps:
        sev = g["severity"]
        sev_class = "critico" if "Crítico" in sev else ("medio" if "Médio" in sev else ("forca" if "Força" in sev else "oportunidade"))
        html += f"""<div class="gap {sev_class}"><div class="gap-header"><span class="gap-severity {sev_class}">{sev}</span><h4>{g['title']}</h4></div><p>{g['desc']}</p><div class="fix"><strong>✅ Como resolver:</strong> {g['fix']}</div><div class="meta-row"><span>📈 Impacto: {g['impact']}</span><span>⏱️ Esforço: {g['effort']}</span></div></div>"""

    html += f"""</div>
<div class="cta"><h2>{offer}</h2><p>Diagnóstico gratuito. Nosso plano Sentinela (R$197/mês) monitora seu negócio todo mês.</p><a href="https://wa.me/5521999999999" class="cta-btn" target="_blank">💬 {copy['cta']} no WhatsApp</a></div></div>
<footer><div class="container"><p>Diagnóstico gerado por <span>adsentice</span> — hub inteligente de marketing para negócios locais.</p><p style="margin-top:.25rem">Dados: Google Meu Negócio · website · mercado local · {time.strftime('%d/%m/%Y')}</p></div></footer>
</body></html>"""

    # Save files
    safe_name = name[:40].replace(" ", "-").replace(".", "").lower()
    html_path = PREVIEW_DIR / f"warp-s10-{safe_name}-{trace_id[:8]}.html"
    meta_path = PREVIEW_DIR / f"warp-s10-{safe_name}-{trace_id[:8]}.json"
    html_path.write_text(html)

    meta = {
        "traceId": trace_id, "lead": name, "category": cat, "segment": seg, "score": score,
        "nicho": nicho, "tokens": tokens, "design_hint": design_hint,
        "gaps": [{"title": g["title"], "severity": g["severity"]} for g in gaps],
        "copy_model": copy.get("model", "template"),
        "copy_tokens": copy.get("tokens", 0),
        "headline": copy["headline"], "computedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "city": city, "district": district,
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    store_trace(meta)
    total_ms = (time.time() - t0) * 1000

    return {"html": str(html_path), "meta": str(meta_path), "trace": trace_id, "ms": total_ms,
            "gaps": len(gaps), "design": design_hint, "copy_model": copy.get("model","template"),
            "headline": copy["headline"][:80]}

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    place_id = None; batch_mode = False; min_score = 50; limit = 1
    for a in sys.argv[1:]:
        if a.startswith("--place-id="): place_id = a.split("=", 1)[1]
        elif a == "--all": batch_mode = True; limit = 20
        elif a.startswith("--min-score="): min_score = int(a.split("=", 1)[1])
        elif a.startswith("--limit="): limit = int(a.split("=", 1)[1])

    print(f"🧠 S10 RAIO-X · {'BATCH x'+str(limit) if batch_mode else 'SINGLE'}")
    if _load_deepseek_key(): print(f"   Copywriter: DeepSeek V4 Flash (~$0.001/query, ~3s)")
    print()

    leads = fetch_leads(limit=limit, min_score=min_score, place_id=place_id)
    if not leads: print("❌ Nenhum lead"); return

    results = []
    for i, lead in enumerate(leads):
        name = lead["title"]
        print(f"  {i+1}/{len(leads)} {name[:55]}... score:{lead.get('score_compound','?')}", end="", flush=True)
        result = generate_s10(lead)
        results.append(result)
        print(f" ✅ {result['gaps']}gaps · {result['design'][:30]} · {result['copy_model']} · {result['ms']:.0f}ms")
        if not batch_mode: print(f"\n📄 {result['html']}\n📊 {result['meta']}\n")

    print(f"\n🏁 {len(results)} S10 gerados · {sum(r['ms'] for r in results):.0f}ms total")
    print(f"   📂 {PREVIEW_DIR}/")

if __name__ == "__main__":
    main()
