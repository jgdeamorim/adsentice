#!/usr/bin/env python3
"""
adsentice_corey_ingest.py — INGESTÃO DAS 4 SKILLS ESTRUTURAIS DE COREY HAINES
═══════════════════════════════════════════════════════════════════════════════
Corey Haines tem 47 skills — o realjaymes tem 28. As diferenças críticas:

1. product-marketing — FOUNDATION CONTEXT que toda skill lê primeiro.
   → adsentice: É o Brand IQ como shared state AG-UI. 12 seções documentadas.

2. prospecting — 3 branches (SaaS/B2B/Local SMB), 5 fases, scoring rubric.
   → adsentice: Stage 1-2 do funil (discovery + pre-filtro).

3. revops — 7 estágios de lifecycle, MQL dual-dimension, routing, SLAs.
   → adsentice: Stage 3-6 do funil (lead scoring + CRM routing).

4. churn-prevention — voluntary+involuntary, cancel flow, health score, dunning.
   → adsentice: Stage 7 do funil (retenção + métricas de churn).

Ingerindo como vec() no Qdrant :6352 para o adsentice ter conhecimento
de OPERAÇÃO REAL de agência — não só estratégia, mas EXECUÇÃO.
"""

import json, os, time, uuid
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG = "adsentice"

def embed(texts):
    req = Request(EMBED_URL, data=json.dumps({"texts": texts}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=30).read())["vectors"]

def upsert(points):
    body = json.dumps({"points": points}).encode()
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                  data=body, headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=30).read()).get("status", "error")

