// ============================================================
// HARDCODED ENV VARS FALLBACK — untuk Netlify production
// (bila Netlify dashboard env vars tidak terbaca saat runtime)
// Set SEBELUM Prisma client initialize
// ============================================================
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres.dpzegmrezhtbsttdibsq:%40Babadan0107@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = "postgresql://postgres.dpzegmrezhtbsttdibsq:%40Babadan0107@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";
}
// ============================================================

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
