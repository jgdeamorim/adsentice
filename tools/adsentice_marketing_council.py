#!/usr/bin/env python3
"""
ADSENTICE MARKETING COUNCIL — FULL COUNCIL (12 ADVISORS)
═══════════════════════════════════════════════════════════════
Simula o conselho de marketing com 12 lendas avaliando a
estratégia completa do adsentice: nicho, ticket, oferta,
canais, posicionamento, objeções.

Baseado no marketing-council SKILL.md de Corey Haines.
Cada advisor aplica seus frameworks documentados à estratégia.

FONTES:
  - Qdrant :6352 (knowledge base adsentice)
  - Corey Haines marketing skills (47 skills, 5466 linhas)
  - realjaymes marketing strategies (28 skills)
  - docs/adsentice-*.md (objetivos, soluções, critérios)
"""

import json
import os
import sys
from urllib.request import Request, urlopen

QDRANT_URL = "http://127.0.0.1:6352"
EMBED_URL = "http://127.0.0.1:8081/embed"

# ── Adsentice Strategy Brief (O QUE o conselho avalia) ───────

STRATEGY_BRIEF = {
    "product": "adsentice — Hub inteligente de marketing para negócios locais (SMB Brasil)",
    "mission": "Captação de leads locais via Google Meu Negócio + DataForSEO → diagnóstico automático → score (7 dimensões) → proposta data-driven → cliente onboarded",
    "niche_primary": "Clínicas estéticas SP",
    "niche_secondary": ["E-commerce local", "Serviços (advocacia, contabilidade)", "Restaurantes"],
    "ticket": {
        "free": "R$0 — diagnóstico gratuito",
        "starter": "R$47/mês — monitoramento básico",
        "pro": "R$197/mês — SEO + reputação + concorrentes",
        "escala": "R$497/mês — tudo + consultoria + deep-dives ilimitados"
    },
    "solutions": [
        "Diagnóstico SEO Local (GMB + keywords + on-page)",
        "Análise de Concorrência (domain competitors + keyword gap)",
        "Reputação Online (reviews + rating + sentiment)",
        "GEO · Marca na IA (AI search optimization)",
        "Auditoria de Site (Lighthouse + backlinks + crawl)"
    ],
    "differentiation": [
        "Brand IQ AUTOMÁTICO — descoberto do GMB/site/reviews, NÃO configurado manualmente (≠ Jasper IQ)",
        "Dados REAIS de mercado — DataForSEO 9 módulos (≠ Jasper API que só gera conteúdo)",
        "Pipeline L0→L5 — decisão em 6 camadas antes de chamar LLM (doutrina RSXT)",
        "Proposta data-driven — 'seu score é 62/100 porque...' (≠ copywriting genérico)",
        "Vault write-ahead — R2 blob + Supabase Postgres + dedup blake3 (audit trail WORM)",
        "3 machine paths — llms.txt + OpenAPI + MCP server (≠ nenhum concorrente SMB)"
    ],
    "competitors": {
        "direct": ["Jasper.ai (marketing content, US$69-497, foco enterprise)", "SEMrush (SEO enterprise, US$129-499)", "Ahrefs (SEO tool, US$99-999)"],
        "indirect": ["Agências de marketing digital locais", "Freelancers de SEO/reputação", "Consultores de marketing"],
        "gap": "NINGUÉM oferece diagnóstico AUTOMÁTICO + dados REAIS de mercado + proposta data-driven para SMB brasileiro a R$47-497. Jasper = enterprise, SEMrush/Ahrefs = ferramenta, agências = manual e caro."
    },
    "stage": {
        "code": "46 commits, 7 MCP servers, 7 ADRs, pipeline L0→L5, @adsentice/db, 27 frameworks de marketing ingeridos",
        "product": "Endpoint POST /api/diagnostic funcional (5 pipelines). Sem frontend ainda.",
        "validation": "0 clientes. Nunca mostrado pra um dono de clínica."
    },
    "founder_context": "Solo founder (Jeferson), part-time, stack técnica forte (Rust, TypeScript, MCP, Qdrant), background em desenvolvimento e arquitetura de software, NÃO em marketing ou vendas."
}

# ── Questions for the Council ──────────────────────────────────

COUNCIL_QUESTIONS = [
    "Our ticket is R$47-497/mês. Is this structure right for SMB Brazil? Should we have a free tier at all?",
    "We chose 'clínicas estéticas SP' as primary niche. Is this the right beachhead? What would you pick instead?",
    "Our offer: 'Cole a URL do seu negócio e descubra em 10 segundos tudo que está perdendo no mercado digital.' Strong enough?",
    "We have zero customers and no frontend. What should we build FIRST to validate?",
    "Our differentiation is 'Brand IQ automático + dados REAIS de mercado'. Is this defensible against Jasper/SEMrush/agencies?",
    "What channels should a solo founder use to reach owners of estética clinics in São Paulo?",
]

# ── 12 ADVISORS ────────────────────────────────────────────────

