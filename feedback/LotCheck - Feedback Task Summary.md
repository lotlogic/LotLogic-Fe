# LotCheck Feedback Task Summary

Last updated: 2026-02-27  
Primary source: `feedback/LotCheck - Backend portals feedback.md`

## Task Register

| ID | Priority | Status | Task File | Focus |
| --- | --- | --- | --- | --- |
| 01 | P1 | Ready (backend + SMTP dependency) | [task-01-invitation-sender-branding.md](task-01-invitation-sender-branding.md) | Sender branding/domain for invitation emails |
| 02 | P1 | Implemented (FE) | [task-02-invitation-redirect-and-login-destination.md](task-02-invitation-redirect-and-login-destination.md) | Post-accept redirect path and login destination |
| 03 | P2 | Ready (client copy pending) | [task-03-invitation-email-copy-and-context.md](task-03-invitation-email-copy-and-context.md) | Invitation copy/content for estate and builder |
| 04 | P1 | Implemented (FE) | [task-04-estate-lot-bulk-import-and-manual-form-reduction.md](task-04-estate-lot-bulk-import-and-manual-form-reduction.md) | Bulk lot onboarding and reduced manual forms |
| 05 | P2 | Implemented (FE) | [task-05-estate-ui-language-and-field-visibility-cleanup.md](task-05-estate-ui-language-and-field-visibility-cleanup.md) | Estate-facing field labels, visibility, and guidance |
| 06 | P2 | Implemented (FE) | [task-06-navigation-labels-and-post-login-default-screen.md](task-06-navigation-labels-and-post-login-default-screen.md) | Nav wording and deterministic first screen |
| 07 | P2 | Implemented (FE) | [task-07-rule-set-hierarchy-and-editor-guidance.md](task-07-rule-set-hierarchy-and-editor-guidance.md) | Rule hierarchy clarity and editor guidance |
| 08 | P1 | Implemented (FE, client-side bulk orchestration) | [task-08-builder-floor-plan-bulk-upload.md](task-08-builder-floor-plan-bulk-upload.md) | Bulk builder floor plan import |
| 09 | P3 | Implemented (FE, canonical style list pending) | [task-09-builder-floor-plan-field-standardisation.md](task-09-builder-floor-plan-field-standardisation.md) | Controlled vocab + ambiguous field cleanup |
| 10 | P3 | Implemented (FE, metrics deferred) | [task-10-builder-dashboard-estate-context-and-metrics.md](task-10-builder-dashboard-estate-context-and-metrics.md) | Builder estate visibility and metrics scope |
| 11 | P2 | Resolved (De-scoped MVP) | [task-11-estate-and-builder-team-role-model.md](task-11-estate-and-builder-team-role-model.md) | Estate/builder intra-org role model |
| 12 | P3 | Implemented (FE) | [task-12-human-readable-timestamps.md](task-12-human-readable-timestamps.md) | Human-readable dates/times in tables |
| 13 | P2 | Implemented (FE) | [task-13-builder-approval-copy-and-notes-clarity.md](task-13-builder-approval-copy-and-notes-clarity.md) | Builder approval wording + notes guidance |
| 14 | P2 | Implemented (FE) | [task-14-admin-login-branding-experience.md](task-14-admin-login-branding-experience.md) | Branded login entry before Entra handoff |

## Client Inputs Pending (Non-blocking)
1. Final invitation subject/body copy from Mitch (Task 03).
2. Canonical architectural style list from Mitch (Task 09).
3. Preferred sender wording, if different from default LotCheck sender identity (Task 01).

## External/Internal Dependencies (Non-client)
1. SMTP readiness for LotCheck invitation sender config (`SMTP_FROM`, optional `SMTP_FROM_NAME`).
2. Optional post-MVP backend bulk import endpoint for floor plans (performance/transactionality hardening only).
3. Post-MVP backlog ownership for org-level role model and builder analytics metrics.

## Latest Implementation Notes (2026-02-27)
1. Estate lot management now runs DXF-first with simplified manual entry and advanced-field gating.
2. Estate branding now includes guided logo upload requirements; unused estate theme color controls were removed.
3. Rule editors now show precedence guidance, architectural review semantics, and explicit Format JSON success/error feedback.
4. Builder floor plans now support CSV bulk import in FE using existing create/update APIs with row-level partial success reporting.
5. Builder dashboard now includes approved-estate visibility with status/effective-date context; analytics remain deferred.
6. Timestamp formatting now consistently uses human-readable local date display with full datetime tooltips, including estate metadata `Created`/`Updated` values.

## Responses Already Captured In "Questions back to Mitch"
1. Current lot ingestion scope was described as DXF import from estate uploads.
2. S1-S4 were described as side lengths and DXF-derived.
3. Frontage GeoJSON was described as DXF-derived and hideable from estate manager UI.
4. Team role model is currently global `ADMIN` vs everyone else as `USER`.
5. Mitch confirmed the lot-field split (DXF auto fields vs 5 required manual fields vs advanced hidden defaults).
6. Mitch confirmed builder context need is company approval visibility per estate, not per-estate floor-plan whitelisting.
7. Mitch confirmed team sub-roles are a future enhancement, not an MVP blocker.
8. Mitch requested logo file-type enforcement where practical; otherwise guidance-first is acceptable.
9. Mitch confirmed he will provide invitation copy.
10. Mitch confirmed he will provide the architectural style list.

## How To Keep This Summary Updated
1. Update each task file status first.
2. Reflect the same status in the table above.
3. Move resolved items out of `Client Inputs Pending (Non-blocking)`.
4. Add implementation PR/commit references under each task once work starts.
