/**
 * Panel module smoke test — hits API routes for Admin (HO), Dealer, and Distributor.
 * Run: npm run test:panels   (backend must be on PORT, default 6544)
 * Seed first if logins fail: npm run seed
 */
import "dotenv/config";

const BASE = (process.env.API_BASE_URL || "http://localhost:6544/api/v1").replace(/\/$/, "");
const TENANT = process.env.SMOKE_TENANT_ID || "tenant-demo";
const PASSWORD = process.env.SMOKE_PASSWORD || "Password@123";

type Result = {
  panel: "public" | "admin" | "dealer" | "distributor";
  module: string;
  method: string;
  path: string;
  status: number;
  ok: boolean;
  note?: string;
};

const results: Result[] = [];

async function request(
  method: string,
  path: string,
  opts?: { token?: string; body?: unknown; headers?: Record<string, string> },
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts?.headers || {}),
  };
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts?.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  let body: unknown = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 200);
  }
  return { status: res.status, body };
}

async function login(role: "admin" | "dealer" | "distributor"): Promise<string> {
  const path =
    role === "admin" ? "/auth/admin/login" : role === "dealer" ? "/auth/dealer/login" : "/auth/distributor/login";
  const userId = role === "admin" ? "admin" : role;
  const { status, body } = await request("POST", path, {
    body: { userId, password: PASSWORD },
  });
  if (status !== 200) {
    const err = body as { error?: { message?: string } };
    throw new Error(`${role} login failed (${status}): ${err?.error?.message || JSON.stringify(body)}`);
  }
  const data = (body as { data?: { accessToken?: string } }).data;
  if (!data?.accessToken) throw new Error(`${role} login: no accessToken`);
  return data.accessToken;
}

async function check(
  panel: Result["panel"],
  module: string,
  method: string,
  path: string,
  token?: string,
  expectOk: (status: number) => boolean = (s) => s >= 200 && s < 300,
): Promise<void> {
  const { status } = await request(method, path, { token });
  const ok = expectOk(status);
  results.push({ panel, module, method, path, status, ok });
}

async function runPublic(): Promise<void> {
  const slug = "patna-auto";
  const routes: [string, string][] = [
    ["Bootstrap", `/public/bootstrap?storefrontSlug=${slug}`],
    ["Home — Hero", `/public/home/hero?storefrontSlug=${slug}`],
    ["Home — Features", `/public/home/features?storefrontSlug=${slug}`],
    ["Home — Offers", `/public/home/offers?storefrontSlug=${slug}`],
    ["Site settings", `/public/site-settings?storefrontSlug=${slug}`],
    ["Navigation", `/public/navigation?storefrontSlug=${slug}`],
    ["Footer", `/public/footer?storefrontSlug=${slug}`],
    ["Products list", `/public/pages/products?storefrontSlug=${slug}`],
    ["Gallery", `/public/pages/gallery?storefrontSlug=${slug}`],
    ["CIBIL config", `/public/cibil/config?storefrontSlug=${slug}`],
  ];
  for (const [module, path] of routes) {
    await check("public", module, "GET", path);
  }
}

async function runAdmin(token: string): Promise<void> {
  const routes: [string, string][] = [
    ["Tenants", "/admin/tenants"],
    ["Panel users", "/admin/panel-users"],
    ["Panel accounts", "/admin/panel-accounts/snapshot"],
    ["Permissions", "/admin/panel-accounts/permissions"],
    ["Dealers (HO)", "/admin/dealers"],
    ["HO — Deviation requests", "/admin/ho/deviation-requests"],
    ["HO — Invoice cancellations", "/admin/ho/invoice-cancellations"],
    ["Audit logs", "/admin/audit-logs"],
    ["Masters", "/admin/masters?type=branches"],
    ["Staff directory", "/admin/staff-directory"],
    ["CMS default products", "/admin/cms/default-products"],
  ];
  for (const [module, path] of routes) {
    await check("admin", module, "GET", path, token);
  }
}

