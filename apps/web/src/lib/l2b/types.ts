// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Shared Types
// 29 categorias SMB · multi-nicho · agnóstico a segmento
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

export interface SiteFetcherResult {
  html: string
  statusCode: number
  finalUrl: string
  latencyMs: number
  headers: Record<string, string>
  error?: string
}

export interface ParsedSite {
  url: string
  domain: string
  title: string
  metaDescription: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  wordCount: number
  bodyText: string // primeiros 5000 chars
  schemaOrg: SchemaOrgItem[]
  headings: { tag: string; text: string }[]
  cssCustomProperties: Record<string, string>
  fontFamilies: string[]
  googleFontsLinks: string[]
  styleTags: string[]
  inlineStyles: string[]
  links: ParsedLink[]
  images: ParsedImage[]
  scripts: string[]
}

export interface ParsedLink {
  href: string
  text: string
  rel?: string
  isSocial: boolean
  platform?: string // "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin" | "whatsapp"
}

export interface ParsedImage {
  src: string
  alt?: string
  width?: number
  height?: number
}

export interface SchemaOrgItem {
  type: string // "LocalBusiness" | "MedicalBusiness" | "Organization" | ...
  data: Record<string, unknown>
}

export interface MinedContent {
  url: string
  domain: string
  title: string
  metaDescription: string
  wordCount: number
  services: string[]
  hasPrices: boolean
  hasBooking: boolean
  bookingPlatform: string | null
  hasWhatsApp: boolean
  whatsAppNumbers: string[]
  socialLinks: { instagram?: string; facebook?: string; tiktok?: string; youtube?: string; linkedin?: string }
  emails: string[]
  phones: string[]
  doctors: { name: string; crm?: string; specialty?: string }[]
  insurance: string[]
  hasTestimonials: boolean
  hasGallery: boolean
  schemaOrgTypes: string[]
  cmsSignatures: string[]
  frameworkSignals: Record<string, number[]>
}

export interface FrameworkDetection {
  framework: string
  renderMode: "ssr" | "csr" | "ssg" | "unknown"
  confidence: number
}

export interface DesignDNA {
  personality: {
    tone: "institucional" | "popular" | "premium" | "tecnico"
    emotion: "confianca" | "inovacao" | "acolhimento" | "autoridade"
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    surface: string
    textPrimary: string
    palette: string[] // top-5 deduped
  }
  typography: {
    heading: string
    body: string
    scale: string[]
    weights: number[]
  }
  visualStyle: {
    radius: "sharp" | "soft" | "rounded" | "pill"
    shadow: "none" | "subtle" | "medium" | "strong"
    photography: "human-centered" | "facility" | "stock" | "none"
    iconography: "outline" | "filled" | "custom" | "emoji"
  }
  score: number // 0-100
}

export interface ComponentDNA {
  sections: string[] // detectadas dos 20 padrões
  components: {
    button: { detected: boolean; variants: string[] }
    card: { detected: boolean; radius: number; shadow: string }
    form: { detected: boolean; style: string }
    nav: { type: "top" | "side" | "hamburger" | "none"; sticky: boolean }
    hero: { detected: boolean; type: "image" | "video" | "text-only" | "slider" }
    footer: { columns: number; hasSitemap: boolean; hasSocialLinks: boolean }
  }
}

export interface UXDNA {
  hierarchy: { clarity: number; consistency: number }
  navigation: { depth: number; hasBreadcrumb: boolean; hasSearch: boolean }
  readability: { contrastRatio: number; fontSize: number; lineHeight: number }
  accessibility: {
    hasAltText: boolean
    hasAriaLabels: boolean
    tabbable: boolean
    wcagLevel: "A" | "AA" | "AAA" | "unknown"
    score: number // 0-100
  }
  perceivedPerformance: {
    hasLazyLoading: boolean
    hasPreconnect: boolean
    fontDisplay: "swap" | "block" | "fallback" | "unknown"
    score: number // 0-100
  }
}

