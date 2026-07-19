# @adsentice/baileys-wa

WhatsApp verification microservice — **Camada 3** do wa-check (ADR-0041).

Usa `@whiskeysockets/baileys` para consultar `sock.onWhatsApp(jid)` — uma query leve que
NÃO envia mensagens, apenas verifica se um número existe no WhatsApp.

## Por que

O `wa.me/{numero}` público só distingue **Business** (og:title ≠ "Share on WhatsApp").
Para números celulares com WhatsApp pessoal vs sem WhatsApp, o HTML é **idêntico**.

O Baileys autentica tua sessão do WhatsApp Web e consulta os servidores diretamente —
`existe: true` ou `existe: false`. Custo: $0.

## Setup

```bash
cd packages/baileys-wa
npm install
npm run dev
```

Na primeira execução, um QR Code aparece no terminal.
Escaneie com: **WhatsApp → Aparelhos conectados → Conectar um aparelho**.

A sessão fica salva em `sessions/` — próximas execuções não precisam de QR.

## API

### `POST /check`
```json
{ "numero": "5511999999999" }
→ { "numero": "5511999999999", "existe": true, "verifiedAt": "..." }
```

### `POST /check-batch`
```json
{ "numeros": ["5511999999999", "5511888888888"] }
→ { "total": 2, "existentes": 1, "ausentes": 1, "resultados": [...] }
```

### `GET /health`
```json
{ "status": "connected", "uptime": 3600, "cacheSize": "in-memory", "version": "1.0.0" }
```

## Integração com adsentice

O `wa-check.ts` chama `POST http://localhost:3100/check` como fallback
após o `wa.me` público não detectar Business:

```typescript
// Camada 1: detectWA(phone) → formato celular?
// Camada 2: checkWhatsapp(phone) → Business? (wa.me público)
// Camada 3: checkWhatsappBaileys(phone) → WhatsApp pessoal? (este serviço)
```

## Porta

`:3100` — não conflita com Next.js `:3000`, Redis `:6396`, Qdrant `:6352`.

## Rate limit

~50 consultas/minuto (WhatsApp Web rate limit).
O `check-batch` processa em lotes de 10 com 200ms de delay.
