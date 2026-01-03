export type UserRole = 'admin' | 'hr' | 'employee';

export interface Employee {
  id: string;
  login_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  profile_picture: string | null;
  department: string | null;
  designation: string | null;
  joining_date: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  pan_number: string | null;
  aadhaar_number: string | null;
  resume_url: string | null;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  wage: number;
  basic_salary_percentage: number;
  hra_percentage: number;
  standard_allowance: number;
  performance_bonus: number;
  lta: number;
  fixed_allowance: number;
  pf_employee_percentage: number;
  pf_employer_percentage: number;
  professional_tax: number;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number;
  extra_hours: number;
  break_minutes: number;
  status: 'present' | 'absent' | 'leave' | 'half_day';
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  is_paid: boolean;
  max_days_per_year: number;
  requires_attachment: boolean;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  attachment_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  leave_type?: LeaveType;
  employee?: Employee;
  reviewer?: Employee;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  leave_type?: LeaveType;
}

export interface Payroll {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  working_days: number;
  days_present: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  basic_salary: number;
  hra: number;
  standard_allowance: number;
  performance_bonus: number;
  lta: number;
  fixed_allowance: number;
  gross_salary: number;
  pf_employee: number;
  pf_employer: number;
  professional_tax: number;
  total_deductions: number;
  net_salary: number;
  status: 'draft' | 'processed' | 'paid';
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface CompanySettings {
  id: string;
  company_code: string;
  company_name: string;
  working_hours_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  login_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  profile_picture: string | null;
  must_change_password: boolean;
}

export interface AttendanceWithEmployee extends Attendance {
  employee: Employee;
}

export interface DailyAttendanceSummary {
  date: string;
  present: number;
  absent: number;
  on_leave: number;
  total: number;
}
