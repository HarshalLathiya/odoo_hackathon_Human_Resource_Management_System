import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCurrentUser, isAdminOrHR } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  if (!isAdminOrHR(user.role) && user.id !== id) {
    const { password_hash, bank_account_number, pan_number, aadhaar_number, ...safeData } = data;
    void password_hash;
    void bank_account_number;
    void pan_number;
    void aadhaar_number;
    return NextResponse.json({ employee: safeData });
  }

  const { password_hash, ...employeeData } = data;
  void password_hash;
  return NextResponse.json({ employee: employeeData });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = getServiceSupabase();

  const employeeEditableFields = ['phone', 'address', 'city', 'state', 'country', 'postal_code', 
    'emergency_contact_name', 'emergency_contact_phone', 'profile_picture'];
  
  const adminEditableFields = [...employeeEditableFields, 'email', 'first_name', 'last_name', 
    'department', 'designation', 'role', 'date_of_birth', 'gender', 'marital_status',
    'bank_name', 'bank_account_number', 'ifsc_code', 'pan_number', 'aadhaar_number', 
    'resume_url', 'is_active'];

  let allowedFields: string[];
  
  if (isAdminOrHR(user.role)) {
    allowedFields = adminEditableFields;
  } else if (user.id === id) {
    allowedFields = employeeEditableFields;
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }

  return NextResponse.json({ employee: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isAdminOrHR(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from('employees')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to deactivate employee' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
