# ZForce Backend

Production-oriented Node.js + Express + MongoDB backend scaffold for the ZForce project, aligned to `BACKEND_API_FULL.md`.

## Included

- TypeScript Express app with `/api/v1`
- MongoDB + Mongoose models for public, dealer, distributor, admin, DMS, CMS, and payments
- JWT auth for admin, distributor, and dealer
- Refresh token persistence
- Public storefront resolution with `X-Storefront-Slug`
- Razorpay CIBIL payment order + confirm + webhook idempotency
- **Surepass** Experian JSON report after payment (`SUREPASS_TOKEN`); optional PDF link via `POST /public/cibil/experian-pdf`
- Cloudinary signed upload flow
- Dealer CMS, inbox, and large DMS catalog
- Distributor catalog under `/tenants/:tenantId/distributor/...`
- Admin governance routes
- Seed script for local development

## Quick start

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

API base URL:
```text
http://localhost:4000/api/v1
```

## Demo users after seed

- Admin: `admin` / `Password@123`
- Distributor: `distributor` / `Password@123`
- Dealer: `dealer` / `Password@123`

## Important env vars

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `PAN_ENCRYPTION_SECRET`
- `SUREPASS_BASE_URL` (default `https://kyc-api.surepass.io`)
- `SUREPASS_TOKEN` — Bearer JWT from Surepass; if unset, CIBIL requests are stored with `surepassStatus: skipped`

## Razorpay test flow

1. Call `POST /api/v1/public/cibil/payment-order` with `X-Storefront-Slug: patna-auto`
2. Open Razorpay Checkout on frontend with returned `orderId` and `keyId`
3. After success, call `POST /api/v1/public/cibil/confirm-payment` (server verifies Razorpay, then calls **Surepass** `fetch-report` with name / mobile / PAN from the draft)
4. Webhook backup endpoint: `POST /api/v1/webhooks/razorpay`
5. Optional PDF: `POST /api/v1/public/cibil/experian-pdf` with `{ "cibilRequestId", "razorpay_payment_id" }` and `X-Storefront-Slug`

## Cloudinary folder layout

- Dealer assets: `zforce/{dealerId}/{purpose}`
- Distributor/admin assets: `zforce/{tenantId|admin}/{purpose}`

## Selected curl tests

### Dealer login
```bash
curl -X POST http://localhost:4000/api/v1/auth/dealer/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"dealer","password":"Password@123"}'
```

### Public bootstrap
```bash
curl http://localhost:4000/api/v1/public/bootstrap \
  -H "X-Storefront-Slug: patna-auto"
```

### Create CIBIL order
```bash
curl -X POST http://localhost:4000/api/v1/public/cibil/payment-order \
  -H "Content-Type: application/json" \
  -H "X-Storefront-Slug: patna-auto" \
  -d '{"name":"Aman","phone":"9999999999","email":"aman@example.com","pan":"ABCDE1234F","consent":true}'
```

### Dealer CMS products
```bash
curl http://localhost:4000/api/v1/dealer/cms/products \
  -H "Authorization: Bearer <dealer_access_token>"
```

### Distributor dashboard
```bash
curl http://localhost:4000/api/v1/tenants/tenant-demo/distributor/dashboard \
  -H "Authorization: Bearer <distributor_access_token>"
```

### Admin tenants
```bash
curl http://localhost:4000/api/v1/admin/tenants \
  -H "Authorization: Bearer <admin_access_token>"
```

## Notes

This codebase is intentionally broad and runnable. Some enterprise details such as PDF rendering, SMTP reset token persistence, advanced permission matrices, and export workers are implemented as placeholders or lightweight stubs so the full route surface is present without hiding incomplete heavy integrations.

## TODO table

| Area | Status |
|---|---|
| PDF streams for invoices and receipts | Placeholder JSON response |
| SMTP forgot-password token persistence | Placeholder mail sender |
| Export workers | Queued job model included, worker not added |
| Deep business validation on all DMS forms | Basic CRUD and scope enforcement included |
