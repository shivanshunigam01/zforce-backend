import ServiceJob from "../models/ServiceJob";
import ServiceInvoice from "../models/ServiceInvoice";
import VehicleInventory from "../models/VehicleInventory";

type SeedServiceDemoResult = {
  jobs: number;
  invoices: number;
  vehiclesUpdated: number;
};

export async function seedServiceDemo(
  dealerId: string,
  tenantId: string,
): Promise<SeedServiceDemoResult> {
  await ServiceInvoice.deleteMany({ dealerId, invoiceNo: { $regex: /^SI-DEMO-/ } });
  await ServiceJob.deleteMany({ dealerId, jobNo: { $regex: /^JC-DEMO-/ } });

  const delivered = await VehicleInventory.findOne({
    dealerId,
    chassisNo: "ZFCH-DLV-001",
  });

  if (delivered) {
    const pl = (delivered.payload || {}) as Record<string, unknown>;
    delivered.payload = {
      ...pl,
      motorNo: pl.motorNo || "MTR-DEMO-001",
      batteryNo: pl.batteryNo || "BAT-DEMO-48V-150",
      registrationNo: pl.registrationNo || "",
    };
    await delivered.save();
  }

  const vehicleStockNo = delivered?.stockNo || "STK-DEMO-010";
  const vehicleId = String(delivered?._id || "");

  await ServiceJob.create({
    dealerId,
    tenantId,
    jobNo: "JC-DEMO-001",
    customerId: "zforcec-demo-099",
    vehicleStockNo,
    vehicleId,
    chassisNo: "ZFCH-DLV-001",
    registrationNo: "",
    customerName: "Vikash Kumar",
    model: "ZForce Elite",
    complaint: "Brake noise and headlight flickering",
    serviceType: "Paid",
    advisor: "Service Advisor 1",
    status: "completed",
    discountPaise: 20000,
    estimatedCostPaise: 458000,
    partsEntries: [
      { name: "Front Brake Pad Set", cost: 850 },
      { name: "LED Headlight Assembly", cost: 2200 },
    ],
    labourEntries: [{ name: "General Service", cost: 500 }],
    payload: { variant: "Elite Standard", colour: "Midnight Black" },
  });

  await ServiceJob.create({
    dealerId,
    tenantId,
    jobNo: "JC-DEMO-002",
    customerId: "zforcec-demo-100",
    vehicleStockNo: "STK-DEMO-011",
    chassisNo: "ZFCH-DLV-002",
    customerName: "Anjali Devi",
    model: "ZForce Plus",
    complaint: "Battery range reduced — health check",
    serviceType: "Warranty",
    advisor: "Service Advisor 2",
    status: "in_progress",
    discountPaise: 0,
    estimatedCostPaise: 150000,
    partsEntries: [],
    labourEntries: [{ name: "Battery Health Check", cost: 1500 }],
    payload: { variant: "Plus Premium", colour: "Pearl White" },
  });

  await ServiceInvoice.create({
    dealerId,
    tenantId,
    invoiceNo: "SI-DEMO-001",
    jobNo: "JC-DEMO-001",
    jobCardId: "JC-DEMO-001",
    customerId: "zforcec-demo-099",
    customerName: "Vikash Kumar",
    customerPhone: "9876543299",
    registrationNo: "",
    model: "ZForce Elite",
    chassisNo: "ZFCH-DLV-001",
    items: [
      { description: "Part: Front Brake Pad Set", qty: 1, ratePaise: 85000, amountPaise: 85000 },
      { description: "Part: LED Headlight Assembly", qty: 1, ratePaise: 220000, amountPaise: 220000 },
      { description: "Labour: General Service", qty: 1, ratePaise: 50000, amountPaise: 50000 },
    ],
    labourChargesPaise: 50000,
    partsChargesPaise: 305000,
    gstPaise: 63900,
    totalPaise: 418900,
    status: "unpaid",
  });

  return { jobs: 2, invoices: 1, vehiclesUpdated: delivered ? 1 : 0 };
}
