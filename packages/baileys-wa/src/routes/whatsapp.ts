// ══════════════════════════════════════════════════════════════════
// ADSENTICE · WhatsApp Route — POST /check + POST /check-batch + GET /health
// Camada 3 do wa-check (ADR-0041) · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import { Router, type Request, type Response } from "express"
import { verificarNumero, verificarNumeros } from "../services/whatsapp.service.js"
import { isConnected } from "../socket.js"

const router = Router()

/** Verifica 1 número */
router.post("/check", async (req: Request, res: Response) => {
  const { numero } = req.body

  if (!numero || typeof numero !== "string") {
    res.status(400).json({ erro: "numero obrigatório (string)" })
    return
  }

  const resultado = await verificarNumero(numero)
  res.json(resultado)
})

/** Verifica múltiplos números em lote */
router.post("/check-batch", async (req: Request, res: Response) => {
  const { numeros } = req.body

  if (!Array.isArray(numeros) || numeros.length === 0) {
    res.status(400).json({ erro: "numeros obrigatório (string[])" })
    return
  }

  if (numeros.length > 200) {
    res.status(400).json({ erro: "máximo 200 números por lote" })
    return
  }

  const resultados = await verificarNumeros(numeros)
  const existentes = resultados.filter(r => r.existe).length

  res.json({
    total: resultados.length,
    existentes,
    ausentes: resultados.length - existentes,
    resultados,
  })
})

/** Health check */
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: isConnected() ? "connected" : "disconnected",
    uptime: process.uptime(),
    cacheSize: "in-memory (per-session)",
    version: "1.0.0",
  })
})

export default router
