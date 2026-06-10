import Employee from "../models/Employee";
import Attendance from "../models/Attendance";

export type AttendanceStatus = "Present" | "Absent" | "Leave" | "Half Day" | "Late";

export async function nextDealerEmployeeId(dealerId: string): Promise<string> {
  const rows = await Employee.find({ dealerId, employeeId: /^EMP-/i })
    .select("employeeId")
    .lean();
  let max = 0;
  for (const r of rows as { employeeId?: string }[]) {
    const m = /^EMP-(\d+)$/i.exec(String(r.employeeId || ""));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `EMP-${String(max + 1).padStart(3, "0")}`;
}

export function salaryPaiseFromBody(body: Record<string, unknown>): number {
  const direct = Number(body.salaryPaise);
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct);
  const salary = Number(body.salary);
  if (Number.isFinite(salary) && salary >= 0) return Math.round(salary * 100);
  return 0;
}

export async function saveAttendanceBatch(
  dealerId: string,
  tenantId: string,
  date: string,
  entries: Array<{ employeeId: string; employeeName?: string; status: AttendanceStatus; remarks?: string }>,
) {
  const dateStr = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("date must be YYYY-MM-DD");
  }

  const results = [];
  for (const entry of entries) {
    const employeeId = String(entry.employeeId || "").trim();
    if (!employeeId) continue;
    const row = await Attendance.findOneAndUpdate(
      { dealerId, employeeId, date: dateStr },
      {
        dealerId,
        tenantId,
        employeeId,
        employeeName: entry.employeeName || "",
        date: dateStr,
        status: entry.status || "Present",
        remarks: entry.remarks || "",
      },
      { upsert: true, new: true },
    );
    results.push(row);
  }
  return results;
}

export type HrSummary = {
  totalEmployees: number;
  activeEmployees: number;
  monthlyPayrollPaise: number;
  presentToday: number;
  onLeave: number;
  absent: number;
  late: number;
  halfDay: number;
  departments: Array<{ name: string; count: number; payrollPaise: number }>;
  attendanceDate: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function buildHrSummary(dealerId: string, date?: string): Promise<HrSummary> {
  const attendanceDate = String(date || todayIso()).trim() || todayIso();
  const [employees, todayAttendance] = await Promise.all([
    Employee.find({ dealerId }).lean(),
    Attendance.find({ dealerId, date: attendanceDate }).lean(),
  ]);

  const active = employees.filter((e) => String(e.status || "Active") === "Active");
  const monthlyPayrollPaise = active.reduce((s, e) => s + (Number(e.salaryPaise) || 0), 0);

  const deptMap = new Map<string, { count: number; payrollPaise: number }>();
  for (const emp of employees) {
    const dept = String(emp.department || "General").trim() || "General";
    const prev = deptMap.get(dept) || { count: 0, payrollPaise: 0 };
    prev.count += 1;
    if (String(emp.status || "Active") === "Active") {
      prev.payrollPaise += Number(emp.salaryPaise) || 0;
    }
    deptMap.set(dept, prev);
  }

  const departments = [...deptMap.entries()]
    .map(([name, v]) => ({ name, count: v.count, payrollPaise: v.payrollPaise }))
    .sort((a, b) => a.name.localeCompare(b.name));

  let presentToday = 0;
  let onLeave = 0;
  let absent = 0;
  let late = 0;
  let halfDay = 0;

  for (const row of todayAttendance) {
    const st = String(row.status || "");
    if (st === "Present" || st === "Late") presentToday += 1;
    if (st === "Leave") onLeave += 1;
    if (st === "Absent") absent += 1;
    if (st === "Late") late += 1;
    if (st === "Half Day") halfDay += 1;
  }

  return {
    totalEmployees: employees.length,
    activeEmployees: active.length,
    monthlyPayrollPaise,
    presentToday,
    onLeave,
    absent,
    late,
    halfDay,
    departments,
    attendanceDate,
  };
}
