import { doc, getDoc, writeBatch, arrayUnion } from "firebase/firestore";
import { firestore, collections } from "./firestore-db";

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
 * and saves records directly into Google Cloud Firestore.
 */
export async function processZaloData(payload: any): Promise<IngestionResult> {
  let groupInfo: ZaloGroupInfo | null = null;
  let memberIds: string[] = [];
  let profiles: Record<string, ZaloMemberProfile> = {};

  // Case A: Payload is an array of objects
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (!item) continue;
      // Check for group response format
      if (item.response) {
        const resp = item.response;
        const avt = resp.avatar || resp.avt || resp.fullAvt || resp.groupAvatar || resp.picture || "";
        groupInfo = {
          groupId: String(resp.groupId || resp.grid || resp.id || ""),
          name: String(resp.name || resp.groupName || resp.title || "Nhóm Zalo"),
          desc: String(resp.desc || resp.description || ""),
          creatorId: resp.creatorId ? String(resp.creatorId) : "",
          adminIds: Array.isArray(resp.adminIds) ? resp.adminIds.map(String) : [],
          avt: avt,
          fullAvt: avt,
          totalMember: Number(resp.totalMember || 0),
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
      const resp = payload.response;
      const avt = resp.avatar || resp.avt || resp.fullAvt || resp.groupAvatar || resp.picture || "";
      groupInfo = {
        groupId: String(resp.groupId || resp.grid || resp.id || ""),
        name: String(resp.name || resp.groupName || resp.title || "Nhóm Zalo"),
        desc: String(resp.desc || resp.description || ""),
        creatorId: resp.creatorId ? String(resp.creatorId) : "",
        adminIds: Array.isArray(resp.adminIds) ? resp.adminIds.map(String) : [],
        avt: avt,
        fullAvt: avt,
        totalMember: Number(resp.totalMember || 0),
      };
    } else if (payload.groupId || payload.grid || payload.name) {
      const avt = payload.avatar || payload.avt || payload.fullAvt || payload.groupAvatar || payload.picture || "";
      groupInfo = {
        groupId: String(payload.groupId || payload.grid || payload.id || "GROUP_" + Date.now()),
        name: String(payload.name || payload.groupName || payload.title || "Nhóm Zalo"),
        desc: String(payload.desc || payload.description || ""),
        creatorId: payload.creatorId ? String(payload.creatorId) : "",
        adminIds: Array.isArray(payload.adminIds) ? payload.adminIds.map(String) : [],
        avt: avt,
        fullAvt: avt,
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

  const groupId = groupInfo?.groupId || "GROUP_" + Date.now();
  let groupName = groupInfo?.name || "Nhóm Zalo (" + groupId + ")";

  // Preserve existing custom group name from Firestore if incoming name is just fallback
  try {
    const existingGroupSnap = await getDoc(doc(firestore, collections.groups, groupId));
    if (existingGroupSnap.exists()) {
      const existingData = existingGroupSnap.data();
      if (existingData?.name && !existingData.name.includes(groupId)) {
        groupName = existingData.name;
      }
    }
  } catch (e) {
    // Ignore error
  }
  const creatorId = groupInfo?.creatorId || "";
  const adminIds = groupInfo?.adminIds || [];

  const adminSet = new Set<string>();
  if (creatorId) adminSet.add(creatorId);
  adminIds.forEach((id) => adminSet.add(id));

  if (memberIds.length === 0 && Object.keys(profiles).length > 0) {
    memberIds = Object.keys(profiles);
  }

  let regularMembersSaved = 0;
  let adminsExcluded = 0;

  // Process members and prepare batch writes (chunks of 400 to stay safely under Firestore's 500 limit)
  const BATCH_SIZE = 400;
  let currentBatch = writeBatch(firestore);
  let opCount = 0;

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

    // Determine friend status from payload or profiles
    const friendSet = new Set<string>(
      Array.isArray(payload?.friendIds) ? payload.friendIds.map(String) : []
    );
    const pendingSet = new Set<string>(
      Array.isArray(payload?.pendingIds) ? payload.pendingIds.map(String) : []
    );

    let isFriendVal = 0;
    if ((profile as any).is_friend !== undefined) {
      isFriendVal = Number((profile as any).is_friend);
    } else if (friendSet.has(uid)) {
      isFriendVal = 1;
    } else if (pendingSet.has(uid)) {
      isFriendVal = 2;
    }

    const memberDocRef = doc(firestore, collections.members, uid);
    currentBatch.set(
      memberDocRef,
      {
        zalo_id: uid,
        display_name: displayName,
        zalo_name: zaloName,
        avatar: avatar,
        account_status: accountStatus,
        global_id: globalId,
        is_admin: isAdmin ? 1 : 0,
        role: role,
        is_friend: isFriendVal,
        group_ids: arrayUnion(groupId),
        groups_list: groupName,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );


    opCount++;
    if (opCount >= BATCH_SIZE) {
      await currentBatch.commit();
      currentBatch = writeBatch(firestore);
      opCount = 0;
    }
  }

  // 2. Save group info
  const groupDocRef = doc(firestore, collections.groups, groupId);
  currentBatch.set(
    groupDocRef,
    {
      group_id: groupId,
      name: groupName,
      description: groupInfo?.desc || "",
      creator_id: creatorId,
      admin_ids: adminIds,
      avatar: groupInfo?.avt || "",
      full_avatar: groupInfo?.fullAvt || "",
      total_member: memberIds.length,
      filtered_member_count: regularMembersSaved,
      admin_count: adminsExcluded,
      status: "completed",
      last_scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
  opCount++;

  // Commit any remaining operations
  if (opCount > 0) {
    await currentBatch.commit();
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
    message: `Đã cào nhóm "${groupName}": Thu được ${regularMembersSaved} thành viên tiềm năng; Lọc bỏ ${adminsExcluded} trưởng/phó nhóm trên Firestore.`,
  };
}
