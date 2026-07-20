# HANDOFF v133 · 2026-07-19 · Evolution API Infra Permanente

**Selo pós-auditoria completa do :3100 + 4 gaps resolvidos + ADR-0043**

## Entregas

| Área | Entrega |
|------|---------|
| ADR-0043 | Spec completa Evolution API (440 linhas) — arquitetura, contratos, segurança, riscos |
| Gap 1 | Systemd `evolution-api.service` — enabled, auto-restart, watchdog 60s |
| Gap 2 | Backup `.env` → `docs/secret/.env.EVOLUTION` |
| Gap 3 | Script `scripts/start-evolution-api.sh` — pre-flight + systemd/fallback |
| Gap 4 | Healthcheck `isEvolutionApiOnline()` — cache 30s, trigger 503, status report |
| Código | wa-check.ts +21 linhas, trigger +6, status +5 |

## Estado do :3100

```
Evolution API v2.3.7 (Node.js v23.10.0, tsx direto)
Instância: adsentice · Status: open · Owner: Jeferson Amorim
Banco: adsentice-pg :6397/evolution_api (37 tabelas, 2,012 IsOnWhatsapp)
Redis: :6396 (3 chaves de sessão evolution:baileys:*)
Webhook: CONNECTION_UPDATE → :3000/api/wa-check/webhook
Systemd: enabled (não ativo — processo direto anterior ainda roda)
```

## Wa-Check

```
Fila: 0 pendentes · Último run: 20:04 BRT (auto, 199 phones)
1.085/1.370 verificados (79%)
  💼 378 Business (35%) · 📱 159 WhatsApp (15%) · 📵 548 Sem (50%)
```

## Commits

```
9c7cb4c → v133 Evolution API infra permanente + healthcheck (ADR-0043)
6e97ae5 → v132 FINAL Wa-Check ciclo completo fechado
```

## Próxima sessão

1. StrategyResolver backport S10
2. Gate S11 elegibilidade via L2
3. L0 re-enrich nos 7.170 listings pré-v104
4. Testar systemd evolution-api no próximo reboot
5. Migrar Evolution API de `tsx` para `start:prod` (build + dist)
6. SurfaceSpecialist factory (20 surfaces)
