#!/usr/bin/env python3
"""
adsentice_warp_ingest_snippets.py — SNIPPETS + REFS: Conhecimento de implementacao
═══════════════════════════════════════════════════════════════════
Fontes:
  1. shadcn/ui v4 source code (context7) — TypeScript real dos componentes
  2. Radix Primitives API docs (context7) — WAI-ARIA, props, keyboard patterns
  3. Component composition structures — arvores de sub-componentes

Cada snippet embedado como:
  kind = "snippet" | "reference" | "pattern"
  source = "shadcn/ui v4 context7" | "Radix Primitives context7"

Isso permite que o compositor responda:
  "como implementar um dropdown acessivel" → codigo + guideline WAI-ARIA
  "quais props o Accordion.Trigger aceita" → API doc com tipos

medido=verdade · 2026-07-14
"""

import json, os, time, uuid
from urllib.request import Request, urlopen

EMBED_URL = "http://127.0.0.1:8081/embed"
QDRANT_URL = "http://127.0.0.1:6352"
COLLECTION = "adsentice-self"
TAG_WARP = "adsentice-warp"

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
# CATEGORIA: SHADCN/UI v4 SOURCE CODE (context7)
# ═══════════════════════════════════════════════════════════════

SHADCN_SOURCE = [
    # ── Button (64 lines, cva variants) ──
    {
        "name": "Button source — cva variants",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Button component with class-variance-authority. Variants: default (bg-primary text-primary-foreground hover:bg-primary/90), destructive (bg-destructive text-white), outline (border bg-background shadow-xs hover:bg-accent), secondary (bg-secondary), ghost (hover:bg-accent), link (text-primary underline-offset-4 hover:underline). Sizes: default (h-9 px-4 py-2), xs (h-6 rounded-md px-2 text-xs), sm (h-8 px-3), lg (h-10 px-6), icon (size-9), icon-xs, icon-sm, icon-lg. Uses Slot.Root from radix-ui for asChild pattern. data-slot='button', data-variant, data-size. focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50. disabled:pointer-events-none disabled:opacity-50. aria-invalid:border-destructive aria-invalid:ring-destructive/20. SVG children automatically sized: [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4""",
    },
    {
        "name": "Card source — 7 sub-components",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Card component system with 7 sub-components. Card: flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm. CardHeader: @container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]. CardTitle: leading-none font-semibold. CardDescription: text-sm text-muted-foreground. CardAction: col-start-2 row-span-2 row-start-1 self-start justify-self-end. CardContent: px-6. CardFooter: flex items-center px-6 [.border-t]:pt-6. Uses @container queries for responsive card header layouts. data-slot attributes on all sub-components.""",
    },
    {
        "name": "Input source — native input with states",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Input component: native <input> styled with Tailwind. h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none. selection:bg-primary selection:text-primary-foreground. file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground. placeholder:text-muted-foreground. disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30. focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50. aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40""",
    },
    {
        "name": "Separator source — Radix primitive",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Separator wraps radix-ui Separator primitive. Props: orientation=horizontal|vertical, decorative=boolean (default true). When decorative=true: aria-hidden, not in accessibility tree. Shrink-0 bg-border. Horizontal: h-px w-full. Vertical: h-full w-px. data-slot='separator', data-orientation. Use for visual dividers between sections, menu items, content blocks.""",
    },
    {
        "name": "Badge source — cva + asChild",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Badge component with cva variants. Inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap. Variants: default (bg-primary text-primary-foreground), secondary (bg-secondary text-secondary-foreground), destructive (bg-destructive text-white), outline (border-border text-foreground hover:bg-accent), ghost (hover:bg-accent), link (text-primary underline-offset-4). Uses Slot.Root from radix-ui for asChild pattern. focus-visible:border-ring focus-visible:ring-[3px]. aria-invalid:border-destructive. SVG children: [&>svg]:pointer-events-none [&>svg]:size-3""",
    },
    {
        "name": "Switch source — Radix Toggle with sizes",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Switch wraps radix-ui Switch primitive. Root+Thumb architecture. Sizes: default (h-[1.15rem] w-8), sm (h-3.5 w-6). peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all. focus-visible:border-ring focus-visible:ring-[3px]. disabled:opacity-50. data-[state=checked]:bg-primary data-[state=unchecked]:bg-input. Thumb: rounded-full bg-background ring-0 transition-transform. data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0. dark variants. aria-role=switch""",
    },
    {
        "name": "Select source — Base UI v4 implementation",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Select v4 uses @base-ui/react/select (NOT Radix). Sub-components: SelectRoot, SelectGroup, SelectValue, SelectTrigger (sizes: sm, default), SelectContent (Popup+Positioner: side, sideOffset, align, alignOffset, alignItemWithTrigger), SelectLabel, SelectItem (with CheckIcon indicator), SelectSeparator, SelectScrollUpButton, SelectScrollDownButton. Trigger: flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap. ChevronDownIcon via SelectPrimitive.Icon render prop. Popup: cn-menu-target cn-menu-translucent max-h-(--available-height) w-(--anchor-width) min-w-36 rounded-lg bg-popover shadow-md ring-1 ring-foreground/10. Animation: data-[side=bottom]:slide-in-from-top-2, data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95""",
    },
    {
        "name": "DropdownMenu source — 16 sub-components Radix",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """DropdownMenu with 16 sub-components using radix-ui DropdownMenu. Exports: DropdownMenu(Root), DropdownMenuPortal, DropdownMenuTrigger, DropdownMenuContent (z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] border bg-popover p-1 shadow-md, animation: data-[side=bottom]:slide-in-from-top-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95, data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95), DropdownMenuGroup, DropdownMenuItem (variants: default|destructive, inset: boolean, focus:bg-accent focus:text-accent-foreground, destructive:text-destructive dark:focus:bg-destructive/20), DropdownMenuCheckboxItem (CheckIcon indicator), DropdownMenuRadioGroup, DropdownMenuRadioItem (CircleIcon indicator), DropdownMenuLabel (px-2 py-1.5 text-sm font-medium), DropdownMenuSeparator (-mx-1 my-1 h-px bg-border), DropdownMenuShortcut (ml-auto text-xs tracking-widest text-muted-foreground), DropdownMenuSub, DropdownMenuSubTrigger (ChevronRightIcon ml-auto), DropdownMenuSubContent. Full keyboard nav: arrows navigate, Enter selects, Esc closes. Sub-menus open on arrow right/click.""",
    },
    {
        "name": "Avatar source — 6 sub-components Radix",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Avatar with 6 sub-components using radix-ui Avatar. Avatar(Root): group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none. Sizes: default(size-8), sm(size-6), lg(size-10). AvatarImage: aspect-square size-full. AvatarFallback: flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground, smaller on sm. AvatarBadge: absolute right-0 bottom-0 z-10 rounded-full bg-primary text-primary-foreground ring-2 ring-background, sizes vary per parent avatar size. AvatarGroup: group/avatar-group flex -space-x-2, children get ring-2 ring-background. AvatarGroupCount: relative flex size-8 rounded-full bg-muted text-muted-foreground ring-2 ring-background, sizes react to parent group size via group-has-data. SVG children responsive to size.""",
    },
    {
        "name": "ScrollArea source — Radix with viewport",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """ScrollArea wraps radix-ui ScrollArea(ScrollView). Root: relative. Viewport: size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50. ScrollBar: flex touch-none p-px transition-colors select-none. Vertical: h-full w-2.5 border-l border-l-transparent. Horizontal: h-2.5 flex-col border-t border-t-transparent. ScrollAreaThumb: relative flex-1 rounded-full bg-border. Corner element for intersection of both scrollbars. Touch-friendly with native scroll on mobile. Keyboard: focus viewport, arrow/page keys scroll.""",
    },
    {
        "name": "Accordion source — Radix with motion",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Accordion wraps radix-ui Accordion. AccordionTrigger: flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50. ChevronDownIcon rotates 180deg on open: [&[data-state=open]>svg]:rotate-180. Transition duration-200. AccordionContent: overflow-hidden text-sm. data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down. Inner div with pt-0 pb-4. Keyboard: Enter/Space toggles, Tab moves focus. WAI-ARIA Accordion pattern. type=single or multiple. collapsible prop allows all closed.""",
    },
    {
        "name": "Popover source — Radix with 7 exports",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Popover wraps radix-ui Popover. 7 exports: Popover(Root), PopoverTrigger, PopoverContent (z-50 w-72 rounded-md border bg-popover p-4 shadow-md, animation: data-[side=bottom]:slide-in-from-top-2, data-[state=open]:animate-in fade-in-0 zoom-in-95, data-[state=closed]:animate-out fade-out-0 zoom-out-95), PopoverAnchor, PopoverHeader (flex flex-col gap-1 text-sm), PopoverTitle (font-medium), PopoverDescription (text-muted-foreground). Content positioned via align (center default) and sideOffset (4 default). Uses --radix-popover-content-transform-origin for animation origin.""",
    },
    {
        "name": "Tooltip source — Radix hover/focus reveal",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Tooltip wraps radix-ui Tooltip. Shows on hover+focus (700ms delay default). Content: z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md. Animation: data-[state=closed]:animate-out fade-out-0 zoom-out-95, data-[state=open]:animate-in fade-in-0 zoom-in-95. Positioning: data-[side=bottom]:slide-in-from-top-2, similar for left/right/top. MUST NOT contain essential info (inaccessible on touch). Ideal for icon labels, keyboard shortcuts, supplementary info. TooltipTrigger wraps the target element. TooltipContent accepts side (top/bottom/left/right) and align.""",
    },
    {
        "name": "Dialog source — modal with focus trap",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Dialog (Modal) wraps radix-ui Dialog. DialogTrigger, DialogContent (z-50 w-full max-w-lg gap-4 border bg-background p-6 shadow-lg, animation: data-[state=open]:animate-in fade-in-0 zoom-in-95, data-[state=closed]:animate-out fade-out-0 zoom-out-95, sm:rounded-lg), DialogHeader, DialogTitle (text-lg font-semibold), DialogDescription (text-sm text-muted-foreground), DialogFooter (flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2). Focus trapped inside modal. Escape closes. Clicks outside by default close (onClose). overlay: fixed inset-0 z-50 bg-black/80. data-[state=open]:animate-in fade-in-0. Prevent scroll on body when open.""",
    },
    {
        "name": "Sheet source — slide-in panel 4 sides",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Sheet wraps radix-ui Dialog (custom implementation). Slides from top, bottom, left, right. SheetTrigger, SheetContent (z-50 gap-4 bg-background p-6 shadow-lg, animation: data-[state=open]:animate-in, data-[state=closed]:animate-out, side-specific: slide-in-from-right/left/top/bottom + fade-in-0), SheetHeader, SheetTitle, SheetDescription, SheetFooter. Overlay: fixed inset-0 z-50 bg-black/80. Swipe to close on mobile. Keyboard: Escape closes. Focus trapped. data-[side=left]:slide-in-from-left, data-[side=right]:slide-in-from-right, etc.""",
    },
    {
        "name": "Sidebar source — full navigation system",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Sidebar is a full navigation system (not primitive). Exports: SidebarProvider (context with open/state/isMobile/toggleSidebar, cookie persistence SIDEBAR_COOKIE_NAME, Ctrl+B shortcut), useSidebar hook, Sidebar (variants: sidebar|floating|inset, collapsible: offcanvas|icon|none, sides: left|right, responsive: Sheet on mobile, div on desktop with CSS transition 200ms ease-linear), SidebarContent, SidebarGroup, SidebarMenu (ul), SidebarMenuButton (cva variants, tooltip integration when collapsed), SidebarTrigger (Button with PanelLeftIcon), SidebarInset (main wrapper). CSS variables: --sidebar-width: 16rem, --sidebar-width-mobile: 18rem, --sidebar-width-icon: 3rem. Group data attributes: group-data-[collapsible=icon], group-data-[state=collapsed]. Menu button active state. Tooltip appears when sidebar collapsed showing truncated labels.""",
    },
    {
        "name": "Chart source — Recharts wrapper with config",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Chart system wraps Recharts. ChartContainer: wrapper providing ChartContext with ChartConfig (label+color mapping per data key). Responsive container with aspect-video. ChartTooltip: direct alias to RechartsPrimitive.Tooltip. ChartTooltipContent: customized tooltip with indicator types (dot/line/dashed), label formatting (labelFormatter callback), hide items options, nameKey and labelKey mapping. ChartStyle injects CSS variables for each chart config entry. ChartLegend: renders legend items from config. Format: config = { key: { label: string, color?: string, icon?: ComponentType } }. CSS class cn-chart on container. Recharts styling applied via CSS selectors for cartesian axis, grid, tooltip cursor, dots, sectors.""",
    },
    {
        "name": "DataTable source — TanStack React Table integration",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """DataTable uses @tanstack/react-table. Hook: useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortingRowModel, getFilteredRowModel }). Renders: table > thead > tr > th (ColumnDef header) + tbody > tr > td (flexRender). Pagination: previous/next buttons, page index display. Sorting: click column header toggles asc/desc. Filtering: per-column filters via ColumnDef.filterFn. Selection: row selection via checkbox column. Column visibility toggle. Export to CSV pattern. Uses shadcn Table component for rendering.""",
    },
    {
        "name": "Toast source — Sonner notification system",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Toast uses Sonner (not Radix). Types: success, error, warning, info, loading, promise. toast() function: ('message', { description, action, duration, position }). Rich toast with action buttons, cancel. Swipe to dismiss on mobile. Stack up to 3 visible. Auto-dismiss configurable. position: top-right, bottom-right, bottom-left, top-left. Styling via CSS variables. Sonner Toaster component placed in layout root. Icons per type. Promise toast: loading → success/error based on promise resolution.""",
    },
    {
        "name": "Command source — CMD+K palette with cmdk",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Command palette uses cmdk (Command component). Dialog wrapper + Command. CommandInput for search, CommandList for results, CommandGroup with CommandItem. Keyboard: Cmd+K opens, arrows navigate, Enter selects, Escape closes. Sub-commands via nested Command. Shortcut display on items. Empty state when no results. Loading state with spinner. Groups with headings. Filtering built-in (fuse.js style). Dialog modal variant. Used for global search, quick actions, navigation. Can be used standalone without Dialog.""",
    },
    {
        "name": "Breadcrumb source — hierarchical nav",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Breadcrumb composition: Breadcrumb > BreadcrumbList > BreadcrumbItem > BreadcrumbLink (or BreadcrumbPage for current). BreadcrumbSeparator between items (chevron slash automatically). Accessible: nav aria-label='Breadcrumb', ol+li semantics. Last item: BreadcrumbPage (not a link, aria-current=page). BreadcrumbEllipsis for collapsed middle items. DropdownMenu can be used in collapsed breadcrumbs for overflow items. Styling: text-sm text-muted-foreground, links hover:text-foreground.""",
    },
    {
        "name": "Pagination source — page navigation",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Pagination component: Pagination > PaginationContent > PaginationItem > PaginationLink/PaginationPrevious/PaginationNext/PaginationEllipsis. Button variants for active page (aria-current=page). Icon chevrons for prev/next. Page number links. Ellipsis for skipped ranges. Accessible: nav aria-label='pagination'. Integration with DataTable: table.getState().pagination.pageIndex, table.setPageIndex(). Show page X of Y, row count info. Items per page selector.""",
    },
    {
        "name": "Tabs source — Radix Tabs primitive",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Tabs wraps radix-ui Tabs. Tabs(Root), TabsList (inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground), TabsTrigger (inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all, focus-visible:ring-[3px], data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm, disabled:opacity-50), TabsContent (mt-2 ring-offset-background, focus-visible:ring-[3px]). Keyboard: Left/Right arrows move between tabs, Home/End go to first/last, Enter/Space activates. defaultValue or value/onValueChange for controlled. orientation: horizontal (default) | vertical.""",
    },
    {
        "name": "Progress source — Radix Progress primitive",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Progress wraps radix-ui Progress. Root: relative h-2 w-full overflow-hidden rounded-full bg-primary/20. Indicator: size-full flex-1 bg-primary transition-all. States: indeterminate (animated translateX), determinate (value 0-100, style transform: translateX(-{100-value}%)). aria-valuenow, aria-valuemin=0, aria-valuemax=100. data-[state=indeterminate]:animate-indeterminate. Used for: loading bars, onboarding progress, upload progress, scoring visual, goal tracking.""",
    },
    {
        "name": "Skeleton source — loading placeholder",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Skeleton component for loading states. Simple div: animate-pulse rounded-md bg-primary/10 (or bg-muted). Variants: lines (h-4 w-full), circles (rounded-full size-12), cards (h-[125px] w-[250px] rounded-xl). No interactive children. Prevents CLS (Cumulative Layout Shift). Use with Suspense boundaries. Typically shown while data fetches: {loading ? <Skeleton /> : <Content />}. aria-busy=true on parent container.""",
    },
    {
        "name": "Collapsible source — Radix expand/collapse",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Collapsible wraps radix-ui Collapsible. Root (open/onOpenChange), Trigger (button that toggles), Content (animates height from 0 to auto, overflow-hidden, data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down). Used as base for Accordion items. Can be used standalone for expandable sections, show more/less, filters. Keyboard: Enter/Space on trigger toggles. aria-expanded on trigger. Content gets aria-hidden when closed.""",
    },
    {
        "name": "NavigationMenu source — website nav with rich dropdowns",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """NavigationMenu uses radix-ui NavigationMenu (DIFFERENT from Menubar — no composite focus, simpler for websites). Root > NavigationMenuList > NavigationMenuItem > NavigationMenuTrigger (opens dropdown) + NavigationMenuContent (rich dropdown with cards, images, lists, grids). NavigationMenuLink for direct links. NavigationMenuIndicator (animated underline). NavigationMenuViewport (portal for dropdown positioning). Delayed open/close (200ms enter, 100ms leave) prevents accidental triggers. Keyboard: Tab enters menu, arrows navigate items, Enter selects. Content reuses Card, Grid patterns. NOT for app menus (use Menubar for desktop apps, DropdownMenu for contextual actions).""",
    },
    {
        "name": "ContextMenu source — right-click menu",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """ContextMenu composition: ContextMenu > ContextMenuTrigger + ContextMenuContent > ContextMenuGroup > ContextMenuLabel + ContextMenuItem + ContextMenuCheckboxItem + ContextMenuRadioGroup > ContextMenuRadioItem. Also: ContextMenuSeparator, ContextMenuSub > ContextMenuSubTrigger + ContextMenuSubContent. Keyboard: Shift+F10 or context menu key opens. Arrow keys navigate. Enter selects. Escape closes. Positioned at cursor. Same sub-component pattern as DropdownMenu but triggered by right-click instead of left-click.""",
    },
    {
        "name": "Menubar source — desktop app menu bar",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Menubar for desktop-style application menus (File, Edit, View, Help). Radix Menubar: MenubarRoot > MenubarMenu > MenubarTrigger + MenubarContent. MenubarSub > MenubarSubTrigger + MenubarSubContent. Full keyboard: Alt activates first menu, Left/Right arrows between menus, Up/Down arrows in open menu, Enter selects, Escape closes. MenubarItem, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarLabel, MenubarShortcut. Different from NavigationMenu: uses composite focus management + first-character navigation (desktop pattern).""",
    },
    {
        "name": "HoverCard source — rich hover preview",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """HoverCard uses radix-ui HoverCard. Trigger + Content (Portal). Opens on hover (delay 700ms default), closes when cursor leaves both trigger and content. Content: z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md. Animation: data-[state=open]:animate-in fade-in-0 zoom-in-95, data-[state=closed]:animate-out fade-out-0 zoom-out-95. Positioning: side=bottom|top|left|right, align=center|start|end. Richer than Tooltip — can contain images, links, buttons. Use for profile previews, product previews, entity details. Content receives focus for keyboard accessibility.""",
    },
    {
        "name": "AlertDialog source — critical confirmation",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """AlertDialog wraps radix-ui AlertDialog. For CRITICAL confirmations only (destructive actions that can't be undone). AlertDialogTrigger, AlertDialogContent (modal overlay), AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter with AlertDialogCancel + AlertDialogAction. Action button auto-focused but NOT the most destructive (prevent accidents). Cancel button positioned to receive focus first. Escape closes (same as cancel). Overlay: fixed inset-0 z-50 bg-black/80. Animation same as Dialog. Role=alertdialog. aria-describedby links to description. Use sparingly — normal confirmations use Dialog.""",
    },
    {
        "name": "Toggle source — binary state button",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Toggle wraps radix-ui Toggle. Root: inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors. hover:bg-muted hover:text-muted-foreground. data-[state=on]:bg-accent data-[state=on]:text-accent-foreground. focus-visible:ring-ring. disabled:opacity-50. Variants: default, outline. Sizes: default (h-9 px-3), sm (h-8 px-2.5), lg (h-10 px-5). aria-pressed for screen readers. Use for: bold/italic toggles in editor, filter on/off, favorite/bookmark toggle. ToggleGroup for mutually exclusive or multi-select groups (toolbar pattern).""",
    },
    {
        "name": "Checkbox source — Radix with indeterminate",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Checkbox wraps radix-ui Checkbox. Root: peer size-4 shrink-0 rounded-sm border border-primary shadow. focus-visible:ring-ring. disabled:opacity-50. data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground. Indicator: flex items-center justify-center text-current. CheckIcon appears when checked (data-state=checked). MinusIcon for indeterminate (data-state=indeterminate — useful for select-all with partial selection). aria-checked: true/false/mixed. Keyboard: Space toggles. Used in forms, data tables (row selection), filters, terms acceptance."""
    },
    {
        "name": "RadioGroup source — exclusive selection",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """RadioGroup wraps radix-ui RadioGroup. Root: grid gap-2. RadioGroupItem: aspect-square size-4 rounded-full border border-primary text-primary shadow. focus-visible:ring-ring. disabled:opacity-50. Indicator (RadioGroupIndicator): flex items-center justify-center. CircleIcon fill-current size-2.5 inside when selected. aria-checked. Keyboard: Up/Down arrows within group move selection. Tab enters/exits group. Used for: plan selection (Free/Pro/Enterprise), payment method, single-choice preferences, yes/no questions."""
    },
    {
        "name": "Slider source — range input",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Slider wraps radix-ui Slider. Root: relative flex w-full touch-none select-none items-center. Track: relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20. Range: absolute h-full bg-primary. Thumb: block size-4 rounded-full border border-primary/50 bg-background shadow. focus-visible:ring-ring. disabled:opacity-50. Keyboard: Arrow keys adjust value by step. Home/End jump to min/max. aria-valuenow, aria-valuemin, aria-valuemax. Range slider: two thumbs for min-max. Used for: price range filter, budget slider, score selection, volume control."""
    },
    {
        "name": "Label source — form accessibility",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Label wraps radix-ui Label. Root: text-sm font-medium leading-none. peer-disabled:opacity-70 (automatically dims when associated input is disabled). htmlFor connects to input id. Essential for accessibility: all inputs must have labels. Can be visually hidden (sr-only) if design requires. For form fields, use FormLabel (from Form component) which adds error state styling: error && 'text-destructive'. Label is the base; FormLabel extends it."""
    },
    {
        "name": "Textarea source — multi-line input",
        "kind": "snippet", "source": "shadcn/ui v4 context7",
        "text": """Textarea component: native <textarea> styled same as Input. flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm. placeholder:text-muted-foreground. focus-visible:ring-ring. disabled:opacity-50. Resize: resize-none (default behavior via Tailwind). For resizable: use resize-y or resize. Used for: bios, descriptions, messages, feedback, notes, multi-line text input. Full keyboard support including newline. Same validation states as Input (aria-invalid)."""
    },
]

