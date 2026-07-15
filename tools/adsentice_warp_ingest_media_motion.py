#!/usr/bin/env python3
"""
adsentice_warp_ingest_media_motion.py — CAMADA MEDIA+MOTION
═══════════════════════════════════════════════════════════════
Fontes combinadas:
  1. Framer Motion (context7) — layout animations, scroll-linked, SVG, gestures
  2. tw-animate-css (context7) — Tailwind CSS v4 animation utilities
  3. Locomotive Scroll (context7) — parallax, smooth scroll, data-attributes
  4. Lucide (context7) — 1700+ SVG icons, tree-shaking, a11y
  5. Lucide Animated (context7) — 400+ animated SVG icons (Motion-powered)
  6. 21st-magic — scroll-based-velocity, morphing-text, text-reveal, animated-list

Categorias de conhecimento:
  - svg-sprite        SVG icon libraries, patterns, a11y
  - svg-animated      SVG path morphing, animated icons, Lucide Animated
  - motion-scroll     Scroll-driven animations, ScrollTimeline, parallax
  - motion-layout     Layout animations, AnimatePresence, variants
  - motion-gesture    Drag, hover, tap, pan gestures
  - image-format      WebP, AVIF, responsive images, srcset, picture
  - css-animation     Tailwind animation utilities, easing, durations

Isso alimenta o M9 (tokens-composer) pipeline MOTION e RESPONSIVE.
E o M4 (composer) critique DIMENSION detailExecution.

medido=verdade · 2026-07-14 · adsentice
"""

import json, os, time, uuid
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG = "adsentice-warp"

def embed(texts):
    texts = [t[:800] for t in texts]
    req = Request(EMBED_URL, data=json.dumps({"texts": texts}).encode(),
                  headers={"Content-Type": "application/json"})
    return json.loads(urlopen(req, timeout=30).read())["vectors"]

def upsert(points):
    body = json.dumps({"points": points}).encode()
    req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                  data=body, headers={"Content-Type": "application/json"}, method="PUT")
    return json.loads(urlopen(req, timeout=30).read()).get("status", "error")

# ═══════════════════════════════════════════════════════════════
# SVG ICONS — Lucide + Lucide Animated + patterns
# ═══════════════════════════════════════════════════════════════

