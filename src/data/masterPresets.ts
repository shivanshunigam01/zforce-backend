/** Demo rows for Admin → Master Management (dealer-demo). */

export type MasterPresetType =
  | "branches"
  | "models"
  | "variants"
  | "colors"
  | "areas"
  | "paymentModes"
  | "parts"
  | "labourCharges"
  | "expenseHeads"
  | "vendors"
  | "dse";

export type MasterPresetRow = {
  type: MasterPresetType;
  name: string;
  code: string;
  status?: "Active" | "Inactive";
  extra?: Record<string, string>;
};

export const MASTER_PRESETS: MasterPresetRow[] = [
  // Branches
  {
    type: "branches",
    name: "Patna Main Showroom",
    code: "BR-PAT-01",
    extra: { address: "Bailey Road, Patna", manager: "Amit Sharma", phone: "9876543210" },
  },
  {
    type: "branches",
    name: "Muzaffarpur Branch",
    code: "BR-MUZ-01",
    extra: { address: "Motijheel, Muzaffarpur", manager: "Vikash Kumar", phone: "9876543211" },
  },
  {
    type: "branches",
    name: "Gaya Service Center",
    code: "BR-GAY-01",
    extra: { address: "Bodhgaya Road, Gaya", manager: "Sanjay Yadav", phone: "9876543212" },
  },
  {
    type: "branches",
    name: "Bhagalpur Outlet",
    code: "BR-BHA-01",
    extra: { address: "Tilkamanjhi, Bhagalpur", manager: "Rohit Singh", phone: "9876543213" },
  },

  // Vehicle models
  {
    type: "models",
    name: "ZForce Elite",
    code: "MDL-ELITE",
    extra: {
      category: "Passenger",
      basePrice: "185000",
      defaultInsurance: "8500",
      defaultRto: "4500",
      defaultHsrp: "650",
      defaultGps: "3500",
      defaultOtherCharges: "0",
    },
  },
  {
    type: "models",
    name: "ZForce Plus",
    code: "MDL-PLUS",
    extra: {
      category: "Passenger",
      basePrice: "165000",
      defaultInsurance: "7800",
      defaultRto: "4200",
      defaultHsrp: "650",
      defaultGps: "3500",
      defaultOtherCharges: "0",
    },
  },
  {
    type: "models",
    name: "ZForce Cargo",
    code: "MDL-CARGO",
    extra: {
      category: "Commercial",
      basePrice: "195000",
      defaultInsurance: "9200",
      defaultRto: "5200",
      defaultHsrp: "650",
      defaultGps: "3500",
      defaultOtherCharges: "500",
    },
  },
  {
    type: "models",
    name: "ZForce City",
    code: "MDL-CITY",
    extra: {
      category: "Passenger",
      basePrice: "145000",
      defaultInsurance: "7200",
      defaultRto: "4000",
      defaultHsrp: "650",
      defaultGps: "3000",
      defaultOtherCharges: "0",
    },
  },

  // Variants
  {
    type: "variants",
    name: "Elite Long Range",
    code: "VAR-ELITE-LR",
    extra: { model: "ZForce Elite", priceAddon: "15000" },
  },
  {
    type: "variants",
    name: "Elite Standard",
    code: "VAR-ELITE-STD",
    extra: { model: "ZForce Elite", priceAddon: "0" },
  },
  {
    type: "variants",
    name: "Plus Premium",
    code: "VAR-PLUS-PRM",
    extra: { model: "ZForce Plus", priceAddon: "12000" },
  },
  {
    type: "variants",
    name: "Cargo Heavy Duty",
    code: "VAR-CARGO-HD",
    extra: { model: "ZForce Cargo", priceAddon: "20000" },
  },

  // Colors
  {
    type: "colors",
    name: "Pearl White",
    code: "CLR-WHT",
    extra: { hexCode: "#F5F5F5" },
  },
  {
    type: "colors",
    name: "Midnight Black",
    code: "CLR-BLK",
    extra: { hexCode: "#1A1A1A" },
  },
  {
    type: "colors",
    name: "Electric Blue",
    code: "CLR-BLU",
    extra: { hexCode: "#2563EB" },
  },
  {
    type: "colors",
    name: "Forest Green",
    code: "CLR-GRN",
    extra: { hexCode: "#166534" },
  },
  {
    type: "colors",
    name: "Ruby Red",
    code: "CLR-RED",
    extra: { hexCode: "#DC2626" },
  },

  // Areas
  {
    type: "areas",
    name: "Patna City",
    code: "AREA-PAT-C",
    extra: { district: "Patna", state: "Bihar" },
  },
  {
    type: "areas",
    name: "Muzaffarpur Rural",
    code: "AREA-MUZ-R",
    extra: { district: "Muzaffarpur", state: "Bihar" },
  },
  {
    type: "areas",
    name: "Gaya Town",
    code: "AREA-GAY-T",
    extra: { district: "Gaya", state: "Bihar" },
  },
  {
    type: "areas",
    name: "Bhagalpur Zone",
    code: "AREA-BHA-Z",
    extra: { district: "Bhagalpur", state: "Bihar" },
  },
  {
    type: "areas",
    name: "Darbhanga District",
    code: "AREA-DAR-D",
    extra: { district: "Darbhanga", state: "Bihar" },
  },

  // Payment modes
  { type: "paymentModes", name: "Cash", code: "PAY-CASH" },
  { type: "paymentModes", name: "UPI", code: "PAY-UPI" },
  { type: "paymentModes", name: "NEFT / RTGS", code: "PAY-NEFT" },
  { type: "paymentModes", name: "Cheque", code: "PAY-CHQ" },
  { type: "paymentModes", name: "Finance / EMI", code: "PAY-FIN" },

  { type: "financeCompanies", name: "HDFC Bank", code: "FIN-HDFC", extra: { category: "NBFC" } },
  { type: "financeCompanies", name: "ICICI Bank", code: "FIN-ICICI", extra: { category: "Bank" } },
  { type: "financeCompanies", name: "State Bank of India", code: "FIN-SBI", extra: { category: "Bank" } },
  { type: "financeCompanies", name: "Bajaj Finance", code: "FIN-BAJAJ", extra: { category: "NBFC" } },
  { type: "financeCompanies", name: "Axis Bank", code: "FIN-AXIS", extra: { category: "Bank" } },
  { type: "financeCompanies", name: "L&T Finance", code: "FIN-LNT", extra: { category: "NBFC" } },
  { type: "financeCompanies", name: "Tata Capital", code: "FIN-TATA", extra: { category: "NBFC" } },
  { type: "financeCompanies", name: "Mahindra Finance", code: "FIN-MAH", extra: { category: "NBFC" } },
  { type: "financeCompanies", name: "Kotak Mahindra Bank", code: "FIN-KOTAK", extra: { category: "Bank" } },
  { type: "financeCompanies", name: "IndusInd Bank", code: "FIN-INDUS", extra: { category: "Bank" } },
  { type: "financeCompanies", name: "Other", code: "FIN-OTHER", extra: { category: "Other" } },

  // Parts
  {
    type: "parts",
    name: "48V Lithium Battery Pack",
    code: "PRT-BAT-48",
    extra: { category: "Battery", unitPrice: "28000" },
  },
  {
    type: "parts",
    name: "48V Fast Charger",
    code: "PRT-CHG-48",
    extra: { category: "Charger", unitPrice: "4500" },
  },
  {
    type: "parts",
    name: "Front Brake Pad Set",
    code: "PRT-BRK-F",
    extra: { category: "Brakes", unitPrice: "850" },
  },
  {
    type: "parts",
    name: "LED Headlight Assembly",
    code: "PRT-LED-HL",
    extra: { category: "Electrical", unitPrice: "2200" },
  },
  {
    type: "parts",
    name: "Tyre 3.00-10 (Pair)",
    code: "PRT-TYR-10",
    extra: { category: "Tyres", unitPrice: "3200" },
  },

  // Labour charges
  {
    type: "labourCharges",
    name: "General Service",
    code: "LAB-GEN",
    extra: { category: "Service", rate: "500" },
  },
  {
    type: "labourCharges",
    name: "Battery Replacement",
    code: "LAB-BAT",
    extra: { category: "Battery", rate: "800" },
  },
  {
    type: "labourCharges",
    name: "Motor Diagnostics",
    code: "LAB-MOT",
    extra: { category: "Electrical", rate: "600" },
  },
  {
    type: "labourCharges",
    name: "Body Panel Repair",
    code: "LAB-BDY",
    extra: { category: "Body", rate: "1200" },
  },

  // Expense heads
  { type: "expenseHeads", name: "Fuel & Travel", code: "EXP-FUEL" },
  { type: "expenseHeads", name: "Showroom Rent", code: "EXP-RENT" },
  { type: "expenseHeads", name: "Staff Salary", code: "EXP-SAL" },
  { type: "expenseHeads", name: "Marketing & Ads", code: "EXP-MKT" },
  { type: "expenseHeads", name: "Utilities", code: "EXP-UTIL" },

  // Vendors
  {
    type: "vendors",
    name: "SK Auto Parts Pvt Ltd",
    code: "VND-SK-01",
    extra: {
      phone: "9123456701",
      altPhone: "9123456702",
      email: "sales@skautoparts.in",
      address: "Industrial Area, Patna",
      district: "Patna",
      state: "Bihar",
      pincode: "800001",
      businessType: "Pvt. Ltd.",
      category: "A",
      fleetSize: "12",
      kycDocType: "GST Certificate",
      kycDocNumber: "10AABCS1234F1Z5",
    },
  },
  {
    type: "vendors",
    name: "Bihar EV Supplies",
    code: "VND-BEV-01",
    extra: {
      phone: "9123456703",
      email: "contact@biharev.in",
      address: "Fraser Road, Patna",
      district: "Patna",
      state: "Bihar",
      pincode: "800001",
      businessType: "Proprietorship",
      category: "B",
      fleetSize: "5",
      kycDocType: "PAN Card",
      kycDocNumber: "ABCPK1234D",
    },
  },
  {
    type: "vendors",
    name: "Patna Battery Hub",
    code: "VND-PBH-01",
    extra: {
      phone: "9123456704",
      email: "hub@patnabattery.com",
      address: "Kankarbagh, Patna",
      district: "Patna",
      state: "Bihar",
      pincode: "800020",
      businessType: "Dealer",
      category: "A",
      fleetSize: "8",
      kycDocType: "Aadhaar Card",
      kycDocNumber: "XXXX-XXXX-4521",
    },
  },

  // DSE / field staff
  {
    type: "dse",
    name: "Rahul Kumar",
    code: "DSE-RK-01",
    extra: {
      phone: "9988776655",
      email: "rahul.kumar@zforce.in",
      branch: "Patna Main Showroom",
      designation: "DSE",
    },
  },
  {
    type: "dse",
    name: "Priya Singh",
    code: "DSE-PS-01",
    extra: {
      phone: "9988776656",
      email: "priya.singh@zforce.in",
      branch: "Patna Main Showroom",
      designation: "Senior DSE",
    },
  },
  {
    type: "dse",
    name: "Manoj Paswan",
    code: "DSE-MP-01",
    extra: {
      phone: "9988776657",
      email: "manoj.p@zforce.in",
      branch: "Muzaffarpur Branch",
      designation: "DSE",
    },
  },
  {
    type: "dse",
    name: "Anjali Verma",
    code: "DSE-AV-01",
    extra: {
      phone: "9988776658",
      email: "anjali.v@zforce.in",
      branch: "Gaya Service Center",
      designation: "Team Lead",
    },
  },
];
