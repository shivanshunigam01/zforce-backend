import User from "../models/User";
import HoStaff from "../models/HoStaff";

const STAFF_PREFIX = "EMP-USER-";

export type SeedDealerUsersResult = {
  staff: number;
  portalUsers: number;
};

type DealerUserSeed = {
  userId: string;
  displayName: string;
  email: string;
  employeeId: string;
  hoRole: string;
  department: string;
  branch: string;
  reportingTo: string;
  mobile: string;
  permissions: string[];
  branchIds?: string[];
};

const GM_PERMISSIONS = [
  "dashboard",
  "crm",
  "inventory",
  "invoicing",
  "payments",
  "master_management",
  "cms",
  "reports",
  "hr",
  "user_management",
];

const BRANCH_PERMISSIONS = [
  "dashboard",
  "crm",
  "inventory",
  "invoicing",
  "payments",
  "reports",
];

const DSE_PERMISSIONS = ["dashboard", "crm", "invoicing", "payments"];

const CRM_PERMISSIONS = ["dashboard", "crm"];

const ACCOUNTS_PERMISSIONS = ["dashboard", "payments", "invoicing", "reports"];

const FINANCE_PERMISSIONS = ["dashboard", "payments", "invoicing", "reports"];

const MD_PERMISSIONS = [
  "dashboard",
  "crm",
  "inventory",
  "invoicing",
  "payments",
  "master_management",
  "cms",
  "reports",
  "hr",
  "user_management",
  "settings",
];

const DEALER_USERS: DealerUserSeed[] = [
  {
    userId: "dealer-md",
    displayName: "Amit Verma (MD)",
    email: "md@dealer.example",
    employeeId: `${STAFF_PREFIX}MD`,
    hoRole: "MD",
    department: "Management",
    branch: "Patna HQ",
    reportingTo: "-",
    mobile: "9876510001",
    permissions: MD_PERMISSIONS,
  },
  {
    userId: "dealer-gm",
    displayName: "Priya Singh (GM)",
    email: "gm@dealer.example",
    employeeId: `${STAFF_PREFIX}GM`,
    hoRole: "GM",
    department: "Management",
    branch: "Patna HQ",
    reportingTo: "Amit Verma (MD)",
    mobile: "9876510002",
    permissions: GM_PERMISSIONS,
  },
  {
    userId: "dealer-branch",
    displayName: "Vikash Kumar (Branch Manager)",
    email: "branch@dealer.example",
    employeeId: `${STAFF_PREFIX}DSM`,
    hoRole: "DSM",
    department: "Sales",
    branch: "Muzaffarpur",
    reportingTo: "Priya Singh (GM)",
    mobile: "9876510003",
    permissions: BRANCH_PERMISSIONS,
    branchIds: ["Muzaffarpur"],
  },
  {
    userId: "dealer-dse",
    displayName: "Rohit Yadav (Sales Executive)",
    email: "dse@dealer.example",
    employeeId: `${STAFF_PREFIX}DSE`,
    hoRole: "DSE",
    department: "Sales",
    branch: "Patna HQ",
    reportingTo: "Priya Singh (GM)",
    mobile: "9876510004",
    permissions: DSE_PERMISSIONS,
  },
  {
    userId: "dealer-crm",
    displayName: "Neha Kumari (CRM)",
    email: "crm@dealer.example",
    employeeId: `${STAFF_PREFIX}CRM`,
    hoRole: "CRM Executive",
    department: "CRM",
    branch: "Patna HQ",
    reportingTo: "Priya Singh (GM)",
    mobile: "9876510005",
    permissions: CRM_PERMISSIONS,
  },
  {
    userId: "dealer-accounts",
    displayName: "Suresh Prasad (Accounts)",
    email: "accounts@dealer.example",
    employeeId: `${STAFF_PREFIX}ACC`,
    hoRole: "Accounts Executive",
    department: "Accounts",
    branch: "Patna HQ",
    reportingTo: "Priya Singh (GM)",
    mobile: "9876510006",
    permissions: ACCOUNTS_PERMISSIONS,
  },
  {
    userId: "dealer-finance",
    displayName: "Anjali Mishra (Finance)",
    email: "finance@dealer.example",
    employeeId: `${STAFF_PREFIX}FIN`,
    hoRole: "Finance Executive",
    department: "Finance",
    branch: "Patna HQ",
    reportingTo: "Suresh Prasad (Accounts)",
    mobile: "9876510007",
    permissions: FINANCE_PERMISSIONS,
  },
];

export async function seedDealerUsers(
  dealerId: string,
  tenantId: string,
  passwordHash: string,
): Promise<SeedDealerUsersResult> {
  let staff = 0;
  let portalUsers = 0;

  for (const row of DEALER_USERS) {
    await HoStaff.findOneAndUpdate(
      { employeeId: row.employeeId },
      {
        employeeId: row.employeeId,
        name: row.displayName,
        mobile: row.mobile,
        email: row.email,
        role: row.hoRole,
        department: row.department,
        branch: row.branch,
        reportingTo: row.reportingTo,
        status: "Active",
        portalUsername: row.userId,
        portalPasswordHash: passwordHash,
      },
      { upsert: true, new: true },
    );
    staff += 1;

    await User.findOneAndUpdate(
      { userId: row.userId },
      {
        userId: row.userId,
        email: row.email,
        displayName: row.displayName,
        passwordHash,
        role: "dealer",
        dealerId,
        tenantId,
        branchIds: row.branchIds ?? [],
        permissions: row.permissions,
        isActive: true,
      },
      { upsert: true, new: true },
    );
    portalUsers += 1;
  }

  return { staff, portalUsers };
}

export function dealerUserCredentialsSummary(): string[] {
  return DEALER_USERS.map((u) => `    ${u.userId} / Password@123  (${u.hoRole})`);
}
