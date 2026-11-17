import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    // Makes session.user required. id is already id?: string on DefaultUser.
    user: DefaultSession["user"] & {};
  }
}
