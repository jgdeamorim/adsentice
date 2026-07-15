#!/usr/bin/env python3
"""
adsentice_llm_copywriter.py — LLM Copywriter para S10 Raio-X
═══════════════════════════════════════════════════════════
Gera copy personalizada via DeepSeek V4 Flash ($0.001/query, ~3s).
Fallback: Qwen 2.5 1.5B local ($0, ~100s).

Arquitetura:
  DeepSeek API (primário) → copy pt-BR natural, personalizada
  Qwen local (fallback)   → copy básica $0
  Templates (fallback)    → NICHO_MAP/PERSONA_MAP

Calibração:
  model: deepseek-v4-flash (cheap, fast)
  temperature: 0.8 (criativo mas controlado)
  response_format: json_object
  max_tokens: 800 (headline + subtitle + cta — DeepSeek V4 Flash e reasoning model, precisa de margem)

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, subprocess, re, sys, time
from pathlib import Path

# ═══════════════════════════════════════════════════════════════
# DEEPSEEK — produção (~$0.001/query, ~3s)
# ═══════════════════════════════════════════════════════════════

DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-v4-flash"

def _load_deepseek_key():
    for path in [
        Path(__file__).parent.parent / "docs" / "secret" / ".env.DEEPSEEK",
        Path(os.path.expanduser("~")) / ".deepseek" / ".env",
    ]:
        if path.exists():
            with open(path) as f:
                for line in f:
                    if line.startswith("DEEPSEEK_API_KEY="):
                        return line.strip().split("=", 1)[1]
    return os.environ.get("DEEPSEEK_API_KEY", "")

def generate_copy_deepseek(lead: dict, gaps: list, temperature=0.8, timeout=15) -> dict | None:
    """Gera copy via DeepSeek V4 Flash. Custo: ~$0.001/query."""
    key = _load_deepseek_key()
    if not key:
        return None

    name = lead.get("title", "Empreendedor")
    cat = lead.get("category", "negócio")
    score = lead.get("score_compound", 50)
    level = lead.get("schwartz_label", "Problem Aware")
    district = lead.get("district", "sua região") or "sua região"
    city = lead.get("city", "sua cidade") or "sua cidade"
    rating = lead.get("rating_value", 0) or 0
    reviews = lead.get("rating_votes", 0) or 0

    # Tone por Schwartz
    tones = {
        "Unaware": "Tom educativo. Ela nao sabe que tem um problema — mostre de forma simples o que esta perdendo.",
        "Problem Aware": "Tom de urgencia. Ela sabe que tem poucos pacientes mas nao sabe resolver. Mostre que a solucao existe e e simples.",
        "Solution Aware": "Tom comparativo. Ela ja ouviu falar de agencias de marketing. Mostre que o adsentice e melhor e mais barato (R$197 vs R$2.000/mes de agencia).",
        "Product Aware": "Tom de prova social. Ela conhece o adsentice. Use cases de sucesso e depoimentos.",
        "Most Aware": "Tom de fechamento. Ela ja decidiu. Remova a ultima objecao.",
    }
    tone = tones.get(level, tones["Problem Aware"])

    gaps_text = "\n".join(f"- {g['title']} ({g['severity']})" for g in gaps[:3])

    try:
        import httpx
        r = httpx.post(DEEPSEEK_API, json={
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": f"Voce e um copywriter senior especializado em marketing digital para SMBs brasileiros. Voce escreve copy para relatorios de diagnostico digital (Raio-X) que ajudam donos de negocios locais. REGRAS: portugues brasileiro natural, use o primeiro nome da pessoa, mencione o bairro e a especialidade, sem jargao tecnico (SEO, schema, backlink, trafego), frases curtas, foco em BENEFICIO. {tone}"},
                {"role": "user", "content": f"Gere um objeto JSON com chaves headline, subtitle, cta para o relatorio de diagnostico de: {name}, {cat} em {district}, {city}. Score {score}/100. {rating} estrelas, {reviews} avaliacoes. Nivel: {level}.\n\nGaps detectados:\n{gaps_text}"},
            ],
            "max_tokens": 800,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }, headers={"Authorization": f"Bearer {key}"}, timeout=timeout)

        data = r.json()
        content = data["choices"][0]["message"]["content"].strip()
        result = json.loads(content)
        tokens = data["usage"]["total_tokens"]

        return {
            "headline": str(result.get("headline", "")),
            "subtitle": str(result.get("subtitle", "")),
            "cta": str(result.get("cta", "")),
            "tokens": tokens,
            "model": DEEPSEEK_MODEL,
        }
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════
# QWEN LOCAL — fallback $0 (~100s CPU)
# ═══════════════════════════════════════════════════════════════

LLAMA_CLI = "/media/jeffer/RSXT/llama-runtime/bin/llama-cli"
LLAMA_LIB = "/media/jeffer/RSXT/llama-runtime/bin"
MODEL = "/media/jeffer/RSXT/models/qwen2.5-1.5b-instruct-q4_k_m.gguf"

def generate_copy_qwen(lead: dict, gaps: list, timeout=120) -> dict | None:
    """Fallback $0 via Qwen 2.5 1.5B local GGUF."""
    if not Path(LLAMA_CLI).exists() or not Path(MODEL).exists():
        return None

    name = lead.get("title", "Empreendedor")
    cat = lead.get("category", "negócio")
    score = lead.get("score_compound", 50)
    level = lead.get("schwartz_label", "Problem Aware")
    district = lead.get("district", "sua região") or "sua região"
    city = lead.get("city", "sua cidade") or "sua cidade"

    gaps_text = "\n".join(f"- {g['title']}" for g in gaps[:3])

    prompt = f"""<|im_start|>system
