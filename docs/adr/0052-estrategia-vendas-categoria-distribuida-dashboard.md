# ADR-0052 · Estratégia de Vendas por Categoria — Distribuída em Todo o Dashboard

**Status:** PROPOSED
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** Nenhum (novo)
**Extends:** ADR-0046 (Realinhamento), ADR-0049 (Discovery Layer), ADR-0050 (Category Intelligence), ADR-0051 (Auto-Pilot)
**Sources:** DAG completa — 6 categorias com dados (1,193 leads), 23 não-descobertas, Dashboard :3000, estratégia de vendas mapeada

---

## 1. Contexto

A sessão v154 identificou que das 29 categorias ICP, apenas 6 têm dados de leads (1,193 de 5,745). Para cada uma, mapeamos uma estratégia de vendas específica baseada em volume, score médio, maturidade digital e ticket. As 23 categorias restantes precisam ser prospectadas primeiro.

**Problema:** Essa inteligência de vendas está fragmentada. O founder sabe, o Auto-Pilot sabe, mas **nenhuma página do dashboard :3000 sabe**. Cada página vê uma fatia isolada — não a estratégia completa POR categoria.

---

## 2. Decisão

**Distribuir a Estratégia de Vendas por Categoria em cada página do dashboard :3000, de forma que o founder tenha o contexto completo de decisão independente de qual página está visitando.**

Não é criar uma página nova. É **injetar inteligência contextual** em cada uma das 9 páginas existentes, derivada dos dados reais da Category Intelligence + Auto-Pilot.

### 2.1 Matriz: o que cada página mostra HOJE vs o que DEVERIA mostrar

```
PÁGINA              MOSTRA HOJE                      DEVERIA MOSTRAR
─────────────────────────────────────────────────────────────────────────────
/admin/discovery    Formulário de busca manual      🎯 "Prospectar AGORA:"
                    (categorias + lat/lng + raio)    Dentista em Guarulhos
                                                     (54pts, ~35 leads est.)
                                                     [Executar Discovery]

/admin/categories   Não existe                      📊 Dashboard central:
(NOVA)                                               Todas as 29 categorias
                                                     com score, leads, gaps,
                                                     estratégia e ação

/admin/pipeline     Funil L0-L7 global               Funil POR categoria:
                                                     Dentista: S0=449 S1=...
                                                     Psicólogo: S0=644 S1=...
                                                     com runbooks específicos

/admin/criteria     87 sinais (catálogo estático)    Sinais ponderados POR
                                                     categoria: "Dentista pesa
                                                     W6(8pts) + I1(25pts)"
                                                     Triggers específicos

/admin/leads        Tabela plana com filtros         Segmentação por estratégia:
                                                     "💰 Melhor Oportunidade"
                                                     "📈 Volume" "💎 Premium"
                                                     Cards com insight

/admin/solutions    5 planos (Raio-X...Growth OS)    Recomendação POR lead:
                                                     "Dra. Ana: Sentinela
                                                     (score 72, 3 gaps)"
                                                     Upsell path visível

/admin/market       IBGE + cobertura + gaps          "📊 Inteligência de
                                                     Mercado por Categoria"
                                                     Top 6 com estratégia
                                                     23 a prospectar

/admin/surface      S10 + S11 tracking               Surface POR categoria:
                                                     "Dentista: 12 S10 gerados
                                                     → 3 S11-MK → 1 cliente"

/admin/dashboard    Não existe (só página inicial)   COCKPIT do founder:
(NOVA OU REFINAR)                                    1卡片 = 1 ação HOJE
                                                     "Prospectar X"
                                                     "Enviar Raio-X para Y"
                                                     "Follow-up Z"
```

---

## 3. Arquitetura de Injeção

Cada página recebe inteligência via **3 novas funções compartilhadas** em `category-intel.ts`:

