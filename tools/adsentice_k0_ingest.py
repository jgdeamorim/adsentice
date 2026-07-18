#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""
adsentice_k0_ingest.py — k0-lite Code Structure Ingest (EVO-API pattern)

L0 AST/regex: parse file tree → classify → extract structure → embed → Qdrant.
Entities: Component, Module, Route, Stylesheet, Type, Config
Edges: imports, exports, renders, depends_on, has_style, has_route

Pattern: rsxt-k0 (NodeId/EdgeKind Strings, add_edge, sync canonical)
         EVO-API coder-mcp (AST L0/regex → VecRecord{meta} → Qdrant)

medido=verdade · 2026-07-18 · adsentice
"""

import json, os, re, sys, time, uuid
from pathlib import Path
from typing import Any
import httpx

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

ROOTS = [
    Path("/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/adsentice/apps/web/src"),
    Path("/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/adsentice/packages/warp/src"),
]
QDRANT = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
EMBED = "http://127.0.0.1:8081/embed"
BATCH_SIZE = 10
DRY_RUN = "--dry-run" in sys.argv

# ═══════════════════════════════════════════════════════════════
# L0: CLASSIFY
# ═══════════════════════════════════════════════════════════════

def classify(filepath: Path) -> dict:
    """L0 AST/regex classification (EVO-API pattern: no LLM)."""
    ext = filepath.suffix
    name = filepath.stem
    path_str = str(filepath)

    # Directory-based hints
    is_api_route = "/app/api/" in path_str or "/route.ts" in path_str
    is_component = "/components/" in path_str and ext == ".tsx"
    is_layout = "/@layouts/" in path_str
    is_hoc = "/hocs/" in path_str
    is_view = "/views/" in path_str
    is_lib = "/lib/" in path_str and ext == ".ts"
    is_theme = "/@core/theme/" in path_str and ext == ".ts"
    is_css = ext in (".css", ".scss")

    if is_css:
        return {"kind": "stylesheet", "category": "style"}
    if is_api_route:
        return {"kind": "route", "category": "api"}
    if is_component or is_layout or is_hoc or is_view or (ext == ".tsx"):
        return {"kind": "component", "category": "ui"}
    if is_theme:
        return {"kind": "module", "category": "theme"}
    if is_lib and "types" not in name.lower():
        return {"kind": "module", "category": "business-logic"}
    if "types" in name.lower():
        return {"kind": "type", "category": "types"}
    if ext == ".ts":
        return {"kind": "module", "category": "utility"}

    return {"kind": "file", "category": "other"}

# ═══════════════════════════════════════════════════════════════
# L1: EXTRACT STRUCTURE
# ═══════════════════════════════════════════════════════════════

def extract_structure(filepath: Path, meta: dict) -> dict:
    """Extract imports, exports, JSX elements, CSS classes, tokens via regex (L0)."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except:
        return {}

    struct: dict[str, Any] = {}

    # ── IMPORTS: local modules (edges) ──
    imports_local = re.findall(r'^import\s+.*\s+from\s+["\'](\.\.?/[^"\']+)["\']', content, re.MULTILINE)
    imports_pkg = re.findall(r'^import\s+.*\s+from\s+["\'](@[^"\']+|packages/[^"\']+)["\']', content, re.MULTILINE)
    struct["imports"] = imports_local[:20]
    struct["imports_pkg"] = imports_pkg[:10]

    # ── EXPORTS ──
    exports_named = re.findall(r'export\s+(?:const|function|class|interface|type|enum|async function)\s+(\w+)', content)
    exports_default = re.findall(r'export\s+default\s+(?:function|class)\s+(\w+)', content)
    struct["exports"] = exports_named[:15]
    struct["exports_default"] = exports_default[:3]

    # ── JSX ELEMENTS (componente React) ──
    jsx_tags = re.findall(r'<([A-Z]\w+)', content)
    html_tags = re.findall(r'<(div|span|header|main|footer|section|nav|button|input|form|a|img|p|h[1-6])[\s>]', content)
    struct["jsx_tags"] = list(set(jsx_tags))[:15]
    struct["html_tags"] = list(set(html_tags))[:10]

    # ── CSS CLASSES ──
    css_classes = re.findall(r'class(?:Name)?=["\']([^"\']+)["\']', content)
    classes_flat = []
    for c in css_classes:
        classes_flat.extend(re.findall(r'([a-z][a-zA-Z0-9_-]+)', c))
    struct["css_classes"] = list(set(classes_flat))[:20]

    # ── DESIGN TOKENS ──
    tokens = re.findall(r'--([a-z][a-z-]+)', content)
    struct["design_tokens"] = list(set(tokens))[:15]

    # ── FUNCTIONS / HOOKS / CLASSES ──
    functions = re.findall(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)', content)
    struct["functions"] = functions[:20]

    # ── IMPORTS NAMED (what symbols are imported from local modules) ──
    imports_named = re.findall(r'import\s+\{([^}]+)\}\s+from\s+["\']([^"\']+)["\']', content)
    imported_symbols = []
    for symbols, path in imports_named:
        for sym in symbols.split(","):
            sym_clean = sym.strip().split(" as ")[0].strip()
            if sym_clean:
                imported_symbols.append({"symbol": sym_clean, "from": path})
    struct["imported_symbols"] = imported_symbols[:10]

    # ── HEURISTIC INTENT (what this file DOES, from comments) ──
    first_comment = re.search(r'/\*\*?\s*\n?\s*\*?\s*(.+?)(?:\n|$)', content)
    struct["intent_hint"] = first_comment.group(1).strip()[:120] if first_comment else ""

    return struct

