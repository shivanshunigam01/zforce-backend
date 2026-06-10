import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    dealerId: { type: String, index: true },
    tenantId: String,
    employeeId: { type: String, index: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    department: { type: String, default: "" },
    branch: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
    salaryPaise: { type: Number, default: 0 },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    joiningDate: { type: String, default: "" },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

schema.index({ dealerId: 1, employeeId: 1 }, { unique: true });

export default model("Employee", schema);
