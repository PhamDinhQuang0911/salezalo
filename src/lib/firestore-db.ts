import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  writeBatch,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { firestore } from "./firebase";

export { firestore };

// Collection References
export const collections = {
  accounts: "accounts",
  groups: "groups",
  members: "members",
  campaigns: "campaigns",
  settings: "settings",
};

// ================= ACCOUNTS =================
export async function getAccounts(): Promise<any[]> {
  const q = query(collection(firestore, collections.accounts));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAccountByPhone(phone: string): Promise<any> {
  if (!phone) return null;
  const docRef = doc(firestore, collections.accounts, phone);
  const snap = await getDoc(docRef);
  if (snap.exists()) return { id: snap.id, ...snap.data() } as any;

  // Fallback query
  const q = query(collection(firestore, collections.accounts), where("phone", "==", phone));
  const qSnap = await getDocs(q);
  if (!qSnap.empty) {
    const d = qSnap.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
}

export async function saveAccount(data: {
  phone: string;
  name?: string;
  scrape_webhook_url?: string;
  send_webhook_url?: string;
  friend_webhook_url?: string;
  sync_webhook_url?: string;
}) {
  const phone = data.phone.trim();
  const docRef = doc(firestore, collections.accounts, phone);
  const existing = await getDoc(docRef);

  const payload: any = {
    phone,
    name: data.name || (existing.exists() ? existing.data().name : `Zalo ${phone}`),
    scrape_webhook_url: data.scrape_webhook_url || "",
    send_webhook_url: data.send_webhook_url || "",
    friend_webhook_url: data.friend_webhook_url || "",
    sync_webhook_url: data.sync_webhook_url || "",
    updated_at: new Date().toISOString(),
  };

  if (!existing.exists()) {
    payload.created_at = new Date().toISOString();
    payload.total_groups_scraped = 0;
    payload.total_sent_messages = 0;
  }

  await setDoc(docRef, payload, { merge: true });
  return { id: phone, ...payload };
}

export async function deleteAccount(phoneOrId: string) {
  const docRef = doc(firestore, collections.accounts, phoneOrId);
  await deleteDoc(docRef);
  return true;
}

// ================= GROUPS =================
export async function getGroups() {
  const snap = await getDocs(collection(firestore, collections.groups));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getGroupById(groupId: string): Promise<any> {
  const docRef = doc(firestore, collections.groups, String(groupId));
  const snap = await getDoc(docRef);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

export async function saveGroup(groupId: string, data: any) {
  const docRef = doc(firestore, collections.groups, String(groupId));
  const payload = {
    ...data,
    group_id: String(groupId),
    updated_at: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  return { id: String(groupId), ...payload };
}

export async function updateGroup(groupId: string, data: { name?: string; avatar?: string; description?: string }) {
  const docRef = doc(firestore, collections.groups, String(groupId));
  const payload = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });

  if (data.name) {
    try {
      const snap = await getDocs(collection(firestore, collections.members));
      const batch = writeBatch(firestore);
      let count = 0;
      for (const d of snap.docs) {
        const m = d.data();
        const belongs =
          (Array.isArray(m.group_ids) && m.group_ids.includes(String(groupId))) ||
          m.group_id === String(groupId);
        if (belongs) {
          batch.update(d.ref, {
            groups_list: data.name,
            group_name: data.name,
          });
          count++;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.warn("Could not batch update members group name:", e);
    }
  }

  return { id: String(groupId), ...payload };
}

export async function deleteGroup(groupId: string) {
  const docRef = doc(firestore, collections.groups, String(groupId));
  await deleteDoc(docRef);
  return true;
}

// ================= MEMBERS =================
export interface MemberFilter {
  groupId?: string;
  role?: string; // 'member' | 'admin' | 'creator' | 'all'
  sentStatus?: string; // 'sent' | 'unsent' | 'all'
  friendStatus?: string; // 'friend' | 'pending' | 'not_friend' | 'all'
  strangerBlock?: string; // 'blocked' | 'open' | 'all'
  search?: string;
  sortBy?: string; // 'newest' | 'friend_first' | 'pending_first' | 'not_friend_first'
  page?: number;
  limit?: number;
}

export async function getMembers(filter: MemberFilter = {}) {
  const membersCol = collection(firestore, collections.members);
  const snap = await getDocs(membersCol);
  let allMembers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

  // In-memory filtering for rich multi-criteria filters
  if (filter.groupId && filter.groupId !== "all" && filter.groupId !== "") {
    allMembers = allMembers.filter((m) =>
      Array.isArray(m.group_ids) ? m.group_ids.includes(filter.groupId) : m.group_id === filter.groupId
    );
  }

  if (filter.role && filter.role !== "all") {
    allMembers = allMembers.filter((m) => m.role === filter.role);
  }

  if (filter.sentStatus === "sent") {
    allMembers = allMembers.filter((m) => (m.campaign_sent_count || 0) > 0);
  } else if (filter.sentStatus === "unsent") {
    allMembers = allMembers.filter((m) => !m.campaign_sent_count || m.campaign_sent_count === 0);
  }

  if (filter.friendStatus === "friend") {
    allMembers = allMembers.filter((m) => m.is_friend === 1 || m.is_friend === true);
  } else if (filter.friendStatus === "pending") {
    allMembers = allMembers.filter((m) => m.is_friend === 2);
  } else if (filter.friendStatus === "not_friend") {
    allMembers = allMembers.filter((m) => !m.is_friend || m.is_friend === 0);
  }

  if (filter.strangerBlock === "blocked") {
    allMembers = allMembers.filter((m) => m.block_stranger_msg === 1 || m.block_stranger_msg === true);
  } else if (filter.strangerBlock === "open") {
    allMembers = allMembers.filter((m) => !m.block_stranger_msg || m.block_stranger_msg === 0);
  }

  if (filter.search) {
    const s = filter.search.toLowerCase();
    allMembers = allMembers.filter(
      (m) =>
        (m.display_name && m.display_name.toLowerCase().includes(s)) ||
        (m.zalo_name && m.zalo_name.toLowerCase().includes(s)) ||
        (m.zalo_id && String(m.zalo_id).includes(s))
    );
  }

  // Sorting logic
  if (filter.sortBy === "friend_first") {
    // 1: Friend (highest), 2: Pending, 0: Not friend
    allMembers.sort((a, b) => {
      const order = (v: any) => (v === 1 ? 3 : v === 2 ? 2 : 1);
      return order(b.is_friend) - order(a.is_friend);
    });
  } else if (filter.sortBy === "pending_first") {
    // 2: Pending (highest), 1: Friend, 0: Not friend
    allMembers.sort((a, b) => {
      const order = (v: any) => (v === 2 ? 3 : v === 1 ? 2 : 1);
      return order(b.is_friend) - order(a.is_friend);
    });
  } else if (filter.sortBy === "not_friend_first") {
    // 0: Not friend (highest), 2: Pending, 1: Friend
    allMembers.sort((a, b) => {
      const order = (v: any) => (!v || v === 0 ? 3 : v === 2 ? 2 : 1);
      return order(b.is_friend) - order(a.is_friend);
    });
  } else {
    // Default: newest updated_at first
    allMembers.sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });
  }

  const total = allMembers.length;
  const page = filter.page || 1;
  const limitCount = filter.limit || 20;
  const startIdx = (page - 1) * limitCount;
  const paginatedMembers = allMembers.slice(startIdx, startIdx + limitCount);

  return {
    members: paginatedMembers,
    total,
    page,
    totalPages: Math.ceil(total / limitCount),
  };
}

export async function updateMember(zaloId: string, updates: any) {
  const docRef = doc(firestore, collections.members, String(zaloId));
  await updateDoc(docRef, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
  return true;
}

export async function deleteMember(zaloId: string) {
  const docRef = doc(firestore, collections.members, String(zaloId));
  await deleteDoc(docRef);
  return true;
}

export async function deleteMembers(zaloIds: string[]) {
  const CHUNK_SIZE = 450;
  for (let i = 0; i < zaloIds.length; i += CHUNK_SIZE) {
    const chunk = zaloIds.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(firestore);
    for (const id of chunk) {
      batch.delete(doc(firestore, collections.members, String(id)));
    }
    await batch.commit();
  }
  return true;
}

export async function deleteMembersByGroup(groupId: string) {
  const membersCol = collection(firestore, collections.members);
  const snap = await getDocs(membersCol);
  const toDeleteIds: string[] = [];
  snap.docs.forEach((d) => {
    const data = d.data();
    if (
      (Array.isArray(data.group_ids) && data.group_ids.includes(groupId)) ||
      data.group_id === groupId
    ) {
      toDeleteIds.push(d.id);
    }
  });
  if (toDeleteIds.length > 0) {
    await deleteMembers(toDeleteIds);
  }
  return toDeleteIds.length;
}

export async function deleteAllMembers() {
  const membersCol = collection(firestore, collections.members);
  const snap = await getDocs(membersCol);
  const allIds = snap.docs.map((d) => d.id);
  if (allIds.length > 0) {
    await deleteMembers(allIds);
  }
  return allIds.length;
}

// ================= CAMPAIGNS =================
export async function getCampaigns() {
  const snap = await getDocs(collection(firestore, collections.campaigns));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getCampaignById(id: string): Promise<any> {
  const docRef = doc(firestore, collections.campaigns, String(id));
  const snap = await getDoc(docRef);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

export async function saveCampaign(id: string | null, data: any) {
  let docRef;
  if (id) {
    docRef = doc(firestore, collections.campaigns, String(id));
  } else {
    docRef = doc(collection(firestore, collections.campaigns));
  }

  const payload = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  if (!id) {
    payload.created_at = new Date().toISOString();
    payload.status = payload.status || "draft";
    payload.sent_count = 0;
    payload.failed_count = 0;
  }

  await setDoc(docRef, payload, { merge: true });
  return { id: docRef.id, ...payload };
}

export async function deleteCampaign(id: string) {
  const docRef = doc(firestore, collections.campaigns, String(id));
  await deleteDoc(docRef);
  return true;
}

// Query eligible recipients for campaign with anti-spam filters
export async function getCampaignRecipients(campaign: any) {
  const snap = await getDocs(collection(firestore, collections.members));
  let members = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

  // 1. Only regular members (no admin/creator)
  members = members.filter((m) => m.is_admin === 0 && m.role === "member");

  // 2. Filter by target group if specified (ignore "all" or empty string)
  if (campaign.target_group_id && campaign.target_group_id !== "all" && campaign.target_group_id !== "") {
    members = members.filter((m) =>
      Array.isArray(m.group_ids)
        ? m.group_ids.includes(campaign.target_group_id)
        : m.group_id === campaign.target_group_id
    );
  }

  // 3. Filter by friend status if specified
  if (campaign.friend_filter === "friends_only") {
    members = members.filter((m) => m.is_friend === 1);
  } else if (campaign.friend_filter === "not_friends_only") {
    members = members.filter((m) => m.is_friend !== 1);
  }

  // 4. Cooldown days: exclude members who received campaign recently
  if (campaign.cooldown_days > 0) {
    const now = Date.now();
    const cooldownMs = campaign.cooldown_days * 24 * 60 * 60 * 1000;
    members = members.filter((m) => {
      if (!m.last_campaign_sent_at) return true;
      const sentTime = new Date(m.last_campaign_sent_at).getTime();
      return now - sentTime > cooldownMs;
    });
  }

  // 5. Stranger block filter: if not auto_friend_first, exclude members who block strangers
  if (!campaign.auto_friend_first) {
    members = members.filter((m) => !m.block_stranger_msg || m.block_stranger_msg === 0);
  }

  // Sort: If friends_first, prioritize is_friend === 1 first, then is_friend !== 1, then oldest sent time
  members.sort((a, b) => {
    if (campaign.friend_filter === "friends_first") {
      const aFriend = a.is_friend === 1 ? 1 : 0;
      const bFriend = b.is_friend === 1 ? 1 : 0;
      if (aFriend !== bFriend) {
        return bFriend - aFriend; // 1 before 0 (Friends first)
      }
    }
    const timeA = a.last_campaign_sent_at ? new Date(a.last_campaign_sent_at).getTime() : 0;
    const timeB = b.last_campaign_sent_at ? new Date(b.last_campaign_sent_at).getTime() : 0;
    return timeA - timeB;
  });

  const limitCount = campaign.max_recipients || 100;
  return members.slice(0, limitCount);
}

// ================= SETTINGS =================
export async function getSettings(): Promise<Record<string, string>> {
  const docRef = doc(firestore, collections.settings, "system");
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data() as Record<string, string>;
  return {};
}

export async function updateSettings(data: Record<string, string>) {
  const docRef = doc(firestore, collections.settings, "system");
  await setDoc(docRef, { ...data, updated_at: new Date().toISOString() }, { merge: true });
  return true;
}

// ================= STATS =================
export async function getStats() {
  const [membersSnap, groupsSnap, campaignsSnap, accountsSnap] = await Promise.all([
    getDocs(collection(firestore, collections.members)),
    getDocs(collection(firestore, collections.groups)),
    getDocs(collection(firestore, collections.campaigns)),
    getDocs(collection(firestore, collections.accounts)),
  ]);

  const members = membersSnap.docs.map((d) => d.data());
  const regularMembers = members.filter((m) => m.is_admin === 0 && m.role === "member");
  const excludedAdmins = members.filter((m) => m.is_admin === 1 || m.role !== "member");
  const friendsCount = members.filter((m) => m.is_friend === 1);
  const sentMembersCount = members.filter((m) => (m.campaign_sent_count || 0) > 0);

  return {
    total_groups: groupsSnap.size,
    total_members: members.length,
    filtered_members: regularMembers.length,
    excluded_admins: excludedAdmins.length,
    friends_count: friendsCount.length,
    campaign_sent_members: sentMembersCount.length,
    total_campaigns: campaignsSnap.size,
    total_accounts: accountsSnap.size,
  };
}

export async function batchUpdateMembersFriendStatus(updates: { zaloId: string; isFriend: number }[]) {
  if (!updates || updates.length === 0) return 0;

  const CHUNK_SIZE = 450;
  let updatedCount = 0;

  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(firestore);
    for (const item of chunk) {
      const docRef = doc(firestore, collections.members, String(item.zaloId));
      batch.update(docRef, {
        is_friend: item.isFriend,
        updated_at: new Date().toISOString(),
      });
    }
    await batch.commit();
    updatedCount += chunk.length;
  }

  return updatedCount;
}

