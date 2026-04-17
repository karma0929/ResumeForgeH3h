import { NextResponse } from "next/server";
import { describeEnvironment, getLaunchBlockers } from "@/lib/env";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET() {
  const launchBlockers = getLaunchBlockers();
  const dbConfigured = isDatabaseConfigured;
  let database = "unconfigured";

  if (dbConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "ok";
    } catch {
      database = "error";
    }
  }

  const ok = launchBlockers.length === 0 && (database === "ok" || database === "unconfigured");

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      environment: describeEnvironment(),
      database,
      launchBlockers,
    },
    {
      status: ok ? 200 : 503,
    },
  );
}
