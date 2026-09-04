# Portal Genie Admin — Brand and Design Rules

**Status:** Foundation  
**Audience:** All UI work in this repository  
**Brand source:** `Portal Genie Brand Guide.docx` (authoritative for colour and logo)

This document translates the Brand Guide into admin-interface rules. Where the guide specifies a colour or logo treatment, that value is used unchanged. Where the guide is silent (spacing, form controls, tables, status semantics), this document sets a modern SaaS admin convention that complements the brand.

Do not introduce a second palette, a second typeface, or decorative styles that belong to a different product.

---

## Brand character

Portal Genie should look like software people trust: calm, premium, professional, modern, and friendly.

The admin app is a working tool, not a marketing site. It should feel like the same brand — navy, blue, restrained colour, generous but practical spacing — at a density suited to lists, forms, and rule building.

Avoid: noisy dashboards, rainbow charts, heavy shadows, glassmorphism, stock illustration, and all-caps UI chrome (the stacked wordmark is the exception).

---

## Colour

### Palette (from the Brand Guide)

The guide defines eight swatches. Use these hex values exactly.

| Name | Hex | Guide role | Admin usage |
| --- | --- | --- | --- |
| Portal Navy | `#112136` | Dark primary | App shell, headings, body text, footer/sidebar, important dark surfaces |
| Portal Blue | `#0077BE` | Bright primary | Primary buttons, links, active nav, focus rings, key highlights |
| Portal Teal | `#00BEB9` | Accent | Sparse accent, icons, success emphasis, small highlights |
| Portal Forest | `#12403C` | Deep green | Deep success/positive complement; use sparingly |
| Portal Grey | `#B7BCC2` | Neutral | Borders, dividers, muted icons, disabled chrome |
| Portal Magenta | `#6E0357` | Deep plum | Emphasis and destructive/alert actions |
| Portal Off-White | `#FAFBFB` | Near-white | Default page background |
| Portal Steel | `#365C8D` | Mid blue | Supporting colour on dark navy, secondary labels, muted charts |

**Surfaces not printed as swatches but required for UI**

| Name | Hex | Notes |
| --- | --- | --- |
| Surface | `#FFFFFF` | Cards, dialogs, table surfaces. Not a Brand Guide swatch; required so Off-White pages have elevation. |
| Inverse text | `#FFFFFF` | Text and icons on navy, blue, magenta, or forest. |

### Colour usage

Approximate balance for admin screens:

- ~80% Off-White / white
- ~15% Portal Navy (shell, type, structure)
- ~5% Portal Blue and other accents

Colour directs attention. It must not decorate empty space.

| Need | Colour |
| --- | --- |
| Page canvas | Off-White `#FAFBFB` |
| Card / table / dialog | White `#FFFFFF` |
| Shell / sidebar | Portal Navy `#112136` |
| Primary text | Portal Navy `#112136` |
| Secondary text | Portal Navy at ~70–75% opacity, or Portal Steel on dark surfaces |
| Border / divider | Portal Grey `#B7BCC2` at full or ~40% opacity |
| Primary action | Portal Blue `#0077BE` |
| Link / focus | Portal Blue `#0077BE` |
| Success | Portal Teal `#00BEB9` (icon/badge). Deep success surfaces may use Portal Forest |
| Destructive | Portal Magenta `#6E0357` |
| Warning | Admin convention (not in the Brand Guide): `#B8860B` (muted gold). Use for caution only, never as a brand accent |

Do **not** use the logo’s cyan-to-royal gradient as a page background, sidebar fill, or large button fill. The gradient belongs to the logo mark.

### Logo gradient (mark only)

The G-mark uses a vertical/diagonal blue gradient (bright cyan through Portal Blue to a deeper royal). Reproduce it only on the logo artwork. If a CSS approximation is ever required for the mark:

- Light stop: approximately `#3EC6FF`
- Mid stop: `#0077BE` (Portal Blue)
- Deep stop: approximately `#005A9E`

Prefer the supplied logo files over a hand-built gradient.

---

## Logo usage

The Brand Guide shows:

