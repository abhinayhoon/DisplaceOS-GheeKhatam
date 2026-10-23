import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8, autoSignIn: false },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "RELIEF_CAMP", input: false },
      campId: { type: "string", required: false, input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
  rateLimit: { enabled: true, window: 60, max: 10, customRules: { "/get-session": false } },
  plugins: [nextCookies()],
});
