import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get('employeeId') || user.id;
  const year = searchParams.get('year') || new Date().getFullYear();

  const { data, error } = await supabase
    .from('leave_balances')
    .select('*, leave_type:leave_types(*)')
    .eq('employee_id', employeeId)
    .eq('year', year);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leave balances' }, { status: 500 });
  }

  return NextResponse.json({ leaveBalances: data });
}
