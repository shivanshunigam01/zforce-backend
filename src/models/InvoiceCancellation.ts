import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    dealerId: { type: String, index: true },
    tenantId: String,
    cancellationId: { type: String, index: true },
    invoiceNo: { type: String, index: true },
    customerId: String,
    customerName: String,
    amountPaise: { type: Number, default: 0 },
    status: { type: String, default: "pending", index: true },
    reason: String,
    payload: Schema.Types.Mixed,
  },
  { timestamps: true },
);

export default model("InvoiceCancellation", schema);
