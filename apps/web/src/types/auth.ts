export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  accountStatus?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}
