import { Schema, model } from "mongoose";

const entrySchema = new Schema(
  { name: String, cost: Number, partNo: String },
  { _id: false },
);

const schema = new Schema(
  {
    dealerId: { type: String, index: true },
    tenantId: String,
    jobNo: { type: String, unique: true, index: true },
    customerId: String,
    vehicleStockNo: String,
    vehicleId: String,
    chassisNo: String,
    registrationNo: String,
    customerName: String,
    model: String,
    complaint: String,
    serviceType: String,
    advisor: String,
    status: { type: String, default: "open", index: true },
    discountPaise: { type: Number, default: 0 },
    estimatedCostPaise: { type: Number, default: 0 },
    partsEntries: [entrySchema],
    labourEntries: [entrySchema],
    partsIssued: [{ partNo: String, qty: Number }],
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default model("ServiceJob", schema);
