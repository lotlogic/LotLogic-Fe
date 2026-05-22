# Support Triage Runbook

## Support-related touchpoints

Support-related touchpoints currently include:

- public feasibility enquiries via `POST /api/enquiry/get-in-touch`
- public off-zone enquiry flow in `LotLogic-Free-Assessment`, which also posts to `POST /api/enquiry/get-in-touch`
- checkout status messaging in `LotLogic-Free-Assessment`
- GitHub Actions workflows for deployments
- backend payment, report-generation, and report-delivery endpoints
- branded/admin email copy that references `support@lotcheck.com.au`

## Routing

- `POST /api/enquiry/get-in-touch` sends email to `GET_IN_TOUCH_RECIPIENT_EMAIL`
- if `GET_IN_TOUCH_RECIPIENT_EMAIL` is unset, the backend falls back to `mitch@blockplanner.com.au`
- admin invitation email flow references `support@lotcheck.com.au`

## Key identifiers

These identifiers are useful when tracing payment or report issues:

- `reportId`
- `clientEmail`
- `clientPhone`
- `address`
- `suburb`
- `zone`
- `stripePaymentId`
- monday.com item id
- `Final PDF link`

## First checks

### Deployment issues

- check the relevant GitHub Actions workflow run
- for backend issues, check `GET /api/health`

### Payment issues

- check backend Stripe webhook logs
- check whether monday.com API credentials and board configuration are present
- check whether the payment metadata fields are present in the payload path

### Report generation issues

- check backend logs for `/api/monday/dashboard-trigger`
- check whether Azure Blob and Chrome / Chromium configuration is present
- check whether the monday.com item was updated with `Final PDF link`

### Report delivery issues

- check backend logs for `/api/monday/dashboard-delivery`
- check whether `Final PDF link` and recipient email are present
- check whether the monday.com item was updated with delivery fields

## Support details to confirm during handover

- Agree the priority model, support hours, and any on-call process.
- Confirm named support owners and escalation contacts.
- Confirm the ticketing system, shared mailbox, or workflow that will be used for support intake.
