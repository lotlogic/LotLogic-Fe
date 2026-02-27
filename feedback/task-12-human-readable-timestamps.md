# Task 12 - Human-Readable Timestamps

## Priority
P3

## Status
Ready - display-format decision made.

## Source Feedback
- Table views currently show raw UTC timestamps (ISO strings), reducing readability for business users.

## Current Code Anchors
- FE state rules table: `src/components/admin/state-rules/StateRuleSetsCrud.tsx`
  - `item.effectiveFrom ?? "--"` currently rendered raw.
- FE builder approvals table: `src/components/admin/estates/EstateRuleLayersCrud.tsx`
  - `item.effectiveFrom ?? "--"` currently rendered raw.
- Additional tables likely have the same pattern and should be audited.

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
