#!/usr/bin/env python3
"""
adsentice_warp_ingest.py — M2 REAL: Component Registry Semântico
═══════════════════════════════════════════════════════════════════
Ingere 11 componentes shadcn/ui + Radix como WarpComponent no Qdrant.

Cada componente é embedado com:
  embedding = vec(description + intent + triggers)
  payload   = { kind: "component", tag: "adsentice-warp", ... }

Depois do ingest:
  adsentice_search("botão de ação principal") → button (score alto)
  adsentice_search("exibir métricas do dashboard") → card, table

Fonte: packages/warp/src/3-destiller.ts (SHADCN_COMPONENTS)
       ADR-0018 (Família Warp)
       ADR-0020 (Compositor de Tokens)

medido=verdade · 2026-07-14 · adsentice
"""

import json, os, time, uuid
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG = "adsentice-warp"

def embed(texts: list[str]) -> list[list[float]]:
    texts = [t[:800] for t in texts]
    req = Request(EMBED_URL, data=json.dumps({"texts": texts}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=30).read())["vectors"]

def upsert(points: list[dict]) -> str:
    body = json.dumps({"points": points}).encode()
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                  data=body, headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=30).read()).get("status", "error")

# ═══════════════════════════════════════════════════════════════
# 11 COMPONENTES (fonte: 3-destiller.ts)
# ═══════════════════════════════════════════════════════════════

