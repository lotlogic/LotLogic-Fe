# Support Ownership

## Support routing

Support-related routing in the system currently includes:

- public feasibility enquiries are sent by the backend to `GET_IN_TOUCH_RECIPIENT_EMAIL`
- if that env var is missing, the backend falls back to `mitch@blockplanner.com.au`
- admin invitation email content references `support@lotcheck.com.au`
- deployment control depends on access to GitHub Actions and the Azure resources referenced by the workflows
- report-generation and report-delivery flows depend on Google Sheets / Apps Script, but no in-app ownership model is defined in the repos

## Ownership details to confirm during handover

- support hours
- SLA or response targets
- retainer or commercial support model
- a single canonical support mailbox for all flows
- named owners for Google Sheets / Apps Script maintenance
- named owners for first-line support, report operations, or technical escalation

