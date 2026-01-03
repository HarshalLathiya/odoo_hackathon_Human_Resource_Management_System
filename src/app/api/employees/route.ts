import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCurrentUser, hashPassword, generateLoginId, generateRandomPassword, isAdminOrHR } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;
  const includeInactive = searchParams.get('includeInactive') === 'true';

  let query = supabase
    .from('employees')
    .select('*')
    .order('first_name');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }

  return NextResponse.json({ employees: data });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminOrHR(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      email, first_name, last_name, department, designation, 
      joining_date, role = 'employee', phone, address, city, state, country, postal_code 
    } = body;

    if (!email || !first_name || !last_name || !joining_date) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_code')
      .single();

    const companyCode = settings?.company_code || 'DF';
    const joiningYear = new Date(joining_date).getFullYear();

    const { data: countData } = await supabase
      .from('employees')
      .select('id', { count: 'exact' })
      .gte('joining_date', `${joiningYear}-01-01`)
      .lte('joining_date', `${joiningYear}-12-31`);

    const serialNumber = (countData?.length || 0) + 1;
    const loginId = generateLoginId(companyCode, first_name, last_name, joiningYear, serialNumber);
    const tempPassword = generateRandomPassword();
    const passwordHash = await hashPassword(tempPassword);

    const { data: newEmployee, error } = await supabase
      .from('employees')
      .insert({
        login_id: loginId,
        email,
        password_hash: passwordHash,
        first_name,
        last_name,
        role,
        department,
        designation,
        joining_date,
        phone,
        address,
        city,
        state,
        country,
        postal_code,
        must_change_password: true,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: leaveTypes } = await supabase.from('leave_types').select('*');
    
    if (leaveTypes) {
      const currentYear = new Date().getFullYear();
      const leaveBalances = leaveTypes.map(lt => ({
        employee_id: newEmployee.id,
        leave_type_id: lt.id,
        year: currentYear,
        total_days: lt.max_days_per_year,
        used_days: 0,
      }));
      
      await supabase.from('leave_balances').insert(leaveBalances);
    }

    return NextResponse.json({ 
      employee: newEmployee, 
      credentials: { loginId, tempPassword } 
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
