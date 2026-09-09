import { getDb } from "./db";

export interface ZaloGroupInfo {
  groupId: string;
  name: string;
  desc?: string;
  creatorId?: string;
  adminIds?: string[];
  avt?: string;
  fullAvt?: string;
  totalMember?: number;
  invite_link?: string;
}

export interface ZaloMemberProfile {
  id?: string;
  displayName?: string;
  zaloName?: string;
  avatar?: string;
  accountStatus?: number;
  globalId?: string;
  phone?: string;
}

export interface IngestionResult {
  success: boolean;
  groupId: string;
  groupName: string;
  totalProcessed: number;
  savedMembers: number;
  excludedAdmins: number;
  details: {
    creatorId?: string;
    adminIds: string[];
    regularMemberCount: number;
  };
  message: string;
}

/**
 * Main ingestion function that parses, filters out creator and admins,
 * and saves records into SQLite.
 */
export function processZaloData(payload: any): IngestionResult {
  const db = getDb();

  let groupInfo: ZaloGroupInfo | null = null;
  let memberIds: string[] = [];
  let profiles: Record<string, ZaloMemberProfile> = {};

  // Case A: Payload is an array of objects
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (!item) continue;
      // Check for group response format
      if (item.response && (item.response.groupId || item.response.name)) {
        groupInfo = {
          groupId: String(item.response.groupId || ""),
          name: String(item.response.name || "Nhóm Zalo không tên"),
          desc: String(item.response.desc || ""),
          creatorId: item.response.creatorId ? String(item.response.creatorId) : "",
          adminIds: Array.isArray(item.response.adminIds) ? item.response.adminIds.map(String) : [],
          avt: item.response.avt || "",
          fullAvt: item.response.fullAvt || "",
          totalMember: Number(item.response.totalMember || 0),
        };
      }
      // Check for members & profiles format
      if (item.memberIds || item.profiles) {
        if (Array.isArray(item.memberIds)) {
          memberIds = item.memberIds.map(String);
        }
        if (item.profiles && typeof item.profiles === "object") {
          profiles = { ...profiles, ...item.profiles };
        }
      }
    }
  } else if (typeof payload === "object" && payload !== null) {
    // Case B: Unified object
    if (payload.response) {
      groupInfo = {
        groupId: String(payload.response.groupId || ""),
        name: String(payload.response.name || "Nhóm Zalo"),
        desc: String(payload.response.desc || ""),
        creatorId: payload.response.creatorId ? String(payload.response.creatorId) : "",
        adminIds: Array.isArray(payload.response.adminIds) ? payload.response.adminIds.map(String) : [],
        avt: payload.response.avt || "",
        fullAvt: payload.response.fullAvt || "",
        totalMember: Number(payload.response.totalMember || 0),
      };
    } else if (payload.groupId) {
      groupInfo = {
        groupId: String(payload.groupId),
        name: String(payload.name || "Nhóm Zalo"),
        desc: String(payload.desc || ""),
        creatorId: payload.creatorId ? String(payload.creatorId) : "",
        adminIds: Array.isArray(payload.adminIds) ? payload.adminIds.map(String) : [],
        avt: payload.avt || payload.avatar || "",
        fullAvt: payload.fullAvt || "",
        totalMember: Number(payload.totalMember || 0),
        invite_link: payload.invite_link || "",
      };
    }

    if (Array.isArray(payload.memberIds)) {
      memberIds = payload.memberIds.map(String);
    }
    if (payload.profiles && typeof payload.profiles === "object") {
      profiles = payload.profiles;
    }
  }

  // Fallback if groupInfo not yet found but memberIds exists
  const groupId = groupInfo?.groupId || "UNKNOWN_GROUP_" + Date.now();
  const groupName = groupInfo?.name || "Nhóm Zalo (" + groupId + ")";
  const creatorId = groupInfo?.creatorId || "";
  const adminIds = groupInfo?.adminIds || [];

  const adminSet = new Set<string>();
  if (creatorId) adminSet.add(creatorId);
  adminIds.forEach((id) => adminSet.add(id));

  // If memberIds array is empty but profiles exist, derive memberIds from profiles keys
  if (memberIds.length === 0 && Object.keys(profiles).length > 0) {
    memberIds = Object.keys(profiles);
  }

  let regularMembersSaved = 0;
  let adminsExcluded = 0;

  // Run in a single transaction for maximum speed
  db.exec("BEGIN TRANSACTION;");
  try {
    // 1. Upsert group
    const existingGroup = db.prepare("SELECT group_id FROM groups WHERE group_id = ?").get(groupId);
    if (existingGroup) {
      db.prepare(`
        UPDATE groups SET
          name = COALESCE(NULLIF(?, ''), name),
          description = COALESCE(NULLIF(?, ''), description),
          creator_id = COALESCE(NULLIF(?, ''), creator_id),
          admin_ids = ?,
          avatar = COALESCE(NULLIF(?, ''), avatar),
          full_avatar = COALESCE(NULLIF(?, ''), full_avatar),
          total_member = CASE WHEN ? > 0 THEN ? ELSE total_member END,
          status = 'completed',
          last_scraped_at = datetime('now', 'localtime'),
          updated_at = datetime('now', 'localtime')
        WHERE group_id = ?
      `).run(
        groupName,
        groupInfo?.desc || "",
        creatorId,
        JSON.stringify(adminIds),
        groupInfo?.avt || "",
        groupInfo?.fullAvt || "",
        groupInfo?.totalMember || 0,
        groupInfo?.totalMember || 0,
        groupId
      );
    } else {
      db.prepare(`
        INSERT INTO groups (
          group_id, name, description, creator_id, admin_ids,
          avatar, full_avatar, total_member, status, last_scraped_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now', 'localtime'))
      `).run(
        groupId,
        groupName,
        groupInfo?.desc || "",
        creatorId,
        JSON.stringify(adminIds),
        groupInfo?.avt || "",
        groupInfo?.fullAvt || "",
        groupInfo?.totalMember || memberIds.length
      );
    }

    // 2. Process members
    const insertMemberStmt = db.prepare(`
      INSERT INTO members (
        zalo_id, display_name, zalo_name, avatar, account_status, global_id, is_admin, role, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(zalo_id) DO UPDATE SET
        display_name = COALESCE(NULLIF(excluded.display_name, 'Thành viên Zalo'), members.display_name),
        zalo_name = COALESCE(NULLIF(excluded.zalo_name, ''), members.zalo_name),
        avatar = COALESCE(NULLIF(excluded.avatar, ''), members.avatar),
        account_status = excluded.account_status,
        global_id = COALESCE(NULLIF(excluded.global_id, ''), members.global_id),
        is_admin = excluded.is_admin,
        role = excluded.role,
        updated_at = datetime('now', 'localtime')
    `);

    const insertGroupMemberStmt = db.prepare(`
      INSERT OR REPLACE INTO group_members (group_id, member_id, role, joined_at)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `);

    for (const uid of memberIds) {
      if (!uid) continue;

      const profile = profiles[uid] || {};
      const isCreator = uid === creatorId;
      const isAdminRole = adminSet.has(uid);
      const isAdmin = isCreator || isAdminRole;

      let role: "creator" | "admin" | "member" = "member";
      if (isCreator) {
        role = "creator";
        adminsExcluded++;
      } else if (isAdminRole) {
        role = "admin";
        adminsExcluded++;
      } else {
        regularMembersSaved++;
      }

      const displayName = profile.displayName || profile.zaloName || `Thành viên (${uid.slice(-4)})`;
      const zaloName = profile.zaloName || "";
      const avatar = profile.avatar || "";
      const accountStatus = profile.accountStatus || 0;
      const globalId = profile.globalId || "";

      insertMemberStmt.run(
        uid,
        displayName,
        zaloName,
        avatar,
        accountStatus,
        globalId,
        isAdmin ? 1 : 0,
        role
      );

      insertGroupMemberStmt.run(groupId, uid, role);
    }

    // Update statistics on group
    db.prepare(`
      UPDATE groups SET
        filtered_member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ? AND role = 'member'),
        admin_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ? AND role != 'member'),
        total_member = (SELECT COUNT(*) FROM group_members WHERE group_id = ?)
      WHERE group_id = ?
    `).run(groupId, groupId, groupId, groupId);

    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }

  return {
    success: true,
    groupId,
    groupName,
    totalProcessed: memberIds.length,
    savedMembers: regularMembersSaved,
    excludedAdmins: adminsExcluded,
    details: {
      creatorId,
      adminIds,
      regularMemberCount: regularMembersSaved,
    },
    message: `Đã cào nhóm "${groupName}": Thu được ${regularMembersSaved} thành viên tiềm năng; Lọc bỏ ${adminsExcluded} trưởng/phó nhóm.`,
  };
}
