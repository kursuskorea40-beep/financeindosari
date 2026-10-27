// ============================================================
// HARDCODED ENV VARS — PRODUCTION ONLY
// Force override bila .env bake SQLite URL atau Netlify env vars tidak terbaca
// ============================================================
if (process.env.NODE_ENV === 'production') {
  process.env.DATABASE_URL = "postgresql://postgres.dpzegmrezhtbsttdibsq:%40Babadan0107@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";
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
