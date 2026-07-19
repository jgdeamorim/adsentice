# HANDOFF v132 FINAL · 2026-07-19 · Wa-Check Ciclo Completo

**Selo consolidador da sessão v121→v132 · 12 handoffs · pipeline completo**

## Wa-Check · 3 camadas · ciclo fechado

```
Camada 1: detectWA()          — heurística formato celular (instantâneo, $0)
Camada 2: checkWhatsapp()     — wa.me público (og:title → Business, $0)
Camada 3: Evolution API :3100 — sock.onWhatsApp (WebSocket, indetectável, $0)
```

**Pipeline invertido (v131.4):** Evolution API primeiro (batch, sem rate limit), wa.me só nos existentes (nome Business).

### Estado do banco (19/jul 17:30 BRT)

```
1.370 listings com phone
  ├─ 1.085 verificados (79%)
  │   ├─ 💼 378 Business (35%)
  │   ├─ 📱 159 WhatsApp pessoal (15%)
  │   └─ 📵 548 Sem WhatsApp (50%)
  └─ 285 pendentes (scheduler automático)
```

## Infra

- **Evolution API 2.3.7** (`:3100`): WhatsApp conectado (Jeferson Amorim)
- **PostgreSQL** (`adsentice-pg :6397`): migrations 001-020 aplicadas
- **Redis** (`:6396`): queue + progress + history + OODA
- **Cron** (`*/22 min`): wa-check scheduler automático
- **Time gate**: pausa 23:30-06:00 BRT

## Scheduler

```
500 phones/execução × 20-60min aleatório
Padrão humano: 5-10 concorrentes × 2-3s × 15-60s
Evolution API primeiro (WebSocket, zero rate limit)
wa.me só nos existentes (~40% dos phones)
```

## Entregas da sessão

| Área | Entregas |
|------|----------|
| ADRs | 0039 (L1 deprecated), 0040 (L0 audit), 0041 (Baileys), 0042 (Evolution API) |
| Scoring | +7 sinais (F11, E8-E10, I4-I6) |
| LeadTable | 4 seções 💤 + chip 4 estados + card c/ breakdown |
| Wa-Check | Manager UI + QR code + histórico + progresso + scheduler |
| DB | Migrations 019 (cid+region) + 020 (wa_*) |
| Pipeline | L0 re-enrich + auto-trigger discovery + fila inteligente |
| Infra | Evolution API deploy + webhook + cron |

## Commits

```
63e52dc → v132.4 card Telefone totais reais
512b6c4 → v132.3 const→let fix
00d7137 → v132.2 REST API stats
0bb47ae → v132.1 wa_* select
23a10e9 → v132 LeadTable popup real
49565fb → v131.4 pipeline invertido
e5b492c → v131.3 progress total real
3f69166 → v131 scheduler time gate
780e331 → v131.1 500 phones
edd406b → v130.1 guard auto-chain
e439fe6 → v130 fila inteligente
5973d68 → v129.2 fallback DB
14a5454 → v129.1 wa.me primeiro
e0c7611 → v129 auto-trigger discovery
1fbc7ac → v128 pipeline 3 camadas
373f41c → v127 persistência + chip + webhook
26aabd2 → v126 QR auto-refresh
b819c51 → v126 Evolution API deploy
44e536c → v124 baileys-wa MVP
9395a49 → v125 ADR-0042
8486bde → v121 ADR-0039 + ADR-0040
```

## Próxima sessão

1. StrategyResolver backport S10
2. Gate S11 elegibilidade L2
3. L0 re-enrich nos 7.170 listings com dados incompletos
4. Discovery L0 limpo p/ testar scoring + wa-check auto
5. SurfaceSpecialist factory (20 surfaces)
6. Persistir Evolution API session no Redis
