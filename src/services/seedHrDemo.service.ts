import Employee from "../models/Employee";
import Attendance from "../models/Attendance";

const DEMO_PREFIX = "EMP-DEMO-";

export type SeedHrDemoResult = {
  employees: number;
  attendance: number;
};

export async function seedHrDemo(dealerId: string, tenantId: string): Promise<SeedHrDemoResult> {
  await Attendance.deleteMany({ dealerId, employeeId: { $regex: `^${DEMO_PREFIX}` } });
  await Employee.deleteMany({ dealerId, employeeId: { $regex: `^${DEMO_PREFIX}` } });

  const employees = [
    {
      employeeId: "EMP-DEMO-001",
      name: "Rajesh Sharma",
      role: "DSM",
      department: "Sales",
      branch: "Patna HQ",
      status: "Active",
      salaryPaise: 4500000,
      phone: "9876500001",
      email: "rajesh@dealer.example",
      joiningDate: "2024-01-15",
    },
    {
      employeeId: "EMP-DEMO-002",
      name: "Sneha Kumari",
      role: "CRM Exec",
      department: "CRM",
      branch: "Patna HQ",
      status: "Active",
      salaryPaise: 2800000,
      phone: "9876500002",
      email: "sneha@dealer.example",
      joiningDate: "2024-03-01",
    },
    {
      employeeId: "EMP-DEMO-003",
      name: "Vikram Singh",
      role: "DSE",
      department: "Sales",
      branch: "Muzaffarpur",
      status: "Active",
      salaryPaise: 2200000,
      phone: "9876500003",
      email: "vikram@dealer.example",
      joiningDate: "2024-06-10",
    },
    {
      employeeId: "EMP-DEMO-004",
      name: "Anita Devi",
      role: "Accountant",
      department: "Accounts",
      branch: "Patna HQ",
      status: "Active",
      salaryPaise: 3200000,
      phone: "9876500004",
      email: "anita@dealer.example",
      joiningDate: "2023-11-20",
    },
    {
      employeeId: "EMP-DEMO-005",
      name: "Mohit Yadav",
      role: "Service Technician",
      department: "Service",
      branch: "Gaya",
      status: "Inactive",
      salaryPaise: 1800000,
      phone: "9876500005",
      email: "mohit@dealer.example",
      joiningDate: "2022-08-05",
    },
  ];

  for (const e of employees) {
    await Employee.create({ ...e, dealerId, tenantId });
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const attendanceRows = [
    { employeeId: "EMP-DEMO-001", employeeName: "Rajesh Sharma", date: today, status: "Present", remarks: "" },
    { employeeId: "EMP-DEMO-002", employeeName: "Sneha Kumari", date: today, status: "Late", remarks: "Traffic" },
    { employeeId: "EMP-DEMO-003", employeeName: "Vikram Singh", date: today, status: "Leave", remarks: "Personal" },
    { employeeId: "EMP-DEMO-004", employeeName: "Anita Devi", date: today, status: "Present", remarks: "" },
    { employeeId: "EMP-DEMO-001", employeeName: "Rajesh Sharma", date: yesterday, status: "Present", remarks: "" },
    { employeeId: "EMP-DEMO-002", employeeName: "Sneha Kumari", date: yesterday, status: "Absent", remarks: "Sick" },
    { employeeId: "EMP-DEMO-003", employeeName: "Vikram Singh", date: yesterday, status: "Present", remarks: "" },
    { employeeId: "EMP-DEMO-004", employeeName: "Anita Devi", date: yesterday, status: "Half Day", remarks: "Half day leave" },
  ];

  for (const a of attendanceRows) {
    await Attendance.create({ ...a, dealerId, tenantId });
  }

  return { employees: employees.length, attendance: attendanceRows.length };
}
