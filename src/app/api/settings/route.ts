import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/firestore-db";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      success: true,
      settings: {
        n8n_scrape_webhook: settings.n8n_scrape_webhook || "",
        n8n_send_webhook: settings.n8n_send_webhook || "",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await updateSettings(body);
    return NextResponse.json({ success: true, message: "Đã lưu cài đặt trên Firestore thành công" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