# ═══════════════════════════════════════════════════════════════
# L2: BUILD EDGES
# ═══════════════════════════════════════════════════════════════

def build_edges(filepath: Path, struct: dict) -> list[dict]:
    """Build edges from extracted structure (depends_on, renders, uses)."""
    edges = []
    rel_path = str(filepath)

    # imports → depends_on
    for imp in struct.get("imports", []):
        target = imp.replace("../", "").replace("./", "").replace(".tsx", "").replace(".ts", "")
        edges.append({"source": rel_path, "relation": "depends_on", "target": f"file:{target}", "source_doc": "import statement"})

    # imported symbols from packages → uses
    for sym in struct.get("imported_symbols", []):
        source = sym["from"]
        if "warp" in source or "packages" in source:
            edges.append({"source": rel_path, "relation": "uses", "target": f"symbol:{sym['symbol']}", "source_doc": f"imported from {source}"})

    # JSX tags → renders
    for tag in struct.get("jsx_tags", [])[:8]:
        edges.append({"source": rel_path, "relation": "renders", "target": f"component:{tag}", "source_doc": "JSX element"})

    # CSS classes → applies
    for cls in struct.get("css_classes", [])[:10]:
        edges.append({"source": rel_path, "relation": "applies", "target": f"class:{cls}", "source_doc": "CSS class usage"})

    # Design tokens → consumes
    for tok in struct.get("design_tokens", [])[:8]:
        edges.append({"source": rel_path, "relation": "consumes", "target": f"token:{tok}", "source_doc": "CSS custom property"})

    return edges

# ═══════════════════════════════════════════════════════════════
# L3: EMBED
# ═══════════════════════════════════════════════════════════════