Voce e um copywriter pt-BR para SMBs. Gere APENAS JSON com headline, subtitle, cta. Use nome+bairro+especialidade. Sem jargao. Frases curtas. Tom pessoal.<|im_end|>
<|im_start|>user
{name}, {cat} em {district}/{city}. Score {score}/100. Nivel {level}. Gaps: {gaps_text}. Gere JSON.<|im_end|>
<|im_start|>assistant
{{"""

    env = os.environ.copy()
    env["LD_LIBRARY_PATH"] = LLAMA_LIB

    try:
        proc = subprocess.Popen(
            [LLAMA_CLI, "-m", MODEL, "-n", "250", "-t", "4", "--temp", "0.7", "--top-p", "0.9", "--ctx-size", "2048"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            env=env, text=True,
        )
        out, _ = proc.communicate(input=prompt + "\n/exit\n", timeout=timeout)

        matches = re.findall(r'\{[^{}]*"headline"[^{}]*\}', out)
        for m in matches:
            try:
                result = json.loads(m)
                if result.get("headline") and result.get("cta"):
                    return {
                        "headline": str(result.get("headline", "")),
                        "subtitle": str(result.get("subtitle", "")),
                        "cta": str(result.get("cta", "")),
                        "tokens": 0,
                        "model": "qwen2.5-1.5b-local",
                    }
            except json.JSONDecodeError:
                continue
    except Exception:
        pass

    return None


# ═══════════════════════════════════════════════════════════════
# UNIFIED API
# ═══════════════════════════════════════════════════════════════

def generate_copy(lead: dict, gaps: list, prefer_local=False) -> dict:
    """
    Gera copy para o S10. Tenta DeepSeek primeiro, fallback Qwen local, fallback None.
    Retorna {headline, subtitle, cta, tokens, model} ou None.
    """
    if not prefer_local:
        result = generate_copy_deepseek(lead, gaps)
        if result:
            return result

    result = generate_copy_qwen(lead, gaps)
    if result:
        return result

    return None


# ═══════════════════════════════════════════════════════════════
# MAIN — test
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    test_lead = {
        "title": "Dra. Karina Santos Oliveira - Periodontista e Ortodontista",
        "category": "dentist",
        "score_compound": 64,
        "schwartz_label": "Solution Aware",
        "rating_value": 4.9,
        "rating_votes": 77,
        "district": "Madureira",
        "city": "Rio de Janeiro",
    }
    test_gaps = [
        {"title": "Site invisivel para o Google", "severity": "🔴 Crítico"},
        {"title": "Reputacao 4.9★ nao usada no site", "severity": "✅ Força"},
        {"title": "Oportunidade: periodontista Madureira sem concorrencia", "severity": "✅ Oportunidade"},
    ]

    print("🧠 LLM COPYWRITER — DeepSeek V4 Flash + Qwen 1.5B fallback\n")
    print(f"   Lead: {test_lead['title']}\n")

    t0 = time.time()
    result = generate_copy(test_lead, test_gaps)
    elapsed = time.time() - t0

    if result:
        print(f"✅ {result['model']} · {elapsed:.1f}s · {result.get('tokens', '?')} tokens")
        print(f"   Headline: {result['headline']}")
        print(f"   Subtitle: {result['subtitle']}")
        print(f"   CTA:      {result['cta']}")
    else:
        print(f"❌ Todos os provedores falharam. Use templates.")