export interface ContentSignals {
  detected: string[]
  missing: string[]
  wordCount: number
  hasPrices: boolean
  hasBooking: boolean
  hasWhatsApp: boolean
  hasTestimonials: boolean
  hasGallery: boolean
  hasSchemaOrg: boolean
  servicePages: number
  blogActive: boolean
  blogLastPost?: string
  socialLinksCount: number
  designScore: number
  uxScore: number
  leadStory: string
}

export interface EnrichResult {
  domain: string
  extracted: boolean
  fetchedAt: string
  fetchLatencyMs: number
  confidence: number // 0-100
  mined: MinedContent
  framework: FrameworkDetection
  designDNA?: DesignDNA
  componentDNA?: ComponentDNA
  uxDNA?: UXDNA
  signals: ContentSignals
  error?: string
}

// ═══ Re-export the canonical ADR-0024 service types ═══
export const SERVICE_PATTERNS: Record<string, string[]> = {
  dentist: ["implante", "aparelho", "clareamento", "canal", "limpeza", "ortodontia", "protese", "lentes", "extraç"],
  orthodontist: ["aparelho", "ortodontia", "alinhador", "invisalign", "contenç"],
  medical_aesthetic_clinic: ["botox", "harmonização", "preenchimento", "peeling", "laser", "fio", "microagulhamento", "skinbooster"],
  medical_clinic: ["consulta", "checkup", "exame", "vacina", "telemedicina", "plantao"],
  restaurant: ["rodízio", "executivo", "almoço", "jantar", "buffet", "delivery", "reserva"],
  bakery: ["pão", "bolo", "doce", "salgado", "café", "encomenda", "confeitaria"],
  gym: ["musculação", "crossfit", "personal", "aula", "spinning", "funcional", "luta", "pilates"],
  lawyer: ["trabalhista", "civil", "tributário", "família", "criminal", "previdenciário", "empresarial"],
  barber_shop: ["corte", "barba", "hidratação", "pigmentação", "sobrancelha"],
  beauty_salon: ["corte", "coloração", "manicure", "pedicure", "depilação", "maquiagem", "sobrancelha"],
  veterinarian: ["consulta", "vacina", "cirurgia", "banho", "tosa", "internaç", "exame"],
  real_estate_agency: ["venda", "aluguel", "lançamento", "comercial", "residencial", "temporada"],
  accountant: ["abertura", "declaração", "folha", "tributário", "contábil", "fiscal", "mei"],
  car_repair: ["revisão", "freio", "suspensão", "motor", "câmbio", "elétrica", "ar.condicionado"],
  architect: ["projeto", "reforma", "regularização", "interiores", "residencial", "comercial"],
  electrician: ["instalação", "reparo", "emergência", "residencial", "industrial", "quadro"],
  plumber: ["vazamento", "instalação", "desentupimento", "caixa", "gás", "hidráulica"],
  cleaning_service: ["limpeza", "pós.obra", "comercial", "residencial", "vidro", "jardinagem"],
  school: ["matrícula", "ensino", "berçário", "infantil", "fundamental", "integral", "bilíngue"],
  hotel: ["reserva", "diária", "suíte", "café", "estacionamento", "piscina", "pet"],
  psychologist: ["terapia", "avaliação", "neuropsicolog", "cognitivo", "comportamental", "ansiedade"],
  physical_therapist: ["reabilitação", "pilates", "osteopatia", "acupuntura", "postural", "rpg"],
  pharmacy: ["manipulação", "genérico", "perfumaria", "entrega", "plantao", "medicamento"],
  pet_store: ["banho", "tosa", "ração", "brinquedo", "acessório", "hotelzinho"],
  interior_designer: ["projeto", "consultoria", "reforma", "mobiliário", "iluminação", "3d"],
  driving_school: ["primeira.habilitação", "renovação", "aula", "teórica", "prática", "simulado"],
  ophthalmologist: ["consulta", "cirurgia", "miopia", "catarata", "glaucoma", "lentes"],
  cardiologist: ["consulta", "exame", "teste", "checkup", "ecocardiograma", "holter"],
}
