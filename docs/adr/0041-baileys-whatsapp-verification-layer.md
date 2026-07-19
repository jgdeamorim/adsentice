# ADR-0041 · Baileys WhatsApp Verification Layer — 3-camadas

**Status:** PROPOSED
**Date:** 2026-07-19
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** ADR-0039 (wa-check section), memory `wa-check-wire-2026-07-19`

---

## 1. Contexto

O adsentice tem 1,370 números de telefone de leads (L0 DataForSEO). A verificação WhatsApp atual (`wa-check.ts`, v119) usa apenas `wa.me/{numero}` público — lê `og:title` para confirmar se o número tem conta Business.

**Limitação descoberta:** O HTML do wa.me é IDÊNTICO para números com WhatsApp pessoal e números que não têm WhatsApp. Ambos redirecionam com HTTP 302 e retornam `og:title = "Share on WhatsApp"`. Só Business accounts mostram nome real.

| Tipo de conta | wa.me (público) | Baileys (autenticado) |
|---------------|---|---|
| 💼 Business | ✅ Nome real no `og:title` | ✅ Confirmado + nome |
| 📱 Celular c/ WhatsApp pessoal | ❌ "Share on WhatsApp" | ✅ `existe: true` |
| 📵 Celular s/ WhatsApp | ❌ "Share on WhatsApp" | ✅ `existe: false` |
| 📵 Fixo (não é celular) | ❌ `detectWA()` já filtra | N/A |

---

## 2. Decisão

**Implementar 3 camadas de verificação WhatsApp, sendo a 3ª um microsserviço Baileys local.**

### Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│ Camada 1 · detectWA() — heurística de formato (instantâneo, $0)       │
│   Input: phone string                                                │
│   Output: boolean (é formato celular BR?)                             │
│   Regra: 11 dígitos, 3º char = '9'                                   │
├──────────────────────────────────────────────────────────────────────┤
│ Camada 2 · checkWhatsapp() — wa.me público (5s timeout, $0)           │
│   Input: phone string                                                │
│   Output: { hasWhatsapp, displayName, isBusiness, checked }           │
│   Regra: GET wa.me → og:title ≠ "Share on WhatsApp" = Business       │
│   Cache: Map<string, WaCheckResult> em memória (server-side)         │
├──────────────────────────────────────────────────────────────────────┤
│ Camada 3 · Baileys onWhatsApp() — sessão autenticada (2s, $0)         │
│   Input: phone string (formato 55DDDXXXXXXXX)                        │
│   Output: { numero, existe: boolean }                                │
│   Regra: sock.onWhatsApp(jid) → consulta direta servidores WhatsApp   │
│   Cache: Set<string> em memória (1 verificação por número por sessão) │
└──────────────────────────────────────────────────────────────────────┘
```

### Pipeline de verificação

```
phone do listing
  │
  ├─ detectWA(phone) === false → 📵 Fixo (não verifica mais)
  │
  └─ detectWA(phone) === true → 📱 formato celular
       │
       ├─ checkWhatsapp(phone) → isBusiness=true → 💼 Business:{nome}
       │
       └─ checkWhatsapp(phone) → !hasRealAccount
            │
            └─ Baileys onWhatsApp(phone)
                 ├─ existe=true  → 📱 WhatsApp (pessoal)
                 └─ existe=false → 📵 Sem WhatsApp
