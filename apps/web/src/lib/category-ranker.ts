// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Category Ranker (Stage 0)
// Engine que descobre QUAL categoria tem mais leads com dor na região
// SEM input manual de nicho — o dado REAL decide, não a intuição.
// ══════════════════════════════════════════════════════════════════

import type { GeoLocation, PainFilters } from "./discovery"
import { createDb, type DbClient } from "@adsentice/db"

// ── Types ────────────────────────────────────────────────────

export interface CategoryInfo {
  id: string              // "clinica_estetica", "dentista", "restaurante"
  label: string           // "Clínicas Estéticas"
  gmbCategories: string[] // ["medical_aesthetic_clinic", "beauty_salon", "spa"]
}

export interface CategoryScore {
  category: CategoryInfo
  totalBusinesses: number   // quantos negócios existem na região
  sampledCount: number      // quantos foram amostrados
  painPercentage: number    // % dos amostrados com dor alta (>60)
  avgRating: number         // média de rating dos amostrados
  websitePercentage: number // % com website
  whatsappPercentage: number // % com WhatsApp
  avgSeoCoverage: number    // cobertura SEO média
  rank: number              // posição no ranking
  leadsEstimated: number    // leads potenciais (total × pain%)
}

export interface RankerParams {
  region: GeoLocation
  filters?: PainFilters
  sampleSize?: number       // default: 5 por categoria
  minPainScore?: number     // default: 60 — lead com dor ≥ 60
  categories?: CategoryInfo[] // se omitir, usa catálogo completo
}

export interface RankerResult {
  params: RankerParams
  regionName: string        // "São Paulo, raio 10km"
  categoriesTested: number
  categoriesRanked: CategoryScore[]
  topCategory: CategoryScore
  totalMarketEstimate: number // total de negócios na região (todas categorias)
  totalLeadsEstimate: number  // total de leads potenciais (pain ≥ threshold)
  persistedAt: string        // blob key no R2
  tookMs: number
}

// ── Brazilian SMB Category Catalog ──────────────────────────

