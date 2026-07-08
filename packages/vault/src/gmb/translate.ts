// adsentice · GMB rich translator — os 39 campos de 1º nível do item my_business_info (+ sub-campos dos objetos).
// MEDIDO (DataForSEO /v3/business_data/google/my_business_info/live · provider-root do EVO-API · não inventado).
// O antigo canonical expunha só 10 → aqui TODOS. Defensivo (nullable) · nunca lança em campo faltando.

/** A ficha rica do Google Meu Negócio — canonical, provider-independent, pronta pro score. */
export interface GmbProfile {
  // identidade / posição
  title: string | null;
  original_title: string | null;
  description: string | null;         // a descrição da ficha
  snippet: string | null;
  cid: string | null;
  feature_id: string | null;
  place_id: string | null;
  rank_group: number | null;
  rank_absolute: number | null;
  // categoria
  category: string | null;
  category_ids: string[];
  additional_categories: string[];
  // contato / digital
  phone: string | null;
  url: string | null;                 // o WEBSITE (antes não expúnhamos)
  domain: string | null;
  contact_url: string | null;
  contributor_url: string | null;
  book_online_url: string | null;     // agendamento online
  local_business_links: Record<string, unknown> | null; // reservar/pedir/menu…
  // endereço / geo
  address: string | null;
  address_info: GmbAddressInfo | null;
  latitude: number | null;
  longitude: number | null;
  // visual
  logo: string | null;
  main_image: string | null;
  total_photos: number | null;
  // reputação
  rating: GmbRating | null;
  rating_distribution: Record<string, number> | null; // {1:.,2:.,...,5:.}
  hotel_rating: string | null;
  price_level: string | null;
  place_topics: Record<string, number> | null;        // keyword → nº de menções nas reviews
  // operação
  work_time: Record<string, unknown> | null;
  popular_times: Record<string, unknown> | null;
  is_claimed: boolean | null;                          // false = LEAD QUENTE
  attributes: Record<string, unknown> | null;          // delivery/serviços/pagamento/acessibilidade…
  is_directory_item: boolean | null;
  directory: Record<string, unknown> | null;
  // preservação: o cru fica no cofre (R2); aqui um ponteiro de sanidade
  raw_type: string | null;
}

export interface GmbAddressInfo {
  borough: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  region: string | null;
  country_code: string | null;
}

export interface GmbRating {
  rating_type: string | null;
  value: number | null;               // a nota (ex 3.8)
  votes_count: number | null;         // nº de avaliações
  rating_max: number | null;          // normalmente 5
}

// ── helpers defensivos ──
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const arrStr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

function addressInfo(v: unknown): GmbAddressInfo | null {
  const o = obj(v);
  if (!o) return null;
  return {
    borough: str(o.borough),
    address: str(o.address),
    city: str(o.city),
    zip: str(o.zip),
    region: str(o.region),
    country_code: str(o.country_code),
  };
}

function rating(v: unknown): GmbRating | null {
  const o = obj(v);
  if (!o) return null;
  return {
    rating_type: str(o.rating_type),
    value: num(o.value),
    votes_count: num(o.votes_count),
    rating_max: num(o.rating_max) ?? 5,
  };
}

function ratingDistribution(v: unknown): Record<string, number> | null {
  const o = obj(v);
  if (!o) return null;
  const out: Record<string, number> = {};
  for (const k of Object.keys(o)) {
    const n = num(o[k]);
    if (n !== null) out[k] = n;
  }
  return Object.keys(out).length ? out : null;
}

function placeTopics(v: unknown): Record<string, number> | null {
  const o = obj(v);
  if (!o) return null;
  const out: Record<string, number> = {};
  for (const k of Object.keys(o)) {
    const n = num(o[k]);
    if (n !== null) out[k] = n;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Traduz UM item cru do my_business_info → GmbProfile rico (todos os campos medidos).
 * Aceita tanto o item direto quanto o envelope (tasks[].result[].items[0]).
 */
export function translateGmbProfile(rawResponseOrItem: unknown): GmbProfile {
  const item = extractItem(rawResponseOrItem);
  return {
    title: str(item.title),
    original_title: str(item.original_title),
    description: str(item.description),
    snippet: str(item.snippet),
    cid: str(item.cid),
    feature_id: str(item.feature_id),
    place_id: str(item.place_id),
    rank_group: num(item.rank_group),
    rank_absolute: num(item.rank_absolute),
    category: str(item.category),
    category_ids: arrStr(item.category_ids),
    additional_categories: arrStr(item.additional_categories),
    phone: str(item.phone),
    url: str(item.url),
    domain: str(item.domain),
    contact_url: str(item.contact_url),
    contributor_url: str(item.contributor_url),
    book_online_url: str(item.book_online_url),
    local_business_links: obj(item.local_business_links),
    address: str(item.address),
    address_info: addressInfo(item.address_info),
    latitude: num(item.latitude),
    longitude: num(item.longitude),
    logo: str(item.logo),
    main_image: str(item.main_image),
    total_photos: num(item.total_photos),
    rating: rating(item.rating),
    rating_distribution: ratingDistribution(item.rating_distribution),
    hotel_rating: str(item.hotel_rating),
    price_level: str(item.price_level),
    place_topics: placeTopics(item.place_topics),
    work_time: obj(item.work_time),
    popular_times: obj(item.popular_times),
    is_claimed: bool(item.is_claimed),
    attributes: obj(item.attributes),
    is_directory_item: bool(item.is_directory_item),
    directory: obj(item.directory),
    raw_type: str(item.type),
  };
}

/** Desembrulha o envelope DataForSEO (tasks[].result[].items[0]) OU aceita o item direto. */
function extractItem(raw: unknown): Record<string, unknown> {
  const root = obj(raw);
  if (!root) return {};
  // já é o item?
  if ("title" in root || "place_id" in root || "is_claimed" in root) return root;
  const tasks = Array.isArray(root.tasks) ? root.tasks : [];
  const task = obj(tasks[0]);
  const result = task && Array.isArray(task.result) ? task.result : [];
  const res0 = obj(result[0]);
  const items = res0 && Array.isArray(res0.items) ? res0.items : [];
  return obj(items[0]) ?? {};
}