FRAMEWORKS = [
    # ═══ 1. PRODUCT-MARKETING FOUNDATION ═══
    {
        "source": "corey-haines-marketing",
        "kind": "foundation",
        "framework": "product_marketing_context",
        "title": "Product-Marketing Context — Foundation Skill (12 seções)",
        "text": "FOUNDATION SKILL: Cria .agents/product-marketing.md como fonte única de verdade. TODA outra skill lê este arquivo primeiro. 12 seções: 1) Product Overview (one-liner, categoria, pricing) 2) Target Audience (company profiles, decision-makers, JTBD) 3) Personas B2B (User, Champion, Decision Maker, Financial Buyer, Technical Influencer) 4) Problems & Pain Points (core challenge, why alternatives fail, costs, emotional tension) 5) Competitive Landscape (direct/secondary/indirect + shortcomings) 6) Differentiation (key differentiators, why better) 7) Objections & Anti-Personas (top objections + responses, non-fit profiles) 8) Switching Dynamics (JTBD Four Forces: Push, Pull, Habit, Anxiety) 9) Customer Language (verbatim quotes, prescribed/prohibited vocabulary, glossary) 10) Brand Voice (tone, style, personality) 11) Proof Points (metrics, logos, testimonials) 12) Goals (primary business goal, key conversion action, current metrics). PRINCÍPIO: specificity over generality, exact customer language over polished marketing-speak. ANTI-PERSONA define explicitamente quem NÃO é cliente.",
    },
    {
        "source": "corey-haines-marketing",
        "kind": "foundation",
        "framework": "foundation_pattern",
        "title": "Foundation Pattern — Como o adsentice aplica",
        "text": "O product-marketing.md do Corey Haines é o EQUIVALENTE EXATO do Brand IQ do adsentice. A diferença: Corey pede pro founder PREENCHER manualmente. O adsentice DESCOBRE automaticamente via DataForSEO (GMB, site crawl, reviews, competitors). Aplicação adsentice: 1) Brand IQ como shared state AG-UI (StateSnapshot) 2) Toda pipeline lê Brand IQ antes de executar (L2 gate) 3) Anti-Persona = ANTI-ICP filter (Stage 2) 4) Customer Language = extraído das reviews (DataForSEO business.reviews) 5) Competitive Landscape = domain.competitors + keyword_gap (DataForSEO) 6) Proof Points = métricas reais do diagnóstico (não inventadas). ARQUITETURA: Brand IQ é o product-marketing.md do adsentice — escrito automaticamente, atualizado a cada diagnóstico, consumido por todos os pipelines.",
    },

    # ═══ 2. PROSPECTING ═══
    {
        "source": "corey-haines-marketing",
        "kind": "execution",
        "framework": "prospecting_3branch",
        "title": "Prospecting — 3 Branches (SaaS / B2B / Local SMB)",
        "text": "Sistema de prospecção em 3 branches: SAAS: ICP fit + tech stack + growth signals (funding, hiring). Fontes: LinkedIn, BuiltWith, Crunchbase, Apollo, Clay, Clearbit, ProductHunt. B2B: industry + size + geography + buying signals (trigger events, vendor changes). Fontes: Apollo, ZoomInfo, Clay, Clearbit, LinkedIn Sales Nav. LOCAL SMB: active business + website + proximity + decision-maker access. Fontes: Google Maps, Yelp, directories, Facebook. 5 fases: 1) Define ICP (5 dimensões: firmographic, technographic, buying signal, decision-maker, disqualifiers) 2) Build Candidate List (2-3x target count, cross-verify 2-3 sources) 3) Qualify (evidence-based, confidence High/Medium/Low) 4) Score (Hot/Warm/Cold/Skip, target 20%/30%/50% split) 5) Output Lead Sheet (markdown table ou CSV). COMPLIANCE: 6 regras (sem scraping, sem bypass CAPTCHA, só contatos públicos, GDPR/CAN-SPAM, sem revenda, self-rate-limit). SPEED-TO-LEAD: contato <5min = 21x mais qualificação.",
    },
    {
        "source": "corey-haines-marketing",
        "kind": "execution",
        "framework": "local_smb_prospecting",
        "title": "Local SMB Prospecting — Google Maps + Firecrawl",
        "text": "Prospecção Local SMB (o branch que o adsentice usa): DISCOVERY: Google Maps search(categoria, área) → cross-check Yelp + website + social pages. QUALIFICAÇÃO: active business status + website presente + decision-maker acessível + proximidade geográfica. OUTPUT TABLE (15 leads): Score | Business | Category | Area | Website | Social | Phone | Why Prospect | Confidence. SOURCES: Google Maps (primary), Yelp, Facebook Business, Instagram, website próprio. COMPLIANCE: browser como assisted research tool (não scraper), só informação pública, sem bypass de CAPTCHA, source URL + date capturado. PRINCÍPIO: 25 verified leads beats 250 mostly-junk ones. Target 15 Local SMB leads por batch.",
    },

    # ═══ 3. REVOPS ═══
    {
        "source": "corey-haines-marketing",
        "kind": "execution",
        "framework": "revops_lead_lifecycle",
        "title": "RevOps — Lead Lifecycle 7 Stages + MQL Dual-Dimension",
        "text": "Lead Lifecycle em 7 estágios: SUBSCRIBER (opt-in content) → LEAD (identified contact, basic info) → MQL (Marketing Qualified: fit score + engagement score AMBOS necessários. Perfect-fit que não engaja NÃO é MQL. Estudante baixando conteúdo NÃO é MQL.) → SQL (Sales Qualified: Sales aceita e qualifica via conversa, BANT confirmado) → OPPORTUNITY (Budget+Authority+Need+Timeline) → CUSTOMER (closed-won, expansion/renewal/churn paths) → EVANGELIST (high NPS, referral, case study). HANDOFF SLA: MQL→SQL em <48h, first contact <4 business hours, rejection com reason code. SPEED-TO-LEAD: <5min = 21x qualificação. Após 30min conversão cai 10x. >24h = lead frio.",
    },
    {
        "source": "corey-haines-marketing",
        "kind": "execution",
        "framework": "revops_scoring_routing",
        "title": "RevOps — Lead Scoring 3D + Routing 4 Methods",
        "text": "Lead Scoring em 3 dimensões: EXPLICIT (FIT): company size, industry, revenue, title, seniority, tech stack, geography. IMPLICIT (ENGAGEMENT): pricing page visits, demo requests, content downloads, email opens/clicks, product usage. NEGATIVE: competitor emails, student/personal emails, unsubscribes, intern titles. MQL threshold: 50-80 pontos em escala 100. Recalibrar trimestralmente. 4 ROUTING METHODS: Round-robin (equal reps), Territory (geo/vertical), Account-based (named accounts→named reps), Skill-based (complexity/language). Fallback sempre. Round-robin considera PTO + quota. AUDIT: log toda decisão de routing. AUTOMATION: MQL alert instantâneo, task auto-create, SLA alert, deal stage triggers, re-engagement de dormant leads.",
    },

    # ═══ 4. CHURN PREVENTION ═══
    {
        "source": "corey-haines-marketing",
        "kind": "execution",
        "framework": "churn_cancel_flow",
        "title": "Churn Prevention — Cancel Flow 5 Steps + Save Offers",
        "text": "Cancel Flow em 5 passos: TRIGGER (clica Cancel) → SURVEY (single-question 5-8 reasons: too expensive, not using enough, missing feature, switching competitor, technical issues, temporary need, business closed, other) → DYNAMIC OFFER (matched ao motivo: desconto 20-30% por 2-3 meses, pause 1-3 meses, downgrade, feature unlock, personal outreach top 20% MRR) → CONFIRMATION (clear, sem dark patterns) → POST-CANCEL (win-back emails). PRINCÍPIOS: nunca esconder botão cancelar (FTC Click-to-Cancel), mostrar dollar savings não %, mobile-friendly, um primary offer + um fallback, LTV do save offer >30 dias.",
    },
    {
        "source": "corey-haines-marketing",
        "kind": "execution",
        "framework": "churn_health_score",
        "title": "Churn Prevention — Health Score + Dunning + Benchmarks",
        "text": "HEALTH SCORE (0-100): login frequency (0.30) + feature usage (0.25) + support sentiment (0.15) + billing health (0.15) + engagement (0.15). 80-100=Healthy (upsell), 60-79=Needs Attention (check-in), 40-59=At Risk (intervention campaign), 0-39=Critical (personal outreach). PREDITORES: login drops 50%+ (2-4 semanas antes), feature usage stops (1-3 sem), support spike then stop (1-2 sem), billing page visits (dias), data export (dias, CRÍTICO), NPS<6 (1-3 meses). DUNNING: soft decline retry 3-5x em 7-10 dias. Hard decline não retry. Email D0 friendly→D3 helpful→D7 urgency→D10 final. BENCHMARKS: voluntary save rate 25-35%, pause reactivation 60-80%, dunning recovery 50-60%, churn <5% B2C <2% B2B.",
    },

    # ═══ 5. CROSS-REFERENCE PATTERN ═══
    {
        "source": "corey-haines-marketing",
        "kind": "pattern",
        "framework": "skill_cross_reference",
        "title": "Cross-Reference Pattern — Skill Ecosystem Arquitecture",
        "text": "Padrão estrutural do Corey Haines: cada skill referencia skills relacionadas explicitamente. Ex: copywriting ↔ cro ↔ ab-testing. revops ↔ sales-enablement ↔ cold-email. customer-research → copywriting, cro, competitors. product-marketing → TODAS as outras (dependência universal). Este é o PADRÃO que o adsentice deve seguir: Brand IQ como fundação. Pipelines (site_audit, seo_discovery, gmb_reputation, competitor_intel) como skills de diagnóstico. CRM (lead scoring, proposal engine, follow-up sequences) como skills de vendas. Reports (monthly report, variance report) como skills de retenção. NÃO são 150 skills isoladas — são 20 skills interconectadas que compartilham o Brand IQ como contexto universal.",
    },
]

def main():
    print("🧠 ADSENTICE · COREY HAINES INGEST (4 skills estruturais)")
    total = 0
    for i in range(0, len(FRAMEWORKS), 4):
        batch = FRAMEWORKS[i:i+4]
        vecs = embed([f["text"][:600] for f in batch])
        points = []
        for fw, vec in zip(batch, vecs):
            points.append({"id": str(uuid.uuid4()), "vector": vec, "payload": {**fw, "tag": TAG, "ts": int(time.time())}})
        upsert(points)
        total += len(points)
        print(f"  ✅ {len(points)} frameworks")

    out = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "spec", "corey-haines-frameworks.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(FRAMEWORKS, f, indent=2, ensure_ascii=False)

    print(f"\n🏁 {total} frameworks ingeridos")
    print(f"   Query: adsentice_search('prospecting local SMB maps')")
    print(f"   Query: adsentice_search('lead lifecycle MQL scoring routing')")
    print(f"   Query: adsentice_search('churn prevention cancel flow health score')")
    print(f"\n📄 {out}")

if __name__ == "__main__":
    main()
