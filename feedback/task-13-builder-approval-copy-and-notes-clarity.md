# Task 13 - Builder Approval Copy And Notes Clarity

## Priority
P2

## Status
Implemented (FE) - builder approval wording and notes guidance are updated.

## Source Feedback
- `Create builder approval` button text is technical/awkward.
- Notes field purpose is unclear.
- Client requested clearer plain-English wording.

## Current Code Anchors
- FE estate approval UI: `src/components/admin/estates/EstateRuleLayersCrud.tsx`
  - Button label: `Create builder approval`
  - Notes field has no explanatory placeholder/help text.

## Scope
- Rename actions and labels to business-readable language.
- Add notes field helper text and visibility context.
- Align empty states and success messages with the same terminology.

## Decisions Made To Unblock
1. Use `Approve builder` as the primary action label.
2. Treat notes as internal-only (not visible to builders).
3. Add notes placeholder/help text:
   - `Internal notes about this builder relationship (not visible to builders).`

## Existing Context From "Questions back to Mitch"
- No explicit confirmation yet on notes visibility, but client expectation is internal-only notes.

## Proposed Acceptance Criteria
- Builder approval actions use approved plain-English labels.
- Notes field includes clear helper/placeholder text explaining visibility and purpose.
- Updated wording is consistent across button labels, headings, and toast/success messages.
