import { Schema, model } from "mongoose";

const lineSchema = new Schema(
  {
    sku: String,
    name: String,
    orderedQty: Number,
    receivedQty: Number,
    qualityStatus: { type: String, default: "OK" },
    qualityRemarks: String,
  },
  { _id: false },
);

const schema = new Schema(
  {
    dealerId: { type: String, index: true },
    tenantId: String,
    receiptNo: { type: String, unique: true, index: true },
    grnNo: String,
    poId: String,
    poNo: String,
    supplier: String,
    branch: String,
    partType: String,
    checkedBy: String,
    remarks: String,
    qualityStatus: { type: String, default: "OK" },
    qualityRemarks: String,
    actionableDate: Date,
    status: { type: String, default: "received", index: true },
    lines: [lineSchema],
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default model("StockReceipt", schema);
