# Customer Engagement UX

**Status:** Phase 1 approved (including product decisions)  
**Routes:** `docs/architecture/navigation-and-routes.md`  
**Models:** `docs/architecture/domain-model.md`  
**Metrics:** `docs/architecture/metric-catalog.md`

This document is the screen contract for v1. The next implementation prompt should be able to build these three surfaces without inventing major UX.

Recipient preview is out of scope. Email composition, evaluation of customer populations, send-history, and delivery are out of scope. The app authors **rule definitions** only.

---

## Shared page chrome

All three pages use the application shell and page header (title, description, primary action, breadcrumb).

Copy is sentence case. Status is a **badge with a label**, never colour alone.

---

# A. Rules landing

**Route:** `/engagement/rules`  
**Title:** Rules  
**Description:** Create automated communications based on customer lifecycle and usage.  
**Primary action:** Create rule → `/engagement/rules/new`

The landing page is organised around **Rule Groups** (journeys). The flat table remains as **All rules** so administrators can still search and filter globally.

### Page structure (top to bottom)

1. Page header
2. Overview counts (total / active / disabled for the full loaded set)
3. Global search (name, description, template — all rules, all groups)
4. Rule group cards
5. All rules: status + category filters and the existing table

### Rule group cards

Each card is a journey, not a category filter. Counts are derived from assigned rules only (total / active / disabled). Do not show emails sent, customers, or open rates.

**View rules** → `/engagement/rules/group/:groupId`

### Toolbar (All rules)

| Control | Behaviour |
| --- | --- |
| Search | Global. Filters All rules by rule name, description, and template name. Debounced. Placeholder is a hint; the field has a visible “Search” label or `aria-label` |
| Status | All / Active / Disabled |
| Category | All + **rule** categories (Onboarding, Adoption, Engagement, Conversion, Announcement, Other). Not template categories. Not rule groups. |

Filters combine with AND. No saved views in v1.

# A2. Rule group journey

**Route:** `/engagement/rules/group/:groupId`  
**Title:** Group name  
**Description:** Group description  
**Primary action:** Create rule → `/engagement/rules/new?group=:groupId` (preselects that group)

Breadcrumb: Customer Engagement / Rules / {group name}

Show rules as a restrained vertical **sequence**, sorted by `sequenceOrder`. Disabled rules stay in their stored position. This is a readable journey, not a workflow canvas: no drag-and-drop, no arrows between conditions.

Each item shows name, timing (from existing summary logic), important eligibility, template, status, and category. Edit is available; Duplicate / Enable / Disable / Delete sit in an overflow menu.

Helper copy: order in this list is for administrators. Eligibility and timing on each rule still decide when a communication can send.

Group search, if shown, searches only within that group.

### Columns

| Column | Content | Notes |
| --- | --- | --- |
| Name | Rule name, link to edit | Primary identifier |
| Status | Badge: Active (teal/forest tint) or Disabled (steel tint) | |
| Category | Category label or em dash if none | |
| Template | Template display name | |
| Conditions | Human-readable summary, one line, truncate with title tooltip | Generated from the condition tree |
| Timing | Short label, e.g. “When conditions become true”, “3 days after registration” | |
| Updated | Relative or locale date | Right-aligned if numeric-looking; keep dates left |
| Actions | Overflow or icon buttons | See below |

Do not show recipient counts.

### Row actions

| Action | How | Result |
| --- | --- | --- |
| Edit | Row click or name link or Edit | `/engagement/rules/:id` |
| Duplicate | Duplicate | Draft copy, name `"{name} (copy)"`, status Disabled, editor opened (`/engagement/rules/new?from=:id` or equivalent) |
| Enable | Only if Disabled | Sets status Active **if the stored rule is valid**. If a stored rule would fail current validation, block and toast/inline: “Fix this rule before activating.” |
| Disable | Only if Active | Confirmation: “Disable {name}? It will stop matching customers once delivery is connected.” Confirm / Cancel |
| Delete | Delete | Confirmation (destructive). **Disabled:** standard — “Delete {name}? This cannot be undone.” **Active:** stronger — “Delete {name}? This rule is active. Deleting it will stop future communications associated with it. This cannot be undone.” Confirm / Cancel only — do not require typing the rule name. |

