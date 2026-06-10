import { connectDb } from "../db/mongoose";
import { seedInventoryDemo } from "../services/seedInventoryDemo.service";

async function main() {
  await connectDb();
  const result = await seedInventoryDemo("dealer-demo", "tenant-demo");
  console.log(
    `Inventory demo seeded: ${result.vehicles} vehicles, ${result.spareParts} spare parts, ${result.batteries} batteries`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