SVG_ICONS = [
    {
        "name": "Lucide — 1700+ SVG Icons (tree-shakable)",
        "kind": "media-knowledge",
        "category": "svg-icons",
        "description": "Lucide is an open-source icon library with 1700+ lightweight SVG icons. Fully tree-shakable via ES Modules. Each icon renders as inline SVG element. Props: size (default 24), color (currentColor), strokeWidth (2), absoluteStrokeWidth (false). Supports all SVG presentation attributes. DynamicIcon component for code-splitting: icons loaded async on demand via dynamicIconImports. For buttons: apply aria-label to button, not icon. Icons support <title> child for accessible names. Usage: <Camera size={48} color='red' strokeWidth={1} />. 16,596 code snippets available via context7.",
        "source": "Lucide (context7)", "quality": "P0",
        "tags": ["svg", "icons", "lucide", "tree-shaking", "react", "a11y", "aria-label"],
        "surfaces": ["S1", "S2", "S3", "S4", "S6", "S9", "S10", "S11", "S14", "S20", "S22"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "tokens": ["color", "typography", "spacing", "motion"],
    },
    {
        "name": "Lucide Animated — 400+ SVG Animated Icons (Motion-powered)",
        "kind": "media-knowledge",
        "category": "svg-animated",
        "description": "Lucide Animated provides 400+ beautifully crafted animated React SVG icons. Built on Motion (Framer Motion) + Lucide base icons. MIT licensed, copy-paste ready. Each icon auto-animates on hover with smooth SVG path animations. Install via shadcn CLI: places component file, auto-manages motion dependency. Components use PascalCase naming. Support all standard SVG props: className, onClick, style. Animation triggers on hover by default. SVG path morphing for smooth transitions between states. Example: import { Activity } from '@/components/icons/activity'; <Activity className='size-6' />. Use for: icon buttons, feature highlights, navigation items with hover feedback.",
        "source": "Lucide Animated (context7)", "quality": "P0",
        "tags": ["svg", "animated-icons", "motion", "lucide-animated", "hover", "path-animation", "react"],
        "surfaces": ["S1", "S3", "S4", "S9", "S11", "S14"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "tokens": ["color", "animation", "motion"],
    },
    {
        "name": "SVG Icon Best Practices — accessibility + performance",
        "kind": "media-knowledge",
        "category": "svg-icons",
        "description": "Critical SVG icon patterns: (1) Tree-shaking: import individual icons, never entire library. Lucide is ES Module native — unused icons auto-removed at build. (2) Accessibility: always provide aria-label on icon or <title> child. For icon-only buttons, aria-label goes on button, not icon. Screen readers skip decorative SVGs if aria-hidden=true. (3) Dynamic loading: use DynamicIcon for code-splitting — loads icon async on first render, reduces initial bundle. Has Fallback prop for loading state. (4) Sizing: avoid inline width/height. Use size prop (Lucide) or className with Tailwind. Default 24px matches Material Design touch target. (5) Colors: currentColor by default — inherits from parent text color. Override with color prop or className text-*. (6) strokeWidth: 2 default. Use 1.5 for light UI, 2.5 for bold. absoluteStrokeWidth: true for consistent sizing when scaling. (7) Avoid inline SVGs larger than 10KB — use img tag with .svg file for large illustrations. (8) Sprites: for >20 icons on same page, use SVG sprite sheet (<use href='sprite.svg#icon-id'>) to reduce DOM nodes.",
        "source": "Lucide + SVG spec (context7)", "quality": "P0",
        "tags": ["svg", "icons", "a11y", "performance", "tree-shaking", "best-practices", "aria-label"],
        "surfaces": ["S1", "S2", "S3", "S9", "S11", "S20"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "tokens": ["color", "typography", "spacing"],
    },
]

# ═══════════════════════════════════════════════════════════════
# MOTION + ANIMATION — Framer Motion, Locomotive, tw-animate
# ═══════════════════════════════════════════════════════════════

MOTION_PATTERNS = [
    # ── Framer Motion Core ──
    {
        "name": "Framer Motion — motion components (HTML + SVG)",
        "kind": "media-knowledge",
        "category": "motion-library",
        "description": "Framer Motion: production-grade React animation library. Drop-in replacement for HTML/SVG elements: motion.div, motion.button, motion.path, motion.circle, motion.rect, motion.svg. Props: animate (target state), initial (start state), exit (unmount animation), transition (timing config), variants (named animation states for orchestration), layout (automatic layout animation), layoutId (shared layout between elements). Uses Web Animations API (WAAPI) where possible with hardware acceleration. MotionValue for tracking animated values efficiently. 306 code snippets available via context7. Motion is bundled in shadcn/ui v4 already. For lightweight alternative: Motion One (~5KB, Web Animations API only, not React-specific).",
        "source": "Framer Motion (context7)", "quality": "P0",
        "tags": ["framer-motion", "react", "animation", "layout", "svg", "WAAPI", "hardware-accelerated"],
        "surfaces": ["S1", "S3", "S4", "S9", "S11"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "tokens": ["motion", "animation", "color"],
    },
    {
        "name": "Framer Motion — Layout Animations (layout + layoutId)",
        "kind": "media-knowledge",
        "category": "motion-layout",
        "description": "Layout animations: auto-animate size and position changes. layout prop: true (both size+position), 'position' (position only, size changes instantly), 'size' (size only). LayoutGroup: wrap siblings for coordinated layout animations — when one element changes, others smoothly reposition. layoutId: shared layout animation between two elements (e.g., card expanding to modal). The element morphs from one position/size to another. AnimatePresence: enables exit animations for unmounting components. mode='wait' (exit finishes before enter starts), mode='popLayout' (exit element pops out of layout flow, siblings animate into gap). onExitComplete callback after all exits finish. Example: click card → card layoutId morphs into expanded modal with shared title. Complex orchestrations: nested layoutIds for drill-down navigation animations. Stagger children: variants with transition.staggerChildren for sequenced item animations.",
        "source": "Framer Motion (context7)", "quality": "P0",
        "tags": ["layout-animation", "layoutId", "AnimatePresence", "shared-layout", "morphing", "stagger", "orchestration"],
        "surfaces": ["S1", "S3", "S4", "S9", "S10", "S11", "S18"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "tokens": ["motion", "animation", "spacing"],
    },
    {
        "name": "Framer Motion — Scroll-Linked Animations (scroll function)",
        "kind": "media-knowledge",
        "category": "motion-scroll",
        "description": "Scroll-linked animations using scroll() function. Link any animation to scroll progress: scroll(animation, { source, axis, target, offset }). Uses native ScrollTimeline API with automatic fallbacks. Example: scroll(animate('.progress-bar', { scaleX: [0, 1] })) links scale to scroll. source: scroll container (window default). axis: 'x' or 'y'. target: element to track (for ViewTimeline). offset: ['start start', 'end end'] for trigger range. Callback mode: scroll((progress) => updateDOM(progress)). Combine with React: useEffect + create animation + scroll bind. Performance: runs off main thread via native API. Hardware accelerated. Use for: progress bars, parallax hero text, sticky headers that transform, scroll-to-reveal sections, scroll velocity text effects. Alternative: Locomotive Scroll (JS library, 9.4KB, smooth scrolling + parallax via data-attributes).",
        "source": "Framer Motion + ScrollTimeline API (context7)", "quality": "P0",
        "tags": ["scroll-linked", "ScrollTimeline", "ViewTimeline", "parallax", "scroll-progress", "off-main-thread", "GPU"],
        "surfaces": ["S1", "S2", "S3", "S11"],
        "segments": ["saude", "beleza", "alimentacao", "hospitalidade"],
        "tokens": ["motion", "animation", "spacing"],
    },
    {
        "name": "Framer Motion — SVG Path Animation (stroke + pathLength)",
        "kind": "media-knowledge",
        "category": "svg-animated",
        "description": "SVG-specific animation in Framer Motion. motion.circle, motion.path, motion.rect, motion.svg components. SVG path drawing animation: strokeDasharray + strokeDashoffset animated for 'drawing' effect. Use useAnimation() controls.start() with keyframe arrays: strokeDasharray: ['1px, 200px', '100px, 200px'], strokeDashoffset: [0, -15, -125], transition: { duration: 1.4, ease: 'linear' }. getBBox() called automatically on mount to measure SVG dimensions for transform origin. Use originX/originY on SVG elements to control rotation/pivot point. Transform origin calculated from measured dimensions. SVG elements support all standard motion props: initial, animate, exit, whileHover, whileTap, drag. Important: SVG dimensions measurement requires rendered element — firefox may fail on unrendered elements. Use conditional rendering with onAnimationComplete for looped SVG animations. SVG filter animations: feTurbulence, feDisplacementMap for organic morphing effects.",
        "source": "Framer Motion SVG (context7)", "quality": "P0",
        "tags": ["svg-path", "stroke-dasharray", "path-drawing", "motion-svg", "getBBox", "transform-origin", "svg-morphing"],
        "surfaces": ["S1", "S11", "S13", "S18"],
        "segments": ["beleza", "alimentacao", "hospitalidade"],
        "tokens": ["motion", "animation", "color"],
    },
    {
        "name": "Framer Motion — Gestures (drag, hover, tap, pan)",
        "kind": "media-knowledge",
        "category": "motion-gesture",
        "description": "Gesture system for interactive elements. drag: 'x'|'y'|true for axis-locked or free drag. dragConstraints: { top, bottom, left, right } pixels or ref to container element. dragElastic: 0-1 (0=rigid, 1=fully elastic). dragMomentum: true for physics-based deceleration. dragSnapToOrigin: spring back to start. dragTransition: { bounceStiffness, bounceDamping } for spring physics. useDragControls: programmatic drag via ref handle. whileDrag: animate while dragging (scale: 1.1, cursor: 'grabbing'). whileHover: animate on hover (scale, shadow, color shift). whileTap: animate on press (scale down, darker). whileFocus: animate on keyboard focus (ring, outline). onDragStart/onDrag/onDragEnd: event handlers with (event, info) where info.point, info.delta, info.velocity, info.offset. Gesture priority: pan > drag (pan for scrollable containers). Use for: draggable cards, swipe-to-dismiss, hover cards with 3D tilt, pressable buttons, draggable list reordering (Reorder component).",
        "source": "Framer Motion (context7)", "quality": "P0",
        "tags": ["drag", "hover", "tap", "pan", "gestures", "interactive", "spring-physics", "swipe"],
        "surfaces": ["S1", "S3", "S4", "S6", "S9", "S11", "S14", "S18"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "tokens": ["motion", "animation", "spacing", "shadow"],
    },
    {
        "name": "Framer Motion — Variants (orchestration + stagger)",
        "kind": "media-knowledge",
        "category": "motion-layout",
        "description": "Variants: named animation states for complex orchestration. Define once, reference by name. Parent variants propagate to children. transition.staggerChildren: delay between each child animation (e.g., 0.1s stagger). transition.delayChildren: delay before children start. transition.staggerDirection: 1 (forward) or -1 (reverse). Dynamic variants: variants as function (custom: number) => ({...}) for direction-aware animations. Example: custom={direction} with variants: enter: (dir) => ({ x: dir > 0 ? 1000 : -1000, opacity: 0 }). When: animations with 3+ elements that should animate in sequence. Lists, grids, navigation menus, feature cards, testimonials carousel, multi-step forms. Anti-pattern: using variants for single-element animations (overkill — use direct animate prop). Variants shine when you need: sequencing, direction awareness, reusable animation definitions, conditional animation paths based on state.",
        "source": "Framer Motion (context7)", "quality": "P0",
        "tags": ["variants", "stagger", "orchestration", "sequencing", "direction-aware", "reusable", "children-animation"],
        "surfaces": ["S1", "S2", "S3", "S9", "S10", "S11", "S18"],
        "segments": ["beleza", "alimentacao", "hospitalidade"],
        "tokens": ["motion", "animation"],
    },

    # ── Locomotive Scroll ──
    {
        "name": "Locomotive Scroll — Smooth Scrolling + Parallax (9.4KB)",
        "kind": "media-knowledge",
        "category": "motion-scroll",
        "description": "Locomotive Scroll: lightweight JS library (9.4KB gzipped) for smooth scrolling and parallax. Built on Lenis. Features: smooth scrolling (lerp 0.1 default), parallax via data-scroll-speed (numbers: 1=container height, 0.5=half, negative=reverse direction), viewport detection via data-scroll boolean attribute, scroll-linked animations. data-scroll-enable-touch-speed: enable parallax on touch devices (disabled by default for performance). Lenis options: wrapper (scroll container), content (scrollable element), lerp (0-1 interpolation intensity), duration (1.2s default), orientation (vertical|horizontal), smoothWheel (true), smoothTouch (false), wheelMultiplier (1), touchMultiplier (2), easing function. Performance: 9.4KB, touch-optimized, accessibility-focused. v5 migration: data-scroll attributes replace JS config for parallax. Use when: landing pages with parallax hero, smooth scroll experiences, scroll-triggered reveals, storytelling sites. Alternative: native CSS scroll-behavior: smooth (no JS, basic), CSS Scroll-Driven Animations (no JS, modern browsers).",
        "source": "Locomotive Scroll (context7)", "quality": "P1",
        "tags": ["smooth-scroll", "parallax", "lenis", "data-attributes", "locomotive", "9.4KB", "touch"],
        "surfaces": ["S1", "S2", "S11"],
        "segments": ["beleza", "alimentacao", "hospitalidade"],
        "tokens": ["motion", "animation"],
    },

    # ── Tailwind CSS Animations ──
    {
        "name": "tw-animate-css — Tailwind v4 Animation Utilities",
        "kind": "media-knowledge",
        "category": "css-animation",
        "description": "tw-animate-css: Tailwind CSS v4 plugin for animations. 112 code snippets. Enter animations: animate-in fade-in, zoom-in, slide-in-from-top/bottom/left/right, spin-in. Exit animations: animate-out fade-out, slide-out-to-top/bottom/left/right, zoom-out, spin-out. Directional slide with Tailwind spacing scale: slide-in-from-top-8 (2rem), slide-in-from-bottom-16 (4rem). Logical directions for RTL: slide-in-from-start/end. Fade with opacity levels: fade-in-50 (from 50% opacity), fade-in-[0.3] (arbitrary). Zoom levels: zoom-in-50, zoom-in-95, zoom-in-[0.8]. Duration: duration-150, duration-300, duration-500, duration-700, duration-1000, duration-[400ms], animation-duration-[2s]. Delay: delay-150, delay-300, delay-500. Easing: ease-linear, ease-in, ease-out, ease-in-out, ease-[cubic-bezier(0.34,1.56,0.64,1)]. Repeat: repeat-1, repeat-2, repeat-infinite. Direction: alternate, reverse. Fill mode: fill-mode-both, fill-mode-forwards. Running/paused state toggle. Combine: animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out. Shadcn/ui v4 already ships with tw-animate-css (tw-animate-css package).",
        "source": "tw-animate-css (context7)", "quality": "P0",
        "tags": ["tailwind", "css-animation", "fade", "slide", "zoom", "duration", "easing", "delay", "repeat", "tw-animate"],
        "surfaces": ["S1", "S2", "S3", "S4", "S6", "S9", "S10", "S11"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "tokens": ["motion", "animation"],
    },

    # ── CSS Scroll-Driven Animations (native, zero-JS) ──
    {
        "name": "CSS Scroll-Driven Animations — Native Zero-JS Motion",
        "kind": "media-knowledge",
        "category": "motion-scroll",
        "description": "CSS Scroll-Driven Animations: native browser API, zero JavaScript, off main thread, GPU accelerated. animation-timeline: scroll() or view(). scroll(): links animation to scroll container progress. scroll(root) for page scroll, scroll(nearest) for nearest scrolling ancestor, scroll(self) for element's own scroll. view(): links animation to element's visibility in viewport. animation-range: controls when animation starts/ends within scroll range. entry (element entering viewport), exit (leaving), cover (full coverage), contain (fully visible), entry-crossing, exit-crossing. Keyframe syntax: @keyframes reveal { from { opacity: 0; translate: 0 40px; } to { opacity: 1; translate: 0 0; } }. Apply: .section { animation: reveal linear; animation-timeline: view(); animation-range: entry 0% entry 100%; }. Browser support: Chrome 115+, Edge 115+, Firefox 126+. Polyfill: Scroll Timeline Polyfill (182 snippets). Use for: scroll-reveal sections, sticky headers that shrink, parallax heroes, progress bars, image reveal effects. Performance: runs on compositor thread, no main thread jank. Combine with prefers-reduced-motion: @media (prefers-reduced-motion: reduce) { animation: none; }.",
        "source": "CSS Scroll-Driven Animations spec + Scroll Timeline Polyfill (context7)", "quality": "P0",
        "tags": ["css", "scroll-driven", "animation-timeline", "view-timeline", "zero-js", "GPU", "compositor", "native", "a11y"],
        "surfaces": ["S1", "S2", "S3", "S10", "S11"],
        "segments": ["beleza", "alimentacao", "hospitalidade"],
        "tokens": ["motion", "animation"],
    },

    # ── Specific Animation Patterns (21st-magic + context7) ──
    {
        "name": "Scroll-Based Velocity Text Effect",
        "kind": "media-knowledge",
        "category": "motion-scroll",
        "description": "Scroll-Based Velocity text: text scroll speed changes dynamically based on user scroll velocity. Fast scroll = fast text movement, slow scroll = slow movement. Creates a dynamic parallax experience. 21st-magic component: scroll-based-velocity. Uses Framer Motion scroll() function for progress tracking + velocity calculation. Available variants: text only, text + images demo (Unsplash images), custom speed curves. Best for: hero sections, storytelling pages, brand statement reveals. Performance: uses native ScrollTimeline where available. A11y: ensure text is still readable at all speeds; provide pause/reduce-motion fallback. Pair with Progressive Blur component for fade edges on scroll containers.",
        "source": "21st-magic + Framer Motion (context7)", "quality": "P1",
        "tags": ["scroll-velocity", "dynamic-speed", "parallax-text", "scroll-tracking", "velocity-based"],
        "surfaces": ["S1", "S11"],
        "segments": ["beleza", "alimentacao", "hospitalidade"],
        "tokens": ["motion", "animation", "typography"],
    },
    {
        "name": "Text Morphing + Scroll Reveal Patterns",
        "kind": "media-knowledge",
        "category": "svg-animated",
        "description": "Text morphing and scroll reveal patterns. Morphing Text (21st-magic): dynamic text transformation between words with smooth transitions. Use for rotating headlines, value props, slogans. Text Reveal (21st-magic): fade-in text as user scrolls — animation triggered when element enters viewport. Uses CSS animation-timeline: view() or Framer Motion whileInView. Blur Fade (21st-magic): blur + fade combo for entry/exit transitions — more premium than plain fade. Spinning Text: circular rotating text, good for badges and seals. Word Rotate: vertical word swap in mid-sentence. Typing Animation: typewriter effect with cursor blinking — multiple variants (speed, cursor style, start-on-view, single-play, looping, multiple words). Sparkles Text: continuous sparkle particles around text — premium highlight effect. Combinable: morphing headline + blur-fade content + scroll-reveal sections = premium landing page experience.",
        "source": "21st-magic + tw-animate-css (context7)", "quality": "P0",
        "tags": ["morphing", "scroll-reveal", "blur-fade", "typing", "sparkles", "text-effects", "premium"],
        "surfaces": ["S1", "S2", "S11"],
        "segments": ["beleza", "alimentacao", "hospitalidade"],
        "tokens": ["motion", "animation", "typography", "color"],
    },
]

# ═══════════════════════════════════════════════════════════════
# IMAGE FORMATS — WebP, AVIF, responsive images
# ═══════════════════════════════════════════════════════════════

IMAGE_FORMATS = [
    {
        "name": "WebP + AVIF — Modern Image Formats for Web Performance",
        "kind": "media-knowledge",
        "category": "image-format",
        "description": "Modern image formats for production. WebP: Google format, lossy+lossless+alpha, 25-35% smaller than JPEG/PNG, supported everywhere (96%+ browsers). AVIF: next-gen, 50% smaller than JPEG at same quality, HDR support, 12-bit color depth, better compression than WebP, Chromium+Firefox (90%+). Use picture element with fallbacks: <picture><source srcset='image.avif' type='image/avif'><source srcset='image.webp' type='image/webp'><img src='image.jpg' alt='...'></picture>. Responsive images: srcset + sizes for resolution switching. Lazy loading: loading='lazy' on img (native, no JS). LQIP (Low Quality Image Placeholder): 20px blur-up placeholder → full image. Next.js Image component handles all of this automatically. For adsentice: use WebP default, AVIF for premium plan, JPEG fallback for old browsers. Convert GMB photos to WebP for client portal. SVG for icons, logos, illustrations (infinite scale, tiny size). PNG only when transparency required without WebP support. Avoid: uncompressed full-size images (use srcset), GIF (use video or animated WebP), BMP/TIFF (never for web). Lighthouse performance: properly size images (-1-2s load time), serve in next-gen formats (-30-50% bytes).",
        "source": "Web Performance standards (context7 + Google)", "quality": "P0",
        "tags": ["webp", "avif", "picture", "srcset", "responsive-images", "performance", "lighthouse", "core-web-vitals", "LCP"],
        "surfaces": ["S1", "S2", "S9", "S10", "S11", "S18"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "tokens": ["animation"],
    },
    {
        "name": "Responsive Images — srcset + sizes + picture + loading",
        "kind": "media-knowledge",
        "category": "image-format",
        "description": "Complete responsive image strategy. Resolution switching: srcset='img-640.jpg 640w, img-1024.jpg 1024w, img-1920.jpg 1920w' + sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'. Browser picks best resolution. Art direction: picture with media queries for different crops at different breakpoints. Density switching: srcset='img-1x.jpg 1x, img-2x.jpg 2x, img-3x.jpg 3x' for device pixel ratio. Lazy loading: loading='lazy' (native), Intersection Observer (custom), decode='async' for off-main-thread decoding. fetchpriority='high' for LCP images (hero images above fold). Aspect ratio: explicit width/height to prevent CLS. Containers: object-fit: cover, object-position: center for consistent crops. Background images: image-set() CSS function for responsive bg images. SVG placeholders: blurred inline SVG as placeholder until image loads. Performance budget: <200KB total images above fold, <100KB per image. LCP (Largest Contentful Paint) target: <2.5s. Image CDN (Cloudflare Images, Imgix, Cloudinary) for automatic resizing, format conversion, quality optimization.",
        "source": "Web Performance standards (context7 + MDN)", "quality": "P0",
        "tags": ["srcset", "sizes", "picture", "lazy-loading", "LCP", "CLS", "web-performance", "responsive", "image-CDN"],
        "surfaces": ["S1", "S2", "S9", "S10", "S11", "S18"],
        "segments": ["saude", "beleza", "servicos", "alimentacao", "comercio", "educacao", "hospitalidade"],
        "tokens": ["spacing"],
    },
    {
        "name": "Animated WebP + Animated AVIF — Replace GIFs",
        "kind": "media-knowledge",
        "category": "image-format",
        "description": "Animated WebP and AVIF replace GIFs entirely. Animated WebP: 60-80% smaller than GIF, 24-bit color + alpha, all browsers. Animated AVIF: even smaller than animated WebP but limited browser support (Chromium-based). Use: <picture><source srcset='anim.avif' type='image/avif'><source srcset='anim.webp' type='image/webp'><img src='anim.gif'></picture>. For short animations (<5s): use animated WebP. For longer animations: use video (MP4/WebM) — dramatically smaller. <video autoplay loop muted playsinline> for auto-playing silent video (hero backgrounds, product demos). Lottie: JSON-based vector animations (After Effects → Lottie) — tiny files, infinite scale, interactive. Rive: state-machine animations, runtime for web/mobile — more powerful than Lottie. For icons: SVG animations (CSS or motion). Never use GIF in production. Convert all GIFs to animated WebP or MP4. Fallback: static JPEG/WebP for browsers without animation support.",
        "source": "Web Performance + Google (context7)", "quality": "P0",
        "tags": ["animated-webp", "animated-avif", "gif-replacement", "lottie", "rive", "video-background", "mp4-webm"],
        "surfaces": ["S1", "S11", "S18"],
        "segments": ["beleza", "alimentacao", "hospitalidade"],
        "tokens": ["motion", "animation"],
    },
]

# ═══════════════════════════════════════════════════════════════
# MERGE
# ═══════════════════════════════════════════════════════════════

ALL = SVG_ICONS + MOTION_PATTERNS + IMAGE_FORMATS

def main():
    print(f"🧠 ADSENTICE · MEDIA+MOTION INGEST — SVG, Animation, Images")
    print(f"   Target: {COLLECTION} @ Qdrant :6352")
    print(f"   Points: {len(ALL)} total ({len(SVG_ICONS)} SVG icons + {len(MOTION_PATTERNS)} motion + {len(IMAGE_FORMATS)} image formats)")
    print()

    total = 0
    BATCH = 6

    for i in range(0, len(ALL), BATCH):
        batch = ALL[i:i + BATCH]
        texts = [f"{d['description']} {d['name']} {' '.join(d.get('tags', []))}"[:800] for d in batch]
        vecs = embed(texts)
        points = [{"id": str(uuid.uuid4()), "vector": vec, "payload": {
            **d, "tag": TAG, "ts": int(time.time()),
            "id": d["name"][:100],
        }} for d, vec in zip(batch, vecs)]

        status = upsert(points)
        total += len(points)
        names = ", ".join(d["category"] for d in batch)
        print(f"  ✅ {len(points)}: {names} → {status}")

    # Verify
    tests = [
        ("icone SVG animado hover motion react lucide", "svg-animated"),
        ("animacao scroll parallax landing page premium", "motion-scroll"),
        ("layout animation morphing card expand modal", "motion-layout"),
        ("webp avif formato imagem moderna performance", "image-format"),
        ("arrastar hover tap gesto interativo drag", "motion-gesture"),
        ("tailwind fade slide zoom animacao css duration ease", "css-animation"),
    ]
    print(f"\n🔍 VERIFY queries:")
    for query, expected_cat in tests:
        vec = embed([query])[0]
        body = json.dumps({
            "vector": vec,
            "filter": {"must": [
                {"key": "kind", "match": {"value": "media-knowledge"}},
                {"key": "tag", "match": {"value": TAG}},
            ]},
            "limit": 2,
            "with_payload": True,
        }).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/search", data=body,
                      headers={"Content-Type": "application/json"}, method="POST")
        data = json.loads(urlopen(req, timeout=10).read())
        results = data.get("result", [])
        top_cat = results[0]["payload"]["category"] if results else "N/A"
        top_name = results[0]["payload"]["name"][:80] if results else "N/A"
        match = "✅" if expected_cat in top_cat else "❌"
        print(f"   {match} '{query[:60]}' → [{top_cat}] {top_name}")

    print(f"\n🏁 {total} media+motion knowledge points ingeridos")
    print(f"   kind=media-knowledge · tag={TAG}")
    print(f"   {len(SVG_ICONS)} SVG/icons · {len(MOTION_PATTERNS)} motion · {len(IMAGE_FORMATS)} image formats")
    print(f"   M9 motion pipeline + M4 detailExecution critique alimentados")

if __name__ == "__main__":
    main()