Enable/Disable may be a compact toggle in the status column **or** menu actions. Prefer **menu + status badge** so accidental toggles are harder. Status is not edited inline without confirmation when turning Active → Disabled.

### Create rule

Primary header button. Always visible, including empty state (empty state repeats it).

### Empty state

In the table slot, shared empty-state pattern:

- Title: No engagement rules yet
- Body: Create a rule to send a communication when customers match lifecycle or usage conditions.
- Action: Create rule

Do not render an empty table grid.

### Loading state

Table region skeleton or labelled “Loading rules…” (not a blocking full-app splash). Header and Create rule remain visible.

### Error state

Shared error pattern: short message, Retry. Do not dump raw HTTP text.

### Search with no matches

Distinct from empty: “No rules match this search.” Clear filters action. Do not use the first-run empty copy.

---

# B. Rule editor (create and edit)

**Routes:** `/engagement/rules/new`, `/engagement/rules/:id`  
**Title:** Create rule **or** the rule name (edit)  
**Description:** Define who matches, which communication to send, and when.  
**Actions:** Cancel (secondary) · Save rule (primary, disabled while invalid)

Create and edit are the **same layout**. Edit loads the rule; loading/error apply to the form card.

Cancel: if the form is dirty, confirm “Discard unsaved changes?”. If clean, go to the list.

### Layout

```
Breadcrumb
Title + Cancel + Save rule

On wide screens (≥1280px):

┌─────────────────────────────┬──────────────────────┐
│ Form column (~800px max)    │ Sticky summary card  │
│ 1. Rule details             │ Plain-language rule  │
│ 2. Conditions               │ Validation list      │
│ 3. Communication            │                      │
│ 4. Timing                   │                      │
└─────────────────────────────┴──────────────────────┘

Below 1280px: summary + validation stack above or below the form, not a second scroll trap.
```

The summary is not a recipient preview. It is a sentence restating the current draft.

### 1. Rule details

| Field | Required | Control |
| --- | --- | --- |
| Name | Yes | Text |
| Description | No | Textarea, 2–3 rows |
| Category | Yes | Select: **rule** categories (Onboarding, Adoption, Engagement, Conversion, Announcement, Other). Not template categories. Not rule groups. Help: “Describes the purpose of this rule.” No “None”. |
| Rule group | Yes | Select: Trial & Onboarding, Adoption, Engagement, Announcements. Help: “Organises related rules into a customer journey.” Preselected when Create is launched from a group page. |
| Position in group | Yes | Integer ≥ 1. Display order only. Defaults to the end of the selected group on create. Does not control send order. |
| Status | Yes | Segmented control or select: Disabled / Active |

New rules default to **Disabled** so an incomplete thought is not activated by accident. Administrators set Active before save when the rule is valid.

### 2. Conditions (eligibility)

**Question in the UI:** “Who should this apply to?”

v1 UI: **one group**.

- Combinator control: **Match all conditions (AND)** / **Match any condition (OR)**. Default AND.
- List of condition rows.
- Add condition, remove condition (row).
- Cannot remove the last row if it is the only one — clear it instead, or allow zero rows (zero rows is a validation **error**).

Each **condition row**:

```
[ Metric (grouped by category) ]  [ Operator ]  [ Value … ]  [ Remove ]
```

- Metric selector lists catalog entries grouped by Lifecycle, Branding, Activity, Content.
- Operator selector lists only operators valid for that metric’s type (see metric catalog).
- Value control depends on type:
  - boolean: no extra value (operator *is yes* / *is no*) **or** a Yes/No select — pick **Yes/No select** so the operator can stay `is` for both, which is easier to read. See domain model: booleans use `is_true` / `is_false` **or** `is` + boolean value. **v1 UX:** operator hidden for booleans; value is Yes / No. Stored as `is_true` / `is_false`.
  - enum: single select of allowed values
  - number: numeric input; `between` shows two inputs (From, To)
  - duration (days): integer + visible “days” suffix
  - date with `is_empty`: no value

