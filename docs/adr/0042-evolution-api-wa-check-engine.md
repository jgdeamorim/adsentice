# ADR-0042 · Evolution API como engine do wa-check

**Status:** PROPOSED
**Date:** 2026-07-19
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** ADR-0041 (seção de implementação — substitui `packages/baileys-wa/` como engine)
**Sources:** Context7 audit (4 calls) + análise do source Evolution API + `packages/baileys-wa/` v124

---

## 1. Contexto

O adsentice precisa verificar se números de telefone têm WhatsApp. O pipeline atual tem 3 camadas (ADR-0041):

```
Camada 1: detectWA()         — heurística formato (instantâneo, $0)
Camada 2: checkWhatsapp()    — wa.me público, og:title → Business (5s, $0)
Camada 3: Baileys onWhatsApp — sessão autenticada → existe: true/false (2s, $0)
```

A Camada 3 foi implementada como `packages/baileys-wa/` (v124, 9 arquivos, 361 linhas) — um microsserviço Express + Baileys na porta `:3100`. Funciona, mas é um MVP limitado:

- **1 sessão apenas** — não escala pra múltiplos usuários
- **Sem autenticação** na API — qualquer processo local acessa
- **Sem persistência** de sessão em Redis — arquivo local `sessions/`
- **Sem webhooks** — não sabe quando a conexão caiu sem polling
- **Sem Docker** — precisa de `npm run dev` manual
- **Sem profile picture** — não expõe foto do perfil

Durante a exploração do diretório `EVO-API/self-essentials/evolution-api-main/`, descobrimos que a **Evolution API** é exatamente o que estamos construindo — mas production-ready, open-source, Apache 2.0, e já com Docker + Redis + Prisma + 22 webhook events.

---

## 2. O que é a Evolution API

**Evolution API** é um servidor REST open-source para WhatsApp e mensageria multi-canal. Parte do ecossistema Evolution Foundation. Usa Baileys como engine WhatsApp Web.

| Característica | Valor |
|----------------|-------|
| Licença | Apache 2.0 |
| Stack | Node.js 20+, Express, TypeScript |
| Database | PostgreSQL ou MySQL (Prisma ORM) |
| Cache | Redis (suporte nativo a `use-multi-file-auth-state-redis-db.ts`) |
| Deploy | Docker + docker-compose.yaml |
| Porta padrão | 8080 (configurável) |
| Source | `EVO-API/self-essentials/evolution-api-main/` (já disponível localmente) |

### Endpoints relevantes para o wa-check

| Endpoint | Função | Substitui nosso |
|----------|--------|-----------------|
| `POST /chat/whatsappNumbers/{instance}` | Verifica N números de uma vez | `/check` + `/check-batch` |
| `POST /chat/fetchProfilePictureUrl/{instance}` | Foto do perfil WhatsApp | ❌ não temos |
| `POST /instance/create` | Cria nova instância com QR code | `startSocket()` |
| `GET /instance/connect/{instance}` | QR Code + pairingCode | QR no terminal |
| `GET /instance/fetchInstances` | Lista todas + status | `/health` |
| `GET /instance/connectionState/{instance}` | Estado da conexão | `/health` |
| `POST /webhook/set/{instance}` | Configura webhook por instância | ❌ não temos |

### Webhook events (22 disponíveis)

| Evento | Aplicação no adsentice |
|--------|----------------------|
| `QRCODE_UPDATED` | Alerta no Wa-Check Manager: "QR Code expirado — escaneie novamente" |
| `CONNECTION_UPDATE` | Flag Redis `adsentice:wa-check:online` |
| `CONTACTS_SET` | Trigger automático de wa-check em novos contatos |
| `MESSAGES_UPSERT` | Log de mensagens recebidas (futuro: chatbot SMB) |
| `PRESENCE_UPDATE` | Status online/offline do lead (futuro: score de engajamento) |

---

## 3. Comparação: Nosso MVP vs Evolution API

