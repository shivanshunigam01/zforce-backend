/** Demo rows for HO User Management (idempotent seed). */
export const HO_STAFF_DEMO = [
  { employeeId: "EMP-001", name: "Rajesh Kumar", mobile: "+91-9876543210", email: "rajesh.kumar@zforce.in", role: "MD", department: "Leadership", branch: "Patna HQ", reportingTo: "-", status: "Active" as const },
  { employeeId: "EMP-002", name: "Priya Sharma", mobile: "+91-9876543211", email: "priya.sharma@zforce.in", role: "GM", department: "Sales", branch: "Patna HQ", reportingTo: "Rajesh Kumar", status: "Active" as const },
  { employeeId: "EMP-003", name: "Amit Singh", mobile: "+91-9876543212", email: "amit.singh@zforce.in", role: "DSM", department: "Sales", branch: "Muzaffarpur", reportingTo: "Priya Sharma", status: "Active" as const },
  { employeeId: "EMP-004", name: "Neha Verma", mobile: "+91-9876543213", email: "neha.verma@zforce.in", role: "DSE", department: "Sales", branch: "Patna HQ", reportingTo: "Amit Singh", status: "Active" as const },
  { employeeId: "EMP-005", name: "Vikash Roy", mobile: "+91-9876543214", email: "vikash.roy@zforce.in", role: "CRM Executive", department: "CRM", branch: "Bhagalpur", reportingTo: "Priya Sharma", status: "Active" as const },
  { employeeId: "EMP-006", name: "Sunita Devi", mobile: "+91-9876543215", email: "sunita.devi@zforce.in", role: "Accounts Executive", department: "Finance", branch: "Patna HQ", reportingTo: "Rajesh Kumar", status: "Active" as const },
  { employeeId: "EMP-007", name: "Ravi Shankar", mobile: "+91-9876543216", email: "ravi.shankar@zforce.in", role: "Service Manager", department: "After Sales", branch: "Gaya", reportingTo: "Priya Sharma", status: "Inactive" as const },
  { employeeId: "EMP-008", name: "Kiran Patel", mobile: "+91-9876543217", email: "kiran.patel@zforce.in", role: "Admin", department: "IT & Admin", branch: "Patna HQ", reportingTo: "Rajesh Kumar", status: "Active" as const },
];
