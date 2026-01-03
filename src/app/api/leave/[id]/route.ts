import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCurrentUser, isAdminOrHR } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isAdminOrHR(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*, leave_type:leave_types(*)')
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Leave request has already been processed' }, { status: 400 });
    }

      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          leave_type:leave_types(*),
          employee:employees(id, first_name, last_name, profile_picture, department)
        `)
        .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (status === 'approved') {
        const currentYear = new Date().getFullYear();
        
        const { data: balance } = await supabase
          .from('leave_balances')
          .select('used_days')
          .eq('employee_id', leaveRequest.employee_id)
          .eq('leave_type_id', leaveRequest.leave_type_id)
          .eq('year', currentYear)
          .single();

        if (balance) {
          await supabase
            .from('leave_balances')
            .update({ used_days: balance.used_days + leaveRequest.days })
            .eq('employee_id', leaveRequest.employee_id)
            .eq('leave_type_id', leaveRequest.leave_type_id)
            .eq('year', currentYear);
        }

        const startDate = new Date(leaveRequest.start_date);
        const endDate = new Date(leaveRequest.end_date);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('employee_id', leaveRequest.employee_id)
            .eq('date', dateStr)
            .single();

          if (existing) {
            await supabase
              .from('attendance')
              .update({ status: 'leave' })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('attendance')
              .insert({
                employee_id: leaveRequest.employee_id,
                date: dateStr,
                status: 'leave',
              });
          }
        }
      }

    return NextResponse.json({ leaveRequest: data });
  } catch {
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
  }
}
