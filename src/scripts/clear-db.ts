import mongoose from "mongoose";
import { connectDb } from "../db/mongoose";

/**
 * Drops the entire MongoDB database named in MONGODB_URI (destructive).
 * Run `npm run seed` afterward if you need demo users / storefront again.
 */
async function main() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");
  const name = db.databaseName;
  console.log(`Dropping MongoDB database "${name}"...`);
  await db.dropDatabase();
  await mongoose.disconnect();
  console.log("Database dropped.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
