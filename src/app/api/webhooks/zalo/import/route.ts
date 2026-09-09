import { NextResponse } from "next/server";
import { processZaloData } from "@/lib/zalo-processor";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const db = getDb();
    const secretSetting = db.prepare("SELECT value FROM settings WHERE key = 'webhook_secret'").get() as { value: string } | undefined;
    const expectedSecret = secretSetting?.value;

    // Verify optional secret token header if configured
    const authHeader = request.headers.get("x-webhook-secret") || request.headers.get("authorization");
    if (expectedSecret && expectedSecret.trim() !== "") {
      if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (token !== expectedSecret.trim()) {
          return NextResponse.json({ success: false, error: "Unauthorized: Invalid webhook secret token" }, { status: 401 });
        }
      }
    }

    const body = await request.json();
    if (!body) {
      return NextResponse.json({ success: false, error: "Empty request body" }, { status: 400 });
    }

    const result = processZaloData(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error processing Zalo webhook:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
