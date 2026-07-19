# ADR-0043 · Evolution API como infraestrutura permanente do adsentice

**Status:** ACCEPTED
**Date:** 2026-07-19
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** ADR-0042 (referência — migrou de `packages/baileys-wa/` para Evolution API)
**Sources:** Analise live do :3100 (19/jul 20:30-21:15 BRT), Context7 audit (ADR-0042), fonte EVO-API/self-essentials/evolution-api-main, código adsentice

---

## 1. Contexto

O adsentice usa WhatsApp como canal de inteligência para classificar leads de negócios locais. O **Wa-Check** (v124→v132) implementa verificação de WhatsApp em 3 camadas:

- **Camada 1:** `detectWA()` — heurística de formato (instantâneo, $0)
- **Camada 2:** `checkWhatsapp()` — wa.me público (og:title, $0, rate limit ~2 req/s)
- **Camada 3:** Evolution API — WhatsApp Web via Baileys (WebSocket, indetectável, $0)

A Camada 3 foi inicialmente um MVP (`packages/baileys-wa/`, v124, 361 linhas) e depois migrada para a Evolution API 2.3.7 (ADR-0042). O deploy ocorreu em 19/jul 14:38 BRT e opera desde então.

Este ADR documenta a Evolution API como **infraestrutura permanente do adsentice**, define specs, contratos, e operação.

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                     adsentice Next.js (:3000)                        │
│                                                                      │
│  wa-check.ts                    API Routes                           │
│  ├─ isEvolutionApiOnline()     ├─ /api/wa-check/trigger   (POST)    │
│  ├─ checkWhatsappBaileys()     ├─ /api/wa-check/status    (GET)     │
│  ├─ checkWhatsapp()            ├─ /api/wa-check/evolution (GET)     │
│  └─ normWaNumber()             ├─ /api/wa-check/qrcode    (GET)     │
│                                 └─ /api/wa-check/webhook   (POST)    │
│                                      ▲                               │
│                                      │ webhook CONNECTION_UPDATE     │
│                                      │                               │
│  ┌───────────────────────────────────┼───────────────────────────┐  │
│  │              Evolution API 2.3.7 (:3100)                      │  │
│  │                                                                │  │
│  │  Instance: adsentice                                           │  │
│  │  Owner:    5527999652302 (Jeferson Amorim)                     │  │
│  │  Status:   open (WebSocket Baileys)                            │  │
│  │  API Key:  adsentice-wa-check-2026                             │  │
│  │                                                                │  │
│  │  PostgreSQL ←──────────────→ Redis :6396                       │  │
│  │  adsentice-pg :6397          prefix: evolution                 │  │
│  │  DB: evolution_api           3 keys (auth state)               │  │
│  │  37 tables Prisma                                              │  │
│  │  IsOnWhatsapp: 2,012 rows    Cache local: Map (server-side)    │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 Localização no filesystem

| Componente | Caminho |
|-----------|---------|
| Source | `/media/jeffer/.../EVO-API/self-essentials/evolution-api-main/` |
| .env (vivo) | `EVO-API/self-essentials/evolution-api-main/.env` |
| .env (backup adsentice) | `adsentice/docs/secret/.env.EVOLUTION` |
| Systemd service | `~/.config/systemd/user/evolution-api.service` |
| Startup script | `adsentice/scripts/start-evolution-api.sh` |
| Database | `adsentice-pg :6397/evolution_api` (37 tabelas Prisma) |

### 2.2 Stack técnica

| Dimensão | Spec |
|----------|------|
| Engine | Baileys (WhatsApp Web protocol) |
| Framework | Express.js (TypeScript) |
| Runtime | Node.js v23.10.0 (via nvm) |
| ORM | Prisma (PostgreSQL) |
| Auth | Header `apikey: adsentice-wa-check-2026` |
| Cache | Redis `:6396` (prefix `evolution`) + Local LRU |
| Session | PostgreSQL (`Instance` table) + Redis (`evolution:baileys:*`) |
| Webhooks | URL configurável, retry com backoff exponencial |
| Build | `tsx` (source direto, sem build) |

