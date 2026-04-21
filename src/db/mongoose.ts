import mongoose from "mongoose";
import { env } from "../config/env";

/** Fail fast instead of hanging minutes when Atlas IP/network is wrong (see MONGODB_URI in .env). */
const CONNECT_OPTS = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
} as const;

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri, CONNECT_OPTS);
}