COMPONENTS = [
    {
        "id": "button",
        "type": "atom",
        "name": "Button",
        "description": "Elemento de UI clicavel. Dispara acoes, navega, submete formularios.",
        "intent": "acionar acao primaria, confirmar, submeter, navegar, deletar",
        "category": "action",
        "triggers": [
            "botao", "button", "click", "acao", "confirmar", "enviar", "submit",
            "deletar", "cancelar", "cta", "call to action", "comprar", "assinar",
        ],
        "mode": "design-system",
        "edges": [],
        "tokens": ["color", "typography", "spacing", "radius", "shadow", "animation"],
        "surfaces": ["S1", "S4", "S6", "S9", "S10", "S11", "S14"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "shadcn/ui",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "button",
        "a11y_keyboard": True,
        "a11y_contrast": 4.5,
    },
    {
        "id": "card",
        "type": "molecule",
        "name": "Card",
        "description": "Container flexivel para agrupar conteudo relacionado. Header, conteudo, footer opcionais. Ideal para dashboards e metricas.",
        "intent": "exibir informacao agrupada, destacar conteudo, organizar dashboard, mostrar metrica",
        "category": "data-display",
        "triggers": [
            "card", "cartao", "container", "bloco", "painel", "card de metrica",
            "kpi card", "stat card", "resumo", "destaque",
        ],
        "mode": "dashboard",
        "edges": [],
        "tokens": ["color", "typography", "spacing", "radius", "shadow"],
        "surfaces": ["S3", "S9", "S10", "S11", "S15", "S16", "S17", "S18"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "shadcn/ui",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "region",
        "a11y_keyboard": False,
        "a11y_contrast": 4.5,
    },
    {
        "id": "dialog",
        "type": "molecule",
        "name": "Dialog (Modal)",
        "description": "Janela modal para confirmacoes, formularios ou informacoes criticas. Overlay com foco aprisionado. Tecla Esc fecha.",
        "intent": "confirmar acao destrutiva, exibir formulario em modal, mostrar detalhes sem sair da pagina",
        "category": "feedback",
        "triggers": [
            "modal", "dialog", "popup", "confirmacao", "alerta", "janela",
            "confirmar exclusao", "detalhes", "termos",
        ],
        "mode": "dashboard",
        "edges": ["button"],
        "tokens": ["color", "spacing", "radius", "shadow", "animation", "z-index"],
        "surfaces": ["S3", "S9", "S14", "S18"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "Radix UI (shadcn/ui wrapper)",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "dialog",
        "a11y_keyboard": True,
        "a11y_contrast": 4.5,
    },
    {
        "id": "dropdown-menu",
        "type": "molecule",
        "name": "Dropdown Menu",
        "description": "Menu suspenso com lista de acoes. Ativado por clique no trigger. Navegacao por teclado com setas e Enter.",
        "intent": "exibir menu de acoes, opcoes de navegacao, acoes contextuais, menu de usuario",
        "category": "navigation",
        "triggers": [
            "menu", "dropdown", "suspenso", "opcoes", "acoes", "context menu",
            "menu de usuario", "configuracoes", "perfil",
        ],
        "mode": "dashboard",
        "edges": ["button"],
        "tokens": ["color", "typography", "spacing", "radius", "shadow", "z-index"],
        "surfaces": ["S3", "S9", "S15", "S16"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "Radix UI (shadcn/ui wrapper)",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "menu",
        "a11y_keyboard": True,
        "a11y_contrast": 4.5,
    },
    {
        "id": "form",
        "type": "organism",
        "name": "Form",
        "description": "Formulario com validacao via react-hook-form + zod. Campos, labels, erros e botao de submit. Totalmente acessivel por teclado.",
        "intent": "coletar dados do usuario, validar entrada, submeter formulario, cadastro, login",
        "category": "form",
        "triggers": [
            "formulario", "form", "cadastro", "login", "input", "campos",
            "validacao", "dados", "registro", "contato",
        ],
        "mode": "dashboard",
        "edges": ["input", "label", "button"],
        "tokens": ["color", "typography", "spacing", "radius"],
        "surfaces": ["S4", "S6", "S14"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "shadcn/ui + react-hook-form + zod",
        "source_type": "pattern",
        "source_quality": "P0",
        "a11y_role": "form",
        "a11y_keyboard": True,
        "a11y_contrast": 4.5,
    },
    {
        "id": "input",
        "type": "atom",
        "name": "Input",
        "description": "Campo de entrada de texto single-line. Suporta type=text, email, password, number. Label obrigatorio para acessibilidade.",
        "intent": "coletar texto do usuario, entrada de dados, busca, filtro",
        "category": "form",
        "triggers": [
            "input", "campo", "texto", "entrada", "escrever", "digitar",
            "busca", "pesquisa", "email", "senha", "telefone",
        ],
        "mode": "design-system",
        "edges": ["label"],
        "tokens": ["color", "typography", "spacing", "radius"],
        "surfaces": ["S3", "S4", "S6", "S9", "S14"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "Base UI (shadcn/ui v4)",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "textbox",
        "a11y_keyboard": True,
        "a11y_contrast": 4.5,
    },
    {
        "id": "label",
        "type": "atom",
        "name": "Label",
        "description": "Rotulo de campo de formulario. Sempre associado a um input via htmlFor. Essencial para acessibilidade WCAG.",
        "intent": "rotular campo de formulario, descrever o que o input espera",
        "category": "form",
        "triggers": ["label", "rotulo", "etiqueta", "nome do campo", "descricao do campo"],
        "mode": "design-system",
        "edges": [],
        "tokens": ["typography", "color"],
        "surfaces": ["S3", "S4", "S6", "S9", "S14"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "Radix UI (shadcn/ui wrapper)",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "label",
        "a11y_keyboard": False,
        "a11y_contrast": 4.5,
    },
    {
        "id": "select",
        "type": "molecule",
        "name": "Select",
        "description": "Dropdown de selecao unica. Lista de opcoes com busca integrada. Navegacao completa por teclado.",
        "intent": "selecionar uma opcao entre varias, escolher categoria, filtrar por tipo",
        "category": "form",
        "triggers": ["select", "selecao", "dropdown", "escolher", "opcao", "categoria", "filtro", "combo"],
        "mode": "dashboard",
        "edges": ["label"],
        "tokens": ["color", "typography", "spacing", "radius", "z-index"],
        "surfaces": ["S3", "S9", "S15", "S16"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "Radix UI (shadcn/ui wrapper)",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "combobox",
        "a11y_keyboard": True,
        "a11y_contrast": 4.5,
    },
    {
        "id": "sheet",
        "type": "organism",
        "name": "Sheet (Painel Lateral)",
        "description": "Painel que desliza da borda da tela. Usado para navegacao mobile, filtros avancados, detalhes do item. Esc fecha.",
        "intent": "exibir painel lateral, navegacao mobile, filtros avancados, detalhes do item",
        "category": "navigation",
        "triggers": ["sheet", "painel", "lateral", "drawer", "slide", "filtro lateral", "menu mobile", "detalhes"],
        "mode": "dashboard",
        "edges": ["button"],
        "tokens": ["color", "spacing", "radius", "shadow", "animation", "z-index"],
        "surfaces": ["S3", "S9", "S16"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "Radix UI (shadcn/ui wrapper)",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "dialog",
        "a11y_keyboard": True,
        "a11y_contrast": 4.5,
    },
    {
        "id": "table",
        "type": "organism",
        "name": "Table",
        "description": "Tabela de dados com cabecalho, ordenacao e selecao de linhas. Responsiva com scroll horizontal em mobile.",
        "intent": "exibir dados tabulares, listar leads, mostrar ranking, comparar metricas",
        "category": "data-display",
        "triggers": [
            "tabela", "table", "lista", "dados", "grid", "planilha",
            "ranking", "leads", "metricas", "comparacao",
        ],
        "mode": "dashboard",
        "edges": ["button", "select"],
        "tokens": ["color", "typography", "spacing", "radius"],
        "surfaces": ["S3", "S9", "S10", "S15", "S16"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "shadcn/ui",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "table",
        "a11y_keyboard": True,
        "a11y_contrast": 4.5,
    },
    {
        "id": "tabs",
        "type": "molecule",
        "name": "Tabs",
        "description": "Abas para alternar entre conteudos relacionados. Navegacao por teclado com setas esquerda/direita. Indicador visual da aba ativa.",
        "intent": "organizar conteudo em abas, alternar entre visoes, navegar entre secoes relacionadas",
        "category": "navigation",
        "triggers": ["tabs", "abas", "tab", "painel", "secoes", "alternar", "navegacao por abas"],
        "mode": "dashboard",
        "edges": [],
        "tokens": ["color", "typography", "spacing", "radius"],
        "surfaces": ["S3", "S9", "S10", "S14"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "source_name": "Radix UI (shadcn/ui wrapper)",
        "source_type": "component",
        "source_quality": "P0",
        "a11y_role": "tablist",
        "a11y_keyboard": True,
        "a11y_contrast": 4.5,
    },
]

def main():
    print("🧠 ADSENTICE · WARP M2 INGEST — Component Registry Semantico")
    print(f"   Target: {COLLECTION} @ Qdrant :6352")
    print(f"   Components: {len(COMPONENTS)}")
    print()

    total = 0
    BATCH = 6

    for i in range(0, len(COMPONENTS), BATCH):
        batch = COMPONENTS[i:i + BATCH]

        # Build embed text: description + intent + triggers
        embed_texts = []
        for c in batch:
            text = f"{c['description']} {c['intent']} {' '.join(c['triggers'][:10])}"
            embed_texts.append(text[:800])

        vecs = embed(embed_texts)

        points = []
        for c, vec in zip(batch, vecs):
            points.append({
                "id": str(uuid.uuid4()),
                "vector": vec,
                "payload": {
                    **c,
                    "kind": "component",
                    "tag": TAG,
                    "ts": int(time.time()),
                },
            })

        status = upsert(points)
        total += len(points)
        component_names = ", ".join(c["id"] for c in batch)
        print(f"  ✅ {len(points)} componentes ({component_names}) → {status}")

    # Verify
    query_embed = embed(["botao de acao principal confirmar submit"])[0]
    verify_body = json.dumps({
        "vector": query_embed,
        "filter": {"must": [{"key": "kind", "match": {"value": "component"}}, {"key": "tag", "match": {"value": TAG}}]},
        "limit": 3,
        "with_payload": True,
    }).encode()
    verify_req = Request(
        f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
        data=verify_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    verify_data = json.loads(urlopen(verify_req, timeout=10).read())
    results = verify_data.get("result", [])

    print(f"\n🔍 VERIFY: 'botao de acao principal' →")
    for r in results[:3]:
        p = r.get("payload", {})
        print(f"   {p.get('id')}: {p.get('name')} (score={r.get('score', 0):.4f})")

    # Registry file
    out = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "docs", "spec", "warp-component-registry.json",
    )
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(COMPONENTS, f, indent=2, ensure_ascii=False)

    print(f"\n🏁 {total} componentes Warp registrados no Qdrant")
    print(f"   kind=component · tag={TAG}")
    print(f"   Query: adsentice_search('dashboard executivo para dentista')")
    print(f"   Query: adsentice_search('botao de acao principal')")
    print(f"\n📄 {out}")

if __name__ == "__main__":
    main()