```typescript
// category-intel.ts — novas funções (ADR-0052)

/** Estratégia completa de vendas para 1 categoria */
getCategorySalesStrategy(category: string): CategorySalesStrategy {
  // Retorna: { playbook, targetPlan, channel, pitchScript, upsellPath, kpis }
}

/** Ranking de leads por prioridade de ação (usa scoring + sinais + WA) */
rankLeadsByAction(category?: string): RankedLeadAction[] {
  // "Enviar Raio-X para Dra. Ana (score 72, WA Business)"
  // "Gerar S11-MK para Dr. João (website, score 65)"
}

/** Métricas de funil POR categoria */
getFunnelByCategory(): CategoryFunnelMetrics[] {
  // dentist: { S0:449, S1:120, S2:85, S3:30, S4:15, S5:5, S6:0, S7:0 }
}
```

---

## 4. Especificação por Página

### 4.1 `/admin/discovery` — Auto-Pilot integrado

```tsx
// Componente: <AutoPilotSuggestion />
// Dados: GET /api/auto-pilot/decide (já existe)

<Card sx={{ bgcolor: 'success.50', border: '2px solid', borderColor: 'success.main' }}>
  <Chip label="🎯 Recomendação do Auto-Pilot" color="success" />
  <Typography variant="h6">
    Prospectar {topPick.label} em {topPick.region.city}
  </Typography>
  <Typography variant="body2">
    Oportunidade {topPick.opportunityScore}/100 · ~{topPick.preflightEstimate} leads estimados
    · Custo: ${topPick.estimatedCost} · {topPick.estimatedROI}
  </Typography>
  <LinearProgress value={topPick.opportunityScore} />
  <Button variant="contained" href={`/admin/discovery?cat=${topPick.category}&city=${topPick.region.city}`}>
    Executar Discovery com esta configuração
  </Button>
</Card>
```

### 4.2 `/admin/categories` — NOVA PÁGINA · Dashboard Central

```tsx
// Rota: /admin/categories
// Dados: GET /api/category/intel (já existe) + getCategorySalesStrategy()

<Grid container spacing={3}>
  {/* Card por categoria com dados + estratégia */}
  {categories.map(cat => (
    <Card>
      <Chip label={`${cat.opportunity.score}pts`} color={cat.opportunity.score > 50 ? 'success' : 'warning'} />
      <Typography variant="h6">{cat.label}</Typography>
      <LinearProgress value={cat.coverage.coveragePctBR} />
      <Box>
        <Chip label={`${cat.coverage.totalDiscovered} leads`} />
        <Chip label={`${cat.coverage.gaps.length} gaps`} />
        <Chip label={`score médio ${cat.quality.avgScore}`} />
        <Chip label={`${cat.quality.pctWithWebsite}% website`} />
      </Box>
      <Divider />
      <Typography variant="subtitle2">🎯 Estratégia:</Typography>
      <Typography variant="body2">{cat.opportunity.nextAction}</Typography>
      <Box>
        <Button href={`/admin/discovery?cat=${cat.category}`}>Prospectar</Button>
        <Button href={`/admin/leads?category=${cat.category}`}>Ver Leads</Button>
        <Button href={`/admin/market?category=${cat.category}`}>Market Intel</Button>
      </Box>
    </Card>
  ))}
</Grid>
```

### 4.3 `/admin/pipeline` — Funil por Categoria

```tsx
// Adicionar seletor de categoria + gráfico de funnel
// Dados: getFunnelByCategory()

<FormControl>
  <Select value={selectedCategory} onChange={...}>
    <MenuItem value="all">Todas (global)</MenuItem>
    {categories.map(c => <MenuItem value={c.category}>{c.label} ({c.totalDiscovered})</MenuItem>)}
  </Select>
</FormControl>

{/* Funnel cards filtrados pela categoria selecionada */}
{funnelStages.map(s => (
  <Card>
    <Chip label={s.stage} />
    <Typography>{s.label}</Typography>
    <Typography variant="h4">{s.count}</Typography>
    <Typography variant="caption">{s.runbook.condition}</Typography>
    <Chip label={s.runbook.autoTrigger ? '🤖 Auto' : '👤 Manual'} />
    {s.runbook.cost > 0 && <Chip label={`$${s.runbook.cost}`} />}
  </Card>
))}
```

### 4.4 `/admin/criteria` — Sinais Ponderados por Categoria

