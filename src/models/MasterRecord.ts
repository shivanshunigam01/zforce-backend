import { Schema, model } from "mongoose";

/**
 * Generic dealer/HO master rows used by Admin > Master Management.
 * Stores branches/models/variants/colors/areas/payment modes/finance companies/parts/labour/expense heads/vendors/dse.
 */
const masterRecordSchema = new Schema(
  {
    dealerId: { type: String, required: true, index: true },
    tenantId: { type: String, default: "", index: true },
    type: {
      type: String,
      required: true,
      index: true,
      enum: [
        "branches",
        "models",
        "variants",
        "colors",
        "areas",
        "paymentModes",
        "financeCompanies",
        "insuranceCompanies",
        "parts",
        "labourCharges",
        "expenseHeads",
        "vendors",
        "dse",
      ],
    },
    code: { type: String, default: "" },
    name: { type: String, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    extra: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

masterRecordSchema.index({ dealerId: 1, type: 1, name: 1 });

export default model("MasterRecord", masterRecordSchema);
