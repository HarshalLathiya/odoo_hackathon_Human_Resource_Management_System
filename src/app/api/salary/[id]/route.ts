import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCurrentUser, isAdminOrHR } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isAdminOrHR(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('salary_structures')
    .select('*')
    .eq('employee_id', id)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Failed to fetch salary' }, { status: 500 });
  }

  return NextResponse.json({ salary: data || null });
}

export async function POST(
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
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('salary_structures')
      .insert({
        employee_id: id,
        ...body,
        effective_from: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ salary: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create salary structure' }, { status: 500 });
  }
}

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
    const supabase = getServiceSupabase();

    const { data: existing } = await supabase
      .from('salary_structures')
      .select('id')
      .eq('employee_id', id)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (!existing) {
      const { data, error } = await supabase
        .from('salary_structures')
        .insert({
          employee_id: id,
          ...body,
          effective_from: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ salary: data }, { status: 201 });
    }

    const { data, error } = await supabase
      .from('salary_structures')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ salary: data });
  } catch {
    return NextResponse.json({ error: 'Failed to update salary structure' }, { status: 500 });
  }
}
