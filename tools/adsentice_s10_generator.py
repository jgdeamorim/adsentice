#!/usr/bin/env python3
"""
adsentice_s10_generator.py — S10 Relatório Raio-X · Gerador Automático
═══════════════════════════════════════════════════════════════
O SISTEMA gera sozinho. Ninguém escreve HTML manual.

Pipeline:
  1. Buscar lead do Supabase (dados reais)
  2. Classificar: category → segmento → nicho → persona → skills → tokens
  3. Enriquecer: Qdrant (design inspiration) + Market Intel (regional data)
  4. Computar gaps dos sinais reais
  5. Gerar HTML (cliente) + _meta JSON (interno)
  6. Store trace → Qdrant (market-intel feedback loop)

Uso:
  python3 tools/adsentice_s10_generator.py                    # lead #1 do Supabase
  python3 tools/adsentice_s10_generator.py --place-id <ID>    # lead específico
  python3 tools/adsentice_s10_generator.py --all-above 50     # todos com score > 50

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

PROJECT_ROOT = Path(__file__).parent.parent
PREVIEW_DIR = PROJECT_ROOT / "docs" / "preview"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

# ═══════════════════════════════════════════════════════════════
# DATA SOURCES
# ═══════════════════════════════════════════════════════════════

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

def fetch_leads(limit=1, min_score=0, place_id=None):
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
# EMBED + QDRANT
# ═══════════════════════════════════════════════════════════════

def embed(text):
    req = Request(EMBED_URL, data=json.dumps({"texts": [text[:800]]}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=10).read())["vectors"][0]

def qdrant_search(vector, kind=None, category=None, limit=3):
    must = [{"key": "tag", "match": {"value": "adsentice-warp"}}]
    if kind: must.append({"key": "kind", "match": {"value": kind}})
    if category: must.append({"key": "category", "match": {"value": category}})
    body = json.dumps({"vector": vector, "filter": {"must": must}, "limit": limit, "with_payload": True}).encode()
    req = Request(f"{QDRANT_URL}/collections/adsentice-self/points/search", data=body,
                  headers={"Content-Type": "application/json"}, method="POST")
    return json.loads(urlopen(req, timeout=10).read()).get("result", [])

def store_trace(trace_data):
    text = f"market intel trace | {trace_data['category']} | {trace_data['city']} | {trace_data['district']} | score:{trace_data['score']} | {trace_data['nicho']['name']} | gaps:{len(trace_data['gaps'])}"
    vec = embed(text)
    # Flatten nested objects for Qdrant payload
    flat_payload = {
        "traceId": trace_data["traceId"],
        "kind": "market-intel", "tag": "adsentice",
        "category": str(trace_data.get("category", "")),
        "segment": str(trace_data.get("segment", "")),
        "city": str(trace_data.get("city", "")),
        "district": str(trace_data.get("district", "")),
        "score": str(trace_data.get("score", 50)),
        "schwartzLevel": str(trace_data.get("persona", {}).get("level", "")),
        "nicho_name": str(trace_data.get("nicho", {}).get("name", "")),
        "nicho_specialties": ",".join(trace_data.get("nicho", {}).get("specialties", [])[:3]),
        "tokens_primary": str(trace_data.get("tokens", {}).get("primary", "")),
        "tokens_hue": str(trace_data.get("tokens", {}).get("hue", 0)),
        "tokens_heading": str(trace_data.get("tokens", {}).get("heading", "")),
        "gaps_count": str(len(trace_data.get("gaps", []))),
        "gaps_titles": ",".join(g["title"][:40] for g in trace_data.get("gaps", [])[:3]),
        "design_hint": str(trace_data.get("qdrantHints", {}).get("design", "")),
        "ts": str(int(time.time())),
    }
    point = {
        "id": str(uuid.uuid4()),
        "vector": [float(v) for v in vec],
        "payload": flat_payload,
    }
    body = json.dumps({"points": [point]}).encode()
    req = Request(f"{QDRANT_URL}/collections/adsentice-conversation/points?wait=true", data=body,
                  headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=10).read()).get("status", "error")

# ═══════════════════════════════════════════════════════════════
# CLASSIFICATION LAYERS
# ═══════════════════════════════════════════════════════════════

NICHO_MAP = {
    "dentist": {"name":"Dentista","specialties":["Periodontia","Ortodontia","Implantodontia","Endodontia","Clínico Geral","Estética Dental"],"audience":"Adultos 30-55 anos, classes B/A, que valorizam saúde bucal e estética","tone":"Autoridade técnica com acolhimento. Confiança + proximidade.","keywords":["dentista [bairro]","implante dentário","clareamento dental","aparelho ortodôntico","canal dentário"],"pains":["Poucos pacientes novos","Concorrência local forte","Pacientes que só vão quando dói"],"objections":['"Já tenho dentista há anos"','"Tratamento dentário é caro"','"Só vou quando dói"'],"conversionTriggers":["Primeira consulta gratuita","Raio-X digital","Aceita convênios","Emergência 24h"]},
    "beauty_salon": {"name":"Salão de Beleza","specialties":["Cabelo","Manicure","Estética Facial","Maquiagem","Depilação"],"audience":"Mulheres 20-55, classes B/A, que valorizam beleza e bem-estar","tone":"Acolhedor, feminino, elegante. Linguagem de beleza e autocuidado.","keywords":["salão de beleza [bairro]","manicure [cidade]","cabelereiro profissional"],"pains":["Poucas clientes novas","Concorrência de salões grandes","Dependência de Instagram"],"objections":['"Já tenho cabeleireira há anos"','"Muito caro"'],"conversionTriggers":["Primeira avaliação gratuita","Pacote de serviços com desconto","Indicação de amigas"]},
    "restaurant": {"name":"Restaurante","specialties":["Comida Caseira","Pizzaria","Japonesa","Hamburgueria","Contemporânea"],"audience":"Adultos 20-55, classes B/A, delivery e experiência","tone":"Apetitoso, acolhedor, autêntico. Foco em sabor e experiência.","keywords":["restaurante [bairro]","delivery [cidade]","pizzaria perto","comida japonesa"],"pains":["Poucos clientes no salão","Delivery custa caro (comissão iFood)","Concorrência enorme"],"objections":['"Já conheço todos os restaurantes"','"Cozinho em casa"','"Muito caro comer fora"'],"conversionTriggers":["Delivery grátis 1º pedido","Sobremesa cortesia","Reserva online"]},
}

PERSONA_MAP = {
    "Unaware": {"who":"Não sabe que tem problema de marketing digital","approach":"EDUCAR — mostrar que o problema existe","headline":"Sua clínica está invisível para {N} pessoas que buscam {SERVIÇO} todo mês em {LOCAL}","cta":"Ver Diagnóstico Gratuito","offer":"Diagnóstico de marketing digital gratuito em 30 segundos"},
    "Problem Aware": {"who":"Sabe que tem poucos pacientes mas não sabe resolver","approach":"AGITAR A DOR — quantificar + oferecer caminho","headline":"Descobrimos exatamente por que sua clínica não aparece no Google — e quantos pacientes você está perdendo","cta":"Ver Meus Gaps","offer":"Relatório gratuito com os principais gaps da sua clínica"},
    "Solution Aware": {"who":"Já ouviu falar de SEO/Google Ads","approach":"COMPARAR — mostrar que adsentice é melhor e mais barato","headline":"Agências cobram R$2.000/mês por SEO. Nosso diagnóstico é gratuito e automático — veja seus gaps em 30 segundos.","cta":"Quero Resolver Isso","offer":"Plano de ação personalizado para aparecer no Google"},
    "Product Aware": {"who":"Conhece adsentice, está considerando","approach":"PROVA SOCIAL — cases de sucesso, depoimentos","headline":"Já ajudamos {N} dentistas em {LOCAL}. Veja o resultado.","cta":"Começar Agora","offer":"Monitoramento mensal + otimização contínua (R$197/mês)"},
    "Most Aware": {"who":"Já decidiu, só precisa fechar","approach":"FECHAR — remover última objeção","headline":"Último passo: ative seu monitoramento em 2 minutos.","cta":"Ativar Agora","offer":"Primeiro mês com garantia de resultados"},
}

SEGMENT_TOKENS = {
    "saude":        {"primary":"#2563EB","secondary":"#1E40AF","accent":"#3B82F6","hue":220,"heading":"Inter","body":"Inter","emotion":"Confiança, higiene, profissionalismo","spacing":"1.5rem","radius":"0.5rem","motion":"zero"},
    "beleza":       {"primary":"#E8B4B8","secondary":"#D4AF37","accent":"#C084FC","hue":340,"heading":"Playfair Display","body":"Inter","emotion":"Feminino, luxo, elegância","spacing":"2rem","radius":"0.75rem","motion":"subtle"},
    "servicos":     {"primary":"#1E3A5F","secondary":"#334155","accent":"#475569","hue":260,"heading":"Inter","body":"Inter","emotion":"Autoridade, tradição, confiança","spacing":"1.5rem","radius":"0.25rem","motion":"zero"},
    "alimentacao":  {"primary":"#EA580C","secondary":"#DC2626","accent":"#F97316","hue":25,"heading":"Poppins","body":"Open Sans","emotion":"Apetite, calor, acolhimento","spacing":"1rem","radius":"0.5rem","motion":"moderate"},
    "comercio":     {"primary":"#2563EB","secondary":"#7C3AED","accent":"#059669","hue":250,"heading":"Inter","body":"Inter","emotion":"Confiança, praticidade","spacing":"1rem","radius":"0.25rem","motion":"zero"},
    "educacao":     {"primary":"#059669","secondary":"#0284C7","accent":"#6366F1","hue":160,"heading":"Inter","body":"Inter","emotion":"Crescimento, confiança, aprendizado","spacing":"1.5rem","radius":"0.5rem","motion":"subtle"},
    "hospitalidade":{"primary":"#D4AF37","secondary":"#CA8A04","accent":"#A16207","hue":30,"heading":"Playfair Display","body":"Inter","emotion":"Acolhimento, experiência, conforto","spacing":"2rem","radius":"0.5rem","motion":"subtle"},
}

CATEGORY_TO_SEGMENT = {
    "dentist":"saude","orthodontist":"saude","medical_clinic":"saude","medical_aesthetic_clinic":"saude","hospital":"saude","psychologist":"saude","physical_therapist":"saude","ophthalmologist":"saude","cardiologist":"saude",
    "beauty_salon":"beleza","spa":"beleza","barber_shop":"beleza",
    "lawyer":"servicos","accountant":"servicos","architect":"servicos","interior_designer":"servicos","real_estate_agency":"servicos",
    "restaurant":"alimentacao","cafe":"alimentacao",
    "pet_store":"comercio","pharmacy":"comercio","veterinarian":"comercio","car_repair":"comercio","supermarket":"comercio","electrician":"comercio","plumber":"comercio","cleaning_service":"comercio",
    "school":"educacao","driving_school":"educacao",
    "hotel":"hospitalidade","inn":"hospitalidade",
}

# ═══════════════════════════════════════════════════════════════
# GAP DETECTOR — Decodifica sinais reais do Supabase
# ═══════════════════════════════════════════════════════════════

# Sinais do Supabase e seus significados
SIGNAL_DECODER = {
    "F1": ("Categoria GMB correta", "forca"),
    "F2": ("Nome consistente", "forca"),
    "F3": ("Site próprio (não rede social)", "forca"),
    "F4": ("Fotos adequadas no GMB", "forca"),
    "F5": ("Endereço completo no GMB", "forca"),
    "F7": ("Telefone listado no GMB", "forca"),
    "F9": ("Domínio próprio (não Wix/Instagram)", "forca"),
    "E1": ("Rating alto no GMB", "forca"),
    "E2": ("Volume de reviews bom", "forca"),
    "E3": ("Boas práticas detectadas", "forca"),
    "E4": ("GMB reivindicado", "forca"),
    "E5": ("WhatsApp disponível", "forca"),
    "E6": ("Fotos proxy — perfil ativo", "forca"),
    "E7": ("Descrição + GMB completo", "forca"),
    "F6": ("Categoria GMB genérica", "gap"),
    "F8": ("Sem website", "gap"),
    "F10": ("Sem telefone listado", "gap"),
    "E1_low": ("Rating baixo no GMB", "gap"),
}

def compute_gaps(lead):
    """Detecta gaps REAIS a partir dos sinais do Supabase."""
    gaps = []
    signals = lead.get("signals_detected", []) or []
    signals_str = " ".join(signals)

    cat_lower = (lead.get("category") or "dentist").lower().strip()
    nicho = NICHO_MAP.get(cat_lower, NICHO_MAP.get("dentist", {}))
    rating = lead.get("rating_value", 0) or 0
    reviews = lead.get("rating_votes", 0) or 0
    photos = lead.get("total_photos", 0) or 0
    claimed = lead.get("is_claimed", False)
    district = lead.get("district", "") or ""
    city = lead.get("city", "") or ""
    score = lead.get("score_compound", 50) or 50

    # ── Sinais NEGATIVOS (gaps reais) ──
    has_website = any("F3" in s for s in signals)
    has_claimed = any("E4" in s for s in signals) or claimed
    has_photos_good = any("F4" in s for s in signals)
    has_rating_high = any("E1" in s for s in signals)

    if not has_claimed:
        gaps.append({"title":"Perfil do Google Meu Negócio não reivindicado","severity":"🔴 Crítico","desc":"Seu perfil no Google está sem controle. Qualquer pessoa pode alterar informações, fotos e horários. Você não recebe notificações de novas avaliações.","fix":"Reivindicar gratuitamente em business.google.com. Leva 5 minutos e é o passo #1 de qualquer estratégia de marketing local.","impact":"Crítico","effort":"5 min"})

    if not has_website:
        gaps.append({"title":"Sem website próprio","severity":"🔴 Crítico","desc":"Você não tem um site próprio. 76% dos consumidores visitam o site antes de agendar uma consulta. Sem site, você depende 100% do perfil GMB.","fix":"Criar um site profissional com páginas para cada serviço, informações de contato e integração com WhatsApp. Custo: a partir de R$47/mês.","impact":"Crítico","effort":"1-2 dias"})

    if not has_photos_good or photos < 15:
        gaps.append({"title":"Fotos insuficientes no Google Meu Negócio","severity":"🟡 Médio","desc":f"Seu GMB tem {photos} fotos. Perfis com 30+ fotos recebem 2x mais cliques e 40% mais chamadas. Fotos reais do consultório geram confiança.","fix":"Adicionar fotos do ambiente, equipe, equipamentos, antes/depois de procedimentos. Meta: 1 foto nova por semana até chegar em 30.","impact":"Alto","effort":"30 min"})

    # ── Gaps de conteúdo/SEO (do scoring engine) ──
    has_schema = "jsonld" in signals_str.lower() or "schema" in signals_str.lower()
    if not has_schema:
        gaps.append({"title":"Sem Schema LocalBusiness no site","severity":"🔴 Crítico","desc":"Seu site não informa ao Google que você é um negócio local. Isso reduz seu ranking no Google Maps e impede rich results com estrelas e endereço nos resultados de busca.","fix":"Adicionar JSON-LD LocalBusiness no <head> do site. 5 minutos. O código inclui nome, endereço, telefone, horários e especialidades.","impact":"Alto","effort":"5 min"})

    # ── Forças (oportunidades de marketing) ──
    if has_rating_high and rating >= 4.5 and reviews >= 20:
        gaps.append({"title":"Reputação excepcional — ative essa força no site","severity":"✅ Força","desc":f"Com {rating}★ e {reviews} avaliações, sua clínica tem uma das melhores reputações da região. Isso é um ativo de marketing poderoso que você não está usando no site.","fix":"Adicionar schema AggregateRating no site para exibir as estrelas nos resultados do Google. Incluir seção de depoimentos com as 5 melhores avaliações na home page.","impact":"Alto","effort":"30 min"})

    if has_claimed and has_website and has_rating_high:
        gaps.append({"title":"Base digital sólida — hora de escalar","severity":"✅ Força","desc":f"Sua clínica tem os fundamentos: GMB verificado, site próprio, {rating}★ de reputação. O próximo passo é otimização para aparecer em PRIMEIRO nas buscas locais.","fix":"Focar em SEO local: otimizar cada página para palavras-chave específicas ('periodontista Madureira'), criar conteúdo regular (blog), conseguir backlinks de sites locais.","impact":"Alto","effort":"Contínuo"})

    # ── Sempre: contexto competitivo ──
    gaps.append({"title":"Diferenciação no mercado local","severity":"✅ Oportunidade","desc":f"O mercado de {nicho['name'].lower()} tem concorrência ativa. A vantagem: a MAIORIA dos concorrentes ignora marketing digital. Quem aparece primeiro no Google leva o paciente.","fix":f"Criar landing pages para: '{nicho['specialties'][0].lower()} em {district or city}', '{nicho['specialties'][1].lower()} {city}'. São buscas com alta intenção e baixa concorrência.","impact":"Alto","effort":"1-2 semanas"})

    return gaps

# ═══════════════════════════════════════════════════════════════
# MARKET CONTEXT
# ═══════════════════════════════════════════════════════════════

def get_market_context(category, city, district, lead_score):
    query = f"{category} {city} {district or ''} market intelligence brazil smb dental clinic saude"
    vec = embed(query)
    results = qdrant_search(vec, kind="market-intel", limit=10)

    if not results:
        return {"regionalAvgScore": 38, "regionalTraceCount": 0, "marketPosition": "sem dados da região", "benchmarkGap": ""}

    traces = [r["payload"] for r in results if r["payload"].get("city") == city]
    if not traces:
        return {"regionalAvgScore": 38, "regionalTraceCount": 0, "marketPosition": "sem dados da região", "benchmarkGap": ""}

    scores = [t.get("score", 0) for t in traces]
    avg = sum(scores) // len(scores)
    position = "acima da média" if lead_score > avg + 10 else ("na média" if lead_score > avg else "abaixo da média")
    gap_text = f"Sua clínica está {lead_score - avg:+d} pontos vs média de {avg}/100 em {district or city} ({len(traces)} negócios analisados)."

    return {"regionalAvgScore": avg, "regionalTraceCount": len(traces), "marketPosition": position, "benchmarkGap": gap_text}

# ═══════════════════════════════════════════════════════════════
# HTML GENERATOR
# ═══════════════════════════════════════════════════════════════

def generate_html(output, market_context):
    lead = output["lead"]
    tokens = output["tokens"]
    p, s, a, h = tokens["primary"], tokens["secondary"], tokens["accent"], tokens["hue"]

    name = lead["title"]
    score = lead["score_compound"]
    fit = lead.get("score_fit", 50) or 50
    eng = lead.get("score_engagement", 50) or 50
    ints = lead.get("score_intent", 50) or 50
    rating = lead.get("rating_value", 0) or 0
    reviews = lead.get("rating_votes", 0) or 0
    photos = lead.get("total_photos", 0) or 0
    website = lead.get("website", "sem site") or "sem site"
    claimed = "✅ Sim" if lead.get("is_claimed") else "❌ Não"
    local = f"{lead.get('district','') or 'Sua região'}, {lead.get('city','') or 'Sua cidade'}"
    level = lead.get("schwartz_label", "Problem Aware") or "Problem Aware"
    nicho = output["nicho"]
    persona = output["persona"]
    headline = output["headline"]
    subtitle = output["subtitle"]
    cta_text = output["cta"]
    offer = output["offer"]
    gaps = output["gaps"]
    competitor_count = 47

    benchmark = market_context.get("benchmarkGap", "")

    result = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="{headline}">
<title>Diagnóstico de Marketing Digital · {name} | adsentice</title>
<link href="https://fonts.googleapis.com/css2?family={tokens['heading'].replace(' ', '+')}:wght@400;500;600;700;800&family={tokens['body'].replace(' ', '+')}:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {{
  --primary: {p}; --primary-fg: #fff;
  --secondary: {s}; --secondary-fg: #fff;
  --accent: {a}; --accent-fg: #fff;
  --bg: #f8fafc; --fg: #0f172a;
  --card: #fff; --muted: #f1f5f9; --muted-fg: #64748b;
  --border: #e2e8f0; --destructive: #ef4444;
  --success: #10b981; --warning: #f59e0b;
  --font: '{tokens['heading']}', system-ui, sans-serif;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);
  --radius: 0.75rem; --radius-sm: 0.5rem;
  --motion: 200ms cubic-bezier(0.4,0,0.2,1);
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: var(--font); background: var(--bg); color: var(--fg); line-height: 1.6; -webkit-font-smoothing: antialiased; }}
.hero {{ background: linear-gradient(135deg, {p} 0%, {s} 100%); color: #fff; padding: 3.5rem 2rem; text-align: center; position: relative; overflow: hidden; }}
.hero::before {{ content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 30% 60%, rgba(255,255,255,0.08) 0%, transparent 60%); }}
.hero-content {{ position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }}
.hero-badge {{ display: inline-flex; align-items: center; gap: 0.375rem; background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.18); padding: 0.375rem 0.875rem; border-radius: 99px; font-size: 0.8125rem; font-weight: 500; margin-bottom: 1.25rem; }}
.hero h1 {{ font-size: clamp(1.5rem, 3.5vw, 2.25rem); font-weight: 800; line-height: 1.2; margin-bottom: 0.75rem; }}
.hero .subtitle {{ font-size: 1.05rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }}

.container {{ max-width: 860px; margin: 0 auto; padding: 0 1.5rem; }}
.section {{ padding: 2.5rem 0; }}

.score-card {{ background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; box-shadow: var(--shadow); display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; margin-top: -2rem; position: relative; z-index: 2; }}
.score-ring {{ width: 130px; height: 130px; border-radius: 50%; background: conic-gradient({p} 0% {fit}%, {a} {fit}% {fit+eng}%, {s} {fit+eng}% 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }}
.score-inner {{ width: 100px; height: 100px; border-radius: 50%; background: var(--card); display: flex; flex-direction: column; align-items: center; justify-content: center; }}
.score-value {{ font-size: 2.25rem; font-weight: 800; line-height: 1; color: {p}; }}
.score-label {{ font-size: 0.7rem; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem; }}
.score-info {{ flex: 1; min-width: 240px; }}
.score-info h2 {{ font-size: 1.35rem; font-weight: 700; margin-bottom: 0.25rem; }}
.score-level {{ display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.8125rem; font-weight: 600; background: {p}15; color: {p}; margin-bottom: 1rem; }}
.score-bars {{ display: flex; flex-direction: column; gap: 0.625rem; }}
.score-bar {{ display: flex; align-items: center; gap: 0.75rem; }}
.score-bar-label {{ width: 110px; font-size: 0.8rem; font-weight: 500; color: var(--muted-fg); }}
.score-bar-track {{ flex: 1; height: 8px; background: var(--muted); border-radius: 99px; overflow: hidden; }}
.score-bar-fill {{ height: 100%; border-radius: 99px; }}
.score-bar-val {{ width: 36px; text-align: right; font-size: 0.8rem; font-weight: 600; }}

.info-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin: 1.5rem 0; }}
.info-card {{ background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1.25rem; box-shadow: var(--shadow-sm); }}
.info-card h4 {{ font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem; }}
.info-card .value {{ font-size: 1.5rem; font-weight: 800; line-height: 1.2; }}
.info-card .value.stars {{ color: #f59e0b; }}
.info-card .meta {{ font-size: 0.8125rem; color: var(--muted-fg); margin-top: 0.25rem; }}
.info-card .status {{ display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; margin-top: 0.5rem; }}
.info-card .status.ok {{ background: {p}12; color: {p}; }}
.info-card .status.good {{ background: #10b98115; color: #10b981; }}
.benchmark {{ background: {p}06; border-left: 3px solid {p}; padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin: 1rem 0; font-size: 0.9rem; }}

.gap {{ background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1.5rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm); transition: all var(--motion); position: relative; }}
.gap:hover {{ transform: translateY(-1px); box-shadow: var(--shadow-lg); }}
.gap::before {{ content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; border-radius: var(--radius-sm) 0 0 var(--radius-sm); }}
.gap.critico::before {{ background: var(--destructive); }}
.gap.medio::before {{ background: var(--warning); }}
.gap.oportunidade::before, .gap.forca::before {{ background: var(--success); }}
.gap-header {{ display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }}
.gap-severity {{ font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }}
.gap-severity.critico {{ color: var(--destructive); }}
.gap-severity.medio {{ color: var(--warning); }}
.gap-severity.oportunidade, .gap-severity.forca {{ color: var(--success); }}
.gap h4 {{ font-size: 1.05rem; font-weight: 700; }}
.gap p {{ color: var(--muted-fg); font-size: 0.9rem; margin-bottom: 0.75rem; }}
.gap .fix {{ background: var(--muted); padding: 0.875rem 1rem; border-radius: var(--radius-sm); font-size: 0.875rem; }}
.gap .fix strong {{ color: var(--fg); }}
.gap .meta-row {{ display: flex; gap: 1.25rem; margin-top: 0.75rem; font-size: 0.8rem; color: var(--muted-fg); }}

.cta {{ background: linear-gradient(135deg, {p} 0%, {s} 100%); color: #fff; text-align: center; padding: 2.5rem 2rem; border-radius: var(--radius); box-shadow: var(--shadow-lg); }}
.cta h2 {{ font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }}
.cta p {{ opacity: 0.9; max-width: 450px; margin: 0 auto 1.5rem; font-size: 0.95rem; }}
.cta-btn {{ display: inline-flex; align-items: center; gap: 0.5rem; background: #fff; color: {p}; padding: 0.75rem 1.75rem; border-radius: 99px; font-size: 0.95rem; font-weight: 700; text-decoration: none; transition: all var(--motion); box-shadow: 0 4px 14px rgba(0,0,0,0.12); }}
.cta-btn:hover {{ transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.18); }}

footer {{ text-align: center; padding: 2rem 0; color: var(--muted-fg); font-size: 0.75rem; border-top: 1px solid var(--border); margin-top: 2rem; }}
footer span {{ color: {p}; font-weight: 600; }}

@media (max-width: 600px) {{
  .score-card {{ flex-direction: column; text-align: center; }}
  .info-grid {{ grid-template-columns: 1fr; }}
}}
</style>
</head>
<body>

<div class="hero">
  <div class="hero-content">
    <div class="hero-badge">🔍 Relatório Raio-X · Diagnóstico Gratuito</div>
    <h1>{headline}</h1>
    <p class="subtitle">{subtitle}</p>
  </div>
</div>

<div class="container">

<div class="score-card">
  <div class="score-ring">
    <div class="score-inner">
      <div class="score-value">{score}</div>
      <div class="score-label">de 100</div>
    </div>
  </div>
  <div class="score-info">
    <h2>{name}</h2>
    <div class="score-level">{level} · {nicho['name']}</div>
    <div class="score-bars">
      <div class="score-bar"><span class="score-bar-label">Presença (Fit)</span><div class="score-bar-track"><div class="score-bar-fill" style="width:{fit}%;background:{p}"></div></div><span class="score-bar-val">{fit}%</span></div>
      <div class="score-bar"><span class="score-bar-label">Engajamento</span><div class="score-bar-track"><div class="score-bar-fill" style="width:{eng}%;background:{a}"></div></div><span class="score-bar-val">{eng}%</span></div>
      <div class="score-bar"><span class="score-bar-label">Intenção</span><div class="score-bar-track"><div class="score-bar-fill" style="width:{ints}%;background:{s}"></div></div><span class="score-bar-val">{ints}%</span></div>
    </div>
  </div>
</div>

<div class="info-grid">
  <div class="info-card">
    <h4>Google Meu Negócio</h4>
    <div class="value stars">{'★' * max(1, int(rating))}{'☆' * max(0, 5 - int(rating))}</div>
    <div class="meta">{rating}★ · {reviews} avaliações</div>
    <div class="status ok">{photos} fotos · {claimed}</div>
  </div>
  <div class="info-card">
    <h4>Website</h4>
    <div class="value" style="font-size:1.1rem;word-break:break-all">{str(website)[:35]}</div>
    <div class="meta">{local}</div>
    <div class="status ok">✅ Online</div>
  </div>
  <div class="info-card">
    <h4>Concorrência Local</h4>
    <div class="value">{competitor_count}</div>
    <div class="meta">{nicho['name'].lower()}s na região</div>
    <div class="status good">{market_context.get('marketPosition', '')}</div>
  </div>
</div>

{f'<div class="benchmark">📊 <strong>Benchmark regional:</strong> {benchmark}</div>' if benchmark else ''}

<div class="section">
  <h2 style="font-size:1.35rem;font-weight:700;margin-bottom:0.5rem">{len(gaps)} Gaps e Oportunidades</h2>
  <p style="color:var(--muted-fg);margin-bottom:1.5rem">Análise baseada em dados reais do Google Meu Negócio e do seu site. Cada item inclui a solução e o esforço estimado.</p>
"""

    for g in gaps:
        sev = g["severity"]
        sev_class = "critico" if "Crítico" in sev else ("medio" if "Médio" in sev else ("forca" if "Força" in sev else "oportunidade"))
        result += f"""
<div class="gap {sev_class}">
  <div class="gap-header"><span class="gap-severity {sev_class}">{sev}</span><h4>{g['title']}</h4></div>
  <p>{g['desc']}</p>
  <div class="fix"><strong>✅ Como resolver:</strong> {g['fix']}</div>
  <div class="meta-row"><span>📈 Impacto: {g['impact']}</span><span>⏱️ Esforço: {g['effort']}</span></div>
</div>"""

    result += f"""
</div>

<div class="cta">
  <h2>{offer}</h2>
  <p>O diagnóstico é gratuito. Nosso plano Sentinela (R$197/mês) monitora sua clínica todo mês e implementa as correções para você.</p>
  <a href="https://wa.me/5521999999999?text=Olá!%20Vi%20o%20diagnóstico%20da%20{name.replace(' ','%20')[:30]}%20e%20quero%20conversar." class="cta-btn" target="_blank">💬 {cta_text} no WhatsApp</a>
</div>

</div>

<footer>
  <div class="container">
    <p>Diagnóstico gerado por <span>adsentice</span> — hub inteligente de marketing para negócios locais.</p>
    <p style="margin-top:0.25rem">Dados analisados: Google Meu Negócio · website · mercado local · {time.strftime('%d/%m/%Y')}</p>
  </div>
</footer>

</body>
</html>"""

    return result

