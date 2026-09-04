# Metric Catalog Architecture

**Status:** Implemented in the frontend catalog (`METRIC_CATALOG`). This file is the architecture source of truth for metric keys, categories, and operators.

The catalog is the single description of what administrators can test in a rule. The condition builder is driven by this data. Adding a metric later should be a catalog (and mock) change, not a new form.

Customer Usage will later **display** the same keys. It must not own a second incompatible list.

Live customer values are not part of this catalog. This file defines **definitions**, not readings.

Selector categories, in order: **Lifecycle**, **Branding**, **Admin activity**, **Portal usage**, **Communications**. There is no generic Content or Integrations category. Branding stays separate even though an administrator uploads the logo.

---

## Design rules

1. Every condition `metricKey` must exist in the catalog.
2. The editor offers only that metric’s `operators`.
3. `valueRequired` plus operator determines whether a value control is shown.
4. Timing after/before uses metrics with `supportsTimingAnchor`.
5. Prefer a **derived `duration_days` metric** for “days since / until” rather than complex date operators in v1.

---

## Operator sets (by type)

| Type | Operators | Value required |
| --- | --- | --- |
| `boolean` | `is_true`, `is_false` | No |
| `enum` | `is`, `is_not` | Yes |
| `number` | `eq`, `gt`, `gte`, `lt`, `lte`, `between` | Yes |
| `duration_days` | same as number | Yes (integer days) |
| `date` | `is_empty` only in v1 | No |

Calendar comparisons (“registered before 1 Jan”) are deferred. v1 date metrics exist so “never occurred” is expressible via `is_empty`. Recency uses a derived `duration_days` metric, not date comparison.

---

## Enumerations (temporary frontend / mock contracts)

**These values are approved for frontend development only.** The backend team may later supply the authoritative lists. Define them **once** (metric catalog / domain source). Condition pickers, summaries, and validators must read from that source — do not scatter string literals through presentation components.

**Trial status** (`trialStatus`)

| Value | Label |
| --- | --- |
| `in_trial` | In trial |
| `trial_expired` | Trial expired |
| `not_in_trial` | Not in trial |

**Account / subscription status** (`accountStatus`)

| Value | Label |
| --- | --- |
| `trial` | Trial |
| `active` | Active |
| `past_due` | Past due |
| `cancelled` | Cancelled |
| `inactive` | Inactive |

---

## Initial catalog

### Lifecycle

| Key | Display name | Type | Operators | Value required | Timing anchor |
| --- | --- | --- | --- | --- | --- |
| `registeredAt` | Registration date | `date` | `is_empty` | No | After (not before) |
| `daysSinceRegistration` | Days since registration | `duration_days` | number set | Yes | No — use timing “days after registration” for send time |
| `trialStatus` | Trial status | `enum` | `is`, `is_not` | Yes | No |
| `trialExpiresAt` | Trial expiry date | `date` | `is_empty` | No | After and before |
| `daysUntilTrialExpiry` | Days until trial expiry | `duration_days` | number set | Yes | No — eligibility only. Send-time uses timing before/after `trialExpiresAt` |
| `accountStatus` | Account / subscription status | `enum` | `is`, `is_not` | Yes | No |

Notes:

- `registeredAt` + `is_empty` is unlikely in production (every customer has a registration). Include for catalog completeness; the editor may still show it. Optional product choice: hide metrics flagged `hiddenInBuilder` later — **not in v1**.
- **Days until trial expiry** is eligibility (“fewer than 7 days left”). **Timing** “7 days before trial expiry” or “3 days after trial expiry” is when to send. Do not require both.

### Branding

| Key | Display name | Type | Operators | Value required | Timing anchor |
| --- | --- | --- | --- | --- | --- |
| `logoUploaded` | Company logo | `boolean` | `is_true`, `is_false` | No | No |

Company logo stays under Branding. It describes business state, not admin usage, even though an administrator performs the upload.

### Admin activity

Activity performed by the subscriber/admin inside Portal Genie. Not client-portal behaviour.

**Portal sign-in key interpretation:** `lastPortalSignInAt`, `daysSinceLastPortalSignIn`, and `portalSignInCount` mean **subscriber/admin sign-in to Portal Genie**, not a client visiting the client portal. Display names use “Admin sign-in”. Keys are preserved so existing fixture rules continue to load. Client portal behaviour uses the separate Portal usage metrics.

