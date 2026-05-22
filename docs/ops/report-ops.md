# Report Operations Runbook

## Scope

This runbook covers the report-generation and report-delivery behavior in `LotLogic-Be`.

## Report flow

### Generation

1. A monday.com webhook posts to `POST /api/monday/dashboard-trigger`.
2. The backend accepts the request and starts background processing.
3. The backend extracts the monday.com item id and loads the paid-report item from monday.com.
4. The backend renders `dashboard-report.pug`.
5. The backend converts the HTML to PDF with `puppeteer-core`.
6. The backend uploads the PDF to Azure Blob Storage.
7. The backend updates the monday.com item with the final PDF link and status fields.

### Delivery

1. A monday.com webhook posts to `POST /api/monday/dashboard-delivery`.
2. The backend downloads the PDF from the `Final PDF link`.
3. The backend sends the PDF by email using the BlockPlanner sender profile.
4. The backend updates the monday.com item with `Delivery status` and `Delivery date`.

## Request fields

### `POST /api/monday/dashboard-trigger`

The controller requires:

- a monday.com item id in the webhook payload, such as `itemId` or `event.pulseId`
- a valid webhook secret when `MONDAY_WEBHOOK_SECRET` is configured
- the monday.com item must have `send for QA?` set to `Yes`

### `POST /api/monday/dashboard-delivery`

The controller requires:

- a monday.com item id in the webhook payload, such as `itemId` or `event.pulseId`
- a valid webhook secret when `MONDAY_WEBHOOK_SECRET` is configured
- `Final PDF link`
- `Client email`
- `Delivery status` set to the value expected by the backend for sending

## Data fields used by report generation

The report-generation service reads a number of fields from the monday.com item, including:

- `Report ID`
- `Client name`
- `Client email`
- `Address`
- `Suburb`
- `Zone`
- `Intention`
- block-size, frontage, house-position, rear-yard, tree, heritage, easement, sewer, driveway, and feasibility fields referenced in `dashboard-report.service.ts`

## Technical dependencies

- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER`
- `AZURE_STORAGE_FOLDER`
- `MONDAY_API_TOKEN`
- `MONDAY_API_BASE_URL`
- `MONDAY_API_VERSION`
- `MONDAY_PAID_REPORTS_BOARD_ID`
- `MONDAY_PAID_REPORTS_GROUP_ID`
- `MONDAY_WEBHOOK_SECRET` when webhook secret validation is enabled
- `CHROME_EXECUTABLE_PATH` or `PUPPETEER_EXECUTABLE_PATH` when Chromium is not discoverable
- SMTP credentials for mail delivery

## Completion signals

### Generation

Successful generation is evidenced by:

- backend logs for HTML render, PDF render, upload, and row update
- an updated monday.com item containing `Final PDF link`

### Delivery

Successful delivery is evidenced by:

- backend logs for PDF download, email send, and row update
- an updated monday.com item containing `Delivery status` and `Delivery date`

## Constraints

- `dashboard-trigger` rejects requests without a monday.com item id, and rejects invalid secrets when `MONDAY_WEBHOOK_SECRET` is configured.
- `dashboard-delivery` rejects requests without a monday.com item id, and requires final PDF link plus recipient email before sending.
- PDF rendering fails if Chrome / Chromium cannot be found.
- PDF upload depends on Azure Blob configuration.
- Both flows run in-process after request acceptance; no durable queue is defined in the repos.

## Report operations details to confirm during handover

- Confirm who prepares and quality-checks the monday.com item before generation.
- Confirm how report reruns should be requested and recorded.
- Confirm whether any queue dashboard or job-history view is needed outside monday.com.