| Dimensão | `packages/baileys-wa/` (v124) | Evolution API |
|----------|:---:|:---:|
| **Verificação de número** | ✅ `POST /check` (1) + `/check-batch` (≤200) | ✅ `POST /chat/whatsappNumbers` (N, batch nativo) |
| **Profile picture** | ❌ | ✅ `POST /chat/fetchProfilePictureUrl` |
| **QR Code** | Terminal (qrcode-terminal) | Terminal + endpoint REST |
| **Multi-instance** | ❌ (1 sessão fixa) | ✅ (N sessões, cada uma independente) |
| **Auth** | ❌ (sem proteção) | ✅ `apikey` header (configurável) |
| **Session store** | Arquivo `sessions/` | Redis + Prisma DB (persistente) |
| **Webhooks** | ❌ | ✅ 22 eventos configuráveis |
| **Docker** | ❌ | ✅ docker-compose.yaml |
| **Health check** | `GET /health` (manual) | `GET /instance/connectionState/{name}` + webhook CONNECTION_UPDATE |
| **Reconexão** | setTimeout 5s | Gerenciada pelo BaileysStartupService |
| **alwaysOnline** | ❌ | ✅ (configurável por instância) |
| **Linhas de código** | 361 (9 arquivos) | 5,122 (só Baileys service) + controllers + routes + cache |
| **Manutenção** | Nós mantemos | Comunidade open-source (Evolution Foundation) |

---

## 4. Decisão

**Migrar a Camada 3 do wa-check de `packages/baileys-wa/` para Evolution API como engine.**

O `packages/baileys-wa/` foi um MVP funcional que provou o conceito (v124, testado live, `:3100` respondendo). Mas não é production-ready e replica funcionalidade que a Evolution API já oferece com qualidade superior.

### Arquitetura proposta

```
┌──────────────────────────────────────────────────────────────────┐
│                        adsentice (Next.js :3000)                  │
│                                                                   │
│  wa-check.ts                                                      │
│    ├─ Camada 1: detectWA()          — heurística formato          │
│    ├─ Camada 2: checkWhatsapp()     — wa.me público               │
│    └─ Camada 3: fetch() → Evolution API (NOVA)                    │
│                                                                   │
│  Wa-Check Manager UI (/admin/settings/wa-check)                   │
│    ├─ GET /instance/fetchInstances     → status cards             │
│    ├─ POST /chat/whatsappNumbers       → verificação batch        │
│    └─ POST /chat/fetchProfilePictureUrl → foto do perfil          │
│                                                                   │
│  Webhook Listener (API route Next.js)                             │
│    ├─ POST /api/wa-check/webhook       ← CONNECTION_UPDATE        │
│    └─ Atualiza Redis adsentice:wa-check:online                    │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│              Evolution API (Docker, porta :3100)                    │
│                                                                   │
│  POST /instance/create              → 1 instância "adsentice"     │
│  GET  /instance/connect/adsentice   → QR code (1ª execução)       │
│  POST /chat/whatsappNumbers/adsentice → verificação batch         │
│  POST /chat/fetchProfilePictureUrl  → foto do perfil              │
│  POST /webhook/set/adsentice        → aponta pra adsentice        │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│              Redis :6396 (compartilhado)                           │
│                                                                   │
│  adsentice:wa-check:*         (estado do wa-check)                │
│  evolution:adsentice:*        (sessão WhatsApp - opcional)        │
└──────────────────────────────────────────────────────────────────┘
```

### O que muda no código adsentice

| Arquivo | Mudança |
|---------|---------|
| `wa-check.ts` | Nova função `checkWhatsappBaileys()` → `fetch("http://localhost:3100/chat/whatsappNumbers/adsentice")` |
| `Wa-Check Manager` | Adicionar profile picture, status de conexão real, webhook health |
| `packages/baileys-wa/` | **Deprecar** — substituído pela Evolution API |
| `docker-compose.yml` | Adicionar serviço `evolution-api` |
| `.env` | `EVOLUTION_API_URL=http://localhost:3100` |

### O que NÃO muda

- **Camada 1** (`detectWA`) — continua igual
- **Camada 2** (`checkWhatsapp` wa.me público) — continua igual
- **Wa-Check Manager** — mesma UI, mesma página, mesmos cards
- **Redis OODA** — mesmo namespace `adsentice:wa-check:*`
- **Discovery alert** — mesma flag após pipeline
- **ADR-0041** — arquitetura 3 camadas permanece válida, só o engine da Camada 3 muda

---

## 5. Plano de migração

### Fase 1 · Deploy Evolution API (30 min)

1. Copiar `evolution-api-main/` para `~/evolution-api/` (separado do repo adsentice)
2. Configurar `.env`: `DATABASE_PROVIDER=postgresql`, Redis `:6396`, porta `:3100`
3. `docker-compose up` (ou `npm run dev` sem Docker)
4. Criar instância: `POST /instance/create { "instanceName": "adsentice", "integration": "WHATSAPP-BAILEYS" }`
5. Escanear QR Code: `GET /instance/connect/adsentice`
6. Testar: `POST /chat/whatsappNumbers/adsentice { "numbers": ["5511999999999"] }`

