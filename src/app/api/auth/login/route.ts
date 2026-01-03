import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();
    
    if (!loginId || !password) {
      return NextResponse.json({ error: 'Login ID and password are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('login_id', loginId)
      .eq('is_active', true)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, employee.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const authUser = {
      id: employee.id,
      login_id: employee.login_id,
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      role: employee.role,
      profile_picture: employee.profile_picture,
      must_change_password: employee.must_change_password,
    };

    const token = generateToken(authUser);
    
    const response = NextResponse.json({ user: authUser });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