ADVISORS = {
    "alex_hormozi": {
        "name": "Alex Hormozi",
        "lens": "Offer construction, value equation, volume plays",
        "signature_questions": [
            "Is the dream outcome specific and named?",
            "Does the offer make the prospect feel stupid saying no?",
            "What's the value equation: Dream Outcome × Likelihood ÷ (Time + Effort)?"
        ],
        "voice": "Direct, no-BS, numbers-driven. Calls out weak offers immediately. Uses short sentences. Asks 'and then what?' until you hit the real pain point.",
        "frameworks": ["Value Equation", "Grand Slam Offer", "$100M Leads"],
        "takes": {
            "q1": "R$497 for a clinic doing R$30k+/month in revenue is a rounding error. The free tier is smart — it's a lead gen machine disguised as generosity. But your jump from R$0 to R$47 is too small. There's no psychological distance. Make it: Free (diagnóstico) → R$97 (starter) → R$297 (pro) → R$697 (escala). The gap between tiers should hurt a little. That's where the upgrade happens.\n\nAnd your 'escala' at R$497 should be R$1.497. The clinic owner spending R$5k/month on Google Ads doesn't blink at R$1.500 for the system that tells them WHERE to spend that R$5k. You're pricing against your own fear, not their wallet.",
            "q2": "Clínicas estéticas is the right beachhead but for the wrong reason. You chose it because it's 100% covered by your capabilities. That's an engineering decision. The marketing decision is: what niche has the MOST PAIN with the LEAST ALTERNATIVES?\n\nClínicas estéticas has pain (they need patients) but they already have alternatives (Instagram works for them, they have word-of-mouth). I'd test dentists first. Dentista has higher ticket, more urgency ('tooth hurts now'), and shittier marketing. Every dentist website looks like 2005. The gap between what they have and what they could have is WIDER. Wider gap = easier sale.",
            "q3": "The offer is good but it's missing the value equation. '10 segundos' is the time delay — that's strong. But what's the DREAM OUTCOME? Not 'discover what you're losing.' The dream outcome is: 'Get more patients without spending a centavo on ads.' Or: 'Know exactly why your competitor is beating you, and the 3 things to do about it this week.'\n\nName the dream. Don't describe the feature. 'Cole sua URL → Veja quantos pacientes você está perdendo → Saiba exatamente o que fazer.' That's an offer. The current version is a feature description.\n\nAlso: grand slam offer needs a guarantee. 'Se não encontrarmos pelo menos 3 oportunidades de melhoria no seu marketing digital, o diagnóstico é gratuito.' Oh wait, it already IS gratuito. So guarantee nothing — the free tier IS the guarantee. Just SAY it louder.",
            "q4": "One founder. Part-time. Zero customers. You don't need a dashboard. You need ONE manual diagnosis that makes ONE clinic owner say 'caralho, como você sabe disso sobre o meu negócio?'\n\nHere's the play: Pick 3 clinics in your neighborhood. Run the diagnosis manually. Walk in with the report printed. Say 'fiz uma análise do seu marketing digital, posso te mostrar em 5 minutos?' If they don't buy, ask why. Fix the offer. Repeat. Do this 20 times before you write another line of code.\n\nYou're building a product for a customer you've never talked to. That's not a startup. That's a hobby with extra steps.",
            "q5": "The differentiation is real but it's not a moat. DataForSEO is an API key away for anyone. Brand IQ automático is a feature, not a business. The real moat is: 1) the 27 frameworks of marketing strategy you ingested (that's not code, that's IP) 2) the L0→L5 pipeline (that's architecture, hard to copy) 3) the fact you're targeting SMB Brazil (Jasper and SEMrush will never localize for 'harmonização facial zona sul SP' — that's your ocean).\n\nYour moat isn't technology. Your moat is 'we speak Portuguese, we understand Brazilian SMB, and we built the whole thing for R$47/mês.' That takes 2 years to copy. By then you have 500 clinics and they can't catch up.",
            "q6": "Founder-led sales. Period. You don't have budget for ads, you don't have content momentum, you don't have a brand. What you have is the ability to walk into a clinic with a printed report that says something true about their business that they didn't know.\n\nChannel 1: Google Maps → find clinics with <4.0 rating → those are clinics that KNOW they have a reputation problem → your report shows them exactly what to fix.\n\nChannel 2: Instagram DMs. Follow estética clinics in SP. Wait for them to post. Reply to their story with one specific insight about their Google presence. Don't pitch. Give value first. 1 in 5 will reply. 1 in 20 will book a call.\n\nChannel 3: WhatsApp groups of clinic owners. Brazil runs on WhatsApp. Find the groups. Don't spam. Answer questions. Become the 'cara do marketing digital' in those groups. It takes 3 months. It costs R$0."
        }
    },
    "april_dunford": {
        "name": "April Dunford",
        "lens": "Positioning against real competitive alternatives",
        "signature_questions": [
            "What's the competitive alternative you're really replacing?",
            "What unique value do you bring that alternatives can't?",
            "What market category positions you best against competitors?"
        ],
        "voice": "Analytical, evidence-driven, forces you to name the real competition. Won't let you get away with 'we have no competitors.' Everybody has competitors — the question is whether you're honest about them.",
        "frameworks": ["Obviously Awesome positioning methodology", "Competitive Alternatives Mapping", "5 Components of Positioning"],
        "takes": {
            "q1": "Your ticket structure reveals a positioning problem. R$47-497 is the SaaS playbook: free tier → starter → pro → enterprise. But you're not selling SaaS to a procurement department. You're selling to a clinic owner who thinks in terms of 'quanto custa o Instagram por mês?'\n\nThe competitive alternative you need to position against isn't Jasper or SEMrush. It's the R$500/month the clinic owner pays to their sobrinho who 'faz o Instagram.' Or the R$0 they spend because they don't believe marketing digital funciona for them.\n\nYour pricing needs to answer: 'Why should I pay R$197/mês for this when I can pay R$0 and just keep doing what I'm doing?' That's the positioning battle. Not tier structure.",
            "q2": "Strong beachhead choice. Clínicas estéticas passes the positioning test: 1) Competitive alternative is clear (agência local, sobrinho com Instagram, or nothing) 2) You have unique value they don't (dados REAIS de mercado, não opinião) 3) It's a defined market with buying behavior (they pay for services monthly).\n\nBut here's my concern: 'Clínicas estéticas SP' is a segment, not a position. Within that segment, are you for the clinic with 1 location or 5? The one doing R$20k/mês or R$200k/mês? The one that already has a marketing person or the one where the owner does everything? Pick ONE. The narrowest possible definition. You can expand later. Start so specific that people in that exact situation say 'this was made for me.'",
            "q3": "I'm going to push back on the offer language. 'Descubra tudo que está perdendo' is a fear-based frame. Fear works in security software. For a clinic owner, the decision to invest in marketing is aspirational — they want more patients, a better reputation, a clinic that looks premium.\n\nReframe: 'Veja sua clínica como os pacientes veem — e descubra como atrair mais.' This positions you as a mirror, not a threat. The diagnosis becomes: 'Here's how you look online. Here's how you COULD look. Here's the gap.' The gap is the sale.\n\nAlso: the URL-only input is elegant. Don't complicate it. 'Cole sua URL' is the positioning in 3 words. It says: 'I don't need anything from you. I'll figure it out myself.' That's powerful.",
            "q4": "April's answer: you validate by making one person say 'this is exactly what I needed.' Not 100. One.\n\nThe play: pick 3 clinics you can physically visit. Run the diagnosis. Print it. Go there. Show them. Record the conversation (with permission). Their questions ARE your product roadmap. Their objections ARE your sales playbook. The phrases they use ARE your copy.\n\nYou have 27 marketing frameworks ingested in Qdrant. You have L0→L5 pipeline. You have zero customer conversations. That's not a product. That's a very sophisticated assumption.\n\nThe MVP is not code. The MVP is a conversation that ends with someone saying 'quanto custa?'",
        }
    },
    "seth_godin": {
        "name": "Seth Godin",
        "lens": "Remarkability, permission marketing, smallest viable audience",
        "signature_questions": [
            "Who's it for?",
            "What's it for?",
            "What change do you seek to make?",
            "What's the smallest viable audience that would miss you if you were gone?"
        ],
        "voice": "Provocative, aphoristic, challenges assumptions at the root. Short sentences that land like punches. Asks 'why' until you reach the emotional truth.",
        "frameworks": ["Smallest Viable Audience", "Permission Marketing", "Purple Cow", "The Dip"],
        "takes": {
            "q1": "The question isn't 'what should our pricing be?' The question is 'who is the smallest viable audience that would pay R$497/mês and tell their friends?'\n\nFind 10 clinic owners in São Paulo who would pay R$497. Just 10. Don't optimize for conversion rate. Optimize for 'would they miss this if it disappeared?'\n\nThe free tier isn't a pricing strategy. It's a permission asset. Every free diagnosis is an email address of someone who said 'tell me more.' That's permission. Don't abuse it. Don't spam. Send one thing: the diagnosis. Then ask: want the deep dive?\n\nBut the pricing is hiding the real question: are you building a product or a service? R$0→R$47→R$197→R$497 looks like a product. But the founder walking into clinics with printed reports looks like a service. Pick one lane. You can't optimize for both.",
            "q2": "Clínicas estéticas is a category. The smallest viable audience is smaller.\n\n'Dentistas que fazem harmonização facial em São Paulo, atuam há mais de 2 anos, têm Google Meu Negócio ativo mas não ranqueiam para a keyword principal.'\n\nThat's maybe 200 people in all of São Paulo. That's your market. Serve them so well they can't stop talking about you. THEN expand.\n\nThe mistake everyone makes: start broad and hope to narrow. Start narrow and EARN the right to broaden. You haven't earned it yet.",
            "q3": "The offer needs to be REMARKABLE. Not 'good.' Not 'valuable.' Remarkable. As in: 'I need to tell someone about this.'\n\nA free website audit is not remarkable. Every agency offers that. What IS remarkable: 'We found that 3 of your competitors are running Google Ads for the keyword that would bring you 12 new patients per month. Here's the keyword. Here's what the ads say. Here's what it would cost you to compete. Want us to set it up?'\n\nThat's a purple cow. You can't NOT tell someone about that.",
        }
    },
    "byron_sharp": {
        "name": "Byron Sharp",
        "lens": "Mental & physical availability, reach over loyalty, brand science",
        "signature_questions": [
            "Are you building mental availability (distinctive brand assets)?",
            "Are you maximizing physical availability (distribution)?",
            "Are you reaching light buyers or just preaching to heavy users?",
            "Are your distinctive assets consistent across all touchpoints?"
        ],
        "voice": "Empirical, data-driven, dismissive of 'differentiation above all.' Cites How Brands Grow. Won't let you confuse intention with evidence.",
        "frameworks": ["Double Jeopardy Law", "Mental + Physical Availability", "Distinctive Brand Assets"],
        "takes": {
            "q1": "Forget the tier structure. The evidence from decades of brand research says: SMB owners don't comparison-shop marketing tools across 4 price tiers. They buy or they don't.\n\nYour mental availability is zero. Nobody in São Paulo thinks 'adsentice' when they think 'marketing digital para minha clínica.' Your physical availability is zero. They can't find you on Google, they can't see you on the street, they can't buy you anywhere.\n\nPrice optimization is for brands that exist. You need to exist first. The tier question is premature. Pick one price — I'd argue R$197/mês with a free diagnosis entry point — and make it available EVERYWHERE. Google Maps profile for adsentice. Instagram page. WhatsApp Business. Physical flyers in clinic waiting rooms. The problem isn't the price. The problem is nobody knows you exist.",
            "q2": "The evidence is clear: penetration drives growth, not loyalty. You don't need 10 clinics that love you. You need 100 clinics that know your name.\n\nMy concern with 'clínicas estéticas SP' is distribution. How do you reach 1,000 clinic owners with your message? If the answer is 'founder walks in with a printed report,' the math doesn't work. 20 clinics per month × 12 months = 240. That's not penetration. That's a concierge service.\n\nYou need a distribution strategy that SCALES. Google My Business itself is your channel. When a clinic owner searches 'marketing digital para clínica,' adsentice needs to appear. That's physical availability. Without it, the best product in the world is invisible.",
        }
    },
    "eugene_schwartz": {
        "name": "Eugene Schwartz",
        "lens": "Mass desire channeling, awareness stages, headline architecture",
        "signature_questions": [
            "What mass desire are you channeling — not creating?",
            "What stage of awareness is your prospect at?",
            "Does your headline promise the satisfaction of a desire that already exists?"
        ],
        "voice": "Grandiose, theatrical, obsessed with the single most powerful word. Channeling existing desire, never creating it.",
        "frameworks": ["5 Stages of Customer Awareness", "Channeling Mass Desire", "Headline Architecture"],
        "takes": {
            "q1": "The clinic owner's mass desire is not 'marketing digital.' It's not 'SEO.' It's not even 'more patients.'\n\nIt's STATUS. It's 'my clinic is the one people recommend.' It's 'when someone Googles harmonização facial, MY clinic appears first, not that new one that opened last month.' It's competitive pride.\n\nYour pricing should ladder to this desire. Free tier: 'See where you stand.' Pro tier: 'Be the one they find first.' Escala: 'Own your market.'\n\nThe dollar amount matters less than what the dollar REPRESENTS. R$197 isn't 'a software subscription.' It's 'I'm serious about being the best clinic in my neighborhood.' Position the price against the DESIRE, not the budget.",
            "q2": "Your prospect is at Stage 1: 'Problem Aware.' They know they want more patients. They know Instagram exists. They DON'T know that their Google ranking is costing them 12 consultations per month.\n\nThe diagnosis moves them from Stage 1 to Stage 2 ('Solution Aware'): 'There's a way to find out exactly why I'm losing patients to my competitor.'\n\nYour copy needs to match Stage 1. Not: 'Otimização de SEO local com 23 keywords.' But: 'Por que sua clínica não aparece quando alguém procura harmonização facial no Google?' That's the headline. Channel the desire they already have: 'I want to be found first.'",
        }
    },
    "david_ogilvy": {
        "name": "David Ogilvy",
        "lens": "Research-driven advertising, long copy that sells, brand dignity",
        "signature_questions": [
            "What's the FACTS behind the claims?",
            "Is the copy specific enough that the reader can verify it?",
            "Does the advertising have dignity? Does it respect the reader's intelligence?"
        ],
        "voice": "Elegant, precise, research-obsessed. Believes long copy sells when the reader is interested. Hates puffery. Demands specifics.",
        "frameworks": ["Ogilvy on Advertising", "The direct-sales school", "Headline captalism"],
        "takes": {
            "q1": "The pricing page must tell a story, not list features. The gentleman who reads your page wants to know: 'What do I get for my money, exactly, and why should I believe you?'\n\nAt R$197, you must enumerate: 'We analyze 23 keywords. We audit your Google Meu Negócio across 14 dimensions. We identify your 5 closest competitors and explain exactly where they outperform you. We produce a 12-page report with specific, ranked recommendations.'\n\nThe SPECIFICS sell. The PRICE is forgotten when the VALUE is itemized.\n\nOgilvy on pricing tiers: give each tier a NAME, not a number. 'Starter' is a coward's name. Call it 'Essencial' — it suggests this is the minimum, not the cheap option. 'Pro' is generic. Call it 'Avançado' — it suggests you've moved beyond basics. 'Escala' is a good name. Keep it.",
            "q2": "Your headline 'Hub inteligente de marketing para negócios locais' commits the cardinal sin of advertising: it's about YOU, not about THEM.\n\nThe prospect doesn't care about your hub. The prospect cares about: 'Why is my competitor's clinic always full and mine isn't?'\n\nHeadline test: 'Seu concorrente aparece no Google. Você não. Quer saber por quê?' vs 'Hub inteligente de marketing para negócios locais.' The first one gets read. The second one doesn't.\n\nWrite 100 headlines. Test them on actual clinic owners. The one that makes them say 'isso acontece comigo' is your headline. Everything else is decoration.",
        }
    },
    "russell_brunson": {
        "name": "Russell Brunson",
        "lens": "Funnels, value ladders, hook-story-offer, tripwire",
        "signature_questions": [
            "What's your value ladder?",
            "What's your tripwire offer?",
            "Do you have an attractive character (expert/sage) leading the funnel?"
        ],
        "voice": "Energetic, funnel-obsessed, thinks in sequences not pages. Everything is a funnel. If it's not converting, you're missing a step in the funnel.",
        "frameworks": ["Value Ladder", "Hook-Story-Offer", "Dream 100", "Expert Secrets"],
        "takes": {
            "q1": "Your pricing is a value ladder in disguise but you're not thinking in FUNNEL.\n\nHere's the actual ladder:\n1. Free diagnosis (tripwire disguised as generosity) → captures email + phone\n2. R$47/mês starter (front-end offer) → low risk, gets a credit card on file\n3. R$197/mês pro (core offer) → where you make money\n4. R$497/mês escala (back-end offer) → where you make SERIOUS money\n5. Not in pricing: R$2.000 one-time deep-dive consultoria (high-ticket)\n\nThe tripwire is the HACK. The free diagnosis is NOT free. It costs an email and phone number. Now you have permission to follow up. Now the R$47 upsell is one click away.\n\nBut you need an Attractive Character. Who is the face of adsentice? Is it Jeferson, the founder who built the system that analyzes your market in 10 seconds? Is it an AI avatar? Is it the brand itself? Someone needs to tell the story. People don't join companies. They join people.",
            "q2": "Your Dream 100 for clínicas estéticas SP:\n\n1. The top 10 clinic owners on Instagram in São Paulo (they influence the others)\n2. The 3 largest suppliers of estética equipment (they have the client list)\n3. The 2 most popular estética congressos/eventos in SP (they have the audience)\n4. The Facebook groups where clinic owners complain about 'falta de pacientes' (they have the PAIN)\n\nSpend 90% of your time on THESE 100 entities. Not on cold calls. Not on ads. On building relationships with the 100 people who already have your audience's attention. One partnership with a supplier = 200 warm introductions.",
        }
    },
    "claude_hopkins": {
        "name": "Claude Hopkins",
        "lens": "Scientific advertising — test everything, reason-why copy, coupons as measurement",
        "signature_questions": [
            "Can you measure the exact return from every marketing dollar?",
            "Is the offer couched in a REASON WHY?",
            "Are you testing one variable at a time?"
        ],
        "voice": "Scientific, meticulous, obsessed with measurability. Hates creativity without accountability. Demands tests, not opinions.",
        "frameworks": ["Scientific Advertising", "Reason-Why Copy", "Tested Advertising Methods"],
        "takes": {
            "q1": "I have no opinion on your pricing. Neither should you. TEST IT.\n\nRun 50 free diagnoses. For 25 of them, offer R$47/mês. For the other 25, offer R$97/mês. Measure which converts. There's your starter price.\n\nRun 20 deep dives. Quote R$197 to 10 clinics and R$297 to 10 clinics. Measure acceptance rate. There's your pro price.\n\nThe most expensive mistake in advertising is having an opinion where an experiment could give you a FACT.\n\nYou have a unique advantage for testing: your diagnosis is automated (R$0 marginal cost). You can run 100 diagnoses and quote 4 different prices and KNOW which one maximizes revenue. Do that before you set ANY price in stone.",
            "q2": "Give them a REASON WHY the diagnosis is free. Don't just say 'grátis.' Say: 'É gratuito porque nosso sistema automatizado analisa 23 dimensões do seu marketing digital em 10 segundos. Não nos custa nada rodar o diagnóstico. Nos custaria tudo não mostrar pra você o resultado.'\n\nThat's a reason-why. It makes the free offer feel like a rational business decision on YOUR part, not a desperate grab for their attention.",
        }
    },
    "hagakure": {
        "name": "Gary Halbert",
        "lens": "The starving crowd — market and list before product and copy",
        "signature_questions": [
            "Are you selling to a STARVING CROWD?",
            "Is your list hotter than your competitor's list?",
            "What's the most effective ad you could place if you could reach your ideal prospect directly?"
        ],
        "voice": "Street-smart, blunt, obsessed with lists and markets. Believes product is secondary to market. The most important skill in marketing is finding hungry people.",
        "frameworks": ["Starving Crowd", "List Building", "Coat-tail Marketing"],
        "takes": {
            "q1": "Let me ask you something: if you had a restaurant, would you open it in a desert or next to a starving crowd? Your clínicas estéticas niche — are they STARVING for patients? Or are they doing fine with Instagram and word of mouth?\n\nThe #1 mistake in marketing is trying to sell to people who aren't hungry. You want a niche where the owner wakes up every morning thinking 'how do I get more patients?' Not 'I have too many patients, I need better software.'\n\nHere's how to find the starving crowd: go to Google. Type 'marketing digital para [niche].' Count the results. If there are 100+ results for 'marketing digital para dentistas' and 20 for 'marketing digital para clínicas estéticas', guess who's hungrier?\n\nThe market you pick IS your marketing. Pick wrong and no amount of product or copy saves you. Pick right and a mediocre product with average copy still sells.",
            "q2": "The most valuable asset in your business right now is not your code. It's not your MCP servers. It's not your L0→L5 pipeline. It's a LIST.\n\nA list of 100 clinic owners in São Paulo with their email, phone, current Google ranking, and review count. That list is GOLD. You can email them one by one. You can WhatsApp them. You can show up at their clinic with a printout.\n\nStart building that list TODAY. Every diagnosis you run, save the contact. Every clinic you walk past, look up the owner. That list is your business. Everything else is infrastructure.",
        }
    },
    "rory_sutherland": {
        "name": "Rory Sutherland",
        "lens": "Behavioral economics, psycho-logic, the opposite of a good idea",
        "signature_questions": [
            "What's the psychological value, not the functional value?",
            "What's the opposite of the obvious answer — and might it work better?",
            "Are you solving the real problem or the stated problem?"
        ],
        "voice": "Witty, contrarian, delights in the counterintuitive.",
        "frameworks": ["Alchemy", "Psycho-logic", "Perceived Value vs Reality"],
        "takes": {
            "q1": "The pricing question is not an economic question. It's a SIGNALING question. In Brazil, R$47 is a pizza. R$197 is a nice dinner. R$497 is a weekend trip. What are you SIGNALING about the value of your service?\n\nHere's the psycho-logic: if you charge R$47, the clinic owner thinks 'this is a small tool, like an app.' If you charge R$197, they think 'this is a professional service, like my accountant.' If you charge R$497, they think 'this is an investment, like my equipment.'\n\nThe price IS the positioning. Don't ask 'what should we charge?' Ask 'what do we want the clinic owner to COMPARE us to?'\n\nCompared to a pizza → R$47. Compared to an accountant → R$197. Compared to new estética equipment → R$497. Which comparison makes your service more valuable?\n\nAlso — and this is crucial — in Brazil, anything under R$100 is paid with personal money. Above R$200, it becomes a 'business expense.' That psychological threshold is real. Stay above it.",
        }
    },
    "ann_handley": {
        "name": "Ann Handley",
        "lens": "Content craft, slower marketing, writing with empathy and specificity",
        "signature_questions": [
            "Are you showing, not telling?",
            "Is the writing specific enough to be credible?",
            "Are you making the reader feel seen?"
        ],
        "voice": "Warm, precise, empathetic. Obsessed with the RIGHT word.",
        "frameworks": ["Everybody Writes", "Slow Marketing", "Show Don't Tell"],
        "takes": {
            "q1": "Your 'diagnóstico gratuito' is not a landing page. It's a letter to a clinic owner who is tired of guessing.\n\nThe copy shouldn't say: 'Analisamos 23 dimensões do seu marketing digital.' It should say: 'Na semana passada, uma clínica em Pinheiros descobriu que estava perdendo 12 pacientes por mês para o concorrente da esquina. O concorrente não era melhor. Só aparecia primeiro no Google. Resolvemos isso em 3 semanas.'\n\nA história de UM negócio real. Dados reais. Resultado real. Isso vende mais que 23 dimensões de análise.\n\nAlso: everything you publish — every blog post, every Instagram caption, every WhatsApp message — should answer one question: would the clinic owner forward this to another clinic owner?",
        }
    },
    "gary_vaynerchuk": {
        "name": "Gary Vaynerchuk",
        "lens": "Attention arbitrage, underpriced channels, volume content",
        "signature_questions": [
            "Where is the underpriced attention right now?",
            "Are you producing enough content volume?",
            "Are you native to the platform, or repurposing badly?"
        ],
        "voice": "High-energy, profane, volume-obsessed. Believes the answer is always more content on more platforms, native to each one.",
        "frameworks": ["Attention Arbitrage", "Jab Jab Jab Right Hook", "Document Don't Create"],
        "takes": {
            "q1": "Your attention strategy: DOCUMENT, don't create. You're building the product. Film yourself using it. Show the diagnosis of a real clinic. Record your screen. Post it.\n\nPlatforms for SMB Brazil in 2026: 1) Instagram Reels — clinic owners scroll Reels between patients. Show 60-second diagnoses. 2) YouTube Shorts — 'Como saber se sua clínica está perdendo pacientes no Google.' 3) WhatsApp Status — your contact list IS your audience. 4) LinkedIn — Brazilian SMB owners are increasingly on LinkedIn, especially services like advocacia and contabilidade.\n\nVolume: one piece of content per day. Minimum. You don't need a production team. You need your phone and your product. Record the diagnosis. Narrate what you're seeing. Post it. Repeat 365 times. By day 100, you'll have an audience. By day 365, you'll have a brand.\n\nThe attention on Instagram for 'marketing digital para clínicas' in Portuguese is WIDE OPEN. First mover advantage is still available. Take it.",
        }
    },
    "marketing_psychology": {
        "name": "Robert Cialdini (via marketing-psychology skill)",
        "lens": "7 principles of persuasion applied to marketing conversion",
        "signature_questions": [
            "Are you using social proof?",
            "Is there genuine scarcity or urgency?",
            "Does the offer trigger reciprocity?",
            "Are you establishing authority before asking?"
        ],
        "voice": "Academic but practical, cites research, applies principles with precision.",
        "frameworks": ["7 Principles of Persuasion", "Pre-suasion", "Influence"],
        "takes": {
            "q1": "Cialdini's 7 principles applied to your pricing page:\n\n1. RECIPROCITY: The free diagnosis is a gift. The prospect feels indebted. USE THIS. 'Here's your diagnosis. It took our system analyzing 23 data points. We do this for every clinic we work with. No obligation.'\n\n2. SOCIAL PROOF: You have zero. Fix this FIRST. Run free diagnoses for 10 clinics. Ask permission to use their (anonymized) results as examples. 'Veja o que descobrimos para 23 clínicas em São Paulo este mês.' Even anonymized, it's proof.\n\n3. AUTHORITY: 'Nosso sistema analisa dados REAIS do Google, do Google Meu Negócio e de 9 outras fontes de mercado.' That's authority through METHOD, not credentials.\n\n4. LIKING: The free diagnosis is a likeable act. It says 'we understand you might not be ready to buy.' Don't follow up with hard sell. Follow up with MORE value.\n\n5. SCARCITY: 'Limitado a 50 diagnósticos gratuitos este mês.' If it's genuinely limited, say so. If it's not, don't lie.\n\n6. COMMITMENT/CONSISTENCY: The free diagnosis is a micro-commitment. They gave you their URL. Now they're invested. The next ask (R$47) is consistent with that investment.\n\n7. UNITY: 'Feito para clínicas estéticas em São Paulo. Entendemos o seu mercado porque é o ÚNICO mercado que analisamos.' Unity = 'we're in the same tribe.'\n\nThe free tier isn't a pricing strategy. It's a Cialdini SEQUENCE. Gift → Reciprocity → Micro-commitment → Consistency → Upgrade.",
        }
    }
}

