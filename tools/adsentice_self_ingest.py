#!/usr/bin/env python3
"""
adsentice_self_ingest.py
Ingestao do corpus adsentice (docs, ADRs, specs, skills, codigo) no Qdrant :6352.
Pipeline: scan → blake3 dedup → chunk → embed (:8081, mpnet 768d) → index (Qdrant).

Collections:
  adsentice-self     → corpus completo (docs+ADRs+specs)
  adsentice-materio  → design tokens Materio (UI vocabulary)

ISOLADO do EVO-API: Qdrant :6352 · Embed :8081 · collections adsentice-*
"""

import hashlib
import json
import os
import re
import sys
import time
try:
    from hashlib import blake3
except ImportError:
    blake3 = None
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

# ── Config ──
PROJECT_ROOT = Path(__file__).parent.parent
QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6352")
EMBED_URL = os.getenv("EMBED_URL", "http://127.0.0.1:8081")
COLLECTION_SELF = "adsentice-self"
COLLECTION_MATERIO = "adsentice-materio"
EMBED_DIM = 768
BATCH_SIZE = 8

# ── Materio tokens (design system vocabulary) ──
MATERIO_TOKENS = {
    "palette": [
        {"name": "coral-warm", "hex": "#f9603f", "role": "accent", "desc": "Cor principal da marca adsentice"},
        {"name": "coral-hover", "hex": "#cf3f1f", "role": "accent-hover", "desc": "Hover state do accent"},
        {"name": "coral-soft", "hex": "#ffe3da", "role": "accent-soft", "desc": "Background suave do accent"},
        {"name": "ink", "hex": "#1c1917", "role": "fg-primary", "desc": "Cor de texto principal"},
        {"name": "stone-dark", "hex": "#1c1917", "role": "bg-dark", "desc": "Background escuro (CTA, footer)"},
        {"name": "muted", "hex": "#57534e", "role": "fg-secondary", "desc": "Texto secundario"},
        {"name": "surface", "hex": "#faf8f6", "role": "bg-surface", "desc": "Background de superficies"},
        {"name": "surface-alt", "hex": "#fff0ea", "role": "bg-surface-alt", "desc": "Background alternativo (coral claro)"},
        {"name": "border", "hex": "#e7e5e4", "role": "border", "desc": "Cor de borda padrao"},
        {"name": "pastel-coral", "hex": "#fff0ea", "role": "bg-pastel", "desc": "Background pastel coral"},
        {"name": "pastel-amber", "hex": "#fef3d7", "role": "bg-pastel", "desc": "Background pastel amber"},
        {"name": "pastel-mint", "hex": "#e7f5ee", "role": "bg-pastel", "desc": "Background pastel mint"},
        {"name": "pastel-sky", "hex": "#eaf1fb", "role": "bg-pastel", "desc": "Background pastel sky"},
    ],
    "typography": [
        {"name": "font-display", "value": "'Plus Jakarta Sans', sans-serif", "role": "heading", "desc": "Fonte para headlines e titulos"},
        {"name": "font-body", "value": "'Inter', sans-serif", "role": "body", "desc": "Fonte para corpo de texto"},
        {"name": "font-mono", "value": "'JetBrains Mono', monospace", "role": "code", "desc": "Fonte monospace para codigo e dados"},
    ],
    "spacing": [
        {"name": "sp-1", "value": "4px", "desc": "Menor espacamento"},
        {"name": "sp-2", "value": "8px", "desc": ""},
        {"name": "sp-3", "value": "12px", "desc": ""},
        {"name": "sp-4", "value": "16px", "desc": "Padding padrao de card"},
        {"name": "sp-5", "value": "20px", "desc": ""},
        {"name": "sp-6", "value": "24px", "desc": "Gap padrao de grid"},
        {"name": "sp-7", "value": "28px", "desc": ""},
        {"name": "sp-8", "value": "32px", "desc": "Padding de secao"},
    ],
    "radius": [
        {"name": "r-sm", "value": "0.5rem", "desc": "Botoes pequenos, chips"},
        {"name": "r-md", "value": "1rem", "desc": "Cards, inputs"},
        {"name": "r-lg", "value": "1.25rem", "desc": "Cards grandes, modais"},
        {"name": "r-pill", "value": "100vw", "desc": "Botoes CTA, pills"},
    ],
    "shadows": [
        {"name": "sh-sm", "value": "0 1px 2px rgba(28,25,23,.04)", "desc": "Sombra sutil"},
        {"name": "sh-md", "value": "0 4px 12px rgba(28,25,23,.05)", "desc": "Sombra media (cards)"},
        {"name": "sh-lg", "value": "0 8px 24px rgba(28,25,23,.06)", "desc": "Sombra grande (modais)"},
        {"name": "sh-coral", "value": "0 16px 50px rgba(249,96,63,.18)", "desc": "Sombra do accent (CTAs)"},
    ],
    "motion": [
        {"name": "ease-default", "value": "cubic-bezier(.22,.61,.36,1)", "desc": "Curva de ease padrao"},
        {"name": "duration-fast", "value": "160ms", "desc": "Transicoes rapidas"},
        {"name": "duration-smooth", "value": "400ms", "desc": "Transicoes suaves"},
        {"name": "duration-reveal", "value": "700ms", "desc": "Reveal animations"},
    ],
}

