// src/lib/auth.ts
import "server-only";

import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/** เรียกใน Route Handlers/Server Components */
export async function auth(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export { authOptions };