### Fase 2 · Integrar com adsentice (30 min)

7. Atualizar `wa-check.ts`: `checkWhatsappBaileys()` → chamar Evolution API
8. Atualizar `POST /api/wa-check/trigger`: usar `/chat/whatsappNumbers` para batch
9. Criar `POST /api/wa-check/webhook`: listener para `CONNECTION_UPDATE`
10. Atualizar Wa-Check Manager: status real via `GET /instance/fetchInstances`
11. Atualizar Wa-Check Manager: exibir foto de perfil via `/chat/fetchProfilePictureUrl`

### Fase 3 · Cleanup (10 min)

12. Marcar `packages/baileys-wa/` como DEPRECATED no README
13. Atualizar ADR-0041 com nota: "Camada 3 migrou para Evolution API (ADR-0042)"
14. Commitar e selar

---

## 6. Riscos e mitigação

| Risco | Probabilidade | Mitigação |
|-------|:--:|-----------|
| Evolution API quebrar com update do WhatsApp Web | Baixa | Mantida ativamente (v2.x, 2025). Atualizar imagem Docker periodicamente |
| Complexidade extra (PostgreSQL necessário) | Média | Evolution API suporta SQLite para dev. Produção: mesmo Supabase que já usamos |
| Porta :3100 conflito | Nenhuma | Nós definimos a porta. Manter :3100 (já reservada) |
| Sessão expirar | Baixa | Webhook `QRCODE_UPDATED` notifica. Redis persiste auth state |
| Curva de aprendizado | Baixa | API REST documentada, já exploramos o source. Rotas são simples |
| Dependência externa (não é nosso código) | Baixa | Apache 2.0, open-source, 294 snippets documentados, comunidade ativa |

---

## 7. Alternativas consideradas

### A) Manter `packages/baileys-wa/` e evoluir
**Rejeitado:** Reimplementaria Redis session store, multi-instance, webhooks, auth, Docker — tudo que a Evolution API já tem. Custo de oportunidade alto.

### B) Usar apenas wa.me público (Camada 2)
**Rejeitado:** Só detecta Business (~5-20%), não resolve o gap de WhatsApp pessoal.

### C) Meta Business API (Cloud API)
**Rejeitado:** Custo, setup complexo, não tem endpoint "verificar existência".

### D) Evolution API como substituição TOTAL do wa-check
**Rejeitado para já:** A Camada 2 (wa.me público, $0, sem sessão) ainda é útil como fallback rápido quando a Evolution API está offline. Manter as 3 camadas.

---

## 8. Métricas esperadas

| Métrica | Antes (baileys-wa MVP) | Depois (Evolution API) |
|---------|:---:|:---:|
| Verificação batch | Loop de 10 com delay 200ms | Batch nativo, 1 chamada HTTP |
| Profile picture | ❌ | ✅ (high-res + preview) |
| Sessão persistente | Arquivo local | Redis + PostgreSQL |
| Status da conexão | Polling `/health` | Webhook `CONNECTION_UPDATE` em tempo real |
| Multi-instance | ❌ | ✅ (adsentice + teste + time) |
| Auth | ❌ | ✅ `apikey` header |
| Deploy | `npm run dev` manual | `docker-compose up` |
| Código que mantemos | 361 linhas | ~20 linhas (fetch + webhook) |

---

## 9. Fontes (medido=verdade)

- **Context7 audit** — 4 chamadas: Evolution API docs (2 fontes) + Baileys docs (2 fontes), 2026-07-19
- **Source Evolution API** — `EVO-API/self-essentials/evolution-api-main/src/` (explorado 2026-07-19)
  - `whatsapp.baileys.service.ts` — 5,122 linhas, BaileysStartupService
  - `baileys.router.ts` — POST onWhatsapp, profilePictureUrl, assertSessions
  - `instance.controller.ts` — 477 linhas, create/connect/fetchInstances
  - `rediscache.ts` — 118 linhas, RedisCache com BufferJSON
- **`packages/baileys-wa/`** — v124, 9 arquivos, 361 linhas, testado live :3100
- **ADR-0041** — arquitetura 3 camadas do wa-check
- **ADR-0040** — L0 Live Audit, 1,370 phones no banco
- **v123** — Wa-Check Manager (settings sub-page, 3 API routes, discovery alert)