**Nested groups:** not shown. The data model still wraps rows in a single `RuleConditionGroup`. A future “Add condition group” can nest another group in that tree.

Helper text under the section: Conditions describe which customers are eligible. When to send is set under Timing. Do not add a lifecycle offset here if it is already expressed as timing.

### 3. Communication

**Question:** “What should we send?”

- Required template select, grouped by category, searching by name.
- After selection, a compact **read-only card**: name, category, purpose, lifecycle stage, Available badge.
- Link: “View all templates” → library (new tab not required; same-app navigation is fine). Warn if dirty? Not required; browser back/forward is enough. Prefer staying on the editor — the library is for browsing, the select is for choosing.

No subject, body, or preview iframe. No “send test”. No create/edit/activate controls — templates are system-provided and read-only.

### 4. Timing

**Question:** “When should we send?”

Mutually exclusive modes (radio group):

| Mode | Label | Extra fields |
| --- | --- | --- |
| `on_match` | When the conditions become true | None |
| `days_after_date` | A number of days after a lifecycle date | Days (integer ≥ 0) + date metric. 0 = the date itself |
| `days_before_date` | A number of days before a lifecycle date | Days (integer ≥ 0) + date metric. 0 = the date itself |

**v1 date options** (from catalog flags, not hard-coded labels in the template):

- After: Registration date; Trial expiry date (covers “X days after trial expiry”)
- Before: Trial expiry date (covers “X days before trial expiry”)

Further anchors are added later through the metric catalog, not a one-off control.

Default: **When the conditions become true**.

Do not stack a second “delay after match” on top of lifecycle timing.

Helper (informational, not a control): “Each customer should receive this communication once when they qualify. Sending and deduplication happen outside this application.”

### 5. Validation (real time)

Recompute on every change to details, conditions, template, or timing.

Show:

- Inline errors under the offending control (magenta border + message).
- A **Validation** list in the summary column: errors first, then warnings.

| Condition | Severity | Example message |
| --- | --- | --- |
| Name empty | Error | Enter a rule name |
| Zero complete conditions | Error | Add at least one condition |
| Metric missing | Error | Choose a metric |
| Operator missing | Error | Choose an operator |
| Required value missing | Error | Enter a value |
| Non-integer / negative days | Error | Enter a whole number of days (0 or more). Direction is before/after, not a minus sign |
| Number `between` inverted or incomplete | Error | Enter a valid range |
| Contradictory AND pair (e.g. in trial AND trial expired) | Error | These conditions cannot both be true |
| No template | Error | Select a communication template |
| Timing days missing or invalid | Error | Enter a valid number of days (0 or more) |
| Timing date metric missing | Error | Choose a date |
| Missing rule category | Error | Choose a category |
| Days > 365 | Warning | This is more than a year — check this is intentional. Does **not** block save. There is no maximum. |
| Unusual template vs conditions | Warning | Optional; skip in v1 rather than guess |

### When Save is available

**Save rule is enabled only when there are zero errors.** Warnings do not block save.

Status = Active is allowed only on a valid rule (same error set). If the user sets Active while errors exist, keep Save disabled; the validation list already explains why.

There is no separate Activate button (decision D6).

### Human-readable summary

Update live, same cadence as validation. Example:

> When **all** of: customer is in trial, days since registration is greater than 3, logo uploaded is no — send **Logo / branding setup** **3 days after registration**.

If timing is on-match:

> … send **Logo / branding setup** when these conditions become true.

### Edit loading / error / not found

- Loading: skeleton in the form column.
- Not found: “This rule does not exist” + back to list.
- Load error: Retry.

### Duplicate entry

Pre-filled editor, dirty = true, status Disabled, name suffix ` (copy)`. Saving creates a new id (mock: new id; later: POST).

---

# C. Communication template library

**Route:** `/engagement/templates`  
**Title:** Communication templates  
**Description:** System templates you can assign to engagement rules. Delivery is not sent from this application.  
**Primary action:** none. Do not show Create, Edit, or status toggles. Templates are system-provided and read-only.

