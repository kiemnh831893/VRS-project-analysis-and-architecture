import { apiFetch } from './client.js';
import type { AuthResponse, AuthUser } from '../types/auth.js';

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  nationalId: string;
  password: string;
  address?: string;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchMe(): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/api/auth/me');
}
