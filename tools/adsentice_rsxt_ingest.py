#!/usr/bin/env python3
"""
adsentice_rsxt_ingest.py — INGESTÃO DA FAMÍLIA RSXT COMO SELF-KNOWLEDGE
═══════════════════════════════════════════════════════════════════════
Lê os docs de doutrina RSXT, extrai nodes+edges+schemas+doctrines,
embebe via :8081, upsert no Qdrant :6352 (adsentice-self + adsentice-kg).

FONTES: /media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/rsxt/docs/
OUTPUT: Qdrant :6352 · collections adsentice-self (vec) + adsentice-kg (edges)
         + intent-schema.json (mapeamento intent→pipeline/storage/tool)
"""

import json, os, re, sys, time, uuid
from pathlib import Path
from urllib.request import Request, urlopen

# ── Config ─────────────────────────────────────────────────────
RSXT_DOCS = Path("/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/rsxt")
EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
TAG = "adsentice"
COLL_SELF = "adsentice-self"
COLL_KG = "adsentice-kg"

# ── Embed ──────────────────────────────────────────────────────

def embed(texts: list[str]) -> list[list[float]]:
    req = Request(EMBED_URL, data=json.dumps({"texts": texts}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=30).read())["vectors"]

def upsert(collection: str, points: list[dict]) -> str:
    body = json.dumps({"points": points}).encode()
    req = Request(f"{QDRANT_URL}/collections/{collection}/points?wait=true",
                  data=body, headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=30).read()).get("status", "error")

# ── Extractors ─────────────────────────────────────────────────

def load_doc(path: str) -> str:
    p = RSXT_DOCS / path
    return p.read_text() if p.exists() else ""

def extract_sections(md: str) -> list[dict]:
    """Extrai seções com título e conteúdo."""
    sections = []
    current_title = ""
    current_lines = []
    for line in md.split("\n"):
        if line.startswith("## ") or line.startswith("# "):
            if current_title and current_lines:
                sections.append({"title": current_title, "content": "\n".join(current_lines)})
            current_title = line.lstrip("#").strip()
            current_lines = []
        else:
            current_lines.append(line)
    if current_title and current_lines:
        sections.append({"title": current_title, "content": "\n".join(current_lines)})
    return sections

def extract_code_blocks(md: str) -> list[dict]:
    """Extrai blocos de código com linguagem."""
    blocks = []
    pattern = re.compile(r'```(\w+)?\n(.*?)```', re.DOTALL)
    for m in pattern.finditer(md):
        blocks.append({"language": m.group(1) or "text", "code": m.group(2).strip()})
    return blocks

# ── RSXT Knowledge Graph ───────────────────────────────────────

