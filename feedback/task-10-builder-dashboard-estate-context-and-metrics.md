# Task 10 - Builder Dashboard Estate Context And Metrics

## Priority
P3

## Status
Ready - MVP scope split decided and client clarification captured.

## Source Feedback
- Builders currently lack visibility of which estates they are approved for.
- No performance/lead metrics currently visible to builders.

## Current Code Anchors
- FE builder dashboard: `src/pages/dashboard/DashboardBuilderPage.tsx`
  - Focuses on builder profile, team, and floor plans.
  - No approved-estate status panel.
- BE approvals endpoint:
  - `src/modules/admin/admin-builder-estate-approval.controller.ts` exposes approvals by estate.
  - No builder-centric aggregate endpoint currently.

## Scope
- Add an approved-estates view for builders with status summary.
- Define phase-appropriate metrics (views, leads, conversions, etc.).
- Keep floor plans globally available for MVP and focus this task on builder-company approval visibility.

## Decisions Made To Unblock
1. Keep current matching model for MVP: builder plans are globally available and filtered by rules/approvals.
2. Clarification from Mitch: this task is about visibility of builder-company approvals per estate, not plan-level estate assignment.
3. Add approved-estates visibility now (estate name, approval status, floor plan count).
4. Defer lead/performance analytics to a separate roadmap task (not blocking current delivery).
5. Implement a builder-centric approvals summary endpoint if needed for efficient dashboard loading.

## Existing Context From "Questions back to Mitch"
- Henry noted current behavior treats builder floor plans as viable across assigned estates if rules pass.
- Mitch confirmed the concern is builder-company context ("which estates they have been approved on"), not per-estate plan whitelisting.

## Proposed Acceptance Criteria
- Builder dashboard shows approved estates and current status.
- Product-approved metric set is defined with data source ownership.
- No per-estate floor-plan mapping changes are required for MVP in this task.
