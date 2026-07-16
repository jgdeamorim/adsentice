"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

export interface FindingAlert {
  id: string
  level: "critical" | "warning" | "info"
  route: string
  message: string
  detail?: string
  count: number
  first_seen: string
  last_seen: string
  acknowledged: boolean
}

interface AlertContextType {
  alerts: FindingAlert[]
  activeAlerts: FindingAlert[]
  criticalCount: number
  warningCount: number
  ackAlert: (id: string) => void
  refresh: () => void
}

const AlertContext = createContext<AlertContextType>({
  alerts: [], activeAlerts: [], criticalCount: 0, warningCount: 0,
  ackAlert: () => {}, refresh: () => {},
})

export function useAlerts() { return useContext(AlertContext) }

/** Poll alerts from /api/health every 30s + on focus */
export function AlertProvider({ children, initialAlerts = [] }: {
  children: React.ReactNode
  initialAlerts?: FindingAlert[]
}) {
  const [alerts, setAlerts] = useState<FindingAlert[]>(initialAlerts)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { signal: AbortSignal.timeout(5000) })

      if (!res.ok) return
      const data = await res.json()

      if (data.alerts?.active > 0 || (alerts.length === 0 && data.recent_errors?.length > 0)) {
        // Fetch full alerts list from telemetry endpoint or use embedded
        setAlerts(data.alerts?.items || [])
      }
    } catch { /* health endpoint offline — keep current alerts */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, 30_000) // poll every 30s

    window.addEventListener("focus", refresh)
    
return () => { clearInterval(id); window.removeEventListener("focus", refresh) }
  }, [refresh])

  const ackAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
    fetch(`/api/health?ack=${id}`, { method: "POST" }).catch(() => {})
  }, [])

  const activeAlerts = alerts.filter(a => !a.acknowledged)
  const criticalCount = activeAlerts.filter(a => a.level === "critical").length
  const warningCount = activeAlerts.filter(a => a.level === "warning").length

  return (
    <AlertContext.Provider value={{ alerts, activeAlerts, criticalCount, warningCount, ackAlert, refresh }}>
      {children}
    </AlertContext.Provider>
  )
}
