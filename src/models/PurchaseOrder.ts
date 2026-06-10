import { Schema, model } from "mongoose";

const lineSchema = new Schema(
  {
    sku: String,
    name: String,
    category: String,
    orderedQty: { type: Number, default: 0 },
    receivedQty: { type: Number, default: 0 },
    qty: Number,
    pricePaise: Number,
    variant: String,
    colour: String,
  },
  { _id: false },
);

const schema = new Schema(
  {
    dealerId: { type: String, index: true },
    tenantId: String,
    poNo: { type: String, unique: true, index: true },
    status: { type: String, default: "ordered", index: true },
    supplier: String,
    branch: String,
    partType: String,
    expectedDelivery: String,
    lines: [lineSchema],
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default model("PurchaseOrder", schema);