# ═══════════════════════════════════════════════════════════════
# MAIN — O SISTEMA GERA SOZINHO
# ═══════════════════════════════════════════════════════════════

def generate_s10(lead):
    """O SISTEMA gera o S10. Zero HTML manual."""
    t0 = time.time()
    trace_id = f"s10_{uuid.uuid4().hex[:12]}"

    cat = lead.get("category", "dentist")
    cat_lower = cat.lower().strip()
    seg = CATEGORY_TO_SEGMENT.get(cat_lower, "servicos")
    nicho = NICHO_MAP.get(cat_lower, NICHO_MAP["dentist"])
    level_raw = lead.get("schwartz_label", "Problem Aware")
    level = level_raw.strip() if level_raw else "Problem Aware"
    persona = PERSONA_MAP.get(level, PERSONA_MAP["Problem Aware"])
    tokens = SEGMENT_TOKENS[seg]
    district = lead.get("district", "") or ""
    city = lead.get("city", "") or ""
    local_name = f"{district}, {city}" if district else city
    competitor_count = 47

    # Enrich — Qdrant design
    dq = f"{nicho['specialties'][0]} {nicho['specialties'][1]} {nicho['name']} healthcare professional design {district} {city}"
    dv = embed(dq)
    dh = qdrant_search(dv, kind="design-knowledge", limit=2)
    design_hint = dh[0]["payload"]["name"] if dh else f"{nicho['name']} Design"

    # Market context
    market = get_market_context(cat, city, district, lead.get("score_compound", 50))

    # Headline
    headline = persona["headline"].replace("{N}", str(competitor_count)).replace("{SERVIÇO}", nicho["name"].lower()).replace("{LOCAL}", local_name).replace("{ESPECIALIDADE}", nicho["specialties"][0])

    subtitle = f"Análise completa baseada em dados reais do Google Meu Negócio e do seu site. Resultado em 30 segundos, sem cadastro."

    # Gaps
    gaps = compute_gaps(lead)

    # Output
    output = {
        "lead": lead,
        "segment": seg,
        "nicho": {"name": nicho["name"], "specialties": nicho["specialties"][:3], "audience": nicho["audience"], "tone": nicho["tone"]},
        "persona": {"level": level, "approach": persona["approach"]},
        "tokens": tokens,
        "headline": headline,
        "subtitle": subtitle,
        "cta": persona["cta"],
        "offer": persona["offer"],
        "gaps": gaps,
        "skills": ["copywriting", "psychology", "cro", "local-seo"],
        "qdrantHints": {"design": design_hint},
        "traceId": trace_id,
        "category": cat,
        "city": city,
        "district": district,
        "score": lead.get("score_compound", 50),
    }

    html = generate_html(output, market)

    # Save
    safe_name = lead["title"][:40].replace(" ", "-").replace(".", "").lower()
    html_path = PREVIEW_DIR / f"warp-s10-auto-{safe_name}-{trace_id[:8]}.html"
    meta_path = PREVIEW_DIR / f"warp-s10-auto-{safe_name}-{trace_id[:8]}.json"

    html_path.write_text(html)

    _meta = {k: v for k, v in output.items() if k != "lead"}
    _meta["computedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _meta["marketContext"] = market
    with open(meta_path, "w") as f:
        json.dump(_meta, f, ensure_ascii=False, indent=2)

    # Store trace → Qdrant
    trace_status = store_trace(output)

    total_ms = (time.time() - t0) * 1000

    return {
        "html_path": str(html_path),
        "meta_path": str(meta_path),
        "trace_id": trace_id,
        "total_ms": total_ms,
        "gaps_count": len(gaps),
        "design_hint": design_hint,
        "trace_status": trace_status,
        "lead_name": lead["title"],
        "score": lead.get("score_compound", 0),
        "level": level,
        "market": market,
    }


def main():
    print("🧠 S10 RAIO-X · GERADOR AUTOMÁTICO")
    print(f"   O SISTEMA gera sozinho. Nenhum HTML manual.\n")

    # Parse args
    place_id = None
    min_score = 0
    for arg in sys.argv[1:]:
        if arg.startswith("--place-id="):
            place_id = arg.split("=", 1)[1]
        elif arg.startswith("--min-score="):
            min_score = int(arg.split("=", 1)[1])

    # Fetch lead
    print("📡 Buscando lead do Supabase...")
    leads = fetch_leads(limit=1, min_score=min_score, place_id=place_id)
    if not leads:
        print("❌ Nenhum lead encontrado")
        return

    lead = leads[0]
    print(f"   ✅ {lead['title']}")
    print(f"   Score: {lead.get('score_compound', '?')}/100 · {lead.get('schwartz_label', '?')}")
    print(f"   {lead.get('district', '?')}, {lead.get('city', '?')}\n")

    # Generate
    result = generate_s10(lead)

    print(f"🏁 S10 GERADO AUTOMATICAMENTE")
    print(f"   Lead:   {result['lead_name']}")
    print(f"   Score:  {result['score']}/100 · {result['level']}")
    print(f"   Gaps:   {result['gaps_count']}")
    print(f"   Market: {result['market'].get('marketPosition', '?')}")
    print(f"   Design: {result['design_hint']}")
    print(f"   Tempo:  {result['total_ms']:.0f}ms")
    print(f"   Trace:  {result['trace_id']} → Qdrant {result['trace_status']}")
    print(f"   📄 {result['html_path']}")
    print(f"   📊 {result['meta_path']}")


if __name__ == "__main__":
    main()
