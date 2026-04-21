import { Schema, model } from "mongoose";

/** HO employee directory (User Management module) — separate from auth `User`. */
const hoStaffSchema = new Schema(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, default: "" },
    role: { type: String, required: true },
    department: { type: String, default: "" },
    branch: { type: String, default: "" },
    reportingTo: { type: String, default: "-" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    portalUsername: { type: String, default: "" },
    portalPasswordHash: { type: String, default: "" },
  },
  { timestamps: true },
);

export default model("HoStaff", hoStaffSchema);
