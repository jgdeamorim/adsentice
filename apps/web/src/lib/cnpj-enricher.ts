// ══════════════════════════════════════════════════════════════════
// ADSENTICE · CNPJ Enricher — extrai CNPJ do site + lookup ReceitaWS
// Lei 14.195/2021 obriga exibição de CNPJ no site de toda empresa BR.
// Estratégia: extrair CNPJ do footer → ReceitaWS (CNAE, sócios, regime).
//
// Pipeline:
//   L3 content_parsing → texto do site
//   → extractCNPJFromText(text) → CNPJ
//   → lookupCNPJ(cnpj) → ReceitaWS (primário) + Brasil API (fallback)
//   → enriquece lead com CNAE validado, regime tributário, sócios
//
// medido=verdade · ADR-0027 · 2026-07-16 · adsentice
// ══════════════════════════════════════════════════════════════════

import "server-only"

// ── Types ─────────────────────────────────────────────────────

export interface CNPJData {
  cnpj: string
  razao_social: string | null
  nome_fantasia: string | null
  cnae_principal: string | null            // CNAE fiscal (ex: "8630-5/00")
  cnae_descricao: string | null            // Descrição do CNAE
  cnaes_secundarios: string[]              // CNAEs secundários
  regime_simples: boolean | null
  regime_mei: boolean | null
  capital_social: number | null
  data_abertura: string | null             // "DD/MM/AAAA"
  porte: string | null                     // MEI, ME, EPP, DEMAIS
  natureza_juridica: string | null
  socios: string[]                         // Nomes dos sócios
  logradouro: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  telefone: string | null
  email: string | null
  situacao: string | null                  // ATIVA, BAIXADA, etc.
  fonte: "receitaws" | "brasilapi"         // Qual API forneceu os dados
}

// ── CNPJ Extraction (regex) ─────────────────────────────────────

const CNPJ_REGEX = /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g

/** Extrai números de CNPJ do texto do site. Retorna o primeiro encontrado (limpo). */
export function extractCNPJFromText(text: string): string | null {
  if (!text) return null

  // Busca todos os matches
  const matches = text.matchAll(CNPJ_REGEX)

  for (const match of matches) {
    const raw = match[1]
    const cleaned = raw.replace(/[./\-]/g, "") // remove máscara → 14 dígitos

    if (cleaned.length === 14 && isValidCNPJ(cleaned)) {
      return cleaned
    }
  }

  return null
}

/** Valida dígitos verificadores do CNPJ (algoritmo da Receita Federal). */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "")

  if (digits.length !== 14) return false

  // CNPJs com todos dígitos iguais são inválidos
  if (/^(\d)\1{13}$/.test(digits)) return false

  // Validação dos dígitos verificadores
  const calc = (baseIndex: number) => {
    let sum = 0

    const weights = baseIndex === 0
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(digits[i]) * weights[i]
    }

    const remainder = sum % 11

    return remainder < 2 ? 0 : 11 - remainder
  }

  const dv1 = calc(0)

  if (dv1 !== parseInt(digits[12])) return false

  const dv2 = calc(1)

  if (dv2 !== parseInt(digits[13])) return false

  return true
}

// ── CNPJ Lookup (ReceitaWS) ─────────────────────────────────────

const RECEITAWS_TOKEN = process.env.RECEITAWS_TOKEN || ""
const RECEITAWS_URL = "https://www.receitaws.com.br/v1/cnpj"