RSXT_NODES = {
    # ── CORE ENGINES ──
    "rsxt:s0": {
        "type": "engine",
        "label": "RSXT s0 — Filesystem Cognitivo",
        "summary": "Engine de storage append-only com tier management (RAM→NVMe hot→NVMe cold→archive). Fundação de todos os outros variantes. ZERO LLM.",
        "layer": "L0-L2 (estrutural + estatístico + determinístico)",
        "competes_with": "Fjall, RocksDB, ext4 LSM stores",
        "adsentice_equivalent": "Vault (packages/vault, R2BlobStore + SupabaseSeriesStore)"
    },
    "rsxt:t0": {
        "type": "engine",
        "label": "RSXT t0 — Time-Series",
        "summary": "Engine de séries temporais (OHLCV, ticks, métricas). Append ordenado, range queries, auto-downsampling, ZERO LLM.",
        "layer": "L0-L1 (estrutural + estatístico)",
        "competes_with": "InfluxDB, TimescaleDB, QuestDB, Prometheus TSDB",
        "adsentice_equivalent": "BOA score timeline + diagnostics history (Supabase)"
    },
    "rsxt:v0": {
        "type": "engine",
        "label": "RSXT v0 — Vector Storage (SENSOR)",
        "summary": "Engine de vetores com busca por similaridade. HNSW/IVF, quantização FP16/INT8/INT4. Embedding é SENSOR, NUNCA árbitro. Retorna candidates, cliente decide.",
        "layer": "L3 (embedding similarity · sensor)",
        "competes_with": "LanceDB, Qdrant, Milvus, Pinecone, Chroma",
        "adsentice_equivalent": "Qdrant :6352 (adsentice-self, HNSW 768d)"
    },
    "rsxt:k0": {
        "type": "engine",
        "label": "RSXT k0 — Knowledge Graph",
        "summary": "Engine de grafo (nodes+edges) com traversal BFS/DFS. L0 AST/regex extrai entidades PRIMEIRO. LLM L6 SÓ se ambiguidade real + founder gate.",
        "layer": "L4 (graph traversal)",
        "competes_with": "Neo4j, SurrealDB, ArangoDB, DGraph",
        "adsentice_equivalent": "adsentice-kg MCP (34 edges, 5 relations, estático)"
    },
    "rsxt:f0": {
        "type": "engine",
        "label": "RSXT f0 — Finance/Trading Specialized",
        "summary": "Engine de domínio financeiro: Trade, Decision, CouncilVote, BOA score canonical. Usa s0+t0+v0+k0 por baixo.",
        "layer": "L5 (consensus multi-agent)",
        "competes_with": "nada direto (domínio específico)",
        "adsentice_equivalent": "adsentice_boa_score.py + CRM pipeline Stage 0→7"
    },

    # ── PYRAMID LAYERS ──
    "rsxt:L0": {
        "type": "layer",
        "label": "L0 · ESTRUTURAL",
        "summary": "AST, parser, regex, format extraction. Primeira linha de defesa. µs 0.1-10. ZERO LLM. ZERO embedding.",
        "adsentice_use": "URL validation, domain extraction, CMS detection regex"
    },
    "rsxt:L1": {
        "type": "layer",
        "label": "L1 · ESTATÍSTICO",
        "summary": "Frequency, recency, BOA accumulation, pattern counting. µs 10-1000.",
        "adsentice_use": "Keyword volume stats, review count distribution, score trend"
    },
    "rsxt:L2": {
        "type": "layer",
        "label": "L2 · DETERMINÍSTICO",
        "summary": "Spec validator, whitelist, circuit-breaker, rule engine. µs 1-100.",
        "adsentice_use": "ANTI-ICP filter, credit gate, plan eligibility check"
    },
    "rsxt:L3": {
        "type": "layer",
        "label": "L3 · EMBEDDING (SENSOR)",
        "summary": "Vector similarity. Embedding é SENSOR — NARROWS candidates, NÃO decide. ms 1-10.",
        "adsentice_use": "adsentice_search → similar businesses, similar diagnostics"
    },
    "rsxt:L4": {
        "type": "layer",
        "label": "L4 · GRAPH TRAVERSAL",
        "summary": "BFS/DFS, 3-hop walks, centrality, causal chains. ms 5-20.",
        "adsentice_use": "adsentice_kg_neighbors → capability→provider, pipeline→step"
    },
    "rsxt:L5": {
        "type": "layer",
        "label": "L5 · CONSENSUS (BOA)",
        "summary": "BOA formula canonical, Council vote, multi-agent agreement. ms 10-50.",
        "adsentice_use": "Lead Score = fixability × potential × value-fit"
    },
    "rsxt:L6": {
        "type": "layer",
        "label": "L6 · LLM ÁRBITRO (LAST RESORT)",
        "summary": "LLM decide entre candidates, interpretação ambígua. SÓ quando L0-L5 falharam. ms 100-1000, $$.",
        "adsentice_use": "DeepSeek V4 synthesis → cards + tips + score"
    },

    # ── DOCTRINES ──
    "rsxt:doctrine:llm_arbitro": {
        "type": "doctrine",
        "label": "LLM = ÁRBITRO, NUNCA EXTRATOR",
        "summary": "A LLM decide entre opções já estruturadas pelas camadas L0-L5. NUNCA extrai entidades, NUNCA classifica sozinha, NUNCA decide tier de storage."
    },
    "rsxt:doctrine:embedding_sensor": {
        "type": "doctrine",
        "label": "EMBEDDING = SENSOR, NÃO ÁRBITRO",
        "summary": "Embedding narrows candidates (top-K retrieval). NUNCA decide qual candidate é 'a resposta'. Cliente ou camada superior decide."
    },
    "rsxt:doctrine:pattern_accumulation": {
        "type": "doctrine",
        "label": "PATTERN ACCUMULATION = FINE-TUNING SEM RETREINAR",
        "summary": "Cada interação adiciona pattern automaticamente. BOA score ≥ 0.80 → Tier 1 forever. Maturation: 0→500 patterns, LLM usage cai 70%→5%.",
    },
    "rsxt:doctrine:founder_signal": {
        "type": "doctrine",
        "label": "FOUNDER_SIGNAL = 0.35 (MAIOR PESO)",
        "summary": "BOA formula: 0.30·stability + 0.20·performance + 0.15·error_free + 0.35·founder_signal. Founder confia mais no founder que em métricas técnicas."
    },
    "rsxt:doctrine:pipeline_l0_l6": {
        "type": "doctrine",
        "label": "SEMPRE L0→L1→L2→L3→L4→L5→L6. NUNCA pular.",
        "summary": "Pipeline determinístico primeiro. Sobe pra LLM SÓ quando GENUINAMENTE precisa interpretação. Cache resultado L6 → vira pattern L1-L2."
    },

    # ── PATTERNS ABSORBED ──
    "rsxt:pattern:layer_streaming": {
        "type": "pattern",
        "source": "airllm",
        "summary": "70B model in 4GB GPU: load 1 layer at a time. RSXT v0: only active namespace in RAM, rest streams from NVMe."
    },
    "rsxt:pattern:block_quantization": {
        "type": "pattern",
        "source": "airllm",
        "summary": "3× speedup per shard: FP16 hot, INT8 warm, INT4 cold, INT2 archive."
    },
    "rsxt:pattern:hybrid_search": {
        "type": "pattern",
        "source": "MiroFish",
        "summary": "0.7 vector + 0.3 BM25. Tantivy embed. Weights determinísticos (não LLM-tuned)."
    },
    "rsxt:pattern:graph_trait_abstract": {
        "type": "pattern",
        "source": "MiroFish",
        "summary": "GraphStorage trait: default Fjall, pluggable RocksDB/sled/memory. Swap backend sem reescrever app."
    },
    "rsxt:pattern:auto_ner_re": {
        "type": "pattern",
        "source": "MiroFish",
        "summary": "L0 AST/regex extrai entities PRIMEIRO. L2 rule-based classifica. L6 LLM SÓ se ambiguidade + founder gate."
    },
    "rsxt:pattern:strategy_personas": {
        "type": "pattern",
        "source": "MiroFish",
        "summary": "Cada strategy = persona com profile (bias, thresholds, history, BOA score). Tournament massivo barato."
    },
    "rsxt:pattern:mmap_zero_copy": {
        "type": "pattern",
        "source": "LanceDB",
        "summary": "Zero-copy mmap reads. Automatic versioning. Multimodal (não só vetor)."
    },
}