```

### Estados finais do chip Telefone

| # | Chip | Cor | Significado |
|---|------|-----|-------------|
| 1 | `💼 {Nome}` | primary (azul) | Business Account confirmado via wa.me |
| 2 | `📱 WhatsApp` | success (verde) | Celular com WhatsApp pessoal (Baileys) |
| 3 | `📱 Celular` | warning (laranja) | Formato celular, sem confirmação (Baileys offline) |
| 4 | `📵 Fixo` | default (cinza) | Não é celular (detectWA) |

---

## 3. Tecnologia

### 3.1 Baileys (`@whiskeysockets/baileys`)

- **O que é:** Cliente WhatsApp Web API em TypeScript. Simula WhatsApp Web sem Puppeteer.
- **O que usamos:** `sock.onWhatsApp(jid)` — query leve, não envia mensagem, não viola ToS.
- **Licença:** Apache 2.0
- **Custo:** $0 — usa tua sessão pessoal do WhatsApp
- **Rate limit:** WhatsApp Web ~50 consultas/minuto. Suficiente para nosso volume (1,370 phones).
- **Sessão:** Multi-file auth state (`./sessions/`). QR Code uma vez, depois persiste.

### 3.2 Por que NÃO Meta Business API (Cloud API)

| Critério | Meta Business API | Baileys |
|----------|:---:|:---:|
| Custo | $0.005-0.08/msg + verificação | $0 |
| Setup | Business Manager + app review + webhook | npm install + QR scan |
| Verificar existência | `GET /v20.0/{phone-id}` precisa do ID | `onWhatsApp(jid)` direto |
| Aprovação Meta | ~2 semanas | instantâneo |
| Violação ToS? | Oficial | Zona cinza (uso pessoal) |

Meta Business API foi descartada: custo, complexidade de setup, e a API não tem endpoint "verificar se número existe" — só funciona com phone-number-id já cadastrado.

---

## 4. Implementação

### 4.1 Estrutura do package

```
packages/baileys-wa/
├── src/
│   ├── server.ts              # Express + bootstrap
│   ├── socket.ts              # makeWASocket + auth state
│   ├── routes/
│   │   └── whatsapp.ts        # POST /check
│   ├── services/
│   │   └── whatsapp.service.ts # verificarNumero()
│   └── config.ts              # PORT, SESSION_DIR
├── sessions/                  # .gitignore
├── package.json
├── tsconfig.json
└── .env
```

### 4.2 API

```
POST http://localhost:3100/check
Body: { "numero": "5511999999999" }
Response: { "numero": "5511999999999", "existe": true }
```

Porta 3100 (não conflita com :3000 Next.js nem :6396 Redis).

### 4.3 Integração com wa-check.ts

Nova função em `wa-check.ts`:

```typescript
export async function checkWhatsappBaileys(phone: string): Promise<{ existe: boolean } | null> {
  const digits = normWaNumber(phone)
  if (!digits) return null

  try {
    const res = await fetch(`http://localhost:3100/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero: digits }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null } // Baileys offline → fallback
}
```

### 4.4 Wire no pipeline

O `wa-check` existente (API route `POST /api/wa-check/trigger`) ganha 3ª etapa:

```
Para cada phone:
  1. detectWA(phone) → false → 📵 Fixo
  2. checkWhatsapp(phone) → isBusiness → 💼 Business
  3. checkWhatsappBaileys(phone) → existe → 📱 WhatsApp / 📵 Sem WhatsApp
```

### 4.5 Wa-Check Manager (settings sub-page)

Atualizar o componente para mostrar os 4 estados e stats segregadas:
- 💼 Business confirmados
- 📱 WhatsApp pessoal (Baileys)
- 📱 Celular (Baileys offline, não verificado)
- 📵 Fixo / Sem WhatsApp

---

## 5. Riscos e mitigação

| Risco | Probabilidade | Mitigação |
|-------|:--:|-----------|
| WhatsApp banir a sessão por uso indevido | Baixa | `onWhatsApp` é leve — não envia mensagens, mesma chamada que o WhatsApp Web faz ao abrir chat |
| Baileys quebrar com update do WhatsApp Web | Média | Package `@whiskeysockets/baileys` é ativamente mantido (v6.x, 2025). Pin versão no package.json |
| Sessão expirar | Média | Auth state em arquivo. Validade típica: semanas. Se expirar, regenerar QR Code |
| Rate limit | Baixa | Volume: ~1,370 números. Com 50/min, ~28 minutos para verificação completa na primeira execução. Cache evita re-verificação |
| Baileys offline | Média | `checkWhatsappBaileys()` retorna `null` → fallback para Camada 2 (wa.me) + detectWA. UI mostra "📱 Celular" sem confirmação |
| ToS do WhatsApp | Baixa | Uso pessoal, não comercial. `onWhatsApp` não envia mensagens nem coleta dados de terceiros |

---

## 6. Alternativas consideradas

### A) Apenas wa.me público (status quo)
**Rejeitado:** Só detecta Business (~5-20%), não resolve o gap de WhatsApp pessoal.

### B) Meta Business API
**Rejeitado:** Custo, setup complexo, não tem endpoint "verificar existência" direto.

### C) WhatsApp Business API via BSP (360dialog, WATI)
**Rejeitado:** Custo mensal + por mensagem, overkill para verificação.

### D) Enviar mensagem real e verificar entrega
**Rejeitado:** Violação de privacidade, spam, e a entrega não confirma existência (pode cair em "enviado" sem ser "entregue").

---

## 7. Plano de execução

### Fase 1 · Package + Microsserviço

1. Criar `packages/baileys-wa/` com TypeScript
2. Implementar `socket.ts` (makeWASocket + auth state)
3. Implementar `whatsapp.service.ts` (verificarNumero)
4. Implementar rota `POST /check`
5. Testar com o próprio número
6. Docker opcional (docker-compose com health check)

### Fase 2 · Integração com adsentice

7. `checkWhatsappBaileys()` em `wa-check.ts`
8. Wire no pipeline `POST /api/wa-check/trigger`
9. Atualizar LeadTable chip (4 estados)
10. Atualizar Wa-Check Manager UI
11. Atualizar `/api/wa-check/status` para segregar stats por camada

### Fase 3 · Produção

12. Health check no `/api/wa-check/status` (Baileys online?)
13. Monitorar tamanho do cache
14. Cron de verificação batch (diário, 2am)
15. Persistir resultados no Supabase (colunas `wa_checked`, `wa_has_whatsapp`, `wa_is_business`, `wa_display_name`)

---

## 8. Métricas esperadas

| Métrica | Antes (só wa.me) | Depois (+Baileys) |
|---------|:---:|:---:|
| 💼 Business confirmados | 5-20% | 5-20% (igual) |
| 📱 WhatsApp pessoal detectado | 0% | ~60-80% dos celulares restantes |
| 📱 Celular (sem confirmação) | 80-95% | ~10-20% (Baileys offline) |
| 📵 Confirmado sem WhatsApp | 0% | ~10-20% |
| Custo total | $0 | $0 |
| Setup | — | QR Code scan (1 vez) |

---

## 9. Fontes (medido=verdade)

- **wa-check.ts** — `apps/web/src/lib/wa-check.ts` (v119, wa.me público com redirect:follow)
- **detectWA** — `LeadTable.tsx:390-397` (heurística formato celular BR)
- **Banco** — Supabase `discovery_listings`, 1,370 phones, 8,626 total
- **Teste live** — `tools/audit_l0_fields.py` ($0.0131, dentist Vitória ES, 3 items, phone=null em 2/3)
- **Baileys docs** — `@whiskeysockets/baileys` v6, `onWhatsApp(jid)` method
- **ADR-0040** — L0 Live Audit, 41 campos, phone fill rate 38%
