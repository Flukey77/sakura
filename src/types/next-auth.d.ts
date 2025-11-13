import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: "ADMIN" | "EMPLOYEE";
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: "ADMIN" | "EMPLOYEE";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "ADMIN" | "EMPLOYEE";
  }
}