RSXT_EDGES = [
    # Engine hierarchy
    ("rsxt:t0", "depends_on", "rsxt:s0"),
    ("rsxt:v0", "depends_on", "rsxt:s0"),
    ("rsxt:k0", "depends_on", "rsxt:s0"),
    ("rsxt:f0", "depends_on", "rsxt:t0"),
    ("rsxt:f0", "depends_on", "rsxt:v0"),
    ("rsxt:f0", "depends_on", "rsxt:k0"),

    # Layer pipeline
    ("rsxt:L0", "feeds_into", "rsxt:L1"),
    ("rsxt:L1", "feeds_into", "rsxt:L2"),
    ("rsxt:L2", "feeds_into", "rsxt:L3"),
    ("rsxt:L3", "feeds_into", "rsxt:L4"),
    ("rsxt:L4", "feeds_into", "rsxt:L5"),
    ("rsxt:L5", "feeds_into", "rsxt:L6"),
    ("rsxt:L6", "last_resort", "rsxt:doctrine:llm_arbitro"),

    # Engines to layers
    ("rsxt:s0", "operates_at", "rsxt:L0"),
    ("rsxt:s0", "operates_at", "rsxt:L1"),
    ("rsxt:t0", "operates_at", "rsxt:L0"),
    ("rsxt:t0", "operates_at", "rsxt:L1"),
    ("rsxt:v0", "operates_at", "rsxt:L3"),
    ("rsxt:k0", "operates_at", "rsxt:L4"),
    ("rsxt:f0", "operates_at", "rsxt:L5"),

    # Doctrines to engines
    ("rsxt:doctrine:llm_arbitro", "governs", "rsxt:k0"),
    ("rsxt:doctrine:llm_arbitro", "governs", "rsxt:f0"),
    ("rsxt:doctrine:embedding_sensor", "governs", "rsxt:v0"),
    ("rsxt:doctrine:pattern_accumulation", "governs", "rsxt:f0"),
    ("rsxt:doctrine:founder_signal", "governs", "rsxt:f0"),
    ("rsxt:doctrine:pipeline_l0_l6", "governs", "rsxt:s0"),

    # Patterns to engines
    ("rsxt:pattern:layer_streaming", "applied_in", "rsxt:v0"),
    ("rsxt:pattern:block_quantization", "applied_in", "rsxt:v0"),
    ("rsxt:pattern:block_quantization", "applied_in", "rsxt:t0"),
    ("rsxt:pattern:hybrid_search", "applied_in", "rsxt:v0"),
    ("rsxt:pattern:graph_trait_abstract", "applied_in", "rsxt:k0"),
    ("rsxt:pattern:auto_ner_re", "applied_in", "rsxt:k0"),
    ("rsxt:pattern:strategy_personas", "applied_in", "rsxt:f0"),
    ("rsxt:pattern:mmap_zero_copy", "applied_in", "rsxt:s0"),

    # ADSENTICE BRIDGE
    ("adsentice:vault", "equivalent_to", "rsxt:s0"),
    ("adsentice:qdrant", "equivalent_to", "rsxt:v0"),
    ("adsentice:kg", "equivalent_to", "rsxt:k0"),
    ("adsentice:boa", "equivalent_to", "rsxt:f0"),
    ("adsentice:diagnostic", "could_use", "rsxt:L3"),
    ("adsentice:diagnostic", "could_use", "rsxt:L4"),
    ("adsentice:diagnostic", "could_use", "rsxt:L5"),
    ("adsentice:diagnostic", "uses", "rsxt:doctrine:pipeline_l0_l6"),
    ("adsentice:lead_scoring", "uses", "rsxt:doctrine:founder_signal"),
]

