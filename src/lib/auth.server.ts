import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db/index.server";
import * as schema from "@/db/schema";
import { siteConfig } from "@/config/site";
import { env } from "@/lib/env.server";
import { ac, ADMIN_ROLES, DEFAULT_ROLE, roles } from "@/lib/permissions";

export const auth = betterAuth({
  appName: siteConfig.name,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: { cookiePrefix: `ngodingpakeai-${siteConfig.id}` },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Add an email provider before enabling verification or password recovery.
    requireEmailVerification: false,
  },
  // Akun pertama klinik di server baru: email di CLINIC_ADMIN_EMAILS otomatis
  // mendapat peran admin dan pemilik saat mendaftar. Peran lain tetap diatur
  // lewat Kelola klinik (dokter) atau npm run role:set.
  databaseHooks: {
    user: {
      create: {
        before: async (user) =>
          env.CLINIC_ADMIN_EMAILS.includes(user.email.trim().toLowerCase())
            ? { data: { ...user, role: "admin,pemilik" } }
            : undefined,
      },
    },
  },
  plugins: [
    // Roles come from the access control in lib/permissions.ts. New accounts get
    // DEFAULT_ROLE; `role` is not accepted from signup input, so nobody can
    // grant themselves one. Use npm run role:set to promote an account.
    admin({
      ac,
      roles,
      defaultRole: DEFAULT_ROLE,
      adminRoles: ADMIN_ROLES,
    }),
    // Keep tanstackStartCookies() last so it observes every other plugin's cookies.
    tanstackStartCookies(),
  ],
});