```tsx
// Adicionar: "Sinais mais críticos para [categoria]"
// Dados: CRITERIA_TRIGGERS (já existe) + análise de distribuição real

<Card>
  <Typography variant="h6">🎯 Sinais Mais Críticos para {cat.label}</Typography>
  <Typography variant="body2">
    Com base nos {total} leads desta categoria, estes são os sinais
    que mais impactam o score e a prioridade de ação:
  </Typography>
  {topSignals.map(s => (
    <Box>
      <Typography fontWeight={700}>{s.id} — {s.name} ({s.points}pts)</Typography>
      <Typography variant="body2">{s.description}</Typography>
      <Typography variant="caption" color="warning.main">
        🎯 Ação: {CRITERIA_TRIGGERS.find(t => t.signals.includes(s.id))?.action || "Avaliar manualmente"}
      </Typography>
    </Box>
  ))}
</Card>
```

### 4.5 `/admin/leads` — Segmentação por Estratégia

```tsx
// Adicionar: chips de estratégia no topo da tabela
// Dados: rankLeadsByAction()

<Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
  <Chip label="💰 Melhor Oportunidade (score>60, WA)" color="success"
    onClick={() => setFilter('strategy=top_opportunity')} />
  <Chip label="📈 Volume (score 30-60, sem website)" color="info"
    onClick={() => setFilter('strategy=volume')} />
  <Chip label="🎨 Visual (score<40, barbearia/beleza)" color="secondary"
    onClick={() => setFilter('strategy=visual')} />
  <Chip label="💎 Premium (score>70, ticket alto)" color="warning"
    onClick={() => setFilter('strategy=premium')} />
  <Chip label="🏥 Expansão (baixo volume, bom score)" color="error"
    onClick={() => setFilter('strategy=expansion')} />
  <Chip label="🔴 Não Prospectado (0 leads)" color="default"
    onClick={() => setFilter('strategy=undiscovered')} />
</Box>

{/* Card de insight no topo da lista */}
<Alert severity="info">
  💡 <strong>Estratégia para esta categoria:</strong> {strategy.playbook}
  · Plano recomendado: {strategy.targetPlan}
  · Canal: {strategy.channel}
</Alert>
```

### 4.6 `/admin/solutions` — Recomendação por Lead

```tsx
// Adicionar: "Plano Recomendado" dinâmico baseado em score + sinais
// Já existe o mapeamento de planos. Tornar dinâmico.

<Card>
  <Typography variant="h6">🎯 Para {lead.title}</Typography>
  <Box>
    <Chip label={`Score: ${lead.score_compound}`} />
    <Chip label={`WA Business: ${lead.wa_is_business ? '✅' : '❌'}`} />
    <Chip label={`Website: ${lead.website ? '✅' : '❌'}`} />
  </Box>
  <Typography variant="body2">
    {getRecommendedPlan(lead).reasoning}
  </Typography>
  <Button variant="contained" color="primary">
    Gerar {getRecommendedPlan(lead).plan}
  </Button>
</Card>
```

### 4.7 `/admin/market` — Inteligência por Categoria (já parcialmente feito)

```tsx
// JÁ TEMOS: Category Intel → Top Oportunidades (ADR-0051 #1)
// ADICIONAR: Seção "📊 Categorias Não-Descobertas"

{undiscovered.length > 0 && (
  <Card sx={{ bgcolor: 'warning.50' }}>
    <Chip label="🔴 {undiscovered.length} Categorias Não-Prospectadas" color="warning" />
    <Typography variant="body2">
      Estas categorias estão no ICP mas nunca foram buscadas no Google Meu Negócio.
      O Auto-Pilot recomenda começar por: {autoPilot.topPick?.label}
    </Typography>
    <Grid container spacing={1}>
      {undiscovered.map(cat => (
        <Chip key={cat} label={cat} component={Link}
          href={`/admin/discovery?cat=${cat}`} clickable />
      ))}
    </Grid>
  </Card>
)}
```

### 4.8 `/admin/surface` — Surface por Categoria

```tsx
// Adicionar: filtro por categoria nos artifacts
// Dados: s10_artifacts + s11_events (já existem, só filtrar)

<FormControl>
  <Select value={surfaceCategory}>
    <MenuItem value="all">Todas as categorias</MenuItem>
    {categories.map(c => <MenuItem value={c}>{c}</MenuItem>)}
  </Select>
</FormControl>

{/* Métricas por categoria */}
<CardStatVertical stats={categorySurfaces.dentist.s10Count}
  title="S10 · Dentista" subtitle="12 Raio-X gerados → 3 convertidos" />
```