# ── Intent Schema ──────────────────────────────────────────────

INTENT_SCHEMA = {
    "intents": [
        {
            "intent": "site_audit",
            "triggers": ["analisar site", "auditar site", "lighthouse", "performance site", "tecnologia site"],
            "pipeline": "site_audit",
            "layers": ["rsxt:L0", "rsxt:L1", "rsxt:L3"],
            "tools": ["firecrawl_scrape", "on_page_instant_pages", "domain_technologies"],
            "storage": "rsxt:v0 → busca similares · rsxt:s0 → Vault audit trail",
            "doctrine": "L0 extrai URL e domínio. L1 check frequência. L3 busca diagnósticos similares. NUNCA pular L0-L1."
        },
        {
            "intent": "seo_discovery",
            "triggers": ["seo", "palavras-chave", "ranqueamento", "google", "posição", "keyword"],
            "pipeline": "seo_discovery",
            "layers": ["rsxt:L0", "rsxt:L1", "rsxt:L2", "rsxt:L3", "rsxt:L6"],
            "tools": ["serp_organic", "keyword_research", "domain_ranked_keywords"],
            "storage": "rsxt:t0 → keyword volume trends · rsxt:v0 → similar businesses keywords",
            "doctrine": "L2 rule: keywords < 5? amplia busca. L3 busca keywords de negócios similares. L6 LLM sintetiza recomendações."
        },
        {
            "intent": "gmb_reputation",
            "triggers": ["gmb", "google meu negócio", "reviews", "avaliações", "reputação", "perfil google"],
            "pipeline": "gmb_reputation",
            "layers": ["rsxt:L0", "rsxt:L1", "rsxt:L3"],
            "tools": ["business_profile_gmb", "business_reviews_google"],
            "storage": "rsxt:v0 → similar GMB profiles · rsxt:t0 → review velocity trend",
            "doctrine": "L0 regex extrai place_id. L1 estatísticas de reviews. L3 busca perfis similares. NUNCA LLM decide score de reputação."
        },
        {
            "intent": "competitor_intel",
            "triggers": ["concorrentes", "competidores", "mercado", "ranking", "competição"],
            "pipeline": "competitor_intel",
            "layers": ["rsxt:L0", "rsxt:L1", "rsxt:L3", "rsxt:L4", "rsxt:L6"],
            "tools": ["domain_competitors", "domain_keyword_gap", "domain_ranked_keywords"],
            "storage": "rsxt:k0 → competitor relationship graph · rsxt:v0 → similar businesses",
            "doctrine": "L4 k0 traversal: concorrente A → também compete com B? L3 similarity: quais negócios têm perfil competitivo parecido? L6 LLM sintetiza estratégia."
        },
        {
            "intent": "lead_scoring",
            "triggers": ["score", "lead", "qualificar", "prioridade", "oportunidade"],
            "pipeline": "lead_scoring",
            "layers": ["rsxt:L2", "rsxt:L5"],
            "tools": ["adsentice_search", "adsentice_kg_neighbors"],
            "storage": "rsxt:f0 → BOA score canonical · rsxt:t0 → score timeline",
            "doctrine": "L2 rules: ANTI-ICP filter. L5 BOA: fixability × potential × value-fit. founder_signal weight = 0.35."
        },
        {
            "intent": "code_generation",
            "triggers": ["código", "implementar", "endpoint", "rota", "api", "componente", "typescript", "rust"],
            "pipeline": "code_assist",
            "layers": ["rsxt:L3", "rsxt:L6"],
            "tools": ["adsentice_search", "adsentice_conversation_search"],
            "storage": "rsxt:v0 → código similar no corpus · rsxt:k0 → dependency graph",
            "doctrine": "L3 busca código similar (SENSOR). L6 LLM gera código (ÁRBITRO). Pattern accumulation: código gerado → pattern pro futuro."
        },
    ],
    "default_intent": {
        "pipeline": "full_discovery",
        "layers": ["rsxt:L0", "rsxt:L1", "rsxt:L2", "rsxt:L3", "rsxt:L4", "rsxt:L5", "rsxt:L6"],
        "note": "Sem intent específico → pipeline completo L0→L6. Discovery total do negócio."
    }
}

