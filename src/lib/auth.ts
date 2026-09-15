// Sistem autentikasi sederhana dengan bcryptjs untuk hash password
import bcrypt from 'bcryptjs';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// Hash password untuk pertama kali setup (jalankan sekali lalu simpan hash di .env)
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Verifikasi login
export async function verifyLogin(username: string, password: string): Promise<boolean> {
  // Jika tidak ada password hash di environment, tolak semua login
  if (!ADMIN_PASSWORD_HASH) {
    return false;
  }
  
  // Cek username
  if (username !== ADMIN_USERNAME) {
    return false;
  }
  
  // Verifikasi password
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

// Generate session token sederhana (untuk development/production tanpa database)
export function generateSessionToken(): string {
  const random = Math.random().toString(36).substring(2) + Date.now().toString(36);
  return Buffer.from(random).toString('base64');
}

// In-memory session store (akan hilang saat restart, tapi cukup untuk single-instance)
const sessions = new Map<string, { username: string; expiresAt: number }>();

export function createSession(username: string): string {
  const token = generateSessionToken();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 jam
  sessions.set(token, { username, expiresAt });
  return token;
}

export function validateSession(token: string): { username: string } | null {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  
  // Cek expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  
  return { username: session.username };
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

// Cleanup expired sessions (dijalankan setiap 1 jam)
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000);