---

## 3. Configuração (.env)

```bash
SERVER_PORT=3100
SERVER_TYPE=http
SERVER_URL=http://localhost:3100
SERVER_DISABLE_MANAGER=true       # sem UI Manager (só API)
SERVER_DISABLE_DOCS=false         # swagger disponível se habilitado

DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://adsentice:adsentice_local@localhost:6397/evolution_api

CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6396
CACHE_REDIS_PREFIX_KEY=evolution
CACHE_REDIS_TTL=604800            # 7 dias
CACHE_REDIS_SAVE_INSTANCES=true   # sessão sobrevive restart

CACHE_LOCAL_ENABLED=true
CACHE_LOCAL_TTL=86400             # 24h

DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_IS_ON_WHATSAPP=true # cache onWhatsapp 7 dias

AUTHENTICATION_API_KEY=adsentice-wa-check-2026
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
```

### 3.1 Variáveis NÃO configuradas (opcionais futuras)

| Variável | Efeito | Status |
|----------|--------|--------|
| `WEBHOOK_GLOBAL_ENABLED` | Webhook global para todas instâncias | ❌ não configurado (usamos por-instance) |
| `CONFIG_SESSION_PHONE_CLIENT` | Nome do dispositivo WhatsApp | ❌ usa default "Evolution API" |
| `QRCODE_LIMIT` | Timeout do QR code (segundos) | ❌ usa default 30s |
| `DATABASE_SAVE_DATA_CHATS` | Persistir histórico de chats | ❌ false (não precisamos) |
| `LOG_LEVEL` | Nível de log | ❌ usa default (ERROR,WARN,DEBUG,INFO,LOG,VERBOSE,DARK,WEBHOOKS,WEBSOCKET) |
| `LANGUAGE` | Idioma das mensagens | ❌ usa default "en" |

---

## 4. Contrato de API (endpoints usados pelo adsentice)

### 4.1 `POST /chat/whatsappNumbers/:instanceName`

**Uso:** Camada 3 do wa-check. Verifica em batch se números têm WhatsApp.

```typescript
// Request
POST /chat/whatsappNumbers/adsentice
Headers: { apikey: "adsentice-wa-check-2026", Content-Type: "application/json" }
Body: { numbers: ["5527998832727", "5527999652302"] }

// Response 200
[
  { "jid": "5527998832727@s.whatsapp.net", "exists": true, "number": "5527998832727" },
  { "jid": "5511999999999@s.whatsapp.net", "exists": false, "number": "5511999999999" }
]
```

**Performance:** ~200 números em < 5 segundos (WebSocket batch). Sem rate limit.

### 4.2 `GET /instance/fetchInstances`

**Uso:** UI Wa-Check Manager — status da conexão, QR code readiness.

```typescript
// Response 200
[{ "name": "adsentice", "connectionStatus": "open", "ownerJid": "5527999652302@s.whatsapp.net",
   "profileName": "Jeferson Amorim", "profilePicUrl": "https://pps.whatsapp.net/..." }]
```

### 4.3 `GET /instance/connect/:instanceName`

**Uso:** Obter QR code / pairing code para conectar novo dispositivo.

```typescript
// Response 200 (QR code disponível)
{ "base64": "data:image/png;base64,iVBORw0KG..." }
// Response 200 (já conectado)
{ "message": "Instance already connected" }
// Response 200 (modo pairing — WhatsApp → Vincular com número)
{ "pairingCode": "ABCD1234" }
```

### 4.4 `GET /instance/connectionState/:instanceName`

**Uso:** Verificação rápida do estado da conexão (sem expor dados sensíveis).

```typescript
// Response 200
{ "instance": { "instanceName": "adsentice", "state": "open" } }
```

### 4.5 Webhook `POST /webhook/set/:instanceName`

**Uso:** Configurar callback para `CONNECTION_UPDATE` e `QRCODE_UPDATED`.