# ── Scan files ──
def scan_files(root: Path) -> list[dict]:
    files = []
    patterns = [
        ("docs/**/*.md", "doc"),
        ("docs/**/*.json", "spec"),
        (".claude/skills/*/SKILL.md", "skill"),
        ("README.md", "doc"),
    ]
    for pattern, kind in patterns:
        for f in root.glob(pattern):
            if "node_modules" in str(f) or ".data" in str(f):
                continue
            files.append({"path": str(f.relative_to(root)), "kind": kind, "full_path": f})
    return files


def blake3_hex(content: str) -> str:
    if blake3:
        return blake3(content.encode()).hexdigest()
    return hashlib.sha256(content.encode()).hexdigest()


def point_id(content: str) -> str:
    if blake3:
        return blake3(content.encode()).hexdigest()[:32]
    return hashlib.sha256(content.encode()).hexdigest()[:32]


def chunk_text(text: str, max_chars: int = 800) -> list[str]:
    """Divide texto em chunks com overlap."""
    paragraphs = text.split("\n\n")
    chunks = []
    current = ""
    for p in paragraphs:
        if len(current) + len(p) < max_chars:
            current += p + "\n\n"
        else:
            if current.strip():
                chunks.append(current.strip())
            current = p + "\n\n"
    if current.strip():
        chunks.append(current.strip())
    return chunks or [text[:max_chars]]


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Envia batch de textos para o embed server (:8081)."""
    try:
        req = Request(
            f"{EMBED_URL}/embed",
            data=json.dumps({"texts": texts}).encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = urlopen(req, timeout=30)
        return json.loads(resp.read()).get("vectors", [])
    except Exception as e:
        print(f"  ⚠️ embed error: {e}")
        return []


def create_collection(name: str):
    """Cria collection no Qdrant se nao existir."""
    try:
        urlopen(Request(f"{QDRANT_URL}/collections/{name}", method="GET"), timeout=5)
        print(f"  ✅ collection '{name}' ja existe")
        return
    except Exception:
        pass

    body = json.dumps({
        "vectors": {"size": EMBED_DIM, "distance": "Cosine"},
        "hnsw_config": {"m": 16, "ef_construct": 100},
    })
    try:
        req = Request(
            f"{QDRANT_URL}/collections/{name}",
            data=body.encode(),
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        urlopen(req, timeout=10)
        print(f"  ✅ collection '{name}' criada (dim={EMBED_DIM}, Cosine)")
    except Exception as e:
        print(f"  ❌ collection '{name}' erro: {e}")


def ingest_to_qdrant(collection: str, vectors: list[list[float]], payloads: list[dict]):
    """Envia batch de pontos para o Qdrant."""
    points = []
    for i, (vec, payload) in enumerate(zip(vectors, payloads)):
        points.append({
            "id": point_id(payload["content"]),
            "vector": vec,
            "payload": payload
        })
    body = json.dumps({"points": points})
    try:
        req = Request(
            f"{QDRANT_URL}/collections/{collection}/points",
            data=body.encode(),
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        urlopen(req, timeout=30)
        return len(points)
    except Exception as e:
        print(f"  ⚠️ Qdrant put error: {e}")
        return 0


# ── Main ingest pipeline ──
def ingest_corpus(force: bool = False):
    print("📚 ADSENTICE SELF-INGEST")
    print(f"   Qdrant: {QDRANT_URL} · Embed: {EMBED_URL} · dim: {EMBED_DIM}")
    print()

    # 1. Criar collections
    create_collection(COLLECTION_SELF)
    create_collection(COLLECTION_MATERIO)
    print()

    # 2. Scan files
    files = scan_files(PROJECT_ROOT)
    print(f"📂 {len(files)} arquivos encontrados")
    for f in files:
        print(f"   [{f['kind']:6}] {f['path']}")
    print()

    # 3. Process files
    total_chunks = 0
    batch_texts = []
    batch_payloads = []

    for file_info in files:
        try:
            content = file_info["full_path"].read_text()
        except Exception:
            continue

        if not content.strip():
            continue

        # Metadados da fonte
        source = file_info["path"]
        kind = file_info["kind"]
        chunks = chunk_text(content)

        for ci, chunk in enumerate(chunks):
            batch_texts.append(chunk)
            batch_payloads.append({
                "source": source,
                "kind": kind,
                "content": chunk[:600],
                "chunk_index": ci,
                "total_chunks": len(chunks),
                "ingested_at": datetime.now(timezone.utc).isoformat(),
                "tag": "adsentice",
            })

            if len(batch_texts) >= BATCH_SIZE:
                vectors = embed_batch(batch_texts)
                if vectors:
                    n = ingest_to_qdrant(COLLECTION_SELF, vectors, batch_payloads)
                    total_chunks += n
                batch_texts = []
                batch_payloads = []
                time.sleep(0.1)

    # Final batch
    if batch_texts:
        vectors = embed_batch(batch_texts)
        if vectors:
            n = ingest_to_qdrant(COLLECTION_SELF, vectors, batch_payloads)
            total_chunks += n

    print(f"✅ Corpus ingerido: {total_chunks} chunks de {len(files)} arquivos")
    return total_chunks


def ingest_materio():
    """Ingere Materio design tokens como vocabulario semantico."""
    print("\n🎨 ADSENTICE MATERIO INGEST")
    texts = []
    payloads = []

    for category, tokens in MATERIO_TOKENS.items():
        for token in tokens:
            name = token.get("name", "")
            desc = token.get("desc", "")
            value = token.get("value", token.get("hex", ""))
            role = token.get("role", "")

            text = f"{category} {name}: {role} — {desc} ({value})"
            texts.append(text)
            payloads.append({
                "source": f"materio:{category}:{name}",
                "kind": "materio-token",
                "content": text,
                "category": category,
                "name": name,
                "role": role,
                "value": value,
                "ingested_at": datetime.now(timezone.utc).isoformat(),
                "tag": "materio",
            })

    vectors = embed_batch(texts)
    if vectors:
        n = ingest_to_qdrant(COLLECTION_MATERIO, vectors, payloads)
        print(f"✅ Materio ingerido: {n} tokens em {len(MATERIO_TOKENS)} categorias")
        return n
    return 0


if __name__ == "__main__":
    force = "--force" in sys.argv or "-f" in sys.argv
    n_corpus = ingest_corpus(force=force)
    n_materio = ingest_materio()
    print(f"\n🏁 TOTAL: {n_corpus} corpus + {n_materio} materio tokens")
