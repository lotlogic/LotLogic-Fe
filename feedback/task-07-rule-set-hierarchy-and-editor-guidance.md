# Task 07 - Rule Set Hierarchy And Editor Guidance

## Priority
P2

## Status
Ready - rule semantics confirmed in backend.

## Source Feedback
- Clarify how Estate Rule Sets relate to State Rule Sets (override vs supplement).
- Raw JSON-heavy areas need stronger guidance for maintainers.
- `Requires Architectural Review` behavior needs confirmation.
- Client reported `Format JSON` appears non-functional.

## Current Code Anchors
- FE state rule sets: `src/components/admin/state-rules/StateRuleSetsCrud.tsx`
- FE estate rule sets and approvals: `src/components/admin/estates/EstateRuleLayersCrud.tsx`
- FE rule editor: `src/components/admin/rules/RuleLayerEditor.tsx`
- FE rule field/help metadata: `src/components/admin/rules/ruleSetFormConfig.ts`
- BE matching behavior: `src/modules/design-on-lot/design-on-lot.service.ts`

## Scope
- Document and surface rule precedence clearly in UI and internal docs.
- Confirm and document meaning of review-related flags.
- Verify/fix perceived `Format JSON` behavior.

## Decisions Made To Unblock
1. Precedence model is `state baseline + estate overlay`, with stricter rules winning on merge.
2. `requiresArchitecturalReview` is treated as workflow logic that drives `MANUAL_REVIEW` outcomes.
3. Rule schema guidance will live in two places:
   - In-app helper text/examples in editor
   - Repo documentation for maintainers
4. `Format JSON` will keep existing behavior but gain explicit user feedback (success/error message) so it does not appear broken.

## Existing Context From "Questions back to Mitch"
- No direct answer captured for rule precedence or review-flag semantics.

## Proposed Acceptance Criteria
- UI contains concise explanation of rule hierarchy.
- Rule schema guidance is available where admins edit rules.
- `Format JSON` action has clear user-visible behavior and test coverage.
- `requiresArchitecturalReview` semantics are documented and reflected consistently.
