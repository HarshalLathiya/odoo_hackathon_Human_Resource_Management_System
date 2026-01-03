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
  const date = searchParams.get('date');
  const employeeId = searchParams.get('employeeId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  let query = supabase.from('attendance').select('*, employee:employees(id, first_name, last_name, profile_picture, department, designation)');

  if (date) {
    query = query.eq('date', date);
  }

  if (month && year) {
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;
    query = query.gte('date', startDate).lte('date', endDate);
  }

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  } else if (!isAdminOrHR(user.role)) {
    query = query.eq('employee_id', user.id);
  }

  query = query.order('date', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }

  return NextResponse.json({ attendance: data });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { action } = await request.json();
    const supabase = getServiceSupabase();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', user.id)
      .eq('date', today)
      .single();

    if (action === 'check_in') {
      if (existing?.check_in) {
        return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
      }

      if (existing) {
        const { data, error } = await supabase
          .from('attendance')
          .update({ check_in: now, status: 'present', updated_at: now })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ attendance: data });
      }

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: user.id,
          date: today,
          check_in: now,
          status: 'present',
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ attendance: data }, { status: 201 });
    }

    if (action === 'check_out') {
      if (!existing?.check_in) {
        return NextResponse.json({ error: 'Not checked in yet' }, { status: 400 });
      }

      if (existing.check_out) {
        return NextResponse.json({ error: 'Already checked out today' }, { status: 400 });
      }

      const checkInTime = new Date(existing.check_in);
      const checkOutTime = new Date(now);
      const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      const extraHours = Math.max(0, workHours - 8);

      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out: now,
          work_hours: Math.round(workHours * 100) / 100,
          extra_hours: Math.round(extraHours * 100) / 100,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ attendance: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}
