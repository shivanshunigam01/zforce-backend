import { connectDb } from "../db/mongoose";
import { seedDeliveryDemo } from "../services/seedDeliveryDemo.service";

const DEALER_ID = process.env.SEED_DEALER_ID || "dealer-demo";
const TENANT_ID = process.env.SEED_TENANT_ID || "tenant-demo";

async function main() {
  await connectDb();
  const result = await seedDeliveryDemo(DEALER_ID, TENANT_ID);
  console.log(`Delivery demo seeded for ${DEALER_ID}:`);
  console.log(`  Invoices (billed not delivered): ${result.invoices}`);
  console.log(`  Delivery checklists: ${result.checklists}`);
  console.log(`  Gate passes: ${result.gatePasses}`);
  console.log(`  Delivery confirmations (pending): ${result.confirmations}`);
  console.log("");
  console.log("Open dealer panel → Billed Not Delivered / Delivery Checklist / Gate Pass / Delivery Confirmation");
  console.log("Demo invoices: INV-DEMO-BND-001 (start checklist), 002 (checklist open), 003 (gate pass + confirm)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
