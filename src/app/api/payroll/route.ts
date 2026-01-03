import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCurrentUser, isAdminOrHR } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminOrHR(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const employeeId = searchParams.get('employeeId');

  let query = supabase
    .from('payroll')
    .select('*, employee:employees(id, first_name, last_name, profile_picture, department, designation)')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (month) query = query.eq('month', parseInt(month));
  if (year) query = query.eq('year', parseInt(year));
  if (employeeId) query = query.eq('employee_id', employeeId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }

  return NextResponse.json({ payroll: data });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminOrHR(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('is_active', true);

    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: 'No active employees found' }, { status: 400 });
    }

    const results = [];

    for (const emp of employees) {
      const { data: existing } = await supabase
        .from('payroll')
        .select('id')
        .eq('employee_id', emp.id)
        .eq('month', month)
        .eq('year', year)
        .single();

      if (existing) continue;

      const { data: salary } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('employee_id', emp.id)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (!salary) continue;

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', emp.id)
        .gte('date', startDate)
        .lte('date', endDate);

      const daysPresent = attendance?.filter(a => a.status === 'present').length || 0;
      const paidLeaveDays = attendance?.filter(a => a.status === 'leave').length || 0;
      const workingDays = new Date(year, month, 0).getDate();
      const unpaidLeaveDays = workingDays - daysPresent - paidLeaveDays;

      const payableDays = daysPresent + paidLeaveDays;
      const payableRatio = payableDays / workingDays;

      const basicSalary = (salary.wage * salary.basic_salary_percentage / 100) * payableRatio;
      const hra = (basicSalary * salary.hra_percentage / 100);
      const standardAllowance = salary.standard_allowance * payableRatio;
      const performanceBonus = salary.performance_bonus * payableRatio;
      const lta = salary.lta * payableRatio;
      const fixedAllowance = salary.fixed_allowance * payableRatio;

      const grossSalary = basicSalary + hra + standardAllowance + performanceBonus + lta + fixedAllowance;
      const pfEmployee = basicSalary * salary.pf_employee_percentage / 100;
      const pfEmployer = basicSalary * salary.pf_employer_percentage / 100;
      const professionalTax = salary.professional_tax;
      const totalDeductions = pfEmployee + professionalTax;
      const netSalary = grossSalary - totalDeductions;

      const { data: payroll, error } = await supabase
        .from('payroll')
        .insert({
          employee_id: emp.id,
          month,
          year,
          working_days: workingDays,
          days_present: daysPresent,
          paid_leave_days: paidLeaveDays,
          unpaid_leave_days: Math.max(0, unpaidLeaveDays),
          basic_salary: Math.round(basicSalary),
          hra: Math.round(hra),
          standard_allowance: Math.round(standardAllowance),
          performance_bonus: Math.round(performanceBonus),
          lta: Math.round(lta),
          fixed_allowance: Math.round(fixedAllowance),
          gross_salary: Math.round(grossSalary),
          pf_employee: Math.round(pfEmployee),
          pf_employer: Math.round(pfEmployer),
          professional_tax: Math.round(professionalTax),
          total_deductions: Math.round(totalDeductions),
          net_salary: Math.round(netSalary),
          status: 'draft',
        })
        .select()
        .single();

      if (!error && payroll) {
        results.push(payroll);
      }
    }

    return NextResponse.json({ generated: results.length, payroll: results }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to generate payroll' }, { status: 500 });
  }
}
