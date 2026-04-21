import type { AuthUser, LoginPayload, SignUpPayload, StoredAuthUser } from "@/types/auth";

const AUTH_USERS_KEY = "quotegen:v1:auth:users";
const AUTH_SESSION_KEY = "quotegen:v1:auth:session";
const DEFAULT_QUOTE_LIMIT = 30;

type SubscriptionPlan = AuthUser["subscriptionPlan"];

export const ADMIN_CREDENTIALS = {
  name: "digiteq",
  email: "info.digiteq00@gmail.com",
  password: "147852",
} as const;

const DUMMY_USERS: StoredAuthUser[] = [
  {
    id: "demo-user-1",
    name: "Aarav Mehta",
    email: "aarav@acmebuild.com",
    password: "password123",
    createdAt: "2026-01-07T08:45:00.000Z",
    role: "user",
    subscriptionPlan: "pro",
    quoteGenerationLimit: 25,
    lastLoginAt: "2026-04-20T09:15:00.000Z",
  },
  {
    id: "demo-user-2",
    name: "Priya Sharma",
    email: "priya@urbanfabric.in",
    password: "password123",
    createdAt: "2026-01-19T11:20:00.000Z",
    role: "user",
    subscriptionPlan: "pro",
    quoteGenerationLimit: 80,
    lastLoginAt: "2026-04-19T16:42:00.000Z",
  },
  {
    id: "demo-user-3",
    name: "Rohan Patel",
    email: "rohan@sunlineprojects.com",
    password: "password123",
    createdAt: "2026-02-03T07:10:00.000Z",
    role: "user",
    subscriptionPlan: "free",
    quoteGenerationLimit: 10,
    lastLoginAt: null,
  },
  {
    id: "demo-user-4",
    name: "Neha Verma",
    email: "neha@elementspaces.in",
    password: "password123",
    createdAt: "2026-02-22T13:05:00.000Z",
    role: "user",
    subscriptionPlan: "enterprise",
    quoteGenerationLimit: 250,
    lastLoginAt: "2026-04-21T04:30:00.000Z",
  },
];

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

function normalizeSubscriptionPlan(plan: unknown): SubscriptionPlan {
  if (plan === "pro" || plan === "enterprise") return plan;
  if (plan === "starter") return "pro";
  return "free";
}

function normalizeStoredUser(user: Partial<StoredAuthUser>): StoredAuthUser {
  const createdAt = typeof user.createdAt === "string" ? user.createdAt : new Date().toISOString();
  const password = typeof user.password === "string" ? user.password : "";

  return {
    id: user.id || crypto.randomUUID(),
    name: typeof user.name === "string" ? user.name : "",
    email: normalizeEmail(typeof user.email === "string" ? user.email : ""),
    password,
    createdAt,
    role: user.role === "admin" ? "admin" : "user",
    subscriptionPlan: normalizeSubscriptionPlan(user.subscriptionPlan),
    quoteGenerationLimit:
      typeof user.quoteGenerationLimit === "number" && Number.isFinite(user.quoteGenerationLimit)
        ? Math.max(0, Math.floor(user.quoteGenerationLimit))
        : DEFAULT_QUOTE_LIMIT,
    lastLoginAt: typeof user.lastLoginAt === "string" ? user.lastLoginAt : null,
  };
}

export function getStoredUsers(): StoredAuthUser[] {
  const storage = getLocalStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(AUTH_USERS_KEY);
    if (!raw) return seedDummyUsersIfMissing(storage);
    const parsed = JSON.parse(raw) as Partial<StoredAuthUser>[];
    if (!Array.isArray(parsed)) return seedDummyUsersIfMissing(storage);
    const normalizedUsers = parsed.map(normalizeStoredUser);
    if (normalizedUsers.length === 0) return seedDummyUsersIfMissing(storage);
    storage.setItem(AUTH_USERS_KEY, JSON.stringify(normalizedUsers));
    return normalizedUsers;
  } catch {
    return seedDummyUsersIfMissing(storage);
  }
}

