import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    dealerId: { type: String, index: true },
    tenantId: String,
    employeeId: { type: String, index: true },
    employeeName: { type: String, default: "" },
    date: { type: String, index: true },
    status: {
      type: String,
      enum: ["Present", "Absent", "Leave", "Half Day", "Late"],
      default: "Present",
    },
    remarks: { type: String, default: "" },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

schema.index({ dealerId: 1, employeeId: 1, date: 1 }, { unique: true });

export default model("Attendance", schema);
