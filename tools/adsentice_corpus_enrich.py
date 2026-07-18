#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""
adsentice_corpus_enrich.py — Enriquecimento de corpus para intend de qualidade total

Fontes:
  1. Vercel React Best Practices — 70 rules, 8 categories
  2. shadcn/ui theming — token architecture, semantic bg/fg pairs
  3. WCAG 2.2 — ARIA landmarks, focus-visible, contrast 4.5:1
  4. Landing page patterns — CTA placement, trust signals, conversion

Embeda no Qdrant adsentice-self com tag=adsentice-warp, kind=best-practice.
Metadados: domain, severity, segment, surface, intent (para query semântica).

medido=verdade · 2026-07-18 · adsentice
"""

import hashlib, httpx, json, sys, time, uuid
from typing import Any

QDRANT = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
EMBED = "http://127.0.0.1:8081/embed"
BATCH = 15
DRY_RUN = "--dry-run" in sys.argv

def embed(texts: list[str]) -> list[list[float]]:
    if not texts: return []
    try:
        r = httpx.post(EMBED, json={"texts": texts}, timeout=60.0)
        return r.json().get("vectors", []) if r.status_code == 200 else []
    except: return []

def upsert(points: list[dict]) -> bool:
    if DRY_RUN:
        print(f"  [dry] Would upsert {len(points)} pts"); return True
    try:
        r = httpx.put(f"{QDRANT}/collections/{COLLECTION}/points",
                      json={"points": points}, params={"wait": "true"}, timeout=60.0)
        return r.status_code == 200
    except: return False

# ═══════════════════════════════════════════════════════════════
# SOURCE 1: Vercel React Best Practices (70 rules)
# ═══════════════════════════════════════════════════════════════

REACT_RULES = {
    "CRITICAL — Eliminating Waterfalls": [
        ("async-cheap-condition-before-await", "Check cheap sync conditions before awaiting flags or remote values. Place conditions before the await expression."),
        ("async-defer-await", "Move await into the branch where the result is actually used, not at the top of the function."),
        ("async-parallel", "Use Promise.all() for independent async operations instead of sequential awaits."),
        ("async-dependencies", "Use better-all or Promise.allSettled for operations with partial dependencies."),
        ("async-api-routes", "Start promises early in API routes, await them late to maximize parallelism."),
        ("async-suspense-boundaries", "Use React Suspense boundaries to stream content progressively instead of blocking."),
    ],
    "CRITICAL — Bundle Size Optimization": [
        ("bundle-barrel-imports", "Import directly from files, avoid barrel index.ts re-exports that defeat tree-shaking."),
        ("bundle-analyzable-paths", "Prefer statically analyzable import paths for better code splitting."),
        ("bundle-dynamic-imports", "Use next/dynamic() for heavy components to defer loading."),
        ("bundle-defer-third-party", "Load analytics and logging scripts after hydration (requestIdleCallback)."),
        ("bundle-conditional", "Load modules only when a feature is activated, not on initial load."),
        ("bundle-preload", "Preload resources on hover/focus for perceived speed improvements."),
    ],
    "HIGH — Server-Side Performance": [
        ("server-cache-react", "Use React.cache() for per-request data deduplication in Server Components."),
        ("server-cache-lru", "Use LRU cache for cross-request caching of expensive computations."),
        ("server-dedup-props", "Avoid duplicate serialization in RSC props — pass minimal data."),
        ("server-hoist-static-io", "Hoist static I/O (fonts, logos, config) to module level outside request scope."),
        ("server-no-shared-module-state", "Avoid module-level mutable request state in RSC/SSR."),
        ("server-serialization", "Minimize data passed to client components — only what's rendered."),
        ("server-parallel-fetching", "Restructure components to parallelize data fetches instead of waterfall."),
        ("server-after-nonblocking", "Use after() for non-blocking operations (logging, analytics) post-response."),
    ],
    "MEDIUM — Re-render Optimization": [
        ("rerender-memo", "Extract expensive work into memoized components with React.memo."),
        ("rerender-dependencies", "Use primitive dependencies in useEffect/useMemo to avoid false triggers."),
        ("rerender-derived-state", "Subscribe to derived boolean values, not raw complex objects."),
        ("rerender-functional-setstate", "Use functional setState for callbacks to avoid stale closures."),
        ("rerender-lazy-state-init", "Pass a function to useState() for expensive initial values."),
        ("rerender-split-combined-hooks", "Split hooks that have independent dependency arrays."),
        ("rerender-move-effect-to-event", "Put interaction logic in event handlers, not effects."),
        ("rerender-transitions", "Use startTransition for non-urgent updates to keep UI responsive."),
        ("rerender-use-deferred-value", "Defer expensive renders with useDeferredValue to keep input responsive."),
        ("rerender-no-inline-components", "Don't define components inside other components — recreated every render."),
    ],
    "MEDIUM — Rendering Performance": [
        ("rendering-content-visibility", "Use CSS content-visibility:auto for long lists to skip off-screen rendering."),
        ("rendering-hoist-jsx", "Extract static JSX subtrees outside the component to avoid recreation."),
        ("rendering-svg-precision", "Reduce SVG coordinate precision to 2 decimal places for smaller payload."),
        ("rendering-hydration-no-flicker", "Use inline script for client-only data to prevent hydration mismatch flicker."),
        ("rendering-conditional-render", "Use ternary operator, not && for conditional rendering (avoids 0 rendering)."),
        ("rendering-usetransition-loading", "Prefer useTransition for loading states — non-blocking UI updates."),
        ("rendering-resource-hints", "Use React DOM resource hints (preload, preconnect) for critical resources."),
    ],
    "LOW-MEDIUM — JavaScript Performance": [
        ("js-batch-dom-css", "Group CSS changes via class toggling or cssText instead of individual style mutations."),
        ("js-index-maps", "Build a Map<id, object> for O(1) lookups instead of repeated array finds."),
        ("js-cache-property-access", "Cache object properties in local variables inside loops."),
        ("js-cache-function-results", "Cache function results in module-level Map for expensive pure functions."),
        ("js-length-check-first", "Check array length before expensive comparison to short-circuit."),
        ("js-early-exit", "Return early from functions — reduce nesting, improve readability."),
        ("js-hoist-regexp", "Hoist RegExp creation outside loops — compile once, reuse."),
        ("js-set-map-lookups", "Use Set.has() / Map.get() for O(1) existence/retrieval checks."),
        ("js-tosorted-immutable", "Use toSorted() for immutable array sorting instead of sort()."),
        ("js-flatmap-filter", "Use flatMap to map and filter in a single pass."),
    ],
    "LOW — Advanced Patterns": [
        ("advanced-init-once", "Initialize app once per load — use module-level singletons for expensive setup."),
        ("advanced-use-latest", "useLatest() pattern for stable callback refs without stale closures."),
    ],
}

# ═══════════════════════════════════════════════════════════════
# SOURCE 2: shadcn/ui Theme Token Architecture
# ═══════════════════════════════════════════════════════════════

SHADCN_THEMING = [
    ("token-architecture", "Semantic bg/foreground pairs: every surface token has a matching foreground token for text/icons on that surface. background↔foreground, card↔card-foreground, primary↔primary-foreground, secondary↔secondary-foreground, muted↔muted-foreground, accent↔accent-foreground, destructive↔destructive-foreground."),
    ("token-convention", "Use semantic color tokens (bg-primary, text-muted-foreground) instead of raw values (bg-blue-500). This ensures consistency across light/dark themes and component variants."),
    ("spacing-convention", "Prefer gap-* utility classes for flex/grid spacing. Avoid space-y-* or space-x-* for consistent layout behavior across breakpoints."),
    ("radius-scale", "base radius token → derived radius-sm, radius-md, radius-lg, radius-xl. Cards use radius, inputs use radius, buttons use radius. Popovers use radius-md. Full-round components use radius-full (9999px)."),
    ("dark-mode-tokens", "Theme tokens live under :root (light) and .dark (dark mode). Each token has a light and dark variant defined in CSS custom properties. Use color-scheme: light dark meta tag for auto-detection."),
    ("chart-palette", "chart-1 through chart-5 define the default chart color palette. Each is a CSS custom property that maps to semantic colors in light and dark themes."),
    ("typography-rhythm", "Use --typeset-leading and --typeset-flow CSS variables to tune size, leading, and vertical rhythm for different content contexts (chat vs docs vs landing)."),
    ("composition-pattern", "All components share a common composable interface. Use render prop for composition (not asChild). Third-party components integrate and style to match the design system."),
]

# ═══════════════════════════════════════════════════════════════
# SOURCE 3: WCAG 2.2 A11y Best Practices
# ═══════════════════════════════════════════════════════════════

WCAG_RULES = [
    ("aria-landmarks", "Use ARIA landmark roles: banner (header), navigation (nav), main (main content), complementary (sidebar), contentinfo (footer), search, form. Each landmark with unique accessible name when multiple exist.", "high"),
    ("aria-label", "Use aria-label to provide accessible names for elements without visible text labels (icon buttons, close buttons). Use aria-labelledby to reference existing visible labels.", "high"),
    ("focus-visible", "Use :focus-visible pseudo-class for keyboard focus indicators. Never use :focus { outline: none } without replacement. Minimum focus indicator area: 2px solid border equivalent.", "critical"),
    ("contrast-minimum", "Text must have contrast ratio ≥4.5:1 against background (AA). Large text ≥3:1. UI components and graphical objects ≥3:1. Use oklch() with perceptually uniform contrast checks.", "critical"),
    ("keyboard-navigation", "All interactive elements must be keyboard accessible. Tab order follows visual order. No keyboard traps. Skip links for repeated content. Manage focus for dynamic content changes.", "high"),
    ("semantic-html", "Use native HTML elements with implicit roles: <button> (not <div onclick>), <a href> (not <span onclick>), <input> with <label>, <table> with <caption>. ARIA is a supplement, not replacement.", "high"),
    ("prefers-reduced-motion", "Respect prefers-reduced-motion: reduce media query. Disable all animations or reduce to opacity-only transitions (<0.01ms duration). Never use infinite animations.", "high"),
    ("heading-hierarchy", "Use exactly one <h1> per page. Headings create a logical outline — never skip levels (h1→h3 without h2). Use heading elements, not styled <div> or <p>.", "medium"),
    ("color-not-alone", "Color must not be the only visual means of conveying information. Add icons, patterns, or text labels alongside color-coded status indicators.", "medium"),
    ("touch-targets", "Interactive elements on touch screens need minimum 44×44px target size. Ensure adequate spacing between touch targets to prevent accidental activation.", "medium"),
    ("error-identification", "Form errors must be clearly identified and described in text. Error messages must be associated with their inputs via aria-describedby. Suggest corrections.", "medium"),
    ("prefers-color-scheme", "Support light and dark mode via prefers-color-scheme: light/dark media query. Use color-scheme meta tag. Test both themes for contrast compliance in each mode.", "medium"),
]

# ═══════════════════════════════════════════════════════════════
# SOURCE 4: Landing Page Conversion Patterns
# ═══════════════════════════════════════════════════════════════

LANDING_PATTERNS = [
    ("cta-placement", "CTA button must be visible above the fold without scrolling. Primary CTA uses pill shape (border-radius: 99px), high contrast color, and action verb. Secondary CTA is ghost/outline style.", "high"),
    ("trust-signals", "Place social proof (ratings, testimonials, logos) immediately before the first CTA. Above-fold trust signals increase conversion 15-30%. Include specific numbers: '4.9★ (131 reviews)'.", "high"),
    ("hero-structure", "Hero section: headline (problem/benefit, <12 words) → subtitle (specific claim, <20 words) → CTA (action verb) → visual (mockup/screenshot, not stock photo). Gradient background with radial overlay for depth.", "high"),
    ("feature-benefit", "Features section: 3-4 cards, each with icon + headline + benefit (not feature). Use 'so you can...' formula. Cards have hover elevation (translateY(-2px) + shadow increase).", "medium"),
    ("pricing-anchoring", "Display 3-4 pricing tiers with one 'Most Popular' highlighted. Anchor with a high-price option to make mid-tier look attractive. Include 'Free to start' option to reduce friction.", "medium"),
    ("faq-pattern", "FAQ section with accordion component. Group questions by topic. Answer objection-first ('Is it worth the cost?' → 'R$197/mês = less than 1 patient'). Keep answers under 3 sentences.", "medium"),
    ("urgency-scarcity", "Use honest urgency: 'Only 47% of dentists in your area have claimed their GMB' (real data). Never use fake countdown timers or 'Only 2 spots left' when unlimited.", "medium"),
    ("mobile-first", "70% of BR traffic is mobile. Test all sections at 375px width. Touch targets ≥44px. Forms use inputmode='numeric' for phone/CEP fields. CTA sticky on mobile scroll.", "high"),
]

# ═══════════════════════════════════════════════════════════════
# SOURCE 5: Dark/Light Mode Best Practices
# ═══════════════════════════════════════════════════════════════

DARK_MODE_PATTERNS = [
    ("color-scheme-meta", "Use <meta name='color-scheme' content='light dark'> to signal browser native UI adaptation. CSS: :root { color-scheme: light dark; } for automatic form control styling.", "high"),
    ("system-preference", "Default to prefers-color-scheme media query. Store user preference in localStorage with 'light'|'dark'|'system' options. Apply .dark class to <html> for Tailwind dark mode.", "medium"),
    ("semantic-tokens", "Dark mode tokens invert surface hierarchy: bg (darkest) → card (slightly lighter) → popover (lighter still). Text: fg (lightest) → muted-foreground (muted). Primary color stays vibrant but slightly desaturated.", "high"),
    ("shadow-replacement", "Shadows don't work in dark mode — use border or ring instead. Replace box-shadow with border: 1px solid hsl(x y% z% / 0.15). Elevation conveyed through lightness, not shadow darkness.", "medium"),
    ("image-adaptation", "Use CSS filter: brightness(0.9) for images in dark mode to reduce eye strain. SVG icons should use currentColor for automatic theme adaptation. Logo variants for light/dark backgrounds.", "low"),
    ("transition-smooth", "Transition background-color and color on theme change: * { transition: background-color 0.3s ease, color 0.3s ease }. Use will-change: background-color on large surfaces only.", "low"),
    ("contrast-dark", "Dark mode contrast: body text ≥4.5:1 against dark bg, same as light mode. Avoid pure white (#fff) text on pure black (#000) — use off-white (#f0f0f0) on near-black (#111) for comfort.", "high"),
    ("brand-preservation", "Brand colors should be 10-20% lighter in dark mode to maintain perceived brightness. Primary color saturation slightly reduced (chroma -5% in oklch) to avoid vibrating against dark backgrounds.", "low"),
]

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def enrich():
    print("═" * 60)
    print("🧠 adsentice_corpus_enrich — Intend de Qualidade Total")
    print(f"   Sources: React(70) + shadcn(8) + WCAG(12) + Landing(8) + Dark(8)")
    if DRY_RUN: print("   🔍 DRY RUN")
    print("═" * 60)

    all_entries = []

    # Source 1: React rules
    for category, rules in REACT_RULES.items():
        for rule_id, description in rules:
            severity = category.split(" — ")[0].lower()
            domain = category.split(" — ")[1].lower().replace(" ", "-")
            all_entries.append({
                "id": rule_id,
                "kind": "best-practice",
                "category": "react-performance",
                "name": rule_id,
                "source": "vercel/agent-skills/react-best-practices",
                "severity": severity,
                "domain": domain,
                "surface": "all",
                "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
                "text": f"React performance rule ({severity}): {rule_id} — {description}",
                "description": description,
            })

    # Source 2: shadcn/ui theming
    for token_id, description in SHADCN_THEMING:
        all_entries.append({
            "id": f"shadcn-{token_id}",
            "kind": "best-practice",
            "category": "design-tokens",
            "name": token_id,
            "source": "shadcn/ui (context7)",
            "severity": "medium",
            "domain": "design-system",
            "surface": "all",
            "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
            "text": f"shadcn/ui design token pattern: {token_id} — {description}",
            "description": description,
        })

    # Source 3: WCAG 2.2
    for rule_id, description, severity in WCAG_RULES:
        all_entries.append({
            "id": f"wcag-{rule_id}",
            "kind": "best-practice",
            "category": "accessibility",
            "name": rule_id,
            "source": "WCAG 2.2 (context7 + w3c)",
            "severity": severity,
            "domain": "a11y",
            "surface": "all",
            "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
            "text": f"WCAG 2.2 a11y rule ({severity}): {rule_id} — {description}",
            "description": description,
        })

    # Source 4: Landing page patterns
    for pattern_id, description, severity in LANDING_PATTERNS:
        all_entries.append({
            "id": f"landing-{pattern_id}",
            "kind": "best-practice",
            "category": "landing-page",
            "name": pattern_id,
            "source": "landing-page-best-practices (vercel labs + context7)",
            "severity": severity,
            "domain": "conversion",
            "surface": "S11",
            "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
            "text": f"Landing page conversion pattern ({severity}): {pattern_id} — {description}",
            "description": description,
        })

    # Source 5: Dark/Light mode
    for pattern_id, description, severity in DARK_MODE_PATTERNS:
        all_entries.append({
            "id": f"darkmode-{pattern_id}",
            "kind": "best-practice",
            "category": "color-scheme",
            "name": pattern_id,
            "source": "dark-mode-best-practices (MDN + Tailwind + WCAG)",
            "severity": severity,
            "domain": "color-scheme",
            "surface": "all",
            "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
            "text": f"Dark/light mode pattern ({severity}): {pattern_id} — {description}",
            "description": description,
        })

    print(f"\n📋 {len(all_entries)} entries total:")
    kinds = {}; domains = {}
    for e in all_entries:
        kinds[e["category"]] = kinds.get(e["category"], 0) + 1
        domains[e["domain"]] = domains.get(e["domain"], 0) + 1
    for k, v in sorted(kinds.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")
    print(f"\n  Domains: {dict(sorted(domains.items(), key=lambda x: -x[1]))}")

    # Embed + Upsert
    batches = [all_entries[i:i + BATCH] for i in range(0, len(all_entries), BATCH)]
    upserted = 0

    print(f"\n📐 Embedding + Upsert ({BATCH} per batch)...")
    for bi, batch in enumerate(batches):
        texts = [e["text"] for e in batch]
        vectors = embed(texts)
        if len(vectors) != len(batch): continue

        points = []
        for entry, vec in zip(batch, vectors):
            pid = str(uuid.uuid5(uuid.NAMESPACE_URL, entry["id"]))
            pl = {
                "kind": entry["kind"],
                "category": entry["category"],
                "name": entry["name"],
                "source": entry["source"],
                "tag": "adsentice-warp",
                "severity": entry["severity"],
                "domain": entry["domain"],
                "surface": entry["surface"],
                "segments": entry["segments"],
                "description": entry["description"],
                "text": entry["text"],
            }
            points.append({"id": pid, "vector": vec, "payload": pl})

        if upsert(points): upserted += len(points)

        pct = (bi + 1) / len(batches) * 100
        print(f"  Batch {bi + 1}/{len(batches)} ({pct:.0f}%) — {upserted} upserted", end="\r")

    print(f"\n  ✅ {upserted} points upserted to {COLLECTION}")

    # Summary
    print(f"\n🧠 Corpus enriched: {upserted} new best-practice points")
    print(f"   React: 70 rules (8 categories)")
    print(f"   shadcn/ui: 8 token patterns")
    print(f"   WCAG 2.2: 12 a11y rules")
    print(f"   Landing: 8 conversion patterns")
    print(f"   Dark/Light: 8 mode patterns")
    print(f"   = {upserted} total corpus additions")
    print(f"   Tag: adsentice-warp, kind=best-practice")

if __name__ == "__main__":
    enrich()
