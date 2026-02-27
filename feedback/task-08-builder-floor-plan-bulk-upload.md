# Task 08 - Builder Floor Plan Bulk Upload

## Priority
P1

## Status
Implemented (FE, client-side orchestration) - CSV bulk import now creates/updates floor plans with row-level reporting.

## Implementation Notes (2026-02-27)
- Updated `src/components/admin/floorplans/FloorPlanCrud.tsx` with a CSV import workflow:
  - Template download.
  - CSV upload panel.
  - Upload-level defaults (storeys, roof pitch, architectural style, front-service visibility).
  - Row-by-row create/update using existing single-record endpoints.
  - Partial success reporting with per-row error details.
- No dedicated backend bulk endpoint is required for this MVP implementation; FE orchestrates bulk operations via existing CRUD APIs.

## Source Feedback
- Manual one-by-one floor plan entry does not scale for builders with 20-50 plans.
- Bulk upload workflow is required for onboarding velocity.

## Current Code Anchors
- FE:
  - `src/components/admin/floorplans/FloorPlanCrud.tsx` (single-plan form CRUD).
  - `src/pages/dashboard/DashboardBuilderPage.tsx` (builder-facing floor plan management).
- FE API:
  - `src/lib/api/adminApi.ts` (`createFloorPlan`, `updateFloorPlan` only; no bulk endpoint wrapper).
- BE:
  - `src/modules/admin/admin-floor-plan.controller.ts` supports single create/update/delete only.

## Scope
- Define and implement bulk upload workflow (template + import path + validation + result reporting).
- Keep individual form for edits and one-off additions.
- Support default-value shortcuts to reduce repetitive input.

## Decisions Made To Unblock
1. Use CSV as the MVP bulk-upload format.
2. Scope MVP upload to floor plans only (exclude facades from this task).
3. Use row-level partial success handling:
   - valid rows import
   - invalid rows return actionable errors
4. Support upload-level defaults for common fields (for example storeys, roof pitch, front-service-area flag, architectural style).
5. Keep single-plan CRUD unchanged for manual add/edit.

## Existing Context From "Questions back to Mitch"
- No confirmed answer yet on file format or import behavior.

## Proposed Acceptance Criteria
- Builders can upload a single file to create/update many floor plans.
- Import result clearly reports created/updated/failed rows.
- Defaults can be applied once for repeated attributes (for example `Storeys = 1`).
- Recompute/design matching behavior is triggered safely after bulk import.