export const BRAZILIAN_SMB_CATEGORIES: CategoryInfo[] = [
  // ── Saúde & Beleza ──
  { id: "clinica_estetica", label: "Clínicas Estéticas", gmbCategories: ["medical_aesthetic_clinic", "beauty_salon", "spa", "skin_care_clinic"] },
  { id: "dentista", label: "Dentistas", gmbCategories: ["dentist", "dental_clinic", "orthodontist", "oral_surgeon"] },
  { id: "clinica_medica", label: "Clínicas Médicas", gmbCategories: ["medical_clinic", "doctor", "general_practitioner"] },
  { id: "veterinario", label: "Veterinários", gmbCategories: ["veterinarian", "animal_hospital", "pet_store"] },
  { id: "farmacia", label: "Farmácias", gmbCategories: ["pharmacy", "drug_store"] },
  { id: "academia", label: "Academias", gmbCategories: ["gym", "fitness_center", "yoga_studio", "pilates_studio"] },
  { id: "barbearia_salao", label: "Barbearias & Salões", gmbCategories: ["barber_shop", "hair_salon", "beauty_salon"] },
  { id: "psicologo", label: "Psicólogos", gmbCategories: ["psychologist", "therapist", "counselor"] },
  { id: "fisioterapeuta", label: "Fisioterapeutas", gmbCategories: ["physical_therapist", "physiotherapist"] },
  { id: "nutricionista", label: "Nutricionistas", gmbCategories: ["nutritionist", "dietitian"] },

  // ── Alimentação ──
  { id: "restaurante", label: "Restaurantes", gmbCategories: ["restaurant", "brazilian_restaurant", "italian_restaurant", "japanese_restaurant"] },
  { id: "pizzaria", label: "Pizzarias", gmbCategories: ["pizza_restaurant", "pizza_delivery"] },
  { id: "lanchonete", label: "Lanchonetes", gmbCategories: ["hamburger_restaurant", "fast_food_restaurant", "snack_bar"] },
  { id: "padaria", label: "Padarias", gmbCategories: ["bakery", "coffee_shop", "cafe"] },
  { id: "acai_sorvete", label: "Açaí & Sorveterias", gmbCategories: ["ice_cream_shop", "dessert_shop"] },
  { id: "bar", label: "Bares", gmbCategories: ["bar", "pub", "cocktail_bar"] },

  // ── Serviços Profissionais ──
  { id: "advogado", label: "Advogados", gmbCategories: ["lawyer", "law_firm", "attorney"] },
  { id: "contador", label: "Contadores", gmbCategories: ["accountant", "accounting_firm", "tax_preparation"] },
  { id: "arquiteto", label: "Arquitetos", gmbCategories: ["architect", "architecture_firm", "interior_designer"] },
  { id: "engenheiro", label: "Engenheiros", gmbCategories: ["engineer", "engineering_firm", "civil_engineer"] },
  { id: "consultoria", label: "Consultorias", gmbCategories: ["business_consultant", "marketing_agency", "consulting_firm"] },
  { id: "ti", label: "TI & Desenvolvimento", gmbCategories: ["software_company", "it_services", "web_designer", "computer_repair"] },
  { id: "imobiliaria", label: "Imobiliárias", gmbCategories: ["real_estate_agency", "property_management", "real_estate_developer"] },
  { id: "corretor_seguros", label: "Corretores de Seguros", gmbCategories: ["insurance_agency", "insurance_broker"] },

  // ── Construção & Reparos ──
  { id: "construtora", label: "Construtoras", gmbCategories: ["construction_company", "general_contractor", "home_builder"] },
  { id: "eletricista", label: "Eletricistas", gmbCategories: ["electrician", "electrical_contractor"] },
  { id: "encanador", label: "Encanadores", gmbCategories: ["plumber", "plumbing_service"] },
  { id: "marceneiro", label: "Marceneiros", gmbCategories: ["carpenter", "furniture_maker", "cabinet_maker"] },
  { id: "pintor", label: "Pintores", gmbCategories: ["painter", "painting_contractor"] },
  { id: "vidracaria", label: "Vidraçarias", gmbCategories: ["glass_shop", "glass_repair", "window_installer"] },
  { id: "chaveiro", label: "Chaveiros", gmbCategories: ["locksmith", "key_shop"] },
  { id: "dedetizadora", label: "Dedetizadoras", gmbCategories: ["pest_control_service"] },
  { id: "marmoraria", label: "Marmorarias", gmbCategories: ["marble_contractor", "stone_supplier", "countertop_store"] },
  { id: "serralheria", label: "Serralherias", gmbCategories: ["metal_workshop", "metal_fabricator", "welder"] },
  { id: "gesso_drywall", label: "Gesseiros & Drywall", gmbCategories: ["dry_wall_contractor", "plasterer"] },

  // ── Automotivo ──
  { id: "oficina_mecanica", label: "Oficinas Mecânicas", gmbCategories: ["auto_repair_shop", "car_repair", "mechanic"] },
  { id: "auto_eletrico", label: "Auto Elétrico", gmbCategories: ["auto_electrician", "car_battery_store"] },
  { id: "martelinho_ouro", label: "Martelinho de Ouro", gmbCategories: ["auto_body_shop", "dent_repair", "car_painting"] },
  { id: "lava_jato", label: "Lava Jato", gmbCategories: ["car_wash", "car_detailing"] },
  { id: "borracharia", label: "Borracharia", gmbCategories: ["tire_shop", "wheel_shop"] },

  // ── Eventos ──
  { id: "buffet", label: "Buffets", gmbCategories: ["catering_service", "buffet_restaurant"] },
  { id: "decorador_eventos", label: "Decoradores de Eventos", gmbCategories: ["event_planner", "party_planner", "wedding_planner"] },
  { id: "fotografo", label: "Fotógrafos", gmbCategories: ["photographer", "photography_studio", "wedding_photographer"] },
  { id: "dj_banda", label: "DJs & Bandas", gmbCategories: ["dj", "band", "musician"] },
  { id: "locacao_moveis", label: "Locação de Móveis", gmbCategories: ["party_equipment_rental", "furniture_rental"] },

  // ── Pets ──
  { id: "pet_shop", label: "Pet Shops", gmbCategories: ["pet_store", "pet_supply_store"] },
  { id: "banho_tosa", label: "Banho & Tosa", gmbCategories: ["pet_groomer", "dog_groomer"] },
  { id: "hotel_pet", label: "Hotel Pet", gmbCategories: ["pet_boarding", "pet_sitter", "dog_daycare"] },

  // ── Educação ──
  { id: "escola_particular", label: "Escolas Particulares", gmbCategories: ["private_school", "elementary_school", "high_school"] },
  { id: "escola_idiomas", label: "Escolas de Idiomas", gmbCategories: ["language_school", "english_school"] },
  { id: "escola_musica", label: "Escolas de Música", gmbCategories: ["music_school", "music_instructor"] },
  { id: "reforco_escolar", label: "Reforço Escolar", gmbCategories: ["tutoring_service", "learning_center"] },
  { id: "cursos_profissionalizantes", label: "Cursos Profissionalizantes", gmbCategories: ["vocational_school", "trade_school"] },

  // ── Outros Serviços Locais ──
  { id: "lavanderia", label: "Lavanderias", gmbCategories: ["laundry_service", "dry_cleaner"] },
  { id: "costureira", label: "Costureiras", gmbCategories: ["tailor", "seamstress", "alterations"] },
  { id: "sapataria", label: "Sapatarias", gmbCategories: ["shoe_repair", "shoe_store", "leather_goods"] },
]

