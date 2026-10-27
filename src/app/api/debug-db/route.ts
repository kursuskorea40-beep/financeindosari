// DEBUG endpoint — test database connection, Prisma client, User table
// Akses: https://URL-NETLIFY-ANDA.netlify.app/api/debug-db
// Akan return JSON detail tentang status DB connection

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL_set: !!process.env.DATABASE_URL,
      DATABASE_URL_starts_with: process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 50) + "..." : null,
      DIRECT_URL_set: !!process.env.DIRECT_URL,
      DIRECT_URL_starts_with: process.env.DIRECT_URL ? process.env.DIRECT_URL.slice(0, 50) + "..." : null,
      NEXTAUTH_SECRET_set: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_SECRET_length: process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.length : 0,
      NEXTAUTH_URL_set: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_URL_value: process.env.NEXTAUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
    },
    tests: {},
  };

  // Test 1: Prisma connection + User query
  try {
    const userCount = await db.user.count();
    result.tests.userCount = { ok: true, count: userCount };

    // Test 2: Get specific user admin1
    const adminUser = await db.user.findFirst({
      where: { username: "admin1" },
      select: {
        id: true, username: true, name: true, role: true, isActive: true,
        passwordHash: true, cabangId: true,
      },
    });
    if (adminUser) {
      result.tests.admin1User = {
        ok: true,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          name: adminUser.name,
          role: adminUser.role,
          isActive: adminUser.isActive,
          passwordHash_starts: adminUser.passwordHash ? adminUser.passwordHash.slice(0, 20) + "..." : null,
          passwordHash_length: adminUser.passwordHash ? adminUser.passwordHash.length : 0,
          cabangId: adminUser.cabangId,
        },
      };

      // Test 3: Verify bcrypt password hash works
      try {
        const match = await bcrypt.compare("admin123", adminUser.passwordHash || "");
        result.tests.bcryptVerify = { ok: true, password_match: match };
      } catch (e: any) {
        result.tests.bcryptVerify = { ok: false, error: e.message };
      }
    } else {
      result.tests.admin1User = { ok: false, error: "admin1 not found in DB" };
    }
  } catch (e: any) {
    result.tests.userCount = {
      ok: false,
      error: e.message,
      stack: e.stack ? e.stack.split("\n").slice(0, 5) : null,
    };
  }

  // Test 4: Count Cabang
  try {
    const cabangCount = await db.cabang.count();
    result.tests.cabangCount = { ok: true, count: cabangCount };
  } catch (e: any) {
    result.tests.cabangCount = { ok: false, error: e.message };
  }

  // Test 5: Count Setting
  try {
    const settingCount = await db.setting.count();
    result.tests.settingCount = { ok: true, count: settingCount };
  } catch (e: any) {
    result.tests.settingCount = { ok: false, error: e.message };
  }

  // Summary
  const allOk = Object.values(result.tests).every((t: any) => t && t.ok === true);
  result.summary = {
    all_ok: allOk,
    message: allOk
      ? "✓ All tests passed — DB connection works, User table accessible, bcrypt verification works. Login should succeed."
      : "✗ Some tests failed — see details above. The failing test indicates what's broken.",
  };

  return NextResponse.json(result, { status: 200 });
}
