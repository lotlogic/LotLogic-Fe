# LotLogic Handover Pack

This handover pack covers the operational workflows for the three related repos:

| Repo | Purpose | Current deploy model |
| --- | --- | --- |
| `LotLogic-Fe` | Main frontend and admin UI | GitHub Actions -> Azure Storage static website on pushes to `stage` |
| `LotLogic-Be` | Shared backend and integrations | GitHub Actions -> Azure Container Apps via ACR on pushes to `stage` |
| `LotLogic-Free-Assessment` | Public assessment and paid-report entry point | GitHub Actions -> Azure Storage static website on pushes to `main` |

## What this pack covers

- Deployments
- Payment confirmations
- Report operations
- Support triage
- Ongoing support ownership

## Document map

- [plan.md](plan.md)
- [overview.md](overview.md)
- [deployments.md](deployments.md)
- [payments.md](payments.md)
- [report-ops.md](report-ops.md)
- [support-triage.md](support-triage.md)
- [support-ownership.md](support-ownership.md)

## System summary

- The backend is the operational hub. It handles address lookups, Stripe checkout session creation, Stripe webhooks, Google Sheets forwarding, PDF generation, Azure Blob uploads, delivery emails, and public enquiry emails.
- The paid-report workflow depends on systems outside the repos: Stripe, Google Apps Script / Google Sheets, Azure Container Apps, Azure Blob Storage, SMTP, and Google Maps.
- The main frontend and backend release from `stage`, while the public assessment app releases from `main`.
- The `LotLogic-Fe` repo still contains legacy AWS deploy scripts in `package.json`, but the automated deploy path in use here is Azure Storage via GitHub Actions.

## Handover items to confirm

- No persistent job queue exists for report generation or report delivery. Both flows run in-process after the webhook endpoint returns.
- A ticketing workflow is not included here.
- The assessment checkout return page infers success from query params only. It is not a source of truth for whether the payment row reached Google Sheets.
- No first-party "order confirmed" email is sent by backend code after payment.
- Public enquiry/support routing should be confirmed during handover: the backend uses `GET_IN_TOUCH_RECIPIENT_EMAIL`, while some branded copy references `support@lotcheck.com.au`.

## Acceptance coverage

| Acceptance item | Where it is covered |
| --- | --- |
| Deployments documented | [deployments.md](deployments.md) |
| Payment confirmations documented | [payments.md](payments.md) |
| Report ops documented | [report-ops.md](report-ops.md) |
| Support triage documented | [support-triage.md](support-triage.md) |
| Ongoing support ownership clarified | [support-ownership.md](support-ownership.md) |
