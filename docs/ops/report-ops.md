# Report Operations Runbook

## Scope

This runbook covers the report-generation and report-delivery behavior in `LotLogic-Be`.

## Report flow

### Generation

1. A payload is posted to `POST /api/google-sheets/dashboard-trigger`.
2. The backend accepts the request and starts background processing.
3. The backend builds report content from the payload.
4. The backend renders `dashboard-report.pug`.
5. The backend converts the HTML to PDF with `puppeteer-core`.
6. The backend uploads the PDF to Azure Blob Storage.
7. The backend calls the Google Sheets webhook with an update payload containing `finalPdfLink`.

### Delivery

1. A payload is posted to `POST /api/google-sheets/dashboard-delivery`.
2. The backend downloads the PDF from the `Final PDF link`.
3. The backend sends the PDF by email using the BlockPlanner sender profile.
4. The backend updates the Google Sheet row with `deliveryStatus` and `deliveryDate`.

## Request fields

### `dashboard-trigger`

The controller requires:

- `GOOGLE_SHEETS_WEB_APP_SECRET`
- `Row Number` or `rowNumber`

### `dashboard-delivery`

The controller requires:

- `GOOGLE_SHEETS_WEB_APP_SECRET`
- `Row Number` or `rowNumber`
- `Final PDF link`
- `Client email`, unless `GOOGLE_SHEETS_DELIVERY_EMAIL_OVERRIDE` is set

## Data fields used by report generation

The report-generation service reads a number of sheet-style fields from the payload, including:

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
- `GOOGLE_SHEETS_WEB_APP_URL`
- `GOOGLE_SHEETS_WEB_APP_SECRET`
- `CHROME_EXECUTABLE_PATH` or `PUPPETEER_EXECUTABLE_PATH` when Chromium is not discoverable
- SMTP credentials for mail delivery

## Completion signals

### Generation

Successful generation is evidenced by:

- backend logs for HTML render, PDF render, upload, and row update
- an updated Google Sheets row containing `Final PDF link`

### Delivery

Successful delivery is evidenced by:

- backend logs for PDF download, email send, and row update
- an updated Google Sheets row containing `Delivery status` and `Delivery date`

## Constraints

- `dashboard-trigger` rejects requests without a valid row number or shared secret.
- `dashboard-delivery` rejects requests without a valid row number, shared secret, final PDF link, or recipient email.
- PDF rendering fails if Chrome / Chromium cannot be found.
- PDF upload depends on Azure Blob configuration.
- Both flows run in-process after request acceptance; no durable queue is defined in the repos.

## Report operations details to confirm during handover

- Confirm who prepares and quality-checks the Google Sheet payload before generation.
- Confirm how report reruns should be requested and recorded.
- Confirm whether any queue dashboard or job-history view is needed outside the sheet itself.
