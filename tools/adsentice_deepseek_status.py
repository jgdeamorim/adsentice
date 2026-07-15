#!/usr/bin/env python3
"""
adsentice_deepseek_status.py — DeepSeek Balance + Cache Stats
═══════════════════════════════════════════════════════════
GET /user/balance → saldo real (USD/CNY)
Salva no Redis p/ dashboard de custos ler sem chamar API.

Fonte: api-docs.deepseek.com/api/get-user-balance
medido=verdade · 2026-07-15 · adsentice
"""

import json, os, sys, subprocess
from pathlib import Path
from urllib.request import Request, urlopen

BALANCE_API = "https://api.deepseek.com/user/balance"
REDIS_PORT = "6396"

def load_key():
    for p in [
        Path(__file__).parent.parent / "docs" / "secret" / ".env.DEEPSEEK",
        Path(os.path.expanduser("~")) / ".deepseek" / ".env",
    ]:
        if p.exists():
            with open(p) as f:
                for line in f:
                    if line.startswith("DEEPSEEK_API_KEY="):
                        return line.strip().split("=", 1)[1]
    return os.environ.get("DEEPSEEK_API_KEY", "")

def fetch_balance(key: str) -> dict | None:
    try:
        req = Request(BALANCE_API, headers={
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        })
        data = json.loads(urlopen(req, timeout=10).read())
        return data
    except Exception as e:
        print(f"❌ Balance API: {e}", file=sys.stderr)
        return None

def save_to_redis(balance: dict):
    """Salva no Redis p/ dashboard ler (TTL 1h)."""
    try:
        available = balance.get("is_available", False)
        infos = balance.get("balance_infos", [])
        for info in infos:
            currency = info.get("currency", "?")
            total = info.get("total_balance", "0")
            granted = info.get("granted_balance", "0")
            topped = info.get("topped_up_balance", "0")
            subprocess.run(
                ["redis-cli", "-p", REDIS_PORT, "--no-auth-warning",
                 "SETEX", f"adsentice:llm:balance:{currency.lower()}", "3600",
                 json.dumps({"available": available, "total": total,
                             "granted": granted, "topped_up": topped,
                             "updated_at": __import__('time').strftime('%Y-%m-%dT%H:%M:%SZ', __import__('time').gmtime())})],
                timeout=2, capture_output=True,
            )
    except Exception:
        pass

def main():
    key = load_key()
    if not key:
        print("❌ DEEPSEEK_API_KEY não configurada")
        return

    balance = fetch_balance(key)
    if not balance:
        return

    print(f"DeepSeek Balance: {json.dumps(balance, indent=2)}")
    save_to_redis(balance)
    print("✅ Salvo no Redis (adsentice:llm:balance:*)")

if __name__ == "__main__":
    main()
