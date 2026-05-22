# Task 09 - Builder Floor Plan Field Standardisation

## Priority
P3

## Status
Implemented (FE) - labels and controlled style input shipped with temporary default style list.

## Source Feedback
- `Design Depth` label is ambiguous.
- `Front-facing service areas` currently reads like a boolean/technical field and caused confusion.
- `Architectural Style` as free text will create inconsistent data and poor rule matching.

## Current Code Anchors
- FE floor plan form: `src/components/admin/floorplans/FloorPlanCrud.tsx`
  - `Design Depth` label is present.
  - `Architectural Style` is free text.
  - `Front-facing service areas` is a select with values `true/false/(not set)`.
- BE model field:
  - `prisma/schema.prisma` includes `architecturalStyle String?`.

## Scope
- Replace ambiguous labels with explicit business terms.
- Move architectural style from free text to controlled option set.
- Clarify whether front-facing service areas should remain boolean or become structured categories.

## Decisions Made To Unblock
1. Rename `Design Depth` to `Building Depth (m)`.
2. Keep `Front-facing service areas` as boolean for MVP, relabeled to `Front service areas visible from street`.
3. Change `Architectural Style` to controlled single-select for MVP.
4. Use this default style list for now:
   - Contemporary
   - Modern
   - Hamptons
   - Traditional Australian
   - Coastal
   - Farmhouse
   - Minimalist
   - Classic
   - Industrial
   - Other
5. Replace the default list with Mitch's canonical list once supplied.

## Existing Context From "Questions back to Mitch"
- Henry already asked Mitch to provide the architectural style list (`09:26` note).
- Mitch responded `Will do` (`10:01` note).

## Pending Client Input (Non-blocking)
1. Final approved architectural style option list from Mitch.

## Proposed Acceptance Criteria
- Floor plan form uses approved labels/tooltips for ambiguous fields.
- Architectural style input enforces standardized values.
- Data written to API is normalized for consistent matching/reporting.
