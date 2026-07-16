"use client"

import { useState } from "react"

import Box from "@mui/material/Box"

import Typography from "@mui/material/Typography"
import Chip from "@mui/material/Chip"
import Button from "@mui/material/Button"
import Collapse from "@mui/material/Collapse"
import IconButton from "@mui/material/IconButton"

import { useAlerts } from "@/contexts/AlertContext"


/** Banner vermelho no topo de TODA página admin quando há findings ativos.
 *  Igual ao error overlay do Next.js — mas para o ecossistema adsentice. */
export default function AdminAlertBanner() {
  const { activeAlerts, criticalCount, warningCount, ackAlert } = useAlerts()
  const [expanded, setExpanded] = useState(false)

  if (activeAlerts.length === 0) return null

  const criticals = activeAlerts.filter(a => a.level === "critical")
  const warnings = activeAlerts.filter(a => a.level === "warning")

  return (
    <Box sx={{ width: "100%", position: "sticky", top: 0, zIndex: 1300 }}>
      {/* Barra principal — sempre visível */}
      <Box
        sx={{
          bgcolor: criticals.length > 0 ? "error.main" : "warning.main",
          color: "#fff",
          px: 2, py: 1,
          display: "flex", alignItems: "center", gap: 1,
          cursor: "pointer",
          flexWrap: "wrap",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.8rem" }}>
          🚨 {activeAlerts.length} Finding Alert{activeAlerts.length > 1 ? "s" : ""} Ativo{activeAlerts.length > 1 ? "s" : ""}
        </Typography>

        {criticalCount > 0 && (
          <Chip label={`${criticalCount} crítico${criticalCount > 1 ? "s" : ""}`} size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600, fontSize: "0.65rem" }} />
        )}
        {warningCount > 0 && (
          <Chip label={`${warningCount} alerta${warningCount > 1 ? "s" : ""}`} size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#fff", fontSize: "0.65rem" }} />
        )}

        <Box sx={{ flex: 1 }} />

        <Typography variant="caption" sx={{ opacity: 0.7, fontSize: "0.6rem" }}>
          Clique para expandir · Atualiza a cada 30s
        </Typography>

        <Button
          size="small"
          variant="outlined"
          sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", fontSize: "0.65rem", minWidth: 0, px: 1 }}
          href="/en/admin/telemetry"
        >
          📡 Ver Telemetria
        </Button>
      </Box>

      {/* Expansão — detalhes dos alertas */}
      <Collapse in={expanded}>
        <Box sx={{ bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "divider", px: 2, py: 1.5 }}>
          {criticals.map(a => (
            <Box key={a.id} sx={{ mb: 1, p: 1, bgcolor: "error.50", borderRadius: 1, border: "1px solid", borderColor: "error.200" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Chip label="CRITICAL" size="small" color="error" />
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{a.route}</Typography>
                  <Typography variant="caption" color="text.secondary">×{a.count}</Typography>
                </Box>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); ackAlert(a.id) }}>
                  <Typography variant="caption" sx={{ fontSize: "0.6rem" }}>✔️</Typography>
                </IconButton>
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{a.message}</Typography>
              {a.detail && <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: "0.65rem" }}>{a.detail?.slice(0, 200)}</Typography>}
            </Box>
          ))}
          {warnings.slice(0, 5).map(a => (
            <Box key={a.id} sx={{ mb: 0.5, display: "flex", gap: 1, alignItems: "center" }}>
              <Chip label="WARN" size="small" color="warning" variant="tonal" />
              <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{a.route}</Typography>
              <Typography variant="caption" color="text.secondary">{a.message?.slice(0, 100)}</Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}
