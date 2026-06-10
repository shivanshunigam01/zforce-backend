import { Schema, model } from "mongoose";

const itemSchema = new Schema(
  {
    description: String,
    qty: Number,
    ratePaise: Number,
    amountPaise: Number,
  },
  { _id: false },
);

const schema = new Schema(
  {
    dealerId: { type: String, index: true },
    tenantId: String,
    invoiceNo: { type: String, unique: true, index: true },
    jobCardId: String,
    jobNo: String,
    customerId: String,
    customerName: String,
    customerPhone: String,
    customerAddress: String,
    customerEmail: String,
    registrationNo: String,
    model: String,
    chassisNo: String,
    items: [itemSchema],
    labourChargesPaise: { type: Number, default: 0 },
    partsChargesPaise: { type: Number, default: 0 },
    gstPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, default: 0 },
    status: { type: String, default: "unpaid", index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default model("ServiceInvoice", schema);