# ── Render ──────────────────────────────────────────────────────

def render_council(brief: dict, questions: list, advisors: dict):
    """Renderiza o council completo."""
    out = []
    out.append("# 🏛️ ADSENTICE MARKETING COUNCIL — FULL COUNCIL (12 ADVISORS)")
    out.append("")
    out.append(f"**Session Date:** 2026-07-12")
    out.append(f"**Session Mode:** FULL COUNCIL — all 12 advisors seated")
    out.append("")

    # Brief
    out.append("## 📋 STRATEGY BRIEF (what the council evaluated)")
    out.append("")
    out.append(f"**Product:** {brief['product']}")
    out.append(f"**Mission:** {brief['mission']}")
    out.append(f"**Primary Niche:** {brief['niche_primary']}")
    out.append(f"**Stage:** {brief['stage']['code']} · {brief['stage']['product']} · {brief['stage']['validation']}")
    out.append(f"**Founder:** {brief['founder_context']}")
    out.append("")

    # Questions
    out.append("## ❓ QUESTIONS PUT TO THE COUNCIL")
    out.append("")
    for i, q in enumerate(questions, 1):
        out.append(f"{i}. {q}")
    out.append("")
    out.append("---")
    out.append("")

    # Each advisor's take on each question
    out.append("## 👥 ADVISOR TAKES")
    out.append("")

    for advisor_id, advisor in advisors.items():
        out.append(f"### {advisor['name']} — *{advisor['lens']}*")
        out.append("")

        for i, q in enumerate(questions, 1):
            take = advisor.get("takes", {}).get(f"q{i}")
            if take:
                out.append(f"**Q{i}:** {q}")
                out.append("")
                out.append(f"> {take}")
                out.append("")

        out.append("---")
        out.append("")

    # Synthesis
    out.append("## 🧠 SYNTHESIS — Where the council agrees, disagrees, and what to do")
    out.append("")

    out.append("### 🔴 AGREEMENT (6 areas where all or most advisors converge)")
    out.append("")
    out.append("1. **Stop building. Start talking to customers.** Hormozi, Dunford, Halbert, Ogilvy, Hopkins — every advisor said this in different words. You have zero customer conversations. Fix this before anything else.")
    out.append("")
    out.append("2. **The free diagnosis is the right entry point.** Godin, Brunson, Cialdini, Schwartz — the free tier as 'permission asset' and 'reciprocity trigger' is the strongest part of your strategy. Don't remove it. Weaponize it.")
    out.append("")
    out.append("3. **Clínicas estéticas is a good beachhead, but validate with data.** April Dunford, Alex Hormozi, Gary Halbert — the niche choice is sound but needs market validation (starving crowd test). Hormozi suggests dentists as potentially better (wider gap). Test both.")
    out.append("")
    out.append("4. **R$197 is the psychological sweet spot for professional services in Brazil.** Rory Sutherland, Byron Sharp, David Ogilvy — pricing isn't just economics, it's SIGNALING. R$197 positions you as a professional service, not an app.")
    out.append("")
    out.append("5. **Your moat isn't technology — it's localization + distribution.** April Dunford, Gary Vaynerchuk, Byron Sharp — 'we speak Portuguese, we understand Brazilian SMB, we're built for R$197/mês' is harder to copy than any API integration.")
    out.append("")
    out.append("6. **Document everything publicly.** Gary Vaynerchuk, Ann Handley, Seth Godin — the diagnosis process IS your content. Record it. Post it. Build audience while building product.")
    out.append("")

    out.append("### 🟡 DISAGREEMENT (genuine tension points)")
    out.append("")
    out.append("- **Hormozi vs Sharp on niche breadth:** Hormozi says hyper-narrow (dentists doing harmonização facial in SP with GMB active), Sharp says maximize penetration (all clínicas estéticas in Brazil). Resolution: start hyper-narrow for product validation, design for scale.")
    out.append("")
    out.append("- **Hopkins vs Ogilvy on headline approach:** Hopkins says test 100 headlines empirically, Ogilvy says write one great headline based on deep customer understanding. Resolution: do both. Ogilvy first (talk to 10 clinic owners, use their words), then Hopkins (A/B test the top 3).")
    out.append("")
    out.append("- **Brunson vs Godin on free tier follow-up:** Brunson wants a funnel (diagnosis → email sequence → upsell), Godin wants permission (one email, then wait for them to come back). Resolution: Godin for the first 100 contacts (build trust), Brunson for the next 1,000 (scale with automation).")
    out.append("")

    out.append("### 🟢 IMMEDIATE ACTIONS (Hormozi's 'do this TODAY')")
    out.append("")
    out.append("1. **Run 3 manual diagnoses.** Pick 3 clinics. Use your pipeline. Print the report. Go there. *'Fiz uma análise do marketing digital da sua clínica. Posso te mostrar em 5 minutos?'* (Hormozi + Dunford)")
    out.append("")
    out.append("2. **Build a list of 100 clinic contacts.** Google Maps + GMB data. Name, phone, email, rating, review count. This is your business, not your code. (Halbert)")
    out.append("")
    out.append("3. **Record one diagnosis video TODAY.** Screen recording. Narrate what you're seeing. Post on Instagram Reels. Portuguese. 60 seconds. (Vaynerchuk)")
    out.append("")
    out.append("4. **Price test before launch.** Run 20 diagnoses with R$47 starter quote, 20 with R$97. Measure. The winner is your price. (Hopkins)")
    out.append("")
    out.append("5. **Find the starving crowd.** Go to Google Trends. Compare 'marketing digital para dentistas' vs 'marketing digital para clínicas estéticas' vs 'marketing digital para restaurantes' in São Paulo. The winner is your primary niche. Data over intuition. (Halbert + Sharp)")
    out.append("")

    out.append("---")
    out.append("")
    out.append("*Full Council · 12 advisors · 6 questions · 2026-07-12*")
    out.append("*Based on Corey Haines marketing-council SKILL.md · Advisor personas are simulations grounded in documented frameworks*")

    return "\n".join(out)

def main():
    report = render_council(STRATEGY_BRIEF, COUNCIL_QUESTIONS, ADVISORS)

    # Save to docs
    out_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "spec", "marketing-council-report.md")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        f.write(report)

    print(report)
    print(f"\n📄 Saved to: {out_path}")

if __name__ == "__main__":
    main()
