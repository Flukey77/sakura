// src/types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      username?: string;
      role?: "ADMIN" | "EMPLOYEE";
    };
  }

  interface User {
    id: string;
    username: string;
    role: "ADMIN" | "EMPLOYEE";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: "ADMIN" | "EMPLOYEE";
  }
}

export {};
