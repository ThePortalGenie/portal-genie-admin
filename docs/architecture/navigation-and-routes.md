# Navigation, Routes, and Application Shell

**Status:** Phase 1 approved; Phase 2 shell implemented.

---

## Sitemap

```
Portal Genie Admin
│
├── /                                → redirect to /engagement/rules
│
├── Customer Engagement
│   ├── /engagement/rules            Rules landing (groups + all rules)
│   ├── /engagement/rules/journey    Global customer communication journey
│   ├── /engagement/rules/group/:id  Rule group journey
│   ├── /engagement/rules/new        Create rule
│   ├── /engagement/rules/:id        Edit rule
│   └── /engagement/templates        Communication template library
│
├── Customer Usage                   (reserved — no screens, no nav items in v1)
│   ├── /usage
│   ├── /usage/customers
│   └── /usage/customers/:id
│
└── Settings                         (reserved — no screens, no nav items in v1)
    └── /settings
```

Unknown paths render a simple not-found view inside the shell (“Page not found”, link back to Rules). Do not design a marketing-style 404.

Reserved Usage and Settings URLs should not be linked. If typed, show a short “This area is not available yet” page inside the shell rather than a blank router outlet.

---

## Route table (v1)

| Path | Page | Nav highlight | Breadcrumb |
| --- | --- | --- | --- |
| `/` | Redirect | — | — |
| `/engagement/rules` | Rules landing | Rules | Customer Engagement / Rules |
| `/engagement/rules/journey` | Global journey | Rules | Customer Engagement / Rules / Global journey |
| `/engagement/rules/group/:groupId` | Rule group journey | Rules | Customer Engagement / Rules / {group name} |
| `/engagement/rules/new` | Rule editor (create) | Rules | Customer Engagement / Rules / Create rule (or via the group) |
| `/engagement/rules/:id` | Rule editor (edit) | Rules | Customer Engagement / Rules / {rule name} |
| `/engagement/templates` | Template library | Templates | Customer Engagement / Templates |

Duplicate is not a separate route. It opens `/engagement/rules/new` (or edit) with a copied draft; implementation may use a query such as `?from={id}` or a service-held draft. Prefer `?from={id}` so refresh can reconstruct the copy.

There is no template detail route in v1. Template purpose is shown in the library (and in a read-only panel if needed).

---

## Application shell

Desktop-first admin workspace. One shell for all routes.

```
┌──────────────┬─────────────────────────────────────────────────────────┐
│ SIDEBAR      │ TOP BAR (optional, thin)                                │
│ Portal Navy  │ G-mark is in the sidebar; top bar is not a second brand │
│              │ strip. Use a thin content header only if needed for     │
│  G-mark      │ mobile menu button.                                     │
│  Portal      ├─────────────────────────────────────────────────────────┤
│  Genie Admin │ PAGE HEADER                                             │
│              │ Breadcrumb                                              │
│  Customer    │ Title                          Primary action           │
│  Engagement  │ Short description                                       │
│    Rules     ├─────────────────────────────────────────────────────────┤
│    Templates │ MAIN CONTENT  (Off-White canvas)                        │
│              │  White cards / table as specified per page              │
│              │                                                         │
└──────────────┴─────────────────────────────────────────────────────────┘
```

### Sidebar

- Width ~240px expanded. Full-height Portal Navy `#112136`. No drop shadow.
- Top: G-mark (gradient intact) + “Portal Genie Admin” in Inter, white, not the stacked all-caps lockup.
- Section label: “Customer Engagement” (small, Portal Steel).
- Items: **Rules**, **Templates**. Icon + label (outlined Lucide).
- No User menu, notifications, or Settings in v1 (auth does not exist).
- Do not show Usage, Settings, or “Coming soon” items.

### Main content

- Background: Off-White `#FAFBFB`.
- Padding: 24px desktop, 16px narrow.
- Tables use the full content column. The rule editor form column maxes at ~800px; the live summary may sit beside it on wide screens (see UX doc).

### Page header convention

Every page:

1. Breadcrumb (text links, Portal Blue for ancestors, navy for current).
2. Row: **H1** (24px semibold navy) + optional primary button on the right.
3. One-line description under the title (navy at ~75%).

Filters and search sit **below** this header, not inside the H1 row.

### Breadcrumb rules

- Home is not a separate “Dashboard” crumb. First crumb is the feature: Customer Engagement.
- Edit rule uses the rule name once loaded; while loading, use “Edit rule”.
- Breadcrumb ancestors are links; the current page is not.

---

## Navigation states

| State | Treatment |
| --- | --- |
| Default | White or Portal Steel label and icon on navy |
| Hover | Slightly lighter navy/steel background strip, still high contrast |
| Active | Portal Blue label and icon, or a light highlight that **meets WCAG on navy**. Include a 3px Portal Blue leading edge so colour is not the only cue |
| Focus-visible | 2px Portal Blue outline, 2px offset |
| Disabled / reserved | Not shown in v1 |

Do not use Portal Grey for inactive sidebar text (contrast on navy is insufficient).

---

## Responsive behaviour

Primary design surface: **1280px and up**, sidebar expanded.

| Breakpoint (convention) | Behaviour |
| --- | --- |
| ≥ 1280px | Expanded sidebar, editor may show summary beside the form |
| 1024–1279px | Sidebar icon-only (~64px) or collapsed behind a menu button; labels in a tooltip; content uses remaining width |
| < 1024px | Sidebar off-canvas. Menu button in a thin top bar (navy or white with navy icon). Overlay + navy-at-50% scrim. Tables scroll horizontally rather than compressing columns |
| < 640px | Page header stacks (title then action). Editor sections stack. Condition rows stack field / operator / value vertically |

The product is not mobile-first, but it must remain usable on a tablet. Do not ship a layout that only works with a persistent 240px sidebar.

**Phase 2 implementation:** persistent expanded sidebar at **≥ 1024px**; off-canvas drawer below that. Icon-only sidebar for 1024–1279px is deferred so the shell stays simple until the working surfaces exist.

---

## Header / top bar

**Desktop:** No persistent global top bar. Brand lives in the sidebar. Page title lives in the content header.

**Narrow:** A 56px bar with menu icon, compact G-mark, and “Admin” text so the shell remains identifiable when the sidebar is hidden.

---

## Future nav (do not implement)

When Usage and Settings are approved, add further sidebar sections **below** Engagement:

- Customer Usage → Dashboard, Customers
- Settings → (TBD)

Do not pre-render Usage or Settings items in v1. Do **not** show “Coming soon” navigation.
