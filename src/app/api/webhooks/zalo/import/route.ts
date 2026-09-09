import { NextResponse } from "next/server";
import { processZaloData } from "@/lib/zalo-processor";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await processZaloData(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Zalo import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi xử lý bóc tách dữ liệu Zalo vào Firestore: " + error.message,
      },
      { status: 500 }
    );
  }
}
