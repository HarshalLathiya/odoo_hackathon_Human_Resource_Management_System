import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('leave_types')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
  }

  return NextResponse.json({ leaveTypes: data });
}
