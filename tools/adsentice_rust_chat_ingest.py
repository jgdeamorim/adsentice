#!/usr/bin/env python3
"""
Ingest RUST-CHAT.txt → Qdrant adsentice-conversation collection.
Chunk por turnos de conversa, embed 768d via :8081, upsert :6352.
"""

import json
import os
import sys
import time
import uuid
from urllib.request import Request, urlopen

SRC = "/media/jeffer/BKP/PROJETOS/RUST-CHAT/RUST-CHAT.txt"
EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-conversation"
TAG = "adsentice"
CHUNK_MIN_CHARS = 200
CHUNK_MAX_CHARS = 1500

def embed(texts: list[str]) -> list[list[float]]:
    req = Request(
        EMBED_URL,
        data=json.dumps({"texts": texts}).encode(),
        headers={"Content-Type": "application/json"},
    )
    resp = urlopen(req, timeout=30)
    return json.loads(resp.read())["vectors"]

def upsert(points: list[dict]) -> int:
    body = json.dumps({"points": points}).encode()
    req = Request(
        f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
        data=body,
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    resp = urlopen(req, timeout=30)
    result = json.loads(resp.read())
    return result.get("status", "error")

def chunk_conversation(filepath: str) -> list[dict]:
    """Split RUST-CHAT.txt into turn-based chunks."""
    with open(filepath) as f:
        text = f.read()

    # Split by paragraphs, filter empty
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    buf = []
    buf_len = 0

    for para in paragraphs:
        para_len = len(para)
        if buf and buf_len + para_len > CHUNK_MAX_CHARS:
            chunks.append("\n\n".join(buf))
            buf = []
            buf_len = 0
        buf.append(para)
        buf_len += para_len

    if buf:
        chunks.append("\n\n".join(buf))

    # Merge small tail chunks backward
    merged = []
    for chunk in chunks:
        if merged and len(chunk) < CHUNK_MIN_CHARS:
            merged[-1] = merged[-1] + "\n\n" + chunk
        else:
            merged.append(chunk)

    return merged

def main():
    print(f"📖 Reading {SRC}...")
    if not os.path.exists(SRC):
        print(f"❌ Not found: {SRC}")
        sys.exit(1)

    chunks = chunk_conversation(SRC)
    print(f"✂️  {len(chunks)} chunks (min={CHUNK_MIN_CHARS}, max={CHUNK_MAX_CHARS} chars)")

    total = 0
    batch_size = 10

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        batch_texts = [c[:2000] for c in batch]  # trim very long chunks for embed

        print(f"🧮 Embed batch {i//batch_size + 1}/{(len(chunks)-1)//batch_size + 1} ({len(batch)} chunks)...")
        try:
            vectors = embed(batch_texts)
        except Exception as e:
            print(f"  ⚠️ Embed error: {e}, retrying individually...")
            vectors = []
            for t in batch_texts:
                try:
                    vectors.extend(embed([t]))
                except Exception as e2:
                    print(f"  ❌ Skipping chunk: {e2}")
                    vectors.append(None)

        points = []
        for j, (chunk, vec) in enumerate(zip(batch, vectors)):
            if vec is None:
                continue
            point_id = str(uuid.uuid4())
            payload = {
                "text": chunk[:2000],
                "tag": TAG,
                "ts": int(time.time()),
                "source": "RUST-CHAT.txt",
                "kind": "conversation",
            }
            points.append({"id": point_id, "vector": vec, "payload": payload})

        if points:
            try:
                status = upsert(points)
                added = len(points)
                total += added
                print(f"  ✅ {added} points upserted → {status}")
            except Exception as e:
                print(f"  ❌ Upsert error: {e}")
        else:
            print("  ⚠️ No points to upsert")

    print(f"\n🏁 Done: {total} chunks ingested into {COLLECTION} (tag={TAG})")

if __name__ == "__main__":
    main()
