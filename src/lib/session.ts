import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";

const COOKIE = "slopsweep_session";

function secretKey() {
  const secret =
    process.env.AUTH_SECRET || "dev-only-insecure-slopsweep-secret";
  // A256GCM needs exactly 32 bytes
  return createHash("sha256").update(secret).digest();
}

export type SessionUser = {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  token: string;
};

export async function sealSession(user: SessionUser): Promise<string> {
  return new EncryptJWT({
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    token: user.token,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(secretKey());
}

export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtDecrypt(raw, secretKey());
    if (
      typeof payload.token !== "string" ||
      typeof payload.login !== "string"
    ) {
      return null;
    }
    return {
      login: payload.login,
      name: typeof payload.name === "string" ? payload.name : null,
      avatarUrl:
        typeof payload.avatarUrl === "string" ? payload.avatarUrl : null,
      token: payload.token,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser) {
  const jar = await cookies();
  const value = await sealSession(user);
  jar.set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export { COOKIE };
