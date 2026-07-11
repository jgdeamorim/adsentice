#!/usr/bin/env python3
"""
Ingest Claude Code history → Qdrant adsentice-conversation.
Filtra por projeto adsentice (e EVO-API relacionado), agrupa por sessionId,
embebe via :8081, upsert :6352.
"""

import json
import os
import sys
import time
import uuid
from collections import defaultdict
from urllib.request import Request, urlopen

HISTORY_FILE = os.path.expanduser("~/.claude/history.jsonl")
EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-conversation"
TAG = "adsentice"

# Projetos a ingestar
ADSENTICE_PROJECTS = [
    "/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/adsentice",
    "/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/EVO-API",
]

def embed(texts: list[str]) -> list[list[float]]:
    req = Request(
        EMBED_URL,
        data=json.dumps({"texts": texts}).encode(),
        headers={"Content-Type": "application/json"},
    )
    resp = urlopen(req, timeout=30)
    return json.loads(resp.read())["vectors"]


def upsert(points: list[dict]) -> str:
    body = json.dumps({"points": points}).encode()
    req = Request(
        f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
        data=body,
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    resp = urlopen(req, timeout=30)
    return json.loads(resp.read()).get("status", "error")


def load_sessions(filepath: str, target_projects: list[str]) -> dict[str, list[dict]]:
    """Load history.jsonl, filter by project, group by sessionId."""
    sessions: dict[str, list[dict]] = defaultdict(list)
    untracked = []

    with open(filepath) as f:
        for line in f:
            try:
                entry = json.loads(line.strip())
            except json.JSONDecodeError:
                continue

            proj = entry.get("project", "")
            if proj not in target_projects:
                continue

            sid = entry.get("sessionId")
            if sid:
                sessions[sid].append(entry)
            else:
                untracked.append(entry)

    return sessions, untracked


def build_chunks(sessions: dict[str, list[dict]], untracked: list[dict]) -> list[dict]:
    """Build text chunks from conversations."""
    chunks = []

    # Per-session chunks
    for sid, entries in sorted(sessions.items()):
        # Sort by timestamp
        entries.sort(key=lambda e: e.get("timestamp", 0))

        proj = entries[0].get("project", "?")
        proj_label = "adsentice" if "adsentice" in proj else "EVO-API"

        # Get time range
        t0 = entries[0].get("timestamp", 0)
        t1 = entries[-1].get("timestamp", 0)

        # Build conversation text: one line per prompt
        lines = []
        for e in entries:
            display = e.get("display", "")[:300]  # trim very long prompts
            if display.strip():
                lines.append(display.strip())

        if not lines:
            continue

        full_text = "\n---\n".join(lines)

        # If single entry or short, keep as one chunk
        if len(full_text) <= 2000:
            chunks.append({
                "text": full_text,
                "source": f"claude-history:{proj_label}",
                "session_id": sid,
                "msg_count": len(entries),
                "ts_start": t0,
                "ts_end": t1,
            })
            continue

        # Split long sessions into overlapping chunks of ~5 prompts
        for i in range(0, len(lines), 5):
            window = lines[i:i+5]
            if not window:
                continue
            chunk_text = "\n---\n".join(window)
            chunks.append({
                "text": chunk_text[:2000],
                "source": f"claude-history:{proj_label}",
                "session_id": sid,
                "msg_count": len(window),
                "ts_start": t0,
                "ts_end": t1,
                "chunk_index": i // 5,
            })

    # Untracked (no sessionId) → single chunk per 5 entries
    if untracked:
        untracked.sort(key=lambda e: e.get("timestamp", 0))
        lines = [e.get("display", "")[:300].strip() for e in untracked if e.get("display", "").strip()]
        for i in range(0, len(lines), 5):
            chunk_text = "\n---\n".join(lines[i:i+5])
            chunks.append({
                "text": chunk_text[:2000],
                "source": "claude-history:adsentice-untracked",
                "session_id": None,
                "msg_count": min(5, len(lines) - i),
                "ts_start": 0,
                "ts_end": 0,
            })

    return chunks


def main():
    if not os.path.exists(HISTORY_FILE):
        print(f"❌ Not found: {HISTORY_FILE}")
        sys.exit(1)

    print(f"📖 Loading {HISTORY_FILE}...")
    sessions, untracked = load_sessions(HISTORY_FILE, ADSENTICE_PROJECTS)

    total_entries = sum(len(v) for v in sessions.values()) + len(untracked)
    print(f"📊 {len(sessions)} sessions + {len(untracked)} untracked = {total_entries} entries")

    chunks = build_chunks(sessions, untracked)
    print(f"✂️  {len(chunks)} chunks")

    total = 0
    batch_size = 10

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        batch_texts = [c["text"] for c in batch]

        print(f"🧮 Embed batch {i//batch_size + 1}/{(len(chunks)-1)//batch_size + 1} ({len(batch)})...")
        try:
            vectors = embed(batch_texts)
        except Exception as e:
            print(f"  ⚠️ Embed error: {e}")
            continue

        points = []
        for j, (chunk, vec) in enumerate(zip(batch, vectors)):
            point_id = str(uuid.uuid4())
            payload = {
                "text": chunk["text"],
                "tag": TAG,
                "ts": int(time.time()),
                "source": chunk["source"],
                "kind": "claude-history",
                "session_id": chunk.get("session_id") or "",
                "msg_count": chunk["msg_count"],
                "ts_start": chunk["ts_start"],
                "ts_end": chunk["ts_end"],
            }
            points.append({"id": point_id, "vector": vec, "payload": payload})

        if points:
            status = upsert(points)
            total += len(points)
            print(f"  ✅ {len(points)} upserted → {status}")
        else:
            print("  ⚠️ No points")

    print(f"\n🏁 Done: {total} chunks → {COLLECTION} (tag={TAG})")


if __name__ == "__main__":
    main()