### 4.9 Dashboard — COCKPIT do Founder (REFINAR página inicial)

```tsx
// /admin (página inicial) → transformar em COCKPIT
// Dados: autoPilotDecide() + getFunnelByCategory() + rankLeadsByAction()

<Grid container spacing={3}>
  {/* CARD 1: Ação #1 HOJE */}
  <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
    <Chip label="🎯 Ação #1 Hoje" color="success" />
    <Typography variant="h5">Prospectar {topPick.label}</Typography>
    <Typography>{topPick.reasoning}</Typography>
    <Button href={`/admin/discovery?cat=${topPick.category}&city=${topPick.region.city}`}>
      Executar Agora
    </Button>
  </Card>

  {/* CARD 2: Leads Prontos para Raio-X */}
  <Card>
    <Chip label="📨 Prontos para Contato" color="info" />
    <Typography variant="h4">{readyForRaioX.length}</Typography>
    <Typography>leads com score&gt;70 e WhatsApp Business</Typography>
    <Button href="/admin/leads?strategy=top_opportunity">Ver Lista</Button>
  </Card>

  {/* CARD 3: Oportunidades Não-Descobertas */}
  <Card>
    <Chip label="🔴 Expansão" color="error" />
    <Typography variant="h4">{undiscovered.length}</Typography>
    <Typography>categorias nunca prospectadas</Typography>
    <Button href="/admin/categories">Planejar Expansão</Button>
  </Card>

  {/* CARD 4: Pipeline Hoje */}
  <Card>
    <Chip label="📈 Pipeline" color="primary" />
    <Typography variant="h4">{pipelineStats.totalLeads}</Typography>
    <Typography>leads · {pipelineStats.clientsActive} clientes</Typography>
    <Button href="/admin/pipeline">Ver Funil</Button>
  </Card>
</Grid>
```

---

## 5. Sequência de Implementação (próxima sessão)

| # | Página | Novos Componentes | Esforço | Dependência |
|---|--------|------------------|---------|------------|
| 1 | `/admin/categories` | NOVA PÁGINA · Dashboard Central | 2h | Category Intel API (já existe) |
| 2 | `/admin/discovery` | AutoPilotSuggestion | 30min | Auto-Pilot API (já existe) |
| 3 | `/admin` (dashboard) | Cockpit do Founder | 1.5h | Auto-Pilot + Category Intel |
| 4 | `/admin/pipeline` | Seletor de categoria + funnel por cat | 1h | getFunnelByCategory() NOVA |
| 5 | `/admin/leads` | Chips de estratégia + Alert insight | 45min | rankLeadsByAction() NOVA |
| 6 | `/admin/criteria` | Sinais ponderados por categoria | 45min | CRITERIA_TRIGGERS (já existe) |
| 7 | `/admin/market` | Categorias não-descobertas | 20min | Category Intel (já existe) |
| 8 | `/admin/solutions` | Recomendação dinâmica por lead | 45min | getRecommendedPlan() NOVA |
| 9 | `/admin/surface` | Filtro por categoria | 30min | s10_artifacts (já existe) |

**Total: ~8h. Custo: $0.**

---

## 6. Verificação

1. `/admin/categories` — 29 cards, cada um com score, leads, gaps, estratégia e botões de ação
2. `/admin/discovery` — AutoPilotSuggestion visível acima do formulário de busca
3. `/admin` — 4 cards de cockpit com ações priorizadas
4. `/admin/pipeline` — funil filtrável por categoria
5. `/admin/leads` — chips de estratégia funcional com filtros
6. `/admin/criteria` — sinais mais críticos por categoria
7. `/admin/market` — seção de categorias não-descobertas
8. `/admin/solutions` — recomendação de plano dinâmica
9. `/admin/surface` — métricas de surface por categoria

---

## 7. Próximos Passos

- [x] ADR-0052 escrita
- [ ] Implementar na próxima sessão (9 páginas, ~8h)

---

*v1.0 · 2026-07-20 · adsentice · Estratégia de Vendas distribuída em todo o Dashboard*