# ═══════════════════════════════════════════════════════════════
# CATEGORIA: RADIX PRIMITIVES API DOCS (context7)
# ═══════════════════════════════════════════════════════════════

RADIX_API = [
    {
        "name": "Radix Accessibility — WAI-ARIA compliance",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Radix Primitives follow WAI-ARIA authoring practices. All primitives handle: ARIA attributes (role, aria-expanded, aria-checked, aria-haspopup, aria-label, aria-describedby, aria-labelledby, aria-current, aria-selected, aria-disabled, aria-hidden, aria-invalid, aria-valuenow, aria-valuemin, aria-valuemax), role attributes (button, dialog, alertdialog, menu, menubar, menuitem, checkbox, radio, radiogroup, switch, slider, tab, tablist, tabpanel, progressbar, combobox, listbox, option, tooltip, navigation, region, separator, tree, group, status, alert, presentation), focus management (focus trap in modals, focus restoration on close, roving tabindex in menus and lists), keyboard navigation (Tab, Enter, Space, Escape, Arrow keys, Home/End). Tested across Chrome, Firefox, Safari, Edge with VoiceOver, NVDA, JAWS."""
    },
    {
        "name": "Radix Accordion API — WAI-ARIA accordion pattern",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Accordion.Root: type (single|multiple), defaultValue, value, onValueChange, collapsible (boolean, allows all items closed), disabled, dir (ltr|rtl), orientation (horizontal|vertical). Accordion.Item: value (required, unique string), disabled. Accordion.Header: wraps trigger for heading semantics (aria-level can be set). Accordion.Trigger: asChild, data-state (open|closed), data-disabled, data-orientation. Accordion.Content: asChild, data-state, forceMount (keep in DOM when closed). Keyboard: Space/Enter toggles accordion item when focus on trigger, Tab moves to next focusable element, Arrow Up/Down (vertical) or Left/Right (horizontal) navigates between triggers, Home/End jump to first/last trigger."""
    },
    {
        "name": "Radix Select API — custom select primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Select.Root: defaultValue, value, onValueChange, defaultOpen, open, onOpenChange, dir, name (for form submission), disabled, required. Select.Trigger: asChild. Select.Value: placeholder text when no value selected (data-placeholder attribute). Select.Content: position (popper|item-aligned), side, sideOffset, align, alignOffset, avoidCollisions, collisionPadding, sticky. Select.Group: for grouping items with labels. Select.Label: label for a group. Select.Item: value (required), disabled, textValue (optional, for typeahead). Select.ItemText: renders text content. Select.ItemIndicator: renders checkmark icon. Select.Separator: visual divider. Select.ScrollUpButton / ScrollDownButton: scroll arrows. Keyboard: Enter/Space opens, Up/Down arrows navigate items, Enter selects, Escape closes. Typeahead: type letters to jump to matching item."""
    },
    {
        "name": "Radix Dialog API — modal dialog primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Dialog.Root: defaultOpen, open, onOpenChange, modal (default true, prevents interaction with background). Dialog.Trigger: asChild. Dialog.Portal: renders content in document.body (fixes z-index stacking). Dialog.Overlay: fixed background, data-state (open|closed). Dialog.Content: data-state, onOpenAutoFocus (focus first focusable), onCloseAutoFocus (restore focus), onEscapeKeyDown, onPointerDownOutside (default closes unless prevented), onInteractOutside. Dialog.Title: accessible name for screen readers. Dialog.Description: accessible description. Dialog.Close: button that closes dialog. Keyboard: Escape closes, Tab cycles within dialog (focus trap). Focus is restored to trigger on close. Body scroll is prevented when open."""
    },
    {
        "name": "Radix Popover API — floating content primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Popover.Root: defaultOpen, open, onOpenChange, modal. Popover.Trigger: asChild. Popover.Portal. Popover.Content: side, sideOffset, align, alignOffset, avoidCollisions, collisionPadding, collisionBoundary, sticky, hideWhenDetached. onOpenAutoFocus, onCloseAutoFocus, onEscapeKeyDown, onPointerDownOutside, onInteractOutside. Popover.Arrow: visual arrow pointing to trigger (optional, width/height). Popover.Anchor: anchor to a different element than trigger. Popover.Close. Keyboard: Escape closes. Clicks outside close by default. Positioning with Floating UI (floating-ui). Uses --radix-popover-content-transform-origin for animations."""
    },
    {
        "name": "Radix Tabs API — tab panel primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Tabs.Root: defaultValue, value, onValueChange, orientation (horizontal|vertical), dir, activationMode (automatic|manual — auto focuses on arrow nav, manual only moves focus). Tabs.List: contains triggers, aria-label or aria-labelledby. Tabs.Trigger: value (required), disabled. Tabs.Content: value (required), forceMount (keep in DOM). Keyboard (automatic): Left/Right (horizontal) or Up/Down (vertical) moves between tabs AND activates them. Home/End: first/last tab. Keyboard (manual): same arrows but only move focus — Enter/Space to activate. Tab enters from outside, moves to active tab panel content."""
    },
    {
        "name": "Radix DropdownMenu API — menu primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """DropdownMenu.Root: defaultOpen, open, onOpenChange, dir, modal. Trigger. Portal. Content: avoidCollisions, collisionPadding, side, sideOffset, align, alignOffset, onCloseAutoFocus. Item: disabled, onSelect (fires on click/Enter), textValue (for typeahead). CheckboxItem: checked, onCheckedChange. RadioGroup: value, onValueChange. RadioItem: value (required). Sub: open, onOpenChange. SubTrigger: disabled. SubContent. Separator. Label. Keyboard: Enter/Space/DownArrow opens, Up/Down arrows navigate, Enter selects, Escape closes (or closes sub-menu then parent), RightArrow opens sub-menu, LeftArrow closes sub-menu. Typeahead: type letters to jump to matching item. Focus loops within menu. data-highlighted on focused items."""
    },
    {
        "name": "Radix ContextMenu API — right-click menu",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """ContextMenu uses same component pattern as DropdownMenu but triggers on right-click. ContextMenu.Root, ContextMenu.Trigger, ContextMenu.Portal, ContextMenu.Content (positioned at cursor). Item, CheckboxItem, RadioGroup, RadioItem, Sub, SubTrigger, SubContent, Separator, Label. Keyboard: Shift+F10 opens at focused element, Menu key (context menu key) also opens. Content positioned at mouse: uses Floating UI with virtual cursor position. Same typeahead, focus management, and item selection as DropdownMenu. Data attributes: data-state (open|closed), data-highlighted, data-disabled on items."""
    },
    {
        "name": "Radix Tooltip API — hover tooltip primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Tooltip.Root: defaultOpen, open, onOpenChange, delayDuration (default 700ms), skipDelayDuration (300ms, time between tooltips), disableHoverableContent (prevents hovering content). Tooltip.Trigger: asChild. Tooltip.Portal. Tooltip.Content: side, sideOffset, align, alignOffset, avoidCollisions, collisionPadding, arrowPadding, sticky. onEscapeKeyDown. Tooltip.Arrow: optional visual arrow. Hover to open (after delay), leave to close. Focus also opens (instant). Escape closes. Touch: long press opens (no delay). Must NOT contain essential info — supplementary only. No interactive elements inside (use Popover or HoverCard for rich content)."""
    },
    {
        "name": "Radix HoverCard API — rich hover preview primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """HoverCard.Root: defaultOpen, open, onOpenChange, openDelay (700ms default), closeDelay (300ms). HoverCard.Trigger: asChild. HoverCard.Portal. HoverCard.Content: side, sideOffset, align, alignOffset, avoidCollisions, collisionPadding, onEscapeKeyDown, onPointerDownOutside, onInteractOutside, onOpenAutoFocus. HoverCard.Arrow. Same positioning as Popover. Content can contain interactive elements (links, buttons). Stays open when hovering content. Closes when cursor leaves both trigger AND content. Side preference: intelligently switches if not enough space."""
    },
    {
        "name": "Radix Checkbox API — checkbox primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Checkbox.Root: defaultChecked, checked, onCheckedChange (checked: boolean|'indeterminate'), disabled, required, name (form), value (form). Checkbox.Indicator: renders when checked (forceMount prop for animation). State: data-state=checked|unchecked|indeterminate. Keyboard: Space toggles. Used in: forms, data tables, filters, terms acceptance. Indeterminate state useful for 'select all' when partially selected. aria-checked matches state. Indicator should render CheckIcon for checked, MinusIcon for indeterminate."""
    },
    {
        "name": "Radix Switch API — toggle switch primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Switch.Root: defaultChecked, checked, onCheckedChange, disabled, required, name, value. Switch.Thumb: the sliding circle indicator. State: data-state=checked|unchecked. Keyboard: Space toggles. Faster than Checkbox for binary on/off (no indeterminate). Used for: dark mode, notifications toggle, feature flags, boolean settings. aria-checked. Thumb animates translateX between off (0) and on (translate-x-full) positions via CSS transition. Root bg transitions: bg-primary when checked, bg-input when unchecked."""
    },
    {
        "name": "Radix Slider API — range slider primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Slider.Root: defaultValue, value, onValueChange, min (default 0), max (default 100), step (default 1), minStepsBetweenThumbs (when multiple thumbs), disabled, orientation, dir, inverted, name. Slider.Track: visual track. Slider.Range: filled portion between thumbs. Slider.Thumb: value at current position. Data attributes: data-disabled. Keyboard: Arrow Right/Up increases, Arrow Left/Down decreases, Home=min, End=max (each by step). Supports single thumb (value: number) or multiple thumbs (value: [number, number]). aria-valuenow, aria-valuemin, aria-valuemax, aria-valuetext."""
    },
    {
        "name": "Radix Progress API — progress indicator primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Progress.Root: value (null for indeterminate), max (default 100), min (default 0), getValueLabel (optional). Progress.Indicator: visual fill. State: data-state=indeterminate (when value is null), data-state=complete (when value equals max), data-value (current value). aria-valuenow, aria-valuemin, aria-valuemax, aria-valuetext, aria-label. Indeterminate mode: animated stripe or pulse, no specific value. Used for: loading bars, file upload, form completion, onboarding steps, score display."""
    },
    {
        "name": "Radix Collapsible API — expand/collapse primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Collapsible.Root: defaultOpen, open, onOpenChange, disabled. Collapsible.Trigger: asChild. Collapsible.Content: asChild, forceMount. Data attributes: data-state=open|closed, data-disabled. Trigger has aria-expanded, aria-controls pointing to content ID. Content animates height from 0 (closed) to auto (open). Keyboard: Enter/Space on trigger toggles. Use for: expandable FAQ, show more/less, collapsible filters, tree view nodes, accordion (combined with Accordion if needed). Lightweight — no heading requirement unlike Accordion.Item."""
    },
    {
        "name": "Radix Toggle API — press state button",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Toggle.Root: defaultPressed, pressed, onPressedChange, disabled. Data attributes: data-state=on|off, data-disabled. aria-pressed matches state. Keyboard: Enter/Space toggles. Use for: bold/italic/underline toggles, favorite/bookmark star, filter on/off chips, view mode toggle (list/grid). Difference from Button: Toggle has persistent pressed state toggled on/off. Button fires action then returns to default. ToggleGroup combines Toggles: type=single (radio behavior) or multiple (checkbox behavior)."""
    },
    {
        "name": "Radix ToggleGroup API — toolbar toggle group",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """ToggleGroup.Root: type=single|multiple, defaultValue, value, onValueChange, disabled, orientation, dir, rovingFocus (boolean, enables roving tabindex), loop (boolean, wraps at ends). ToggleGroup.Item: same as Toggle.Root (pressed state), value (required), disabled. Keyboard: Tab enters group, arrows move between items (roving tabindex). Single: only one pressed at a time (radio behavior). Multiple: any combination pressed (checkbox behavior). Used for: text alignment toolbar (left/center/right/justify), day picker (M/T/W/Th/F), filter chips. role=toolbar or radiogroup. aria-label on Root for accessible name."""
    },
    {
        "name": "Radix NavigationMenu API — website nav",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """NavigationMenu.Root: value, defaultValue, onValueChange, delayDuration (200ms), skipDelayDuration (300ms), orientation, dir. NavigationMenu.List: contains items. NavigationMenu.Item: value (unique). NavigationMenu.Trigger: asChild, opens/closes content. NavigationMenu.Content: asChild, forceMount. NavigationMenu.Link: asChild, active (boolean), onSelect. NavigationMenu.Indicator: animated line/arrow below active item (data-state=visible|hidden, CSS transition). NavigationMenu.Viewport: portal for content. DIFFERENT from Menubar: avoids composite focus, no first-char nav, simpler UX for websites. Content positioned via Viewport. Hover/delayed open. Keyboard: Tab enters list, arrows move between items, Enter/Space opens/closes."""
    },
    {
        "name": "Radix ScrollArea API — custom scrollbar primitive",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """ScrollArea.Root: type (auto|always|scroll|hover), scrollHideDelay (600ms), dir. ScrollArea.Viewport: the scrollable container. ScrollArea.Scrollbar: orientation (horizontal|vertical), forceMount. ScrollArea.Thumb: draggable thumb, size proportional to content. ScrollArea.Corner: intersection of both scrollbars. Data attributes: data-state=visible|hidden on scrollbars. Thumb position tracks viewport scroll. Touch: native scroll behavior (no custom scrollbar). Keyboard: focus viewport, arrow/page keys scroll. Used for: sidebar scroll, dropdown list overflow, card content overflow, table horizontal scroll."""
    },
    {
        "name": "Radix Separator API — visual divider",
        "kind": "reference", "source": "Radix Primitives context7",
        "text": """Separator.Root: orientation (horizontal|vertical), decorative (boolean, default true). Decorative: aria-hidden=true, not in accessibility tree, purely visual. Non-decorative: role=separator, announced by screen readers as divider. Used between: menu items, sections in sidebar, list items, form sections. Horizontal: hr-like line. Vertical: thin column divider in toolbars or split panels."""
    },
]

# ═══════════════════════════════════════════════════════════════
# MERGE + INGEST
# ═══════════════════════════════════════════════════════════════

ALL_SNIPPETS = SHADCN_SOURCE + RADIX_API

def main():
    print(f"🧠 ADSENTICE · WARP M2 SNIPPETS + REFS")
    print(f"   Target: {COLLECTION} @ Qdrant :6352")
    print(f"   Snippets: {len(SHADCN_SOURCE)} shadcn source + {len(RADIX_API)} Radix API = {len(ALL_SNIPPETS)} total")
    print()

    total = 0
    BATCH = 6

    for i in range(0, len(ALL_SNIPPETS), BATCH):
        batch = ALL_SNIPPETS[i:i + BATCH]
        texts = [s["text"][:800] for s in batch]
        vecs = embed(texts)
        points = [{"id": str(uuid.uuid4()), "vector": vec, "payload": {
            "id": s["name"][:100],
            "kind": s["kind"],
            "tag": TAG_WARP,
            "name": s["name"],
            "description": s["text"][:600],
            "source": s["source"],
            "source_type": s["kind"],
            "source_quality": "P0" if "Radix" in s["source"] else "P0",
            "ts": int(time.time()),
        }} for s, vec in zip(batch, vecs)]

        status = upsert(points)
        total += len(points)
        names = ", ".join(s["name"][:60] for s in batch)
        print(f"  ✅ {len(points)}: {names} → {status}")

    # Verify
    tests = [
        ("como implementar dropdown menu acessivel com keyboard navigation", "DropdownMenu"),
        ("quais props o Accordion Trigger aceita", "Accordion"),
        ("codigo fonte do Button com cva variants", "Button"),
        ("WAI-ARIA padrao de acessibilidade Radix", "Radix"),
    ]
    print(f"\n🔍 VERIFY queries:")
    for query, expected in tests:
        vec = embed([query])[0]
        body = json.dumps({
            "vector": vec,
            "filter": {"must": [{"key": "tag", "match": {"value": TAG_WARP}},
                               {"key": "kind", "match": {"any": ["snippet", "reference"]}}]},
            "limit": 2,
            "with_payload": True,
        }).encode()
        req = Request(f"{QDRANT_URL}/collections/{COLLECTION}/points/search", data=body,
                      headers={"Content-Type": "application/json"}, method="POST")
        data = json.loads(urlopen(req, timeout=10).read())
        results = data.get("result", [])
        top = results[0]["payload"]["name"][:80] if results else "N/A"
        match = "✅" if any(expected in r["payload"]["name"] for r in results[:2]) else "❌"
        print(f"   {match} '{query}' → {top}")

    print(f"\n🏁 {total} snippets + referencias ingeridos")
    print(f"   {len(SHADCN_SOURCE)} shadcn/ui source code")
    print(f"   {len(RADIX_API)} Radix Primitives API docs")
    print(f"   kind = snippet | reference · tag = {TAG_WARP}")

if __name__ == "__main__":
    main()
