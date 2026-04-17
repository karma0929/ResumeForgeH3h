export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumePdfDocument } from "@/components/pdf/resume-document";
import { getSessionIdentity } from "@/lib/auth";
import { hasFeatureAccess } from "@/lib/billing/guards";
import { getAppSnapshot, getExportableVersion } from "@/lib/data";
import { ValidationError } from "@/lib/errors";
import { logEvent } from "@/lib/logger";
import { slugify } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("versionId");
    const requestedFormat = searchParams.get("format");
    const format = requestedFormat === "txt" ? "txt" : requestedFormat === "pdf" || !requestedFormat ? "pdf" : null;
    const identity = await getSessionIdentity();

    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!versionId) {
      throw new ValidationError("Missing versionId.");
    }

    if (versionId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(versionId)) {
      throw new ValidationError("Invalid versionId.");
    }

    if (!format) {
      throw new ValidationError("Invalid format.");
    }

    const snapshot = await getAppSnapshot(identity);

    if (!hasFeatureAccess(snapshot.subscription?.plan, "priority_export")) {
      return NextResponse.redirect(
        new URL("/dashboard/billing?upgradeFeature=priority_export&blocked=1", request.url),
      );
    }

    const version = await getExportableVersion(versionId);

    if (!version || version.userId !== snapshot.user.id) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    if (format === "txt") {
      return new NextResponse(version.content, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slugify(version.name)}.txt"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdf = await renderToBuffer(ResumePdfDocument({ version }));

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slugify(version.name)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logEvent("error", "Resume export failed.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