```typescript
// Request
POST /webhook/set/adsentice
Headers: { apikey: "adsentice-wa-check-2026" }
Body: {
  "url": "http://localhost:3000/api/wa-check/webhook",
  "enabled": true,
  "events": ["CONNECTION_UPDATE", "QRCODE_UPDATED"],
  "webhookByEvents": false
}
```

---

## 5. Contrato de Saúde (Healthcheck)

O adsentice implementa healthcheck com cache de 30 segundos:

```typescript
// wa-check.ts
export async function isEvolutionApiOnline(): Promise<{ online: boolean; version?: string }>
export function evoLastHealth(): { online: boolean; version?: string; checkedAt: number } | null
```

**Comportamento:**
- `GET http://localhost:3100/` → `{ "status": 200, "version": "2.3.7" }` = online
- Timeout 3s, re-verifica a cada 30s
- `checkWhatsappBaileys()` usa o cache para pular chamadas quando offline
- Rota `POST /api/wa-check/trigger` retorna 503 se Evolution API offline
- Rota `GET /api/wa-check/status` reporta `evoHealth` no response

---

## 6. Operação

### 6.1 Startup (systemd — preferencial)

```bash
systemctl --user start evolution-api.service   # inicia
systemctl --user status evolution-api.service  # status
journalctl --user -u evolution-api -f          # logs
```

Systemd garante:
- **Auto-restart** no crash (RestartSec=10s, Restart=always)
- **Auto-start** no login (WantedBy=default.target)
- **Watchdog** a cada 60s via GET /
- **Journal** integrado (StandardOutput=journal)

### 6.2 Startup (script — fallback)

```bash
./scripts/start-evolution-api.sh start    # inicia se offline
./scripts/start-evolution-api.sh status   # status + health
./scripts/start-evolution-api.sh stop     # para (systemd + PID)
```

### 6.3 Backup da sessão

A sessão WhatsApp é persistida em 3 locais:
1. **Redis** `:6396` — chaves `evolution:baileys:*` (auth state, TTL 7 dias)
2. **PostgreSQL** `evolution_api.Instance` + `evolution_api.Session` (persistente)
3. **Backup R2** (`backups/`) — dump diário

Se o Redis for limpo, a sessão regenera do PostgreSQL. Se ambos forem perdidos, é necessário re-escanear o QR code.

### 6.4 Reinicialização segura

```bash
# 1. Verifica estado atual do WhatsApp
systemctl --user status evolution-api.service

# 2. Para o serviço
systemctl --user stop evolution-api.service

# 3. Verifica Redis (sessão persistida?)
redis-cli -p 6396 KEYS "evolution:baileys:*"

# 4. Reinicia
systemctl --user start evolution-api.service

# 5. Verifica conexão
curl -s http://localhost:3100/instance/connectionState/adsentice \
  -H "apikey: adsentice-wa-check-2026"
```

---

## 7. Database (evolution_api)

37 tabelas gerenciadas pelo Prisma. As relevantes para o adsentice:

| Tabela | Função | Rows (~19/jul) |
|--------|--------|-----------------|
| `Instance` | Metadados da instância WhatsApp | 1 |
| `Session` | Auth state Baileys (sessão criptografada) | 1 |
| `Setting` | Configurações da instância | 1 |
| `IsOnWhatsapp` | Cache de verificação onWhatsapp (7d TTL) | 2,012 |
| `Webhook` | Configuração de webhook da instância | 1 |
| `Contact` | Contatos (se DATABASE_SAVE_DATA_CONTACTS=true) | 0 |
| `Chat` | Chats (se DATABASE_SAVE_DATA_CHATS=true) | 0 |
| `Message` | Mensagens (se DATABASE_SAVE_DATA_NEW_MESSAGE=true) | 0 |

O banco `evolution_api` está no mesmo cluster PostgreSQL do adsentice (`adsentice-pg :6397`), separado por database.

---

## 8. Segurança