| Key | Display name | Type | Operators | Value required | Timing anchor |
| --- | --- | --- | --- | --- | --- |
| `lastPortalSignInAt` | Admin sign-in | `date` | `is_empty` | No | No |
| `daysSinceLastPortalSignIn` | Days since last admin sign-in | `duration_days` | number set | Yes | No |
| `portalSignInCount` | Admin sign-in count | `number` | number set | Yes | No |
| `hasCreatedFolder` | Folder | `boolean` | `is_true`, `is_false` | No | No |
| `folderCount` | Folder count | `number` | number set | Yes | No |
| `hasUploadedDocument` | Document | `boolean` | `is_true`, `is_false` | No | No |
| `documentCount` | Document count | `number` | number set | Yes | No |
| `lastDocumentUploadedAt` | Last document uploaded | `date` | `is_empty` | No | No |
| `daysSinceLastDocumentUpload` | Days since last document upload | `duration_days` | number set | Yes | No |
| `accountingSoftwareConnected` | Accounting software | `boolean` | `is_true`, `is_false` | No | No |

Admin inactivity: prefer `daysSinceLastPortalSignIn` `gte` X. Never signed in as admin: `lastPortalSignInAt` `is_empty`. Authored wording for accounting is “is connected” / “is not connected”; stored operators remain `is_true` / `is_false`.

`hasCreatedFolder` is equivalent to `folderCount` `gt` 0. Validation may **warn** if both are used in the same AND group in a redundant way; it should **error** if they contradict (has created folder = yes AND folder count = 0).

`lastDocumentUploadedAt` is an activity date, not a lifecycle timing anchor. Recency uses `daysSinceLastDocumentUpload`.

### Portal usage

Activity performed by the subscriber’s **clients** in the client-facing portal. Do not reuse admin activity keys.

| Key | Display name | Type | Operators | Value required | Timing anchor |
| --- | --- | --- | --- | --- | --- |
| `hasPortalVisit` | Portal visit | `boolean` | `is_true`, `is_false` | No | No |
| `daysSinceLastPortalVisit` | Days since last portal visit | `duration_days` | number set | Yes | No |
| `portalVisitCount` | Portal visit count | `number` | number set | Yes | No |
| `hasPortalDocumentUpload` | Portal document upload | `boolean` | `is_true`, `is_false` | No | No |
| `portalDocumentUploadCount` | Portal document upload count | `number` | number set | Yes | No |
| `lastPortalDocumentUploadedAt` | Last portal document uploaded | `date` | `is_empty` | No | No |
| `daysSinceLastPortalDocumentUpload` | Days since last portal document upload | `duration_days` | number set | Yes | No |

Authored wording for visit/upload booleans is “has occurred” / “has not occurred”. `lastPortalDocumentUploadedAt` is not a timing anchor; recency uses `daysSinceLastPortalDocumentUpload`.

### Communications

| Key | Display name | Type | Operators | Value required | Timing anchor |
| --- | --- | --- | --- | --- | --- |
| `hasCreatedScheduledEmailTemplate` | Scheduled email template | `boolean` | `is_true`, `is_false` | No | No |

Frontend contract only: whether a scheduled email template has been created. Do not inspect or send email from this app. Authored wording is “has been created” / “has not been created”.

---

## Timing anchors (v1)

| Metric | After | Before |
| --- | --- | --- |
| `registeredAt` | Yes | No |
| `trialExpiresAt` | Yes (X days after trial expiry) | Yes (X days before trial expiry) |

`lastPortalSignInAt`, `lastDocumentUploadedAt`, and `lastPortalDocumentUploadedAt` are **not** v1 timing anchors. Admin inactivity is eligibility (`daysSinceLastPortalSignIn`). Client portal recency is eligibility (`daysSinceLastPortalVisit` / `daysSinceLastPortalDocumentUpload`). Further anchors are catalog additions.

---

## Adding a metric later

1. Add a `CustomerMetric` row (key, names, type, operators, flags).
2. If enum, add values.
3. Extend mock customer data only when Usage exists.
4. Do not change `RuleCondition` shape.

No backend schema is defined here.

---

## What the catalog is not

- Not a query language
- Not customer records
- Not analytics measures with time grains (Usage may add those later as a different concept)