function saveUsers(users: StoredAuthUser[]): void {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function seedDummyUsersIfMissing(storage: Storage): StoredAuthUser[] {
  const normalizedSeedUsers = DUMMY_USERS.map(normalizeStoredUser);
  storage.setItem(AUTH_USERS_KEY, JSON.stringify(normalizedSeedUsers));

  normalizedSeedUsers.forEach((user, index) => {
    const usage = Math.min(user.quoteGenerationLimit, (index + 1) * 3);
    storage.setItem(`quotegen:v1:quotes:${user.id}`, String(usage));
  });

  return normalizedSeedUsers;
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

export function isAdminSession(user: AuthUser | null): boolean {
  return Boolean(user?.role === "admin" && normalizeEmail(user.email) === ADMIN_CREDENTIALS.email);
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
  if (normalizedEmail === ADMIN_CREDENTIALS.email) {
    return { ok: false, error: "This email is reserved for admin access." };
  }

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
    role: "user",
    subscriptionPlan: "free",
    quoteGenerationLimit: DEFAULT_QUOTE_LIMIT,
    lastLoginAt: new Date().toISOString(),
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

  if (normalizedEmail === ADMIN_CREDENTIALS.email && payload.password === ADMIN_CREDENTIALS.password) {
    const adminUser: AuthUser = {
      id: "quotegen-admin",
      name: "Digiteq",
      email: ADMIN_CREDENTIALS.email,
      createdAt: "2026-01-01T00:00:00.000Z",
      role: "admin",
      subscriptionPlan: "enterprise",
      quoteGenerationLimit: 999999,
      lastLoginAt: new Date().toISOString(),
    };
    saveSession(adminUser);
    return { ok: true, user: adminUser };
  }

  const matchedUserIndex = users.findIndex(
    user => normalizeEmail(user.email) === normalizedEmail && user.password === payload.password,
  );

  if (matchedUserIndex < 0) {
    return { ok: false, error: "Invalid email or password." };
  }

  const matchedUser = {
    ...users[matchedUserIndex],
    lastLoginAt: new Date().toISOString(),
  };
  const nextUsers = [...users];
  nextUsers[matchedUserIndex] = matchedUser;
  saveUsers(nextUsers);

  const publicUser = toPublicUser(matchedUser);
  saveSession(publicUser);
  return { ok: true, user: publicUser };
}

export function createUserByAdmin(payload: SignUpPayload & { subscriptionPlan: SubscriptionPlan; quoteGenerationLimit: number }) {
  const users = getStoredUsers();
  const normalizedEmail = normalizeEmail(payload.email);
  if (normalizedEmail === ADMIN_CREDENTIALS.email) {
    return { ok: false as const, error: "This email is reserved for the admin account." };
  }
  const existingUser = users.find(user => normalizeEmail(user.email) === normalizedEmail);
  if (existingUser) return { ok: false as const, error: "A user with this email already exists." };

  const user: StoredAuthUser = {
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    email: normalizedEmail,
    password: payload.password,
    createdAt: new Date().toISOString(),
    role: "user",
    subscriptionPlan: normalizeSubscriptionPlan(payload.subscriptionPlan),
    quoteGenerationLimit: Math.max(0, Math.floor(payload.quoteGenerationLimit)),
    lastLoginAt: null,
  };
  saveUsers([user, ...users]);
  return { ok: true as const, user: toPublicUser(user) };
}

export function updateUserByAdmin(
  userId: string,
  payload: {
    name: string;
    email: string;
    subscriptionPlan: SubscriptionPlan;
    quoteGenerationLimit: number;
    password?: string;
  },
) {
  const users = getStoredUsers();
  const targetIndex = users.findIndex(user => user.id === userId);
  if (targetIndex < 0) return { ok: false as const, error: "User not found." };

  const normalizedEmail = normalizeEmail(payload.email);
  if (normalizedEmail === ADMIN_CREDENTIALS.email) {
    return { ok: false as const, error: "This email is reserved for the admin account." };
  }
  const duplicateUser = users.find(user => user.id !== userId && normalizeEmail(user.email) === normalizedEmail);
  if (duplicateUser) return { ok: false as const, error: "Another user already uses this email." };

  const current = users[targetIndex];
  const updated: StoredAuthUser = {
    ...current,
    name: payload.name.trim(),
    email: normalizedEmail,
    subscriptionPlan: normalizeSubscriptionPlan(payload.subscriptionPlan),
    quoteGenerationLimit: Math.max(0, Math.floor(payload.quoteGenerationLimit)),
    password: payload.password?.trim() ? payload.password : current.password,
  };

  const nextUsers = [...users];
  nextUsers[targetIndex] = updated;
  saveUsers(nextUsers);

  const session = getCurrentUser();
  if (session && session.id === updated.id) {
    saveSession(toPublicUser(updated));
  }

  return { ok: true as const, user: toPublicUser(updated) };
}

export function deleteUserByAdmin(userId: string) {
  const users = getStoredUsers();
  const exists = users.some(user => user.id === userId);
  if (!exists) return { ok: false as const, error: "User not found." };
  saveUsers(users.filter(user => user.id !== userId));

  const session = getCurrentUser();
  if (session?.id === userId) {
    saveSession(null);
  }
  return { ok: true as const };
}

export function getManagedUsers(): AuthUser[] {
  return getStoredUsers().map(toPublicUser);
}

export function incrementQuoteGenerationForCurrentUser() {
  const session = getCurrentUser();
  if (!session) return { ok: false as const, error: "You are not logged in." };
  if (session.role === "admin") return { ok: true as const, user: session };

  const users = getStoredUsers();
  const targetIndex = users.findIndex(user => user.id === session.id);
  if (targetIndex < 0) return { ok: false as const, error: "User account not found." };

  const user = users[targetIndex];
  if (user.quoteGenerationLimit <= 0) {
    return { ok: false as const, error: "Your quote generation limit is 0. Contact admin." };
  }

  const generatedCount = Number.parseInt(window.localStorage.getItem(`quotegen:v1:quotes:${user.id}`) || "0", 10) || 0;
  if (generatedCount >= user.quoteGenerationLimit) {
    return {
      ok: false as const,
      error: `You reached your quote generation limit (${user.quoteGenerationLimit}). Contact admin for an update.`,
    };
  }

  window.localStorage.setItem(`quotegen:v1:quotes:${user.id}`, String(generatedCount + 1));
  return { ok: true as const, user: toPublicUser(user), remaining: user.quoteGenerationLimit - (generatedCount + 1) };
}

export function getUserQuoteUsage(userId: string): number {
  if (typeof window === "undefined") return 0;
  return Number.parseInt(window.localStorage.getItem(`quotegen:v1:quotes:${userId}`) || "0", 10) || 0;
}

export function getCurrentUserQuoteQuota() {
  const session = getCurrentUser();
  if (!session) return { canGenerate: false as const, used: 0, limit: 0, remaining: 0 };
  if (session.role === "admin") {
    return {
      canGenerate: true as const,
      used: 0,
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
    };
  }

  const users = getStoredUsers();
  const user = users.find(item => item.id === session.id);
  if (!user) return { canGenerate: false as const, used: 0, limit: 0, remaining: 0 };

  const used = getUserQuoteUsage(user.id);
  const remaining = Math.max(0, user.quoteGenerationLimit - used);
  return {
    canGenerate: used < user.quoteGenerationLimit,
    used,
    limit: user.quoteGenerationLimit,
    remaining,
  };
}

export function logout(): void {
  saveSession(null);
}