/** Busca dados de CNPJ na ReceitaWS (primário). */
async function lookupReceitaWS(cnpj: string): Promise<CNPJData | null> {
  if (!RECEITAWS_TOKEN) return null

  try {
    const url = `${RECEITAWS_URL}/${cnpj}?token=${RECEITAWS_TOKEN}`

    const res = await fetch(url, {
      headers: { "User-Agent": "adsentice/1.0" },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null
    const data = await res.json()

    if (data.status !== "OK") return null

    return {
      cnpj: data.cnpj || cnpj,
      razao_social: data.nome || null,
      nome_fantasia: data.fantasia || null,
      cnae_principal: data.atividade_principal?.[0]?.code || null,
      cnae_descricao: data.atividade_principal?.[0]?.text || null,
      cnaes_secundarios: (data.atividades_secundarias || []).map((a: any) => a.code),
      regime_simples: data.simples?.optante ?? null,
      regime_mei: data.simei?.optante ?? null,
      capital_social: parseFloat(data.capital_social) || null,
      data_abertura: data.abertura || null,
      porte: data.porte || null,
      natureza_juridica: data.natureza_juridica || null,
      socios: (data.qsa || []).map((s: any) => s.nome),
      logradouro: data.logradouro || null,
      numero: data.numero || null,
      bairro: data.bairro || null,
      cidade: data.municipio || null,
      uf: data.uf || null,
      cep: data.cep || null,
      telefone: data.telefone || null,
      email: data.email || null,
      situacao: data.situacao || null,
      fonte: "receitaws",
    }
  } catch { return null }
}

// ── CNPJ Lookup (Brasil API — fallback) ─────────────────────────

const BRASIL_API_URL = "https://brasilapi.com.br/api/cnpj/v1"

/** Busca dados de CNPJ na Brasil API (fallback). */
async function lookupBrasilAPI(cnpj: string): Promise<CNPJData | null> {
  try {
    const url = `${BRASIL_API_URL}/${cnpj}`

    const res = await fetch(url, {
      headers: { "User-Agent": "adsentice/1.0" },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null
    const data = await res.json()

    return {
      cnpj: data.cnpj || cnpj,
      razao_social: data.razao_social || null,
      nome_fantasia: data.nome_fantasia || null,
      cnae_principal: data.cnae_fiscal ? String(data.cnae_fiscal) : null,
      cnae_descricao: data.cnae_fiscal_descricao || null,
      cnaes_secundarios: (data.cnaes_secundarios || []).map((c: any) => String(c.codigo || c)),
      regime_simples: data.opcao_pelo_simples ?? null,
      regime_mei: data.opcao_pelo_mei ?? null,
      capital_social: parseFloat(String(data.capital_social || "0")) || null,
      data_abertura: data.data_inicio_atividade || null,
      porte: data.descricao_porte || data.porte || null,
      natureza_juridica: data.natureza_juridica || null,
      socios: (data.qsa || []).map((s: any) => s.nome_socio || s.nome || "").filter(Boolean),
      logradouro: data.logradouro
        ? `${data.descricao_tipo_de_logradouro || ""} ${data.logradouro}`.trim() || null
        : null,
      numero: data.numero || null,
      bairro: data.bairro || null,
      cidade: data.municipio || null,
      uf: data.uf || null,
      cep: data.cep || null,
      telefone: [data.ddd_telefone_1, data.ddd_telefone_2]
        .filter(Boolean)
        .map((t: string) => `(${t.slice(0, 2)}) ${t.slice(2)}`)
        .join(" / ") || null,
      email: data.email || null,
      situacao: data.descricao_situacao_cadastral || null,
      fonte: "brasilapi",
    }
  } catch { return null }
}

// ── Main Lookup ──────────────────────────────────────────────────

const _cache: Record<string, { ts: number; data: CNPJData | null }> = {}
const CACHE_TTL = 86400_000  // 24h — CNPJ não muda com frequência

/** Busca CNPJ: ReceitaWS → Brasil API (fallback). Cache 24h. */
export async function lookupCNPJ(cnpj: string): Promise<CNPJData | null> {
  const raw = cnpj.replace(/\D/g, "")

  if (raw.length !== 14 || !isValidCNPJ(raw)) return null

  const now = Date.now()
  const cached = _cache[raw]

  if (cached && (now - cached.ts) < CACHE_TTL) return cached.data

  // 1. ReceitaWS (primário)
  const data = await lookupReceitaWS(raw)

  // 2. Brasil API (fallback)
  const result = data || (await lookupBrasilAPI(raw))

  _cache[raw] = { ts: now, data: result }

  return result
}

// ── Scoring: CNPJ → Ticket Qualification ────────────────────────

export interface CNPJScore {
  cnpj_validated: boolean                 // CNPJ real confirmado
  cnae_match: boolean                     // CNAE bate com categoria esperada
  regime_qualifica: "gold" | "silver" | "bronze" | "unqualified"
  ticket_ajustado: number | null          // Ticket ajustado pelo regime
  socios_conhecidos: number               // Quantos sócios identificados
  anos_atividade: number | null           // Anos desde abertura
  capital_score: number                   // 0-100 baseado no capital social
}

/**
 * Calcula score de qualificação baseado nos dados do CNPJ.
 * Regime → ticket potencial (MEI=R$47, Simples=R$197, Outros=R$497)
 */
export function scoreCNPJLead(
  cnpjData: CNPJData | null,
  expectedCNAE?: string[]
): CNPJScore {
  if (!cnpjData) {
    return {
      cnpj_validated: false,
      cnae_match: false,
      regime_qualifica: "unqualified",
      ticket_ajustado: null,
      socios_conhecidos: 0,
      anos_atividade: null,
      capital_score: 0,
    }
  }

  // CNAE match check
  const cnaePrefix = cnpjData.cnae_principal?.replace(/\D/g, "")?.slice(0, 4) || ""

  const cnaeMatch = expectedCNAE
    ? expectedCNAE.some(c => cnaePrefix.startsWith(c.replace(/\D/g, "").slice(0, 4)))
    : true  // sem expectedCNAE, assume match

  // Regime → ticket
  let regimeQualifica: CNPJScore["regime_qualifica"] = "unqualified"
  let ticketAjustado: number | null = null

  if (cnpjData.regime_mei) {
    regimeQualifica = "bronze"
    ticketAjustado = 47   // Plano Starter
  } else if (cnpjData.regime_simples) {
    regimeQualifica = "silver"
    ticketAjustado = 197  // Plano Pro
  } else if (cnpjData.capital_social && cnpjData.capital_social > 100000) {
    regimeQualifica = "gold"
    ticketAjustado = 497  // Plano Escala
  } else {
    regimeQualifica = "bronze"
    ticketAjustado = 47
  }

  // Capital score (0-100)
  const capital = cnpjData.capital_social || 0

  let capitalScore = 0

  if (capital > 1_000_000) capitalScore = 100
  else if (capital > 500_000) capitalScore = 80
  else if (capital > 100_000) capitalScore = 60
  else if (capital > 50_000) capitalScore = 40
  else if (capital > 10_000) capitalScore = 20
  else capitalScore = 5

  // Anos de atividade
  let anosAtividade: number | null = null

  if (cnpjData.data_abertura) {
    const parts = cnpjData.data_abertura.split("/")  // DD/MM/AAAA

    if (parts.length === 3) {
      const abertura = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)

      anosAtividade = Math.floor((Date.now() - abertura.getTime()) / (365.25 * 86400_000))
    }
  }

  return {
    cnpj_validated: true,
    cnae_match: cnaeMatch,
    regime_qualifica: regimeQualifica,
    ticket_ajustado: ticketAjustado,
    socios_conhecidos: cnpjData.socios.length,
    anos_atividade: anosAtividade,
    capital_score: capitalScore,
  }
}

// ── Batch enrichment ──────────────────────────────────────────────

export interface LeadWithCNPJ {
  cnpj_raw: string | null                 // CNPJ extraído do site
  cnpj_data: CNPJData | null              // Dados completos da ReceitaWS
  cnpj_score: CNPJScore                   // Score de qualificação
}

/**
 * Enriquece um lead com dados CNPJ a partir do website e/ou nome.
 * Pipeline: extractCNPJ → lookupCNPJ → scoreCNPJ.
 */
export async function enrichLeadCNPJ(
  websiteContent: string | null,
  expectedCNAE?: string[]
): Promise<LeadWithCNPJ> {
  // 1. Extrair CNPJ do texto do site
  const cnpjRaw = websiteContent ? extractCNPJFromText(websiteContent) : null

  // 2. Lookup na ReceitaWS (se CNPJ encontrado)
  const cnpjData = cnpjRaw ? await lookupCNPJ(cnpjRaw) : null

  // 3. Score de qualificação
  const cnpjScore = scoreCNPJLead(cnpjData, expectedCNAE)

  return { cnpj_raw: cnpjRaw, cnpj_data: cnpjData, cnpj_score: cnpjScore }
}

// ── Unit test (autovalidado em cada build) ────────────────────────

if (process.env.NODE_ENV === "development") {
  // Validação da regex de extração
  void function test() {
    const samples = [
      "CNPJ: 27.865.757/0001-02 — Globo Comunicação",
      "CNPJ 12.345.678/0001-90",                                    // dígitos inválidos
      "© 2024 Clínica XPTO Ltda — CNPJ 05.670.957/0001-44",
      "Documentação no footer: cnpj 27865757000102",
    ]

    for (const s of samples) {
      const result = extractCNPJFromText(s)

      console.log(`[cnpj-enricher] test: "${s.slice(0, 50)}" → ${result || "null"}`)
    }
  }()
}