### Purpose

Administrators scan **name, category, purpose, lifecycle stage, and availability** so they can pick the right template in the rule editor.

### Page structure

1. Page header (no create)
2. Toolbar: search by name/purpose; category filter (All + categories below)
3. Content: **grouped by category**, not a dense data table (scanning purpose matters more than sorting columns)

### Categories (library headings)

Use these headings even if a category currently has one template. Empty categories are omitted (do not show empty groups).

- Welcome
- Onboarding
- Setup
- Branding / logo adoption
- Folder adoption
- Document adoption
- Inactivity / re-engagement
- Trial reminders
- Trial expiry
- Product / feature announcements
- Customer milestones

Mapping from catalog ids to categories is in the domain/template table in `domain-model.md`.

### Template card (repeat per template)

```
┌──────────────────────────────────────────────────────────┐
│ Name (semibold)                          [Available]     │
│ Category · Lifecycle stage                               │
│ Purpose (one or two sentences)                           │
│ Used by N rules   ← optional if cheap from mock; else omit│
└──────────────────────────────────────────────────────────┘
```

Clicking a card opens a **read-only side panel** (or expand in place):

- Name, category, stage, availability
- Purpose
- “Use in a new rule” secondary button → `/engagement/rules/new` with template pre-selected (query `?template={id}`)

No editor, no HTML, no Postmark fields.

### Availability

v1: every shipped template is **Available**. Administrators cannot change that. The badge is informational.

Unavailable templates (future management) would remain visible but not selectable in the rule editor. That workflow is out of v1.

### States

- Loading: skeleton cards
- Error: Retry
- Empty search: “No templates match this search.”
- True empty catalog: should not happen with mock data; still handle: “No templates available.”

---

# Wireframe-level descriptions

These are build contracts, not visual mockups.

## 1. Rules list

- Shell sidebar: Rules active.
- Header: “Rules” + Create rule (Portal Blue).
- Toolbar row: search field, Status select, Category select.
- White rounded table (16px), navy header text, row hover Portal Blue at ~5%.
- Status pills on each row.
- Last column: overflow menu (Edit, Duplicate, Disable/Enable, Delete).
- If no rows and no filters: centred empty state with Create rule.
- If filters exclude everything: “No rules match this search” + Clear filters.

## 2. Create / Edit rule

- Shell sidebar: Rules still active (editor is a child of Rules).
- Header: “Create rule” or loaded name; Cancel + Save rule. Save looks disabled (grey) until valid.
- Left: four white cards stacked, numbered headings 1–4 as above.
- Condition rows aligned to a simple grid; Add condition is a ghost/secondary button, not a primary competing with Save.
- Boolean metrics: metric + Yes/No only.
- Numeric: metric + operator + number.
- Timing radios stacked; extra fields appear only for after/before.
- Right (wide): summary card + validation list. Errors in magenta text; warnings in muted gold text with a label, not colour alone.
- Narrow: summary first or immediately under the header so validation is not below the fold on a long form — **place summary + validation directly under the header actions on <1280px**, then the four sections.

## 3. Communication templates

- Shell sidebar: Templates active.
- Header: “Communication templates”, no primary button and no management actions.
- Search + category filter.
- Sections: category H2, then 1–column cards (2-column grid only if width ≥1280px).
- Card: name, badges, purpose.
- Panel: read-only details + Use in a new rule.

---

## Copy snippets (use unless product revises)

| Place | Copy |
| --- | --- |
| Conditions heading | Who should this apply to? |
| Timing heading | When should we send? |
| Communication heading | What should we send? |
| Combinator AND | Match all conditions |
| Combinator OR | Match any condition |
| Timing on_match | When the conditions become true |
| Timing after | A number of days after a lifecycle date |
| Timing before | A number of days before a lifecycle date |
| Delete disabled | Delete {name}? This cannot be undone. |
| Delete active | Delete {name}? This rule is active. Deleting it will stop future communications associated with it. This cannot be undone. |
| Save blocked (tooltip) | Fix the listed errors to save |
