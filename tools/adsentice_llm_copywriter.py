#!/usr/bin/env python3
"""
adsentice_llm_copywriter.py — LLM Copywriter para S10 Raio-X
═══════════════════════════════════════════════════════════
Usa Qwen 2.5 1.5B local (GGUF, $0) para gerar copy personalizada
para cada lead, substituindo templates hardcoded.

Arquitetura:
  Qwen local (llama-cli, :8089 futuro) → copy pt-BR natural
  Fallback: templates do NICHO_MAP/PERSONA_MAP

Uso:
  python3 tools/adsentice_llm_copywriter.py --lead data.json

medido=verdade · 2026-07-15 · adsentice
"""

import json, os, subprocess, re, sys, time
from pathlib import Path

LLAMA_CLI = "/media/jeffer/RSXT/llama-runtime/bin/llama-cli"
LLAMA_LIB = "/media/jeffer/RSXT/llama-runtime/bin"
MODEL = "/media/jeffer/RSXT/models/qwen2.5-1.5b-instruct-q4_k_m.gguf"

def build_prompt(lead: dict, gaps: list) -> str:
    """Constrói o prompt para o Qwen usando o template chat Qwen 2.5."""
    name = lead.get("title", "Empreendedor")
    cat = lead.get("category", "negócio")
    score = lead.get("score_compound", 50)
    level = lead.get("schwartz_label", "Problem Aware")
    district = lead.get("district", "sua região") or "sua região"
    city = lead.get("city", "sua cidade") or "sua cidade"
    rating = lead.get("rating_value", 0) or 0
    reviews = lead.get("rating_votes", 0) or 0

    # Schwartz level → tone hint
    tone_hints = {
        "Unaware": "Tom educativo: ela não sabe que tem um problema. Explique de forma simples o que está perdendo.",
        "Problem Aware": "Tom de urgência: ela sabe que tem poucos pacientes mas não sabe resolver. Mostre que a solução existe.",
        "Solution Aware": "Tom comparativo: ela já ouviu falar de SEO/Google Ads. Mostre que adsentice é melhor e mais barato que agências.",
        "Product Aware": "Tom de prova social: ela conhece adsentice. Use cases de sucesso e depoimentos.",
        "Most Aware": "Tom de fechamento: ela já decidiu. Remova a última objeção.",
    }
    tone = tone_hints.get(level, tone_hints["Problem Aware"])

    gaps_text = "\n".join(f"- {g['title']} ({g['severity']})" for g in gaps[:3])

    return f"""<|im_start|>system
Você é um copywriter sênior especializado em marketing digital para pequenos negócios brasileiros. Você escreve copy para relatórios de diagnóstico digital (Raio-X).

REGRAS:
- Português brasileiro natural, como se estivesse conversando pessoalmente
- Use o primeiro nome da pessoa quando mencionado
- Mencione o bairro e a especialidade
- Sem jargão técnico (SEO, schema, backlink, SERP)
- Foco em BENEFÍCIO para o cliente, não em termos técnicos
- Frases curtas (até 20 palavras)
- Headline: 1 frase impactante (até 100 caracteres)
- Subtitle: 1-2 frases explicativas (até 150 caracteres)
- CTA: 1 chamada para ação clara (até 60 caracteres)
- {tone}<|im_end|>
<|im_start|>user
Escreva APENAS um JSON com headline, subtitle, cta para o relatório de diagnóstico de:
- Nome: {name}
- Especialidade: {cat}
- Bairro: {district}, {city}
- Score de presença digital: {score}/100
- Avaliação no Google: {rating} estrelas, {reviews} avaliações
- Nível: {level}

Gaps encontrados:
{gaps_text}

Responda APENAS o JSON, sem aspas extras, sem explicações.<|im_end|>
<|im_start|>assistant
""" + "{"

def generate_copy(lead: dict, gaps: list, timeout=120) -> dict:
    """Gera copy via Qwen local. Retorna {headline, subtitle, cta} ou None se falhar."""
    prompt = build_prompt(lead, gaps)

    env = os.environ.copy()
    env["LD_LIBRARY_PATH"] = LLAMA_LIB

    try:
        proc = subprocess.Popen(
            [LLAMA_CLI,
             "-m", MODEL,
             "-n", "300",
             "-t", "4",
             "--temp", "0.7",
             "--top-p", "0.9",
             "--ctx-size", "2048"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            env=env,
            text=True,
        )

        # Send prompt + exit command
        full_input = prompt + "\n/exit\n"
        stdout, _ = proc.communicate(input=full_input, timeout=timeout)

        # Extract JSON from output.
        # llama-cli generates the same response twice (prompt echo + actual).
        # Find ALL JSON objects with "headline" and take the first one.
        import re
        matches = re.findall(r'\{[^{}]*"headline"[^{}]*\}', stdout)
        for m in matches:
            try:
                result = json.loads(m)
                if result.get("headline") and result.get("cta"):
                    return {
                        "headline": str(result.get("headline", "")),
                        "subtitle": str(result.get("subtitle", "")),
                        "cta": str(result.get("cta", "")),
                    }
            except json.JSONDecodeError:
                continue

    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
        pass  # fallback to templates

    return None


# ═══════════════════════════════════════════════════════════════
# MAIN — test standalone
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Test lead from Supabase
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
        {"title": "Sem Schema LocalBusiness no site", "severity": "🔴 Crítico"},
        {"title": "Reputação excepcional (4.9★) não usada no site", "severity": "✅ Força"},
        {"title": "Oportunidade: 'periodontista Madureira' sem concorrência", "severity": "✅ Oportunidade"},
    ]

    print("🧠 LLM COPYWRITER — Qwen 2.5 1.5B ($0)")
    print(f"   Lead: {test_lead['title']}")
    print()

    t0 = time.time()
    copy = generate_copy(test_lead, test_gaps)
    elapsed = time.time() - t0

    if copy:
        print(f"✅ Copy gerada em {elapsed:.1f}s:")
        print(f"   Headline: {copy['headline']}")
        print(f"   Subtitle: {copy['subtitle']}")
        print(f"   CTA:      {copy['cta']}")
    else:
        print(f"❌ Falhou. Usando template fallback.")
