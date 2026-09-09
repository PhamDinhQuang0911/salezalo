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
}) {
  const phone = data.phone.trim();
  const docRef = doc(firestore, collections.accounts, phone);
  const existing = await getDoc(docRef);

  const payload: any = {
    phone,
    name: data.name || (existing.exists() ? existing.data().name : `Zalo ${phone}`),
    scrape_webhook_url: data.scrape_webhook_url || "",
    send_webhook_url: data.send_webhook_url || "",
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
  friendStatus?: string; // 'friend' | 'not_friend' | 'all'
  strangerBlock?: string; // 'blocked' | 'open' | 'all'
  search?: string;
  page?: number;
  limit?: number;
}

export async function getMembers(filter: MemberFilter = {}) {
  const membersCol = collection(firestore, collections.members);
  const snap = await getDocs(membersCol);
  let allMembers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

  // In-memory filtering for rich multi-criteria filters
  if (filter.groupId) {
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

  // 2. Filter by target group if specified
  if (campaign.target_group_id) {
    members = members.filter((m) =>
      Array.isArray(m.group_ids)
        ? m.group_ids.includes(campaign.target_group_id)
        : m.group_id === campaign.target_group_id
    );
  }

  // 3. Cooldown days: exclude members who received campaign recently
  if (campaign.cooldown_days > 0) {
    const now = Date.now();
    const cooldownMs = campaign.cooldown_days * 24 * 60 * 60 * 1000;
    members = members.filter((m) => {
      if (!m.last_campaign_sent_at) return true;
      const sentTime = new Date(m.last_campaign_sent_at).getTime();
      return now - sentTime > cooldownMs;
    });
  }

  // 4. Stranger block filter: if not auto_friend_first, exclude members who block strangers
  if (!campaign.auto_friend_first) {
    members = members.filter((m) => !m.block_stranger_msg || m.block_stranger_msg === 0);
  }

  // Sort by oldest last_campaign_sent_at first
  members.sort((a, b) => {
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
