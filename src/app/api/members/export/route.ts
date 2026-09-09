import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("group_id") || "";
    const role = searchParams.get("role") || "member";
    const format = searchParams.get("format") || "xlsx";

    const db = getDb();

    let whereConditions: string[] = [];
    let params: any[] = [];

    if (role === "member") {
      whereConditions.push("m.is_admin = 0");
    } else if (role === "admin_only") {
      whereConditions.push("m.is_admin = 1");
    }

    if (groupId) {
      whereConditions.push("m.zalo_id IN (SELECT member_id FROM group_members WHERE group_id = ?)");
      params.push(groupId);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const members = db.prepare(`
      SELECT 
        m.zalo_id,
        m.display_name,
        m.zalo_name,
        m.role,
        m.is_admin,
        m.created_at,
        (SELECT GROUP_CONCAT(g.name, ', ') 
         FROM group_members gm 
         JOIN groups g ON gm.group_id = g.group_id 
         WHERE gm.member_id = m.zalo_id) as groups_list
      FROM members m
      ${whereClause}
      ORDER BY m.id ASC
    `).all(...params) as any[];

    // Format data for Excel
    const data = members.map((m, index) => ({
      "STT": index + 1,
      "Zalo UID": m.zalo_id,
      "Tên hiển thị": m.display_name,
      "Tên Zalo": m.zalo_name || "",
      "Vai trò": m.role === "creator" ? "Trưởng nhóm" : m.role === "admin" ? "Phó nhóm" : "Thành viên",
      "Thuộc nhóm": m.groups_list || "",
      "Ngày thu thập": m.created_at || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ThanhVienZalo");

    // Auto fit column widths
    worksheet["!cols"] = [
      { wch: 6 },  // STT
      { wch: 24 }, // UID
      { wch: 25 }, // Display Name
      { wch: 25 }, // Zalo Name
      { wch: 15 }, // Role
      { wch: 40 }, // Groups
      { wch: 20 }, // Created At
    ];

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="zalo_members_${Date.now()}.csv"`,
        },
      });
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="zalo_members_${Date.now()}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
