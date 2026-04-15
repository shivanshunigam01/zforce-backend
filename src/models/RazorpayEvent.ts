import { Schema, model } from "mongoose";

const razorpayEventSchema = new Schema({
  eventId: { type: String, unique: true, sparse: true, index: true },
  eventType: { type: String, index: true },
  paymentId: { type: String, index: true },
  orderId: { type: String, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  processedAt: Date
}, { timestamps: true });

export default model("RazorpayEvent", razorpayEventSchema);