async function runDealer(token: string): Promise<void> {
  const routes: [string, string][] = [
    // CMS / website
    ["CMS — Storefront", "/dealer/cms/storefront"],
    ["CMS — Navigation", "/dealer/cms/navigation"],
    ["CMS — Homepage", "/dealer/cms/homepage"],
    ["CMS — Hero", "/dealer/cms/home/hero"],
    ["CMS — Features", "/dealer/cms/home/features"],
    ["CMS — Footer", "/dealer/cms/footer"],
    ["CMS — Site settings", "/dealer/cms/site-settings"],
    ["CMS — CIBIL payment", "/dealer/cms/cibil-payment"],
    ["CMS — Products", "/dealer/cms/products"],
    ["CMS — Gallery", "/dealer/cms/gallery"],
    ["CMS — Jobs", "/dealer/cms/jobs"],
    // Inbox
    ["Inbox — Website leads", "/dealer/inbox/website-leads"],
    ["Inbox — CIBIL requests", "/dealer/inbox/cibil-requests"],
    ["Inbox — Finance apps", "/dealer/inbox/finance-applications"],
    ["Inbox — Contact messages", "/dealer/inbox/contact-messages"],
    ["Inbox — Dealer applications", "/dealer/inbox/dealer-applications"],
    ["Inbox — Job applications", "/dealer/inbox/job-applications"],
    // DMS — CRM
    ["CRM — Customers", "/dealer/dms/crm/customers"],
    ["CRM — Leads", "/dealer/dms/crm/leads"],
    ["CRM — Visits", "/dealer/dms/crm/visits"],
    ["CRM — Activities", "/dealer/dms/crm/activities"],
    ["CRM — Quotations", "/dealer/dms/crm/quotations"],
    // DMS — Orders & payments
    ["Orders", "/dealer/dms/orders"],
    ["Payments", "/dealer/dms/payment-receipts"],
    ["Invoices", "/dealer/dms/invoices"],
    ["Invoice cancellations", "/dealer/dms/invoice-cancellations"],
    ["Outstanding summary", "/dealer/dms/outstanding/summary"],
    ["Collection plans", "/dealer/dms/collection-tracker/plans"],
    ["HO deviations", "/dealer/dms/ho-deviation-requests"],
    // DMS — Delivery
    ["Billed not delivered", "/dealer/dms/delivery/billed-not-delivered"],
    ["Delivery checklists", "/dealer/dms/delivery/checklists"],
    ["Gate passes", "/dealer/dms/delivery/gate-passes"],
    ["Delivery confirmations", "/dealer/dms/delivery/confirmations"],
    // DMS — Inventory
    ["Inventory — Vehicles", "/dealer/dms/inventory/vehicles"],
    ["Inventory — Spare parts", "/dealer/dms/inventory/spare-parts"],
    ["Inventory — Batteries", "/dealer/dms/inventory/batteries"],
    ["Stock receipts", "/dealer/dms/stock-receipts"],
    ["Purchase orders", "/dealer/dms/purchase-orders"],
    // DMS — Service & accounts
    ["Service jobs", "/dealer/dms/service/jobs"],
    ["Cash / bank", "/dealer/dms/accounts/cash-bank"],
    ["Customer ledger", "/dealer/dms/accounts/customer-ledger"],
    ["Accounts ledger", "/dealer/dms/accounts/ledger"],
    ["Deposits", "/dealer/dms/accounts/deposits"],
    ["Expenses", "/dealer/dms/accounts/expenses"],
    // DMS — Tools
    ["Dashboard summary", "/dealer/dms/dashboard/summary"],
    ["Global search", "/dealer/dms/search?q=test"],
    ["Notifications", "/dealer/dms/notifications"],
    ["Reports — Sales", "/dealer/dms/reports/sales"],
    ["Reports — Inventory aging", "/dealer/dms/reports/inventory-aging"],
    ["Reports — Collections", "/dealer/dms/reports/collections"],
  ];
  for (const [module, path] of routes) {
    await check("dealer", module, "GET", path, token);
  }
}

