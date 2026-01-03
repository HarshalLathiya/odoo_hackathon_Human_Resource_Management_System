import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const authUser = verifyToken(token);
    if (!authUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    
    const { data: employee } = await supabase
      .from('employees')
      .select('password_hash')
      .eq('id', authUser.id)
      .single();

    if (employee && currentPassword) {
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(currentPassword, employee.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
    }

    const newHash = await hashPassword(newPassword);
    
    const { error } = await supabase
      .from('employees')
      .update({ 
        password_hash: newHash,
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUser.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
