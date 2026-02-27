# Task 05 - Estate UI Language And Field Visibility Cleanup

## Priority
P2

## Status
Implemented (FE) - estate-facing branding and lot-form language/visibility cleaned up.

## Implementation Notes (2026-02-27)
- Updated `src/pages/dashboard/DashboardEstatePage.tsx`:
  - Theme color now uses a color picker + hex input + preview swatch.
  - Theme color is validated as hex before save.
  - Logo field guidance now specifies supported file types and recommended usage.
- Updated `src/components/admin/estates/EstateLotsCrud.tsx`:
  - Technical lot fields are hidden by default and gated behind advanced mode.
  - Estate-facing labels and button copy were simplified for non-technical users.

## Source Feedback
- Theme color input is unclear for estate users (raw hex, no picker/preview).
- Logo upload needs guidance on file type/dimensions.
- Estate-facing forms expose technical/internal fields that should be hidden or simplified.
- S1-S4 naming is unclear for non-technical users.

## Current Code Anchors
- FE estate profile: `src/pages/dashboard/DashboardEstatePage.tsx`
  - `Theme color` free text input.
  - `Logo URL` upload field without explicit guidance text.
- FE lot form: `src/components/admin/estates/EstateLotsCrud.tsx`
  - S1-S4 fields, raw GeoJSON fields, frontage coordinate GeoJSON input.

## Scope
- Improve label clarity for estate-facing fields.
- Hide or gate technical fields not intended for estate users.
- Add onboarding-level helper text for brand fields and uploads.

## Decisions Made To Unblock
1. Keep theme color editable by estate users, but change to color-picker + hex input + live preview.
2. Prioritize file-type enforcement for logo uploads if low effort; otherwise ship guidance + soft validation first.
3. Hide technical geometry fields for standard estate users (raw GeoJSON, frontage GeoJSON, S1-S4 raw inputs).
4. Use the Task 04 fallback field set as the approved estate-facing manual lot scope.

## Existing Context From "Questions back to Mitch"
- Henry asked whether logo requirements should be enforced or only guidance.
- Henry noted S1-S4 and frontage geometry are DXF-derived and can be hidden from estate managers.
- Mitch confirmed preference for cleaner, non-technical UI and agreed hiding geometry details.
- Mitch prefers file-type enforcement for logos where practical; if costly, prioritize other UX improvements and provide guidance.

## Proposed Acceptance Criteria
- Estate-facing forms expose only approved business-facing fields.
- Theme color and logo fields include clear guidance (and validation as implemented).
- S1-S4 and raw GeoJSON fields are either renamed with plain language or removed from standard estate UX.
- Logo upload enforces allowed file types when implemented without high effort.