| Aspecto | Configuração |
|---------|-------------|
| Auth | Header `apikey: adsentice-wa-check-2026` em todas as chamadas |
| Rede | Bind `localhost:3100` — não exposto externamente |
| API Key em fetchInstances | `AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true` — token da instância visível na resposta |
| Manager UI | `SERVER_DISABLE_MANAGER=true` — interface web desabilitada |
| CORS | `CORS_ORIGIN=*` — permissivo (localhost) |
| Senha PG | `adsentice:adsentice_local` — local apenas |
| NoNewPrivileges | Systemd: `NoNewPrivileges=true` |
| PrivateTmp | Systemd: `PrivateTmp=true` |

---

## 9. Custos

| Recurso | Custo |
|---------|-------|
| CPU/RAM | Node.js processo direto (~70MB RAM, < 1% CPU idle) |
| DataForSEO | $0 (não usa) |
| WhatsApp Business API | $0 (WhatsApp Web via Baileys, não-oficial) |
| PostgreSQL | Compartilhado com adsentice-pg |
| Redis | Compartilhado com adsentice-redis :6396 |
| **Total** | **$0** |

---

## 10. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| WhatsApp banir o número | Baixa | Alto — perde Camada 3 | Camada 2 (wa.me) como fallback automático |
| Evolution API cair | Baixa (systemd auto-restart) | Médio — wa-check degrada para Camada 2 | Healthcheck + fallback no wa-check.ts |
| Perder sessão (Redis + PG) | Muito baixa | Baixo — precisa re-escanear QR | Backup R2 diário + Redis persist |
| API key vazar | Muito baixa (localhost) | Médio — acesso ao WhatsApp | Trocar key + reiniciar |
| Quebrar na atualização do Evolution API | Média | Alto — :3100 offline | Pinned na v2.3.7 (não atualizar sem testar) |
| Cross-project (EVO-API) | Médio | Baixo — source externo | .env backupado no adsentice, script autônomo |

---

## 11. Alternativas consideradas

| Alternativa | Custo | Por que não |
|------------|-------|------------|
| `packages/baileys-wa/` (MVP v124) | $0 | 361 linhas, sem auth, sem multi-session, sem persistência |
| WhatsApp Business API (Meta) | ~$0.05/msg | Burocracia, aprovação, custo por mensagem |
| Twilio WhatsApp | ~$0.005/msg | Custo, sem detecção passiva |
| DataForSEO L0 phone | Incluso no L0 | Não verifica se é WhatsApp |
| Docker Evolution API | $0 | Já existe container do limpvix. Separar ia poluir o docker-compose. Processo direto é mais simples. |

---

## 12. Endpoints completos da Evolution API (referência)

