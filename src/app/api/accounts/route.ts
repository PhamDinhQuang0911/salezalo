import { NextResponse } from "next/server";
import { getAccounts, saveAccount } from "@/lib/firestore-db";

export async function GET() {
  try {
    const accounts = await getAccounts();
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, name, scrape_webhook_url, send_webhook_url } = body;

    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập Số điện thoại Zalo" }, { status: 400 });
    }

    const account = await saveAccount({
      phone: phone.trim(),
      name: name?.trim(),
      scrape_webhook_url: scrape_webhook_url?.trim(),
      send_webhook_url: send_webhook_url?.trim(),
    });

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
