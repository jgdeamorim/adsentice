#!/usr/bin/env python3
"""
adsentice_warp_accent_fix.py — CORREÇÃO DE ACENTOS NOS PAYLOADS
═══════════════════════════════════════════════════════════════
Diagnóstico: payloads embedados sem acentos degradam busca pt-BR.
"métricas" ≠ "metricas" no embedding do mpnet multilíngue.

Ação: re-embed todos os payloads com texto acentuado correto.
O mpnet :8081 já é multilíngue — só precisa de texto bem formatado.

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, re, time, uuid
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG = "adsentice-warp"

def embed(texts):
    texts = [t[:800] for t in texts]
    req = Request(EMBED_URL, data=json.dumps({"texts": texts}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=30).read())["vectors"]

def upsert(points):
    body = json.dumps({"points": points}).encode()
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                  data=body, headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=30).read()).get("status", "error")

def fetch_all_payloads():
    """Busca todos os payloads com tag=adsentice-warp para re-embed."""
    print(f"🔍 Buscando payloads (tag={TAG})...")
    all_points = []
    offset = None
    while True:
        body = {"filter": {"must": [{"key": "tag", "match": {"value": TAG}}]},
                "limit": 500, "with_payload": True, "with_vector": False}
        if offset:
            body["offset"] = offset
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/scroll",
                      data=json.dumps(body).encode(),
                      headers={"Content-Type": "application/json"}, method="POST")
        data = json.loads(urlopen(req, timeout=60).read())
        result = data.get("result", {})
        points = result.get("points", [])
        all_points.extend(points)
        offset = result.get("next_page_offset")
        if not offset or len(points) == 0:
            break
        print(f"   {len(all_points)} carregados...")
    print(f"   {len(all_points)} payloads total")
    return all_points

def build_embed_text(payload: dict, with_accents: bool) -> str:
    """
    Constrói texto para embedding. with_accents=True usa acentos corretos.
    """
    desc = str(payload.get("description", ""))
    name = str(payload.get("name", ""))
    intent = str(payload.get("intent", ""))
    triggers = payload.get("triggers", [])
    trigger_text = " ".join(str(t) for t in triggers[:10]) if triggers else ""

    text = f"{name}. {desc}. {intent}. {trigger_text}"

    if with_accents:
        text = normalize_accents(text)

    return text[:800]

# Mapa de acentos para palavras comuns nos payloads
ACCENT_MAP = {
    r'\bmetricas\b': 'métricas', r'\bgraficos\b': 'gráficos', r'\bnegocio\b': 'negócio',
    r'\bclinica\b': 'clínica', r'\bestetica\b': 'estética', r'\bsaude\b': 'saúde',
    r'\bcomercio\b': 'comércio', r'\beducacao\b': 'educação', r'\banalise\b': 'análise',
    r'\bconteudo\b': 'conteúdo', r'\bestrategia\b': 'estratégia', r'\bpublico\b': 'público',
    r'\bbasico\b': 'básico', r'\brapido\b': 'rápido', r'\bfacil\b': 'fácil',
    r'\bdificil\b': 'difícil', r'\bespecifico\b': 'específico', r'\bpratico\b': 'prático',
    r'\btecnico\b': 'técnico', r'\borganico\b': 'orgânico', r'\bautomatico\b': 'automático',
    r'\bgenerico\b': 'genérico', r'\bunico\b': 'único', r'\bmaximo\b': 'máximo',
    r'\bminimo\b': 'mínimo', r'\botimo\b': 'ótimo', r'\bcritico\b': 'crítico',
    r'\bperiodo\b': 'período', r'\bmetodo\b': 'método', r'\bcodigo\b': 'código',
    r'\bbotao\b': 'botão', r'\bacao\b': 'ação', r'\bacoes\b': 'ações',
    r'\bconfirmacao\b': 'confirmação', r'\bexclusao\b': 'exclusão', r'\bselecao\b': 'seleção',
    r'\bopcao\b': 'opção', r'\bopcoes\b': 'opções', r'\bnavegacao\b': 'navegação',
    r'\binformacao\b': 'informação', r'\bvalidacao\b': 'validação',
    r'\bcomparacao\b': 'comparação', r'\brecomendacao\b': 'recomendação',
    r'\bsolucao\b': 'solução', r'\bintegracao\b': 'integração',
    r'\bcomposicao\b': 'composição', r'\bvisualizacao\b': 'visualização',
    r'\bconfiguracao\b': 'configuração', r'\batencao\b': 'atenção',
    r'\breputacao\b': 'reputação', r'\bconversao\b': 'conversão',
    r'\btelefone\b': 'telefone', r'\bcategoria\b': 'categoria',
    r'\bartigo\b': 'artigo', r'\bcapitulo\b': 'capítulo',
    r'\bnumerico\b': 'numérico', r'\bestatisticas\b': 'estatísticas',
    r'\bfisico\b': 'físico', r'\beletronico\b': 'eletrônico',
}

def normalize_accents(text: str) -> str:
    """Restaura acentos em texto pt-BR."""
    result = text
    for pattern, replacement in ACCENT_MAP.items():
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result

def main():
    print("🧠 ADSENTICE · ACCENT FIX — Re-embed com acentos corretos")
    print(f"   Modelo: paraphrase-multilingual-mpnet-base-v2 (768d)")
    print(f"   Collection: {COLLECTION} @ {QDRANT_URL}")
    print()

    # 1. Fetch all payloads
    points = fetch_all_payloads()
    if not points:
        print("⚠️ Nenhum payload encontrado.")
        return

    # 2. Delete old embeddings (mantém só os novos)
    old_ids = [p["id"] for p in points]
    print(f"\n🗑️  Removendo {len(old_ids)} embeddings antigos...")
    for i in range(0, len(old_ids), 100):
        batch = old_ids[i:i+100]
        body = json.dumps({"filter": {"must": [{"key": "id", "match": {"any": batch}}]}}).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/delete",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        urlopen(req, timeout=30)
    print(f"   ✅ {len(old_ids)} removidos")

    # 3. Re-embed with proper accents
    print(f"\n🧠 Re-embedding com acentos corretos...")
    BATCH = 6
    total = 0

    for i in range(0, len(points), BATCH):
        batch = points[i:i + BATCH]

        # Build embed texts WITH accents
        texts = [build_embed_text(p["payload"], with_accents=True) for p in batch]
        vecs = embed(texts)

        new_points = []
        for p, vec in zip(batch, vecs):
            payload = p["payload"]
            # Update description with accents in the payload too
            if "description" in payload:
                payload["description"] = normalize_accents(str(payload["description"]))
            if "name" in payload:
                payload["name"] = normalize_accents(str(payload["name"]))

            new_points.append({
                "id": str(uuid.uuid4()),
                "vector": [float(v) for v in vec],
                "payload": {**payload, "ts": int(time.time())},
            })

        status = upsert(new_points)
        total += len(new_points)
        names = ", ".join(str(b["payload"].get("name", "?"))[:30] for b in batch)
        print(f"  ✅ {len(new_points)}: {names}... → {status} "
              f"[{i+1}-{min(i+BATCH, len(points))}/{len(points)}]")

    print(f"\n🏁 {total} payloads re-embedados com acentos")

    # 4. Teste rápido
    print(f"\n🔍 TESTE RÁPIDO:")
    test_queries = [
        "métricas dashboard executivo KPI gráficos",
        "botão de compra ação principal CTA",
        "confirmação exclusão modal alerta",
    ]
    for q in test_queries:
        vec = embed([normalize_accents(q)])[0]
        body = json.dumps({
            "vector": vec,
            "filter": {"must": [{"key": "tag", "match": {"value": TAG}}]},
            "limit": 2, "with_payload": True,
        }).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
                      data=body, headers={"Content-Type": "application/json"}, method="POST")
        results = json.loads(urlopen(req, timeout=10).read()).get("result", [])
        top = results[0]["payload"] if results else {}
        print(f"   '{q[:50]}...' → {top.get('name', '?')[:60]} ({results[0]['score']:.4f})" if results else "   N/A")

if __name__ == "__main__":
    main()