```
/ (GET)                          → versão, status, docs URL
/verify-creds (POST)             → verifica credenciais Facebook
/instance/create (POST)          → nova instância
/instance/restart/:name (POST)   → reinicia instância
/instance/connect/:name (GET)    → QR code / pairing code
/instance/connectionState/:name (GET) → estado da conexão
/instance/fetchInstances (GET)   → lista todas instâncias
/instance/setPresence/:name (POST) → online/offline/typing
/instance/logout/:name (DELETE)  → logout
/instance/delete/:name (DELETE)  → deleta instância
/message/sendText/:name (POST)   → envia texto
/message/sendMedia/:name (POST)  → envia mídia (img/video/audio/doc)
/message/sendPoll/:name (POST)   → envia enquete
/message/sendList/:name (POST)   → envia lista interativa
/message/sendButtons/:name (POST)→ envia botões interativos
/message/sendReaction/:name (POST)→ envia reação
/message/sendLocation/:name (POST)→ envia localização
/message/sendContact/:name (POST)→ envia contato
/message/sendSticker/:name (POST)→ envia sticker
/message/sendLink/:name (POST)   → envia link preview
/chat/whatsappNumbers/:name (POST) ← BATCH CHECK (wa-check)
/chat/fetchProfilePictureUrl/:name (POST) → foto de perfil
/chat/fetchProfile/:name (POST)  → perfil completo (nome, foto, status)
/chat/fetchBusinessProfile/:name (POST) → perfil business
/chat/markMessageAsRead/:name (POST) → marcar lida
/chat/archiveChat/:name (POST)   → arquivar chat
/chat/deleteMessageForEveryone/:name (DELETE) → apagar msg
/chat/findContacts/:name (POST)  → buscar contatos (DB)
/chat/findMessages/:name (POST)  → buscar mensagens (DB)
/chat/findChats/:name (POST)     → buscar chats (DB)
/chat/sendPresence/:name (POST)  → presence (composing/recording)
/chat/updateBlockStatus/:name (POST) → bloquear/desbloquear
/group/create/:name (POST)       → criar grupo
/group/updatePicture/:name (POST)→ foto do grupo
/group/updateSubject/:name (POST)→ nome do grupo
/group/updateDescription/:name (POST)→ descrição do grupo
/group/inviteCode/:name (GET)    → código de convite
/group/leave/:name (DELETE)      → sair do grupo
/group/participants/:name (GET)  → lista participantes
/group/updateParticipant/:name (POST) → promover/remover admin
/label/handle/:name (POST)       → criar/editar label
/label/find/:name (GET)          → listar labels
/proxy/find/:name (GET)          → proxy config
/proxy/set/:name (POST)          → definir proxy
/template/create/:name (POST)    → template de msg
/template/find/:name (GET)       → listar templates
/settings/find/:name (GET)       → configurações da instância
/settings/set/:name (POST)       → alterar configurações
/business/profile/:name (GET)    → WhatsApp Business profile
/webhook/set/:name (POST)        → configurar webhook
/webhook/find/:name (GET)        → consultar webhook
/chatbot/typebot/:name (POST)    → Typebot
/chatbot/dify/:name (POST)       → Dify
/chatbot/openai/:name (POST)     → OpenAI Assistant
/chatbot/n8n/:name (POST)        → N8n
/chatbot/flowise/:name (POST)    → Flowise
/storage/s3/:name (POST)         → upload/download S3
/event/webhook/:name (POST)      → webhook events
/event/kafka/:name (POST)        → Kafka events
/event/rabbitmq/:name (POST)     → RabbitMQ events
/event/sqs/:name (POST)          → SQS events
/event/websocket/:name (POST)    → WebSocket events
/baileys/onWhatsapp/:name (POST) → onWhatsapp Baileys nativo
/baileys/profilePictureUrl/:name (POST) → foto via Baileys
/baileys/assertSessions/:name (POST) → assert sessions
/baileys/sendNode/:name (POST)   → send raw node
/baileys/getAuthState/:name (POST) → auth state
```

---

## 13. Decisão

**A Evolution API v2.3.7 é oficialmente um componente de infraestrutura permanente do adsentice**, operando como Camada 3 do Wa-Check.

**Regras de operação:**
1. Systemd `evolution-api.service` como gerenciador de ciclo de vida (preferencial)
2. Script `scripts/start-evolution-api.sh` como fallback portável
3. `.env` versionado no vault adsentice (`docs/secret/.env.EVOLUTION`)
4. Healthcheck ativo no wa-check.ts (cache 30s, timeout 3s)
5. NÃO atualizar a versão sem teste prévio em staging
6. NÃO expor :3100 externamente (localhost only)
7. Backup da sessão WhatsApp coberto pelo backup diário R2

---

## 14. Próximos passos

- [x] Systemd service criado e habilitado (`evolution-api.service`)
- [x] .env backupado (`docs/secret/.env.EVOLUTION`)
- [x] Startup script (`scripts/start-evolution-api.sh`)
- [x] Healthcheck integrado ao wa-check.ts + trigger + status
- [ ] Migrar de `npm exec tsx` para `npm run start:prod` (build + node dist/main)
- [ ] Adicionar ao `docker-compose.yml` como alternativa ao systemd
- [ ] Monitorar métricas: latência p95, taxa de erro, cache hit rate
- [ ] Teste de DR: destruir Redis + PG e reconectar WhatsApp
