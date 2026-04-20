export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface StoredAuthUser extends AuthUser {
  password: string;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