def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed texts via local embed-server :8081 (mpnet 768d)."""
    if not texts:
        return []
    try:
        r = httpx.post(EMBED, json={"texts": texts}, timeout=60.0)
        if r.status_code == 200:
            return r.json().get("vectors", [])
    except Exception as e:
        print(f"  ⚠️  Embed error: {e}")
    return []

# ═══════════════════════════════════════════════════════════════
# L4: UPSERT QDRANT
# ═══════════════════════════════════════════════════════════════

def upsert_batch(points: list[dict]) -> bool:
    """Upsert points to Qdrant (batch)."""
    if DRY_RUN:
        print(f"  [dry-run] Would upsert {len(points)} points")
        return True
    try:
        body = {"points": points}
        r = httpx.put(
            f"{QDRANT}/collections/{COLLECTION}/points",
            json=body,
            params={"wait": "true"},
            timeout=60.0,
        )
        if r.status_code != 200:
            print(f"\n  ⚠️  Upsert fail: HTTP {r.status_code} {r.text[:200]}")
        return r.status_code == 200
    except Exception as e:
        print(f"\n  ⚠️  Upsert error: {e}")
        return False

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("═" * 60)
    print("🧠 adsentice_k0_ingest — Code Structure to KG")
    print(f"   EVO-API pattern: L0 AST/regex → entities → edges → embed → Qdrant")
    if DRY_RUN:
        print(f"   🔍 DRY RUN — no upserts")
    print("═" * 60)

    # Count files
    all_files = []
    for root in ROOTS:
        if not root.exists():
            continue
        for f in root.rglob("*"):
            if f.is_file() and f.suffix in (".ts", ".tsx", ".css", ".scss") and "node_modules" not in str(f):
                # Skip test files and large auto-generated
                if "test" in f.name.lower() or "__snapshots__" in str(f):
                    continue
                if f.stat().st_size > 200_000:  # skip >200KB
                    continue
                all_files.append(f)

    print(f"\n📁 {len(all_files)} files to ingest")
    by_kind = {}
    for f in all_files:
        k = classify(f)["kind"]
        by_kind[k] = by_kind.get(k, 0) + 1
    for k, v in sorted(by_kind.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")

    # Phase 1: Extract + Classify
    print(f"\n🔍 Phase 1: Extract structure (L0 AST/regex)...")
    entities = []
    edges_all = []
    processed = 0

    for fp in all_files:
        meta = classify(fp)
        struct = extract_structure(fp, meta)
        if not struct:
            continue

        rel_path = str(fp.relative_to(fp.parents[2]) if len(fp.parents) > 2 else fp)

        entity = {
            "id": str(uuid.uuid5(uuid.NAMESPACE_URL, str(fp))),
            "kind": meta["kind"],
            "category": meta["category"],
            "name": fp.stem,
            "source": rel_path,
            "tag": "adsentice-k0",
            "surface": "k0",
            "segments": ["all"],
            "ext": fp.suffix,
            "size_bytes": fp.stat().st_size,
            "exports": struct.get("exports", []),
            "exports_default": struct.get("exports_default", []),
            "functions": struct.get("functions", []),
            "jsx_tags": struct.get("jsx_tags", []),
            "html_tags": struct.get("html_tags", []),
            "css_classes": struct.get("css_classes", []),
            "design_tokens": struct.get("design_tokens", []),
            "imports_count": len(struct.get("imports", [])),
            "intent_hint": struct.get("intent_hint", ""),
            # Text for embedding
            "text": f"{fp.stem} {' '.join(struct.get('exports',[]))} {' '.join(struct.get('functions',[]))} {struct.get('intent_hint','')}",
        }

        entities.append(entity)
        edges_all.extend(build_edges(fp, struct))
        processed += 1

        if processed % 50 == 0:
            status = f"  {processed}/{len(all_files)} files processed..."
            print(status, end="\r")

    print(f"\n  ✅ {processed} files → {len(entities)} entities, {len(edges_all)} edges")

    # Phase 2: Embed
    print(f"\n📐 Phase 2: Embed entities ({BATCH_SIZE} per batch)...")
    batches = [entities[i:i + BATCH_SIZE] for i in range(0, len(entities), BATCH_SIZE)]
    points_upserted = 0

    for bi, batch in enumerate(batches):
        texts = [e["text"] for e in batch]
        vectors = embed_texts(texts)

        if len(vectors) != len(batch):
            print(f"  ⚠️  Batch {bi + 1}: embed mismatch ({len(vectors)} vs {len(batch)})")
            continue

        points = []
        for entity, vec in zip(batch, vectors):
            # Build payload: FLAT (EVO-API/adsentice pattern — no nesting)
            pl = {
                "kind": entity["kind"],
                "category": entity["category"],
                "name": entity["name"],
                "source": entity["source"],
                "tag": "adsentice-k0",
                "surface": "k0",
                "segments": entity["segments"],
                "ext": entity["ext"],
                "size_bytes": entity["size_bytes"],
                "exports": json.dumps(entity["exports"]),
                "functions": json.dumps(entity["functions"]),
                "jsx_tags": entity["jsx_tags"],
                "html_tags": entity["html_tags"],
                "css_classes": entity["css_classes"],
                "design_tokens": entity["design_tokens"],
                "imports_count": entity["imports_count"],
                "intent_hint": entity["intent_hint"],
                "text": entity["text"],
            }
            points.append({
                "id": entity["id"],
                "vector": vec,
                "payload": pl,
            })

        ok = upsert_batch(points)
        if ok:
            points_upserted += len(points)

        pct = (bi + 1) / len(batches) * 100
        print(f"  Batch {bi + 1}/{len(batches)} ({pct:.0f}%) — {points_upserted} upserted", end="\r")

    print(f"\n  ✅ {points_upserted} points upserted to {COLLECTION}")

    # Phase 3: Edge summary
    print(f"\n🔗 Phase 3: Edge statistics")
    relations = {}
    for e in edges_all:
        rel = e["relation"]
        relations[rel] = relations.get(rel, 0) + 1
    for rel, count in sorted(relations.items(), key=lambda x: -x[1]):
        print(f"  {rel}: {count} edges")

    # Phase 4: Add k0 edges to KG server (auto-discovered)
    print(f"\n🧩 Phase 4: Cross-reference with existing KG")
    # Count how many edges reference known vocab entities
    known = ["adsentice.qdrant", "vocab.icon", "vocab.animation", "vocab.layout",
             "service.embed", "service.redis", "pipeline.discovery", "vocab.color",
             "vocab.spacing", "vocab.shadow", "vocab.typography", "vocab.conversion"]
    matches = 0
    for e in edges_all:
        target = e.get("target", "")
        for k in known:
            if k in target:
                matches += 1
                break
    print(f"  {matches}/{len(edges_all)} edges reference known KG entities")

    # Save to Redis for OODA
    try:
        r = __import__("redis").Redis(host="127.0.0.1", port=6396, decode_responses=True, socket_connect_timeout=3)
        r.ping()
        r.set("adsentice:k0:ingest:latest", json.dumps({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "files_ingested": processed,
            "entities": len(entities),
            "edges": len(edges_all),
            "points_upserted": points_upserted,
            "edge_relations": relations,
        }))
        print(f"\n✅ k0 state saved to Redis: adsentice:k0:ingest:latest")
    except:
        pass

    print("\n" + "═" * 60)
    print(f"🧠 k0-lite ingest complete")
    print(f"   {processed} files → {len(entities)} entities → {len(edges_all)} edges")
    print(f"   {points_upserted} points in Qdrant {COLLECTION}")
    print("═" * 60)

if __name__ == "__main__":
    main()
