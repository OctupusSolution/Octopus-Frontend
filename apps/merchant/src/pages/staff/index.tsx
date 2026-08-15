// The registry still routes bare "/staff" to this module (owned by task W1).
// Re-export the Employees sub-page here so that route keeps working while
// /staff/employees, /staff/schedule, /staff/attendance, /staff/tips and
// /staff/payroll exist as the real destinations once W1 wires them in.
export { StaffEmployeesPage as StaffPage } from "./employees";
