import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCurrentUser, isAdminOrHR } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const employeeId = searchParams.get('employeeId');

  let query = supabase
    .from('leave_requests')
    .select(`
      *,
      leave_type:leave_types(*),
      employee:employees(id, first_name, last_name, profile_picture, department),
      reviewer:employees!leave_requests_reviewed_by_fkey(id, first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  } else if (!isAdminOrHR(user.role)) {
    query = query.eq('employee_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }

  return NextResponse.json({ leaveRequests: data });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { leave_type_id, start_date, end_date, reason, attachment_url } = body;

    if (!leave_type_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const supabase = getServiceSupabase();

    const { data: leaveType } = await supabase
      .from('leave_types')
      .select('*')
      .eq('id', leave_type_id)
      .single();

    if (leaveType?.requires_attachment && !attachment_url) {
      return NextResponse.json({ error: 'Attachment is required for this leave type' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const { data: balance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', user.id)
      .eq('leave_type_id', leave_type_id)
      .eq('year', currentYear)
      .single();

    if (balance) {
      const remaining = balance.total_days - balance.used_days;
      if (days > remaining) {
        return NextResponse.json({ error: `Insufficient leave balance. You have ${remaining} days remaining.` }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: user.id,
        leave_type_id,
        start_date,
        end_date,
        days,
        reason,
        attachment_url,
        status: 'pending',
      })
      .select(`
        *,
        leave_type:leave_types(*),
        employee:employees(id, first_name, last_name, profile_picture, department)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leaveRequest: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
  }
}
