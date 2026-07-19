// Webhook: Evolution API → adsentice Redis
// Recebe CONNECTION_UPDATE e atualiza adsentice:wa-check:online
export async function POST(req: Request) {
  try {
    const body = await req.json() as any
    const event = body?.event || body?.type
    const instance = body?.instance || body?.instanceName

    if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
      const status = body?.data?.connectionStatus || body?.connectionStatus || 'unknown'
      const { execSync } = await import('child_process')
      execSync(`redis-cli -p 6396 --no-auth-warning SETEX adsentice:wa-check:online 86400 '${JSON.stringify({ status, instance, ts: new Date().toISOString() }).replace(/'/g, "'\\''")}'`, { encoding: 'utf-8', timeout: 2000 })
      console.log(`[wa-check webhook] ${instance}: ${status}`)
    }

    return Response.json({ ok: true })
  } catch (e: any) {
    console.error('[wa-check webhook]', e.message?.slice(0, 80))
    return Response.json({ ok: true }) // always 200 pra Evolution API
  }
}
