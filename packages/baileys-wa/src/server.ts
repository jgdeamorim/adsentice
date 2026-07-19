// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Baileys WA Server — WhatsApp verification microservice
// Camada 3 do wa-check (ADR-0041) · porta :3100 · $0
// Uso: npm run dev (tsx watch) ou npm start (compilado)
// ══════════════════════════════════════════════════════════════════

import express from "express"
import { startSocket } from "./socket.js"
import whatsappRoute from "./routes/whatsapp.js"
import config from "./config.js"

const app = express()

app.use(express.json())

// ── Rotas ──
app.use("/", whatsappRoute)

// ── Bootstrap ──
async function bootstrap() {
  console.log("🚀 ADSENTICE · Baileys WA Server")
  console.log(`   Porta: ${config.port}`)
  console.log(`   Sessões: ${config.sessionDir}`)
  console.log()

  // Inicia o socket WhatsApp (QR Code na primeira execução)
  await startSocket()

  app.listen(config.port, () => {
    console.log(`\n✅ API rodando em http://localhost:${config.port}`)
    console.log(`   POST /check        — verificar 1 número`)
    console.log(`   POST /check-batch  — verificar até 200 números`)
    console.log(`   GET  /health       — status da conexão`)
  })
}

bootstrap().catch(err => {
  console.error("❌ Falha ao iniciar:", err)
  process.exit(1)
})
