// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Baileys Socket — WhatsApp Web connection
// makeWASocket + multi-file auth state + QR code
// Camada 3 do wa-check (ADR-0041) · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys"

import Pino from "pino"
import qrcode from "qrcode-terminal"

import config from "./config.js"

let sock: WASocket | null = null
let connected = false

export async function startSocket(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir)

  sock = makeWASocket({
    auth: state,
    logger: Pino({ level: "silent" }),
    printQRInTerminal: false, // usamos qrcode-terminal manual
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.log("\n📱 Escaneie o QR Code no WhatsApp:")
      console.log("   Configurações → Aparelhos conectados → Conectar um aparelho\n")
      qrcode.generate(qr, { small: true })
    }

    if (connection === "open") {
      connected = true
      console.log("✅ WhatsApp conectado — Baileys online")
    }

    if (connection === "close") {
      connected = false
      const reason = (lastDisconnect as any)?.error
      const statusCode = (lastDisconnect as any)?.error?.output?.statusCode

      console.log(`🔌 WhatsApp desconectado · reconectando... (${statusCode || reason || "?"})`)

      // Não reconectar em banimentos
      if (statusCode === 401 || statusCode === 403) {
        console.log("⚠️ Sessão inválida. Delete a pasta sessions/ e reinicie para gerar novo QR Code.")
        return
      }

      // Reconexão automática com delay
      setTimeout(() => startSocket(), 5000)
    }
  })

  return sock
}

export function getSocket(): WASocket {
  if (!sock) {
    throw new Error("Socket não iniciado. Chame startSocket() primeiro.")
  }
  return sock
}

export function isConnected(): boolean {
  return connected
}
