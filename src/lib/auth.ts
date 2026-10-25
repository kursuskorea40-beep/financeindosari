import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "indosari-akuntansi-2026-secret-key-change-in-prod",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    // We do not have a separate /login page; auth form rendered inside Home
    // when unauthenticated. We use signIn("credentials", ...) directly.
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await db.user.findFirst({
          where: {
            username: credentials.username.toLowerCase(),
            isActive: true,
          },
          include: { cabang: true },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name || user.username,
          email: user.username,
          role: user.role,
          cabangId: user.cabangId || "",
          cabangNama: user.cabang?.nama || "Semua Cabang",
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.cabangId = (user as any).cabangId;
        token.cabangNama = (user as any).cabangNama;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).cabangId = token.cabangId;
        (session.user as any).cabangNama = token.cabangNama;
      }
      return session;
    },
  },
};

export { authOptions };