1. **G-mark** — circular G whose crossbar is an upward arrow; rounded terminals; blue gradient. Use as favicon, sidebar collapsed icon, and compact header mark.
2. **Stacked wordmark** — `THE` (small) / `PORTAL` / `GENIE` in bold geometric sans, all caps. The O in PORTAL is the G-mark.

**On dark navy** (`#112136`): wordmark in white; G-mark keeps its blue gradient.  
**On light grey / Off-White:** wordmark in Portal Navy (not pure black in product UI); G-mark keeps its blue gradient.

Rules:

- Keep clear space around the mark roughly equal to the height of the G-mark.
- Do not outline, recolour, rotate, or add shadows to the logo.
- Do not replace the O with any other icon.
- Do not set UI headings in the wordmark’s all-caps stacked style.
- In the admin header, prefer G-mark + “Portal Genie Admin” in Inter (sentence case / title case), not the full stacked lockup, so the shell stays compact.

---

## Typography

The Brand Guide specifies the logo lettering but not a product UI typeface. Portal Genie’s existing digital products use **Inter**. This admin app uses the same family so marketing, product, and admin feel like one brand.

| Role | Spec |
| --- | --- |
| Family | Inter, then `system-ui, sans-serif` |
| Body | 14px / 20px (admin density). 16px only for long-form help |
| Small / meta | 12px / 16px |
| Caption | 12px, Portal Grey or navy at 70% |
| Page title (H1) | 24px, semibold (600), tracking tight, Portal Navy |
| Section title (H2) | 18px, semibold, Portal Navy |
| Card / table header | 14px, medium/semibold |
| Button label | 14px, medium |
| Case | Sentence case for all UI copy. All-caps only on the logo wordmark |

Do not use the logo’s display face for forms, tables, or navigation.

---

## Spacing

Admin convention (the Brand Guide does not define a spacing scale).

Use a **4px base**: 4, 8, 12, 16, 20, 24, 32, 40, 48.

| Context | Guidance |
| --- | --- |
| Page padding | 24px (desktop), 16px (narrow) |
| Gap between page header and content | 24px |
| Card padding | 20–24px |
| Compact card / toolbar | 12–16px |
| Form vertical rhythm | 16px between fields |
| Table cell padding | 12px 16px |
| Dialog padding | 24px |

Prefer consistent rhythm over one-off magic numbers. Marketing-site section gaps (72–120px) are too large for admin screens.

---

## Layout and navigation

**Shell**

- Left sidebar on Portal Navy. Content on Off-White.
- Sidebar width ~240px expanded; icon-only collapse below ~1024px.
- Active item: Portal Blue text or a light blue/white highlight that meets contrast on navy.
- Inactive items: white or Portal Steel, not grey-on-navy that fails contrast.

**Page frame**

- Page title, short description, and primary action in a header row.
- Filters/search sit above tables, not inside the page title.
- Max content width for forms: ~800px. Tables may use the full content column.

**Responsive**

- Design for laptop (1280+) first as the primary admin surface.
- Tablet: collapsible nav, stacked page header, horizontally scrollable tables rather than squashed columns.
- Do not ship a desktop-only interface.

---

## Buttons

| Variant | Surface | Label | Radius | Use |
| --- | --- | --- | --- | --- |
| Primary | Portal Blue `#0077BE` | White | 12px | One main action per view (Create rule, Save) |
| Secondary | White | Portal Navy | 12px | Cancel, alternative actions; 1px Portal Grey border |
| Ghost | Transparent | Portal Navy | 12px | Toolbar actions on Off-White |
| Destructive | Portal Magenta `#6E0357` | White | 12px | Delete, irreversible confirm |
| Disabled | Grey at reduced opacity | Grey | 12px | Not clickable; never rely on colour alone |

Height: 40px default; 32px compact in tables. Horizontal padding 16px. Labels name the action (“Save rule”, not “OK”).

Hover: slightly darker fill (primary/destructive) or slightly stronger border (secondary). No scale or glow.

---

## Form controls

- Visible label above the control. Placeholder is hint text only.
- Height 40px, radius 12px, white fill, 1px Portal Grey border.
- Focus: 2px Portal Blue outline, 2px offset (match global `:focus-visible`).
- Error: magenta border + text message under the field.
- Selects, dates, and number-of-days fields use the same geometry as text inputs.
- Toggles (enable/disable rule): Portal Blue when on; Portal Grey when off.
- Checkboxes/radios: Portal Blue when selected.
- Helper text: 12px, navy at 70%.

