import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    dealerId: { type: String, index: true },
    tenantId: String,
    requestNo: { type: String, index: true },
    requestType: { type: String, default: "ho_deviation" },
    customerId: String,
    customerName: String,
    quotationId: String,
    amountPaise: { type: Number, default: 0 },
    status: { type: String, default: "pending", index: true },
    reason: String,
    payload: Schema.Types.Mixed,
  },
  { timestamps: true },
);

export default model("DeviationRequest", schema);
