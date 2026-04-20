import type { AuthUser, LoginPayload, SignUpPayload, StoredAuthUser } from "@/types/auth";

const AUTH_USERS_KEY = "quotegen:v1:auth:users";
const AUTH_SESSION_KEY = "quotegen:v1:auth:session";

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: StoredAuthUser): AuthUser {
  const { password: _password, ...rest } = user;
  return rest;
}

export function getStoredUsers(): StoredAuthUser[] {
  const storage = getLocalStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(AUTH_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAuthUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredAuthUser[]): void {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): AuthUser | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function saveSession(user: AuthUser | null): void {
  const storage = getLocalStorage();
  if (!storage) return;

  if (!user) {
    storage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
}

export function signUp(payload: SignUpPayload): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const users = getStoredUsers();
  const normalizedEmail = normalizeEmail(payload.email);

  const existingUser = users.find(user => normalizeEmail(user.email) === normalizedEmail);
  if (existingUser) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const user: StoredAuthUser = {
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    email: normalizedEmail,
    password: payload.password,
    createdAt: new Date().toISOString(),
  };

  const nextUsers = [...users, user];
  saveUsers(nextUsers);

  const publicUser = toPublicUser(user);
  saveSession(publicUser);
  return { ok: true, user: publicUser };
}

export function login(payload: LoginPayload): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const users = getStoredUsers();
  const normalizedEmail = normalizeEmail(payload.email);

  const matchedUser = users.find(
    user => normalizeEmail(user.email) === normalizedEmail && user.password === payload.password,
  );

  if (!matchedUser) {
    return { ok: false, error: "Invalid email or password." };
  }

  const publicUser = toPublicUser(matchedUser);
  saveSession(publicUser);
  return { ok: true, user: publicUser };
}

export function logout(): void {
  saveSession(null);
}