Required fields marked in the label. Do not use colour as the only required indicator.

---

## Cards

- White background, 16px radius (slightly tighter than marketing 20px, for admin density).
- 1px border using Portal Grey at ~25–40% opacity.
- Shadow optional and very light: `0 8px 24px -8px rgba(17, 33, 54, 0.08)` on raised or interactive cards only.
- Prefer border over shadow.
- One purpose per card. No decorative empty cards.

---

## Tables

- White surface, navy header text (not a solid navy header bar — that is too heavy for dense data).
- Header: 12–14px, semibold, sentence case.
- Row border: Portal Grey at low opacity.
- Row hover: Portal Blue at ~4–6% on white.
- Numeric columns right-aligned. Status as badges, not raw colour fills.
- Pagination and density controls below the table.
- Empty table uses the shared empty state, not a blank grid.

---

## Status badges

Pill radius 999px. Small type (12px), medium weight. Background is a light tint; text is the strong colour.

| Status | Text / icon | Tint approach |
| --- | --- | --- |
| Active / enabled / success | Portal Forest or teal | Teal/forest at ~12% |
| Inactive / disabled | Portal Steel | Steel at ~12% |
| Draft / warning | Muted gold `#B8860B` | Gold at ~12% |
| Error / failed | Portal Magenta | Magenta at ~12% |
| Trial | Portal Blue | Blue at ~12% |
| Info | Portal Steel | Steel at ~12% |

Never encode status by colour alone; include a label.

---

## Icons

- One library: **Lucide**, outlined, stroke 2.
- Default size 16px in tables/buttons, 20px in cards, 24px in empty states.
- Colour: Portal Blue for emphasis, navy or grey for default, teal for positive, magenta for destructive.
- Decorative icons: `aria-hidden="true"`.
- Do not mix filled and outlined sets. Do not use the G-mark as a generic bullet icon.

---

## Border radius

| Element | Radius |
| --- | --- |
| Buttons, inputs, selects | 12px |
| Cards, dialogs | 16px |
| Tables (outer) | 16px |
| Badges, toggles | 999px |
| Sidebar | 0 (full-height shell) |

The logo’s rounded terminals support this radius language. Do not use sharp 0px controls in content, and do not use 24px+ “blob” radii.

---

## Shadows and elevation

| Level | Treatment |
| --- | --- |
| Resting card / table | Border only |
| Hover / interactive card | Optional light navy-tinted shadow (see Cards) |
| Dialog / dropdown | `0 16px 40px -12px rgba(17, 33, 54, 0.18)` plus grey border |
| Sidebar | No shadow; contrast from navy vs Off-White |

No glow, neon, or coloured shadows.

---

## Page backgrounds

| Region | Colour |
| --- | --- |
| Browser/page | Off-White `#FAFBFB` |
| Sidebar / dark shell | Portal Navy `#112136` |
| Main content | Off-White |
| Elevated work area | White |
| Modal overlay | Portal Navy at 50% opacity |

Do not use photographic or gradient page backgrounds.

---

## Motion

Short and functional: 150–200ms fade/slide for menus and validation messages. Honour `prefers-reduced-motion`. No parallax, looping logo spins, or decorative animation on the rule builder.

---

## Accessibility

- WCAG 2.2 AA contrast. Teal `#00BEB9` on white is not sufficient for small text — use it on icons/large badges, or pair teal with navy text.
- Visible focus on every control.
- Semantic headings, labels, and tables (`th`, captions or `aria-labelledby`).
- Keyboard access to the condition builder (add/remove/reorder conditions without a pointer).
- Do not rely on placeholder-only fields.

---

## Copy tone

Plain English. Short labels. Explain the rule in the same language an administrator would use (“Customer is currently in trial”), not internal field names.

---

## Implementation notes (when the app exists)

- Define these values once as CSS tokens (for example `--portal-navy`) and consume them from components. Do not scatter raw hex in feature templates.
- Shared primitives (button, input, card, table, badge, empty/error/loading) live in `shared/`. Features must not restyle them ad hoc.
- Token names should match this document so design review and code review use the same language.