// ── Category Ranker ──────────────────────────────────────────

export async function rankCategories(
  params: RankerParams
): Promise<RankerResult> {
  const startedAt = Date.now()
  const db = createDb("dev")
  const categories = params.categories || BRAZILIAN_SMB_CATEGORIES
  const sampleSize = params.sampleSize || 5
  const minPainScore = params.minPainScore || 60

  // ═══ L0: Persist ranking request (WRITE-AHEAD) ═══
  const runId = `category-rank/${params.region.lat},${params.region.lng}-${params.region.radiusKm}km`
  const blobKey = `${runId}/${new Date().toISOString().split("T")[0]}.json`

  await db.blob.put(blobKey, JSON.stringify({
    runId,
    params,
    categories: categories.map(c => c.id),
    startedAt: new Date().toISOString(),
  }))

  // ═══ L1: For each category, discover businesses ═══
  // TODO(v0.2): wire to EVO-API MCP business_listings_search
  // Para cada categoria: business_listings_search(categories, location_coordinate)
  // → retorna total_count e items[]

  const scores: CategoryScore[] = []
  let totalMarketEstimate = 0

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]

    // Simulando descoberta (MVP — wire no EVO-API MCP na mesma região)
    // No LIVE:
    // const listing = await evoMCP.call("business_listings_search", {
    //   categories: cat.gmbCategories,
    //   location_coordinate: `${params.region.lat},${params.region.lng},${params.region.radiusKm}`,
    //   limit: sampleSize * 3  // oversample pra ter margem após filtros
    // })
    // const total = listing?.total_count || 0
    // const items = listing?.items || []

    // MVP: tabela de mercado (dados estimados baseados em densidade SPRio)
    const estimatedDensity = DENSITY_ESTIMATES[cat.id] || 50
    const total = Math.round(estimatedDensity * (params.region.radiusKm / 10))

    // Simulamos amostragem: na vida real, os items vêm do DataForSEO
    const sampled: Array<{
      hasWebsite: boolean; ratingValue: number; totalReviews: number
      hasPhone: boolean; isWhatsApp: boolean; hasPhotos: boolean
      seoCoverage: number
    }> = []

    for (let s = 0; s < Math.min(sampleSize, total); s++) {
      sampled.push({
        hasWebsite: Math.random() > 0.3,   // ~70% tem website
        ratingValue: 3.0 + Math.random() * 2.0, // 3.0-5.0
        totalReviews: Math.floor(Math.random() * 120),
        hasPhone: Math.random() > 0.15,
        isWhatsApp: Math.random() > 0.4,
        hasPhotos: Math.random() > 0.25,
        seoCoverage: 20 + Math.random() * 60, // 20-80
      })
    }

    // ═══ L3: Score de dor por categoria ═══
    if (sampled.length === 0) continue

    let painCount = 0
    let totalRating = 0
    let websiteCount = 0
    let whatsappCount = 0
    let totalSeo = 0

    for (const biz of sampled) {
      if (biz.hasWebsite) websiteCount++
      if (biz.isWhatsApp) whatsappCount++
      totalRating += biz.ratingValue
      totalSeo += biz.seoCoverage

      // Pain detection (sem chamada ao EVO-API)
      let painScore = 0
      if (biz.seoCoverage < 70) painScore += 25   // SEO ruim = dor
      if (biz.ratingValue < 4.0) painScore += 25   // reputação baixa = dor
      if (biz.totalReviews < 10) painScore += 15   // poucas reviews = baixa presença
      if (!biz.hasWebsite) painScore += 20          // sem site = invisível
      if (!biz.hasPhotos) painScore += 10           // sem fotos = perfil pobre
      if (!biz.isWhatsApp) painScore += 5           // sem WhatsApp = difícil contato

      if (painScore >= minPainScore) painCount++
    }

    const score: CategoryScore = {
      category: cat,
      totalBusinesses: total,
      sampledCount: sampled.length,
      painPercentage: Math.round((painCount / sampled.length) * 100),
      avgRating: +(totalRating / sampled.length).toFixed(1),
      websitePercentage: Math.round((websiteCount / sampled.length) * 100),
      whatsappPercentage: Math.round((whatsappCount / sampled.length) * 100),
      avgSeoCoverage: Math.round(totalSeo / sampled.length),
      rank: 0,
      leadsEstimated: Math.round(total * (painCount / sampled.length)),
    }
    scores.push(score)
    totalMarketEstimate += total

    // ═══ PERSIST: salvar amostra no blob (imutável) ═══
    await db.blob.put(`${runId}/samples/${cat.id}.json`, JSON.stringify({
      category: cat.id,
      total,
      sampled: sampled.length,
      painCount,
      calculatedAt: new Date().toISOString(),
    }))

    // ═══ PERSIST: cada amostra no series (append-only) ═══
    for (const biz of sampled.slice(0, 3)) {
      await db.series.append({
        tenantId: "adsentice",
        capabilityId: "category_ranker.sample",
        inputHash: `${cat.id}_${Date.now()}`,
        blake3: `${cat.id}_sample_${Math.random().toString(36).slice(2, 10)}`,
        parsed: biz,
        costUsd: 0, // MVP: simulado, sem custo
        provider: "category_ranker",
        mode: "dev",
        status: "ok",
      })
    }
  }

  // ═══ RANK + OUTPUT ═══
  scores.sort((a, b) => b.painPercentage - a.painPercentage)
  scores.forEach((s, i) => s.rank = i + 1)

  // ═══ PERSIST: ranking final (imutável) ═══
  const result: RankerResult = {
    params,
    regionName: `${params.region.lat.toFixed(2)},${params.region.lng.toFixed(2)} · ${params.region.radiusKm}km`,
    categoriesTested: categories.length,
    categoriesRanked: scores,
    topCategory: scores[0],
    totalMarketEstimate,
    totalLeadsEstimate: scores.slice(0, 10).reduce((s, c) => s + c.leadsEstimated, 0),
    persistedAt: blobKey,
    tookMs: Date.now() - startedAt,
  }

  await db.blob.put(blobKey, JSON.stringify(result))
  return result
}

