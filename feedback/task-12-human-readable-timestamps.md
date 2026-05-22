# Task 12 - Human-Readable Timestamps

## Priority
P3

## Status
Implemented (FE) - readable date formatting is applied across admin/dashboard timestamp surfaces.

## Implementation Notes (2026-02-27)
- Updated `src/pages/dashboard/DashboardEstatePage.tsx`:
  - `Created` and `Updated` estate metadata now render as readable local dates.
  - Full local datetime is available via tooltip.
- Updated `src/pages/admin/AdminEstatePage.tsx`:
  - `Created` and `Updated` estate metadata now render as readable local dates.
  - Full local datetime is available via tooltip.
- Confirmed existing formatted timestamp surfaces remain in place:
  - `src/components/admin/state-rules/StateRuleSetsCrud.tsx`
  - `src/components/admin/estates/EstateRuleLayersCrud.tsx`
  - `src/pages/dashboard/DashboardBuilderPage.tsx`
  - `src/pages/admin/AdminBrandSettingsPage.tsx`
  - `src/pages/admin/AdminBrandSettingPage.tsx`

## Source Feedback
- Table views currently show raw UTC timestamps (ISO strings), reducing readability for business users.

## Current Code Anchors
- Shared FE formatting helpers: `src/lib/utils/dateTime.ts`
  - `formatDateForCell(...)` for readable local date rendering in cells.
  - `formatDateTimeForTooltip(...)` for full local datetime hover text.
- Estate metadata views:
  - `src/pages/dashboard/DashboardEstatePage.tsx`
  - `src/pages/admin/AdminEstatePage.tsx`
- Rule/approval and brand views:
  - `src/components/admin/state-rules/StateRuleSetsCrud.tsx`
  - `src/components/admin/estates/EstateRuleLayersCrud.tsx`
  - `src/pages/dashboard/DashboardBuilderPage.tsx`
  - `src/pages/admin/AdminBrandSettingsPage.tsx`
  - `src/pages/admin/AdminBrandSettingPage.tsx`

## Scope
- Replace raw ISO timestamps with readable date/time formats in admin/dashboard tables.
- Apply consistently across state rules, builder approvals, and other relevant lists.

## Decisions Made To Unblock
1. Render table timestamps in viewer local timezone.
2. Use date-first display for table cells (for example `11 Feb 2026`).
3. Show full datetime in tooltip/secondary text where needed.

## Existing Context From "Questions back to Mitch"
- No blocking answer required to start; formatting standards still need final confirmation.

## Proposed Acceptance Criteria
- All user-facing timestamp columns use consistent readable formatting.
- Timezone handling is explicit and documented.
- No raw ISO datetime strings remain in business-facing table cells.
