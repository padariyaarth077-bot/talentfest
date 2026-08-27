import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { execute, query, queryOne } from "./index";

const COOKIE_NAME = "tf_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthUser = {
  id: string;
  email: string;
  role?: string | null;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing required environment variable: SESSION_SECRET");
  return secret;
}

function cookieValue() {
  const cookie = getRequestHeader("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function setSessionCookie(token: string, maxAge = MAX_AGE_SECONDS) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  setResponseHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`,
  );
}

async function userWithRole(id: string): Promise<AuthUser | null> {
  const user = await queryOne<{ id: string; email: string }>(
    "SELECT id, email FROM auth_users WHERE id = ? LIMIT 1",
    [id],
  );
  if (!user) return null;
  const role = await queryOne<{ role: string }>(
    "SELECT role FROM user_roles WHERE user_id = ? ORDER BY role = 'admin' DESC LIMIT 1",
    [id],
  );
  return { ...user, role: role?.role ?? null };
}

export async function currentUser(): Promise<AuthUser | null> {
  const token = cookieValue();
  if (!token) return null;
  try {
    const payload = jwt.verify(token, sessionSecret()) as { sub?: string };
    return payload.sub ? userWithRole(payload.sub) : null;
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string, adminOnly = false) {
  const user = await queryOne<{ id: string; email: string; password_hash: string }>(
    "SELECT id, email, password_hash FROM auth_users WHERE email = ? LIMIT 1",
    [email.trim().toLowerCase()],
  );
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error("Invalid email or password.");
  }
  const role = await queryOne<{ role: string }>(
    "SELECT role FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1",
    [user.id, "admin"],
  );
  if (adminOnly && !role) throw new Error("This account is not authorized for admin access.");
  await execute("UPDATE auth_users SET last_sign_in_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
  const token = jwt.sign({ sub: user.id }, sessionSecret(), { expiresIn: MAX_AGE_SECONDS });
  setSessionCookie(token);
  return { user: { id: user.id, email: user.email, role: role?.role ?? "participant" } };
}

export async function signUp(email: string, password: string, fullName: string, phone?: string) {
  const id = crypto.randomUUID();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  await execute(
    "INSERT INTO auth_users (id, email, password_hash, email_confirmed) VALUES (?, ?, ?, 1)",
    [id, normalizedEmail, passwordHash],
  );
  await execute("INSERT INTO profiles (id, full_name, phone) VALUES (?, ?, ?)", [
    id,
    fullName || normalizedEmail,
    phone || null,
  ]);
  await execute("INSERT INTO user_roles (user_id, role) VALUES (?, 'participant')", [id]);
  const token = jwt.sign({ sub: id }, sessionSecret(), { expiresIn: MAX_AGE_SECONDS });
  setSessionCookie(token);
  return { user: { id, email: normalizedEmail, role: "participant" } };
}

export async function signOut() {
  setSessionCookie("", 0);
  return { ok: true };
}

export async function requireAdmin(userId: string) {
  const rows = await query("SELECT id FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1", [userId]);
  if (rows.length === 0) throw new Error("Admin access required.");
}