// ── Density Estimates (negócios por km² em região metropolitana SP) ──

const DENSITY_ESTIMATES: Record<string, number> = {
  clinica_estetica: 120,
  dentista: 340,
  clinica_medica: 280,
  veterinario: 150,
  farmacia: 420,
  academia: 200,
  barbearia_salao: 580,
  psicologo: 310,
  fisioterapeuta: 180,
  nutricionista: 140,
  restaurante: 890,
  pizzaria: 320,
  lanchonete: 480,
  padaria: 360,
  acai_sorvete: 250,
  bar: 610,
  advogado: 390,
  contador: 220,
  arquiteto: 80,
  engenheiro: 70,
  consultoria: 130,
  ti: 110,
  imobiliaria: 170,
  corretor_seguros: 90,
  construtora: 60,
  eletricista: 150,
  encanador: 120,
  marceneiro: 70,
  pintor: 140,
  vidracaria: 50,
  chaveiro: 80,
  dedetizadora: 40,
  marmoraria: 45,
  serralheria: 55,
  gesso_drywall: 65,
  oficina_mecanica: 200,
  auto_eletrico: 60,
  martelinho_ouro: 80,
  lava_jato: 180,
  borracharia: 100,
  buffet: 70,
  decorador_eventos: 90,
  fotografo: 160,
  dj_banda: 50,
  locacao_moveis: 30,
  pet_shop: 200,
  banho_tosa: 140,
  hotel_pet: 60,
  escola_particular: 120,
  escola_idiomas: 140,
  escola_musica: 60,
  reforco_escolar: 90,
  cursos_profissionalizantes: 70,
  lavanderia: 100,
  costureira: 80,
  sapataria: 50,
}

// ── Quick test ─────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await rankCategories({
    region: { lat: -23.5505, lng: -46.6333, radiusKm: 10 },
    sampleSize: 5,
    minPainScore: 40,
  })

  console.log(`\n🏆 TOP 10 CATEGORIES (${result.regionName}):`)
  for (const c of result.categoriesRanked.slice(0, 10)) {
    const bar = "█".repeat(Math.round(c.painPercentage / 5))
    console.log(`  ${c.rank.toString().padStart(2)}. ${c.category.label.padEnd(25)} ${bar.padEnd(20)} ${c.painPercentage}% pain · ${c.leadsEstimated} leads`)
  }
  console.log(`\n  Total: ${result.totalMarketEstimate.toLocaleString("pt-BR")} negócios · ${result.totalLeadsEstimate.toLocaleString("pt-BR")} leads potenciais`)
  console.log(`  Persistido em: ${result.persistedAt}`)
}