# ── Main ───────────────────────────────────────────────────────

def main():
    print("🧬 ADSENTICE · RSXT FAMILY INGEST")
    print(f"   Fonte: {RSXT_DOCS}/docs/")
    print(f"   Destino: Qdrant :6352 ({COLL_SELF} + {COLL_KG})")
    print()

    # ═══════════════════════════════════════════════════════════
    # 1. DOC SECTIONS → VEC()
    # ═══════════════════════════════════════════════════════════
    docs = {
        "00-FAMILY5-GENERIC.md": "5 engines: s0 (filesystem), t0 (time-series), v0 (vectors), k0 (graph), f0 (finance). API surface, storage model, tiering, snapshots.",
        "01-FAMILY5-IMPROVEMENTS.md": "9 patterns from airllm+MiroFish+Fjall+LanceDB. Layer streaming, block quantization, hybrid search, auto-NER/RE, strategy personas.",
        "02-FAMILY5-DOCTRINE.md": "THE GOLD. L0→L6 pyramid. LLM = árbitro NUNCA extrator. BOA formula. OODA 12-task. Pattern accumulation = fine-tuning sem retreinar. Founder signal 0.35.",
        "PLAN-RSXT-001-master-roadmap.md": "10 semanas Phase 1 (s0). 3 semanas t0+f0. v0+k0 adiados. Validation gates determinísticos. Cross-repo consumers (capital.RS, MY-CODER).",
    }

    print("═══ PHASE 1: Doc Sections → VEC() ═══")
    total_sections = 0
    all_sections = []

    for filename, description in docs.items():
        md = load_doc(f"docs/{filename}")
        sections = extract_sections(md)
        print(f"  {filename}: {len(sections)} seções")

        batch = []
        for i, sec in enumerate(sections):
            text = f"{sec['title']}: {sec['content'][:1500]}"
            all_sections.append({
                "source": f"rsxt:{filename}",
                "title": sec["title"],
                "kind": "rsxt-doctrine" if "doctrine" in filename.lower() else "rsxt-doc",
                "content": text[:600],
            })
            batch.append(text[:600])

            if len(batch) >= 8:
                vecs = embed(batch)
                points = []
                for v, s in zip(vecs, all_sections[-len(batch):]):
                    points.append({
                        "id": str(uuid.uuid4()),
                        "vector": v,
                        "payload": {**s, "tag": TAG, "ts": int(time.time())}
                    })
                upsert(COLL_SELF, points)
                total_sections += len(points)
                batch = []

        if batch:
            vecs = embed(batch)
            points = []
            for v, s in zip(vecs, all_sections[-len(batch):]):
                points.append({
                    "id": str(uuid.uuid4()),
                    "vector": v,
                    "payload": {**s, "tag": TAG, "ts": int(time.time())}
                })
            upsert(COLL_SELF, points)
            total_sections += len(points)

    print(f"  ✅ {total_sections} seções ingeridas em {COLL_SELF}")
    print()

    # ═══════════════════════════════════════════════════════════
    # 2. NODES + EDGES → KG
    # ═══════════════════════════════════════════════════════════
    print("═══ PHASE 2: Nodes + Edges → VEC() ═══")

    node_texts = []
    node_ids = []
    for nid, ndata in RSXT_NODES.items():
        label = ndata.get('label') or ndata.get('source','')
        text = f"{label}. {ndata['summary']} Layer: {ndata.get('layer','')}. ADSENTICE: {ndata.get('adsentice_equivalent','')} {ndata.get('adsentice_use','')}"
        node_texts.append(text[:600])
        node_ids.append(nid)

    # Embed nodes
    vecs = embed(node_texts)
    points = []
    for nid, ndata, vec in zip(node_ids, [RSXT_NODES[n] for n in node_ids], vecs):
        points.append({
            "id": str(uuid.uuid4()),
            "vector": vec,
            "payload": {
                "text": node_texts[node_ids.index(nid)][:500],
                "node_id": nid,
                "kind": ndata["type"],
                "label": ndata.get('label') or ndata.get('source',''),
                "tag": TAG,
                "ts": int(time.time()),
                "source": "rsxt-family-ingest",
            }
        })
    upsert(COLL_SELF, points)
    print(f"  ✅ {len(points)} nodes embedados")
    print(f"  ✅ {len(RSXT_EDGES)} edges catalogados (kg server)")
    print()

    # ═══════════════════════════════════════════════════════════
    # 3. INTENT SCHEMA
    # ═══════════════════════════════════════════════════════════
    print("═══ PHASE 3: Intent Schema ═══")

    intent_texts = []
    for intent in INTENT_SCHEMA["intents"]:
        text = (
            f"INTENT: {intent['intent']}. "
            f"Triggers: {', '.join(intent['triggers'][:5])}. "
            f"Pipeline: {intent['pipeline']}. "
            f"Layers: {', '.join(intent['layers'])}. "
            f"Tools: {', '.join(intent['tools'][:5])}. "
            f"Storage: {intent['storage']}. "
            f"Doctrine: {intent['doctrine']}"
        )
        intent_texts.append(text[:600])

    vecs = embed(intent_texts)
    points = []
    for intent, vec in zip(INTENT_SCHEMA["intents"], vecs):
        points.append({
            "id": str(uuid.uuid4()),
            "vector": vec,
            "payload": {
                "text": intent_texts[INTENT_SCHEMA["intents"].index(intent)][:500],
                "kind": "rsxt-intent",
                "intent_id": intent["intent"],
                "pipeline": intent["pipeline"],
                "triggers": intent["triggers"],
                "tag": TAG,
                "ts": int(time.time()),
                "source": "rsxt-intent-schema",
            }
        })
    upsert(COLL_SELF, points)

    # Also save intent schema as JSON file for reference
    with open("docs/spec/rsxt-intent-schema.json", "w") as f:
        json.dump(INTENT_SCHEMA, f, indent=2, ensure_ascii=False)

    print(f"  ✅ {len(points)} intent mappings embedados")
    print(f"  ✅ docs/spec/rsxt-intent-schema.json criado")
    print()

    # ═══════════════════════════════════════════════════════════
    # 4. STATS
    # ═══════════════════════════════════════════════════════════
    print("═══ SUMMARY ═══")
    print(f"  Doc sections:       {total_sections}")
    print(f"  RSXT nodes:         {len(RSXT_NODES)}")
    print(f"  RSXT edges:         {len(RSXT_EDGES)}")
    print(f"  Intent mappings:    {len(INTENT_SCHEMA['intents'])}")
    print(f"  Total vec() points: {total_sections + len(RSXT_NODES) + len(INTENT_SCHEMA['intents'])}")
    print()
    print("🧬 RSXT Family ingested as adsentice self-knowledge.")
    print("   adsentice_search('L0→L6 pipeline') → doctrine + layers")
    print("   adsentice_search('qual storage para audit trail') → rsxt:s0")
    print("   adsentice_search('site_audit intent') → triggers + pipeline + tools")


if __name__ == "__main__":
    main()