async function runDistributor(token: string): Promise<void> {
  const base = `/tenants/${TENANT}/distributor`;
  const routes: [string, string][] = [
    ["Dashboard", `${base}/dashboard`],
    ["Masters — Products", `${base}/masters/products`],
    ["Masters — Categories", `${base}/masters/categories`],
    ["Masters — Areas", `${base}/masters/areas`],
    ["CRM — Leads", `${base}/crm/leads`],
    ["CRM — Activities", `${base}/crm/activities`],
    ["CRM — Visits", `${base}/crm/visits`],
    ["Dealers", `${base}/dealers`],
    ["Dealer applications", `${base}/dealer-applications`],
    ["Dealer performance", `${base}/dealers/performance`],
    ["B2B orders", `${base}/b2b-orders`],
    ["B2B pending orders", `${base}/b2b-orders/pending`],
    ["Dispatches", `${base}/dispatches`],
    ["Inventory — Stock", `${base}/inventory/stock`],
    ["Inventory — GRN", `${base}/inventory/grn`],
    ["Inventory — Transfers", `${base}/inventory/transfers`],
    ["Accounts — Invoices", `${base}/accounts/invoices`],
    ["Accounts — Payments", `${base}/accounts/payments`],
    ["Accounts — Dealer ledger", `${base}/accounts/dealer-ledger?dealerId=dealer-demo`],
    ["Accounts — Expenses", `${base}/accounts/expenses`],
    ["CMS — Catalog products", `${base}/cms/catalog-products`],
    ["CMS — Website leads", `${base}/cms/website-leads`],
    ["CMS — Contact messages", `${base}/cms/contact-messages`],
    ["Reports — Summary", `${base}/reports/summary`],
    ["Reports — Dealers", `${base}/reports/dealers`],
    ["Reports — Inventory", `${base}/reports/inventory`],
  ];
  for (const [module, path] of routes) {
    await check("distributor", module, "GET", path, token);
  }

  // Route shadowing regression: "pending" must not be parsed as orderNo
  const pending = results.find((r) => r.path.includes("b2b-orders/pending"));
  if (pending && pending.status === 404) {
    pending.ok = false;
    pending.note = "Likely route shadowing — pending matched as :orderNo";
  }
}

function printReport(): void {
  const byPanel = (p: Result["panel"]) => results.filter((r) => r.panel === p);
  const panels: Result["panel"][] = ["public", "admin", "dealer", "distributor"];

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  Z-FORCE PANEL MODULE SMOKE TEST");
  console.log(`  API: ${BASE}`);
  console.log("══════════════════════════════════════════════════════════\n");

  let totalFail = 0;
  for (const panel of panels) {
    const rows = byPanel(panel);
    const pass = rows.filter((r) => r.ok).length;
    const fail = rows.filter((r) => !r.ok).length;
    totalFail += fail;
    console.log(`── ${panel.toUpperCase()} (${pass}/${rows.length} passed) ──`);
    for (const r of rows) {
      const icon = r.ok ? "✓" : "✗";
      const note = r.note ? ` — ${r.note}` : "";
      console.log(`  ${icon} [${r.status}] ${r.module}${note}`);
      if (!r.ok) console.log(`      ${r.method} ${r.path}`);
    }
    console.log("");
  }

  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  console.log(`TOTAL: ${passed}/${total} passed, ${total - passed} failed\n`);

  if (totalFail > 0) process.exitCode = 1;
}

async function main(): Promise<void> {
  console.log("Checking API reachability…");
  try {
    await request("GET", `/public/bootstrap?storefrontSlug=patna-auto`);
  } catch (e) {
    console.error(`Cannot reach ${BASE}. Start backend: npm run dev`);
    process.exit(1);
  }

  await runPublic();

  let adminToken: string;
  let dealerToken: string;
  let distributorToken: string;

  try {
    adminToken = await login("admin");
    dealerToken = await login("dealer");
    distributorToken = await login("distributor");
  } catch (e) {
    console.error(String(e));
    console.error("\nRun: npm run seed   then retry: npm run test:panels\n");
    process.exit(1);
  }

  await runAdmin(adminToken);
  await runDealer(dealerToken);
  await runDistributor(distributorToken);

  printReport();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
