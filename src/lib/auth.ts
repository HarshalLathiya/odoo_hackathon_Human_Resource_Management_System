import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getServiceSupabase } from './supabase';
import type { AuthUser, Employee } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'dayflow-secret';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

export function generateLoginId(
  companyCode: string,
  firstName: string,
  lastName: string,
  joiningYear: number,
  serialNumber: number
): string {
  const initials = (firstName.charAt(0) + lastName.substring(0, 2)).toUpperCase();
  const serial = serialNumber.toString().padStart(4, '0');
  return `${companyCode}${initials}${joiningYear}${serial}`;
}

export function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function isAdminOrHR(role: string): boolean {
  return role === 'admin' || role === 'hr';
}
