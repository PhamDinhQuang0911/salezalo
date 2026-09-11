"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Send,
  Database,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Layers,
  Code,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  UploadCloud,
  Phone,
  MessageSquare,
  UserPlus,
  ShieldAlert,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Clock,
  Filter,
  Check,
  X,
  Smartphone,
  Play,
  CheckSquare,
  FileText,
  ChevronDown,
  RotateCcw,
  Key,
  Wand2,
  Star,
  Target,
  ShieldOff,
} from "lucide-react";
import {
  clientGetStats,
  clientGetAccounts,
  clientSaveAccount,
  clientDeleteAccount,
  clientGetGroups,
  clientSaveGroup,
  clientUpdateGroup,
  clientDeleteGroup,
  clientGetMembers,
  clientUpdateMember,
  clientDeleteMember,
  clientDeleteMembers,
  clientDeleteMembersByGroup,
  clientDeleteAllMembers,
  clientGetCampaigns,
  clientSaveCampaign,
  clientDeleteCampaign,
  clientGetSettings,
  clientUpdateSettings,
  clientTriggerScrape,
  clientTriggerSendCampaign,
  clientImportZaloData,
  uploadMediaFile,
  clientSyncFriendStatus,
  clientTriggerSendFriendRequests,
  clientBatchUpdateCustomerStatus,
  clientQuickUpdateCampaignAudience,
  clientCalculateCampaignRecipients,
} from "@/lib/client-api";
import {
  GEMINI_FLASH_MODELS,
  rewriteZaloMessage,
} from "@/lib/gemini-service";


export default function Home() {
  // Tab navigation: "overview" is now on the far left!
  const [activeTab, setActiveTab] = useState<"overview" | "members_hub" | "auto_friend" | "accounts" | "groups" | "campaigns" | "settings">("overview");

  // Stats
  const [stats, setStats] = useState<any>({
    totalGroups: 0,
    targetMembers: 0,
    filteredAdmins: 0,
    totalCampaigns: 0,
    totalAccounts: 0,
    friendsCount: 0,
    strangerBlockedCount: 0,
    messagedCount: 0,
  });
  const [recentGroups, setRecentGroups] = useState<any[]>([]);

  // Accounts Tab
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newAccount, setNewAccount] = useState({
    phone: "",
    name: "",
    scrape_webhook_url: "",
    send_webhook_url: "",
    friend_webhook_url: "",
    sync_webhook_url: "",
  });
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");

  // Edit Account Modal State
  const [editingAccountModal, setEditingAccountModal] = useState<any | null>(null);
  const [editingAccountForm, setEditingAccountForm] = useState({
    id: "",
    phone: "",
    name: "",
    scrape_webhook_url: "",
    send_webhook_url: "",
    friend_webhook_url: "",
    sync_webhook_url: "",
  });
  const [isSavingAccountEdit, setIsSavingAccountEdit] = useState(false);

  // Groups
  const [groups, setGroups] = useState<any[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [newGroupInput, setNewGroupInput] = useState({ group_id: "", name: "", invite_link: "", account_phone: "" });
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [groupNotice, setGroupNotice] = useState("");

  // Direct JSON Import Modal
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [rawJsonInput, setRawJsonInput] = useState("");
  const [jsonImportResult, setJsonImportResult] = useState<any>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);

  // Members Hub (Left Group Directory + Right Members Table)
  const [members, setMembers] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(""); // "" = All Groups
  const [memberFilterRole, setMemberFilterRole] = useState("member");
  const [memberFilterSent, setMemberFilterSent] = useState("all"); // all | not_sent | sent
  const [memberFilterFriend, setMemberFilterFriend] = useState("all"); // all | friend | pending | not_friend
  const [memberFilterStranger, setMemberFilterStranger] = useState("all"); // all | allowed | blocked
  const [memberFilterCustomer, setMemberFilterCustomer] = useState("all"); // all | potential | blocked | standard
  const [memberSortBy, setMemberSortBy] = useState("newest"); // newest | friend_first | pending_first | not_friend_first
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPagination, setMemberPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 1 });
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isDeletingMembers, setIsDeletingMembers] = useState(false);

  // Blacklist & Potential Leads Management Modal
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistModalTab, setBlacklistModalTab] = useState<"blocked" | "potential">("blocked");
  const [bulkUidInput, setBulkUidInput] = useState("");
  const [bulkTargetAction, setBulkTargetAction] = useState<"blocked" | "potential" | "standard">("blocked");
  const [isProcessingBulkCustomer, setIsProcessingBulkCustomer] = useState(false);
  const [customerNotice, setCustomerNotice] = useState("");

  const initialCampaignForm = {
    name: "",
    message_template: "",
    target_group_id: "all",
    account_phone: "",
    friend_filter: "all",
    customer_filter: "all", // all | potential_only | standard_only
    max_recipients: 100,
    cooldown_days: 0,
    auto_friend_first: 0,
    delay_seconds: 15,
    image_url: "",
    video_url: "",
    document_url: "",
    media_url: "",
    media_type: "none",
    file_name: "",
    cta_link: "",
  };

  // Campaigns Tab (Create & Edit & Delete)
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [campaignNotice, setCampaignNotice] = useState("");

  // Quick Audience Editor for Saved Campaigns
  const [quickAudienceModalCampaign, setQuickAudienceModalCampaign] = useState<any | null>(null);
  const [quickAudienceForm, setQuickAudienceForm] = useState<{
    target_group_id: string;
    friend_filter: string;
    customer_filter: string;
    max_recipients: number;
    cooldown_days: number;
    auto_friend_first: number;
  }>({
    target_group_id: "all",
    friend_filter: "all",
    customer_filter: "all",
    max_recipients: 100,
    cooldown_days: 0,
    auto_friend_first: 0,
  });
  const [quickAudienceCalculatedCount, setQuickAudienceCalculatedCount] = useState<number>(0);
  const [isCalculatingQuickAudience, setIsCalculatingQuickAudience] = useState(false);
  const [isSavingQuickAudience, setIsSavingQuickAudience] = useState(false);
  const [isQuickSending, setIsQuickSending] = useState(false);

  // Media Direct Upload for Campaign (Images, Videos, Documents/PDF/Word)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState("");
  const [uploadedMediaInfo, setUploadedMediaInfo] = useState<{
    name: string;
    size: number;
    mediaType: "image" | "video" | "document";
    previewUrl: string;
  } | null>(null);

  // Gemini AI Message Rewriter States
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [geminiModel, setGeminiModel] = useState<string>("gemini-3.5-flash");
  const [isAiRewriting, setIsAiRewriting] = useState<boolean>(false);
  const [aiNotice, setAiNotice] = useState<{ text: string; isError?: boolean } | null>(null);
  const [aiRewriteHistory, setAiRewriteHistory] = useState<string[]>([]);
  const [showAiCustomPrompt, setShowAiCustomPrompt] = useState<boolean>(false);
  const [customAiPrompt, setCustomAiPrompt] = useState<string>("");
  const [showAiKeyModal, setShowAiKeyModal] = useState<boolean>(false);
  const [tempGeminiKey, setTempGeminiKey] = useState<string>("");

  // Friend Status Sync (via n8n getAllFriends & getSentFriendRequest)
  const [isSyncingFriends, setIsSyncingFriends] = useState(false);
  const [friendSyncNotice, setFriendSyncNotice] = useState("");

  // Auto Friend (Gửi Lời Mời Kết Bạn Riêng Biệt)
  const [autoFriendGroupId, setAutoFriendGroupId] = useState<string>("all");
  const [autoFriendLimit, setAutoFriendLimit] = useState<number>(20);
  const [autoFriendAccountPhone, setAutoFriendAccountPhone] = useState<string>("");
  const [autoFriendMessage, setAutoFriendMessage] = useState<string>("Chào bạn, mình cùng nhóm Zalo, kết bạn trao đổi nhé!");
  const [autoFriendDelayMin, setAutoFriendDelayMin] = useState<number>(15);
  const [autoFriendDelayMax, setAutoFriendDelayMax] = useState<number>(30);
  const [isSendingFriendRequests, setIsSendingFriendRequests] = useState<boolean>(false);
  const [autoFriendNotice, setAutoFriendNotice] = useState<string>("");
  const [autoFriendPreviewMembers, setAutoFriendPreviewMembers] = useState<any[]>([]);
  const [isLoadingAutoFriendPreview, setIsLoadingAutoFriendPreview] = useState<boolean>(false);
  const [autoFriendAvailableCount, setAutoFriendAvailableCount] = useState<number>(0);

  // Group Edit Modal State
  const [editingGroupModal, setEditingGroupModal] = useState<any | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupAvatar, setEditingGroupAvatar] = useState("");
  const [isSavingGroupEdit, setIsSavingGroupEdit] = useState(false);

  // Active Zalo Account State (Global Switcher)
  const [activeAccountPhone, setActiveAccountPhone] = useState<string>("");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);

  // Per-feature Quick Webhook Settings State
  const [showScrapeWebhookQuick, setShowScrapeWebhookQuick] = useState<boolean>(false);
  const [showSendWebhookQuick, setShowSendWebhookQuick] = useState<boolean>(false);
  const [showFriendWebhookQuick, setShowFriendWebhookQuick] = useState<boolean>(false);
  const [syncWebhookModalOpen, setSyncWebhookModalOpen] = useState<boolean>(false);
  const [tempSyncWebhookUrl, setTempSyncWebhookUrl] = useState<string>("");


  // Settings Tab
  const [settings, setSettings] = useState<any>({
    n8n_scrape_webhook: "",
    n8n_send_webhook: "",
    n8n_friend_webhook: "",
    n8n_sync_webhook: "",
    webhook_secret: "",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");

  // Copy helper
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUid(text);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  useEffect(() => {
    fetchStats();
    fetchGroups();
    fetchAccounts();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "members_hub" || activeTab === "overview") {
      fetchMembers(1);
    } else if (activeTab === "campaigns") {
      fetchCampaigns();
    } else if (activeTab === "auto_friend") {
      fetchAutoFriendPreview();
    }
  }, [activeTab, selectedGroupId, memberFilterRole, memberFilterSent, memberFilterFriend, memberFilterStranger, memberFilterCustomer, memberSortBy, autoFriendGroupId, autoFriendLimit]);

  const fetchStats = async () => {
    try {
      const data = await clientGetStats();
      if (data.success) {
        setStats(data.stats as any);
        setRecentGroups([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await clientGetAccounts();
      if (data.success) {
        const list = data.accounts || [];
        setAccounts(list);
        const savedPhone = typeof window !== "undefined" ? localStorage.getItem("zalo_active_account") : null;
        if (savedPhone && list.some((a: any) => a.phone === savedPhone)) {
          setActiveAccountPhone(savedPhone);
        } else if (list.length > 0) {
          setActiveAccountPhone((prev) => prev || list[0].phone);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchAccount = (phone: string) => {
    setActiveAccountPhone(phone);
    if (typeof window !== "undefined") {
      localStorage.setItem("zalo_active_account", phone);
    }
    setNewGroupInput((prev) => ({ ...prev, account_phone: phone }));
    setCampaignForm((prev) => ({ ...prev, account_phone: phone }));
    setAutoFriendAccountPhone(phone);
    setIsAccountMenuOpen(false);
  };

  const handleQuickSaveWebhook = async (key: string, value: string) => {
    try {
      const updated = { ...settings, [key]: (value || "").trim() };
      setSettings(updated);
      await clientUpdateSettings(updated);
      alert("Đã lưu Webhook thành công!");
    } catch (e: any) {
      alert("Lỗi lưu webhook: " + (e.message || e));
    }
  };

  const fetchGroups = async () => {
    try {
      const data = await clientGetGroups();
      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMembers = async (page = 1, forceRefresh = false) => {
    setIsLoadingMembers(true);
    try {
      const data = await clientGetMembers({
        groupId: selectedGroupId,
        role: memberFilterRole,
        sentStatus: memberFilterSent,
        friendStatus: memberFilterFriend,
        strangerBlock: memberFilterStranger,
        customerStatus: memberFilterCustomer,
        search: memberSearch,
        sortBy: memberSortBy,
        page,
        limit: 30,
      }, forceRefresh);
      if (data.success) {
        setMembers(data.members || []);
        setMemberPagination(data.pagination || { total: 0, page: 1, limit: 30, totalPages: 1 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const data = await clientGetCampaigns();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await clientGetSettings();
      if (data.success && data.settings) {
        setSettings(data.settings as any);
        const localKey = typeof window !== "undefined" ? localStorage.getItem("zalo_gemini_api_key") || "" : "";
        const localModel = typeof window !== "undefined" ? localStorage.getItem("zalo_gemini_model") || "" : "";
        const keyToUse = data.settings.gemini_api_key || localKey || "";
        const modelToUse = data.settings.gemini_model || localModel || "gemini-3.5-flash";
        setGeminiApiKey(keyToUse);
        setTempGeminiKey(keyToUse);
        setGeminiModel(modelToUse);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle member attributes (friend, block stranger)
  const handleToggleMember = async (zaloId: string, patchData: any) => {
    try {
      const data = await clientUpdateMember(zaloId, patchData);
      if (data.success) {
        setMembers((prev) =>
          prev.map((m) => (m.zalo_id === zaloId ? { ...m, ...patchData } : m))
        );
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Toggle single member selection
  const handleToggleSelectMember = (zaloId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(zaloId) ? prev.filter((id) => id !== zaloId) : [...prev, zaloId]
    );
  };

  // 2. Toggle select all on current page
  const handleToggleSelectAllPage = () => {
    const pageIds = members.map((m) => m.zalo_id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedMemberIds.includes(id));
    if (allSelected) {
      setSelectedMemberIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedMemberIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // 3. Delete selected members (Bulk delete)
  const handleDeleteSelectedMembers = async () => {
    if (selectedMemberIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedMemberIds.length} thành viên đã chọn khỏi hệ thống?`)) return;
    setIsDeletingMembers(true);
    try {
      await clientDeleteMembers(selectedMemberIds);
      const count = selectedMemberIds.length;
      setSelectedMemberIds([]);
      fetchMembers(memberPagination.page);
      fetchStats();
      fetchGroups();
      alert(`Đã xóa thành công ${count} thành viên!`);
    } catch (e: any) {
      alert("Lỗi xóa thành viên: " + e.message);
    } finally {
      setIsDeletingMembers(false);
    }
  };

  // Batch update customer classification (potential / blocked / standard)
  const handleBatchSetCustomerStatus = async (status: "potential" | "blocked" | "standard") => {
    if (selectedMemberIds.length === 0) return;
    const label = status === "potential" ? "⭐ Khách Hàng Tiềm Năng" : status === "blocked" ? "🚫 Danh Sách Chặn (Blacklist)" : "👥 Thành viên thường";
    if (!confirm(`Xác nhận đánh dấu ${selectedMemberIds.length} thành viên đã chọn thành "${label}"?`)) return;
    try {
      await clientBatchUpdateCustomerStatus(selectedMemberIds, status);
      const count = selectedMemberIds.length;
      setSelectedMemberIds([]);
      fetchMembers(memberPagination.page);
      fetchStats();
      alert(`Đã cập nhật trạng thái "${label}" cho ${count} thành viên!`);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  // Set single member customer status
  const handleSetSingleCustomerStatus = async (zaloId: string, status: "potential" | "blocked" | "standard") => {
    try {
      await clientUpdateMember(zaloId, {
        customer_status: status,
        customer_status_updated_at: new Date().toISOString(),
      });
      setMembers((prev) =>
        prev.map((m) => (m.zalo_id === zaloId ? { ...m, customer_status: status } : m))
      );
      fetchStats();
    } catch (e: any) {
      alert("Lỗi cập nhật: " + e.message);
    }
  };

  // Bulk UID processor (for Modal)
  const handleProcessBulkUids = async () => {
    if (!bulkUidInput.trim()) return;
    const lines = bulkUidInput.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return;

    setIsProcessingBulkCustomer(true);
    setCustomerNotice("");
    try {
      await clientBatchUpdateCustomerStatus(lines, bulkTargetAction);
      const label = bulkTargetAction === "potential" ? "⭐ Tiềm Năng" : bulkTargetAction === "blocked" ? "🚫 Bị Chặn (Blacklist)" : "👥 Thành viên thường";
      setCustomerNotice(`Đã cập nhật thành công ${lines.length} UID/SĐT sang trạng thái: ${label}!`);
      setBulkUidInput("");
      fetchMembers(1);
      fetchStats();
    } catch (err: any) {
      setCustomerNotice("Lỗi: " + err.message);
    } finally {
      setIsProcessingBulkCustomer(false);
    }
  };

  // Quick Audience Handlers
  const handleOpenQuickAudienceModal = (c: any) => {
    setQuickAudienceModalCampaign(c);
    const formConfig = {
      target_group_id: c.target_group_id || "all",
      friend_filter: c.friend_filter || "all",
      customer_filter: c.customer_filter || "all",
      max_recipients: c.max_recipients !== undefined ? Number(c.max_recipients) : 100,
      cooldown_days: c.cooldown_days !== undefined ? Number(c.cooldown_days) : 0,
      auto_friend_first: c.auto_friend_first ? 1 : 0,
    };
    setQuickAudienceForm(formConfig);
    calculateQuickAudienceRecipients(formConfig);
  };

  const calculateQuickAudienceRecipients = async (config: any) => {
    setIsCalculatingQuickAudience(true);
    try {
      const res = await clientCalculateCampaignRecipients(config);
      setQuickAudienceCalculatedCount(res.count);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalculatingQuickAudience(false);
    }
  };

  const handleQuickAudienceChange = (patch: Partial<typeof quickAudienceForm>) => {
    const updated = { ...quickAudienceForm, ...patch };
    setQuickAudienceForm(updated);
    calculateQuickAudienceRecipients(updated);
  };

  const handleSaveQuickAudience = async () => {
    if (!quickAudienceModalCampaign) return;
    setIsSavingQuickAudience(true);
    try {
      await clientQuickUpdateCampaignAudience(quickAudienceModalCampaign.id, quickAudienceForm);
      setQuickAudienceModalCampaign(null);
      fetchCampaigns();
      fetchStats();
      alert("Đã cập nhật đối tượng cho chiến dịch thành công!");
    } catch (e: any) {
      alert("Lỗi lưu đối tượng: " + e.message);
    } finally {
      setIsSavingQuickAudience(false);
    }
  };

  const handleQuickAudienceSendNow = async () => {
    if (!quickAudienceModalCampaign) return;
    if (!confirm(`Xác nhận lưu đối tượng và kích hoạt workflow n8n gửi tin cho chiến dịch "${quickAudienceModalCampaign.name}" ngay bây giờ?`)) return;
    setIsQuickSending(true);
    try {
      await clientQuickUpdateCampaignAudience(quickAudienceModalCampaign.id, quickAudienceForm);
      const data = await clientTriggerSendCampaign(String(quickAudienceModalCampaign.id));
      alert(data.message || (data.success ? "Đã gửi lệnh sang n8n thành công!" : "Lỗi"));
      setQuickAudienceModalCampaign(null);
      fetchCampaigns();
      fetchStats();
      fetchMembers(memberPagination.page);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsQuickSending(false);
    }
  };

  // 4. Delete single member
  const handleDeleteSingleMember = async (zaloId: string, name: string) => {
    if (!confirm(`Xóa thành viên "${name || zaloId}" khỏi hệ thống?`)) return;
    try {
      await clientDeleteMember(zaloId);
      setSelectedMemberIds((prev) => prev.filter((id) => id !== zaloId));
      fetchMembers(memberPagination.page);
      fetchStats();
      fetchGroups();
    } catch (e: any) {
      alert("Lỗi xóa: " + e.message);
    }
  };

  // 5. Delete all members in selected group
  const handleDeleteMembersInCurrentGroup = async () => {
    if (!selectedGroupId) return;
    const group = groups.find((g) => g.group_id === selectedGroupId);
    const groupName = group?.name || selectedGroupId;
    if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ thành viên thuộc nhóm "${groupName}" không?`)) return;
    setIsDeletingMembers(true);
    try {
      const res = await clientDeleteMembersByGroup(selectedGroupId);
      setSelectedMemberIds([]);
      fetchMembers(1);
      fetchStats();
      fetchGroups();
      alert(res.message);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsDeletingMembers(false);
    }
  };

  // 6. Delete ALL members across entire system
  const handleDeleteAllMembers = async () => {
    if (!confirm("NGUY HIỂM: Bạn có chắc chắn muốn XÓA SẠCH TOÀN BỘ kho thành viên trong hệ thống không?")) return;
    const secondConfirm = window.prompt('Để xác nhận, vui lòng gõ chữ "XOA" (viết hoa không dấu) vào ô bên dưới:');
    if (secondConfirm !== "XOA") {
      alert("Đã hủy thao tác xóa toàn bộ.");
      return;
    }
    setIsDeletingMembers(true);
    try {
      const res = await clientDeleteAllMembers();
      setSelectedMemberIds([]);
      fetchMembers(1);
      fetchStats();
      fetchGroups();
      alert(res.message);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsDeletingMembers(false);
    }
  };

  // Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingAccount(true);
    setAccountNotice("");
    try {
      const data = await clientSaveAccount(newAccount);
      if (data.success) {
        setAccountNotice("Đã thêm tài khoản SĐT Zalo thành công!");
        setNewAccount({
          phone: "",
          name: "",
          scrape_webhook_url: "",
          send_webhook_url: "",
          friend_webhook_url: "",
          sync_webhook_url: "",
        });
        fetchAccounts();
        fetchStats();
      } else {
        setAccountNotice("Lỗi");
      }
    } catch (err: any) {
      setAccountNotice("Lỗi: " + err.message);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleDeleteAccount = async (id: any) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản SĐT này?")) return;
    try {
      const data = await clientDeleteAccount(String(id));
      if (data.success) {
        fetchAccounts();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit Account Modal
  const handleOpenEditAccount = (acc: any) => {
    setEditingAccountModal(acc);
    setEditingAccountForm({
      id: acc.id || acc.phone,
      phone: acc.phone || "",
      name: acc.name || "",
      scrape_webhook_url: acc.scrape_webhook_url || "",
      send_webhook_url: acc.send_webhook_url || "",
      friend_webhook_url: acc.friend_webhook_url || "",
      sync_webhook_url: acc.sync_webhook_url || "",
    });
  };

  // Save Edit Account Modal
  const handleSaveAccountModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccountModal) return;
    const oldPhone = editingAccountModal.phone;
    const newPhone = editingAccountForm.phone.trim();
    if (!newPhone) {
      alert("Vui lòng nhập số điện thoại Zalo.");
      return;
    }

    setIsSavingAccountEdit(true);
    try {
      await clientSaveAccount({
        phone: newPhone,
        name: editingAccountForm.name.trim(),
        scrape_webhook_url: editingAccountForm.scrape_webhook_url.trim(),
        send_webhook_url: editingAccountForm.send_webhook_url.trim(),
        friend_webhook_url: editingAccountForm.friend_webhook_url.trim(),
        sync_webhook_url: editingAccountForm.sync_webhook_url.trim(),
      });

      // If phone changed, delete old document
      if (oldPhone && oldPhone !== newPhone) {
        await clientDeleteAccount(oldPhone);
        if (activeAccountPhone === oldPhone) {
          handleSwitchAccount(newPhone);
        }
      }

      setEditingAccountModal(null);
      await fetchAccounts();
      await fetchStats();
      alert("Đã cập nhật thông tin tài khoản SĐT thành công!");
    } catch (err: any) {
      alert("Lỗi khi lưu tài khoản: " + (err.message || err));
    } finally {
      setIsSavingAccountEdit(false);
    }
  };

  // Add & Start Scrape Group ("Bắt đầu cào")
  const handleStartScrapeGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingGroup(true);
    setGroupNotice("");
    try {
      if (newGroupInput.group_id || newGroupInput.name) {
        await clientSaveGroup(newGroupInput);
      }
      let scrapeNotice = "";
      try {
        const scrapeRes = await clientTriggerScrape(newGroupInput);
        scrapeNotice = scrapeRes.message;
      } catch (scrapeErr: any) {
        if (!newGroupInput.group_id && !newGroupInput.name) {
          await clientSaveGroup(newGroupInput);
        }
        scrapeNotice = "Đã gửi lệnh cào (" + scrapeErr.message + ")";
      }
      setGroupNotice(scrapeNotice || "Đã thêm nhóm và gọi n8n thành công!");
      setNewGroupInput({ group_id: "", name: "", invite_link: "", account_phone: "" });
      fetchGroups();
      fetchStats();
      fetchMembers();
    } catch (err: any) {
      setGroupNotice(`Lỗi: ${err.message}`);
    } finally {
      setIsAddingGroup(false);
    }
  };

  const handleReScrape = async (groupId: string, inviteLink: string, accountPhone: string) => {
    try {
      const data = await clientTriggerScrape({ group_id: groupId, invite_link: inviteLink, account_phone: accountPhone });
      alert(data.message || (data.success ? "Đã bắn lệnh cào sang n8n" : "Lỗi"));
      fetchGroups();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const openEditGroupModal = (group: any) => {
    setEditingGroupModal(group);
    const isDefault = group.name && (group.name.includes(group.group_id) || group.name.startsWith("Nhóm Zalo"));
    setEditingGroupName(isDefault ? "" : (group.name || ""));
    setEditingGroupAvatar(group.avatar || "");
  };

  const handleEditGroup = (group: any) => {
    openEditGroupModal(group);
  };

  const handleSaveGroupModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupModal) return;
    setIsSavingGroupEdit(true);
    try {
      const finalName = editingGroupName.trim() || editingGroupModal.name;
      await clientUpdateGroup(editingGroupModal.group_id, {
        name: finalName,
        avatar: editingGroupAvatar.trim(),
      });
      setEditingGroupModal(null);
      await fetchGroups();
      await fetchStats();
      await fetchMembers(memberPagination.page);
    } catch (err: any) {
      alert("Lỗi cập nhật nhóm: " + (err.message || err));
    } finally {
      setIsSavingGroupEdit(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhóm này và các liên kết thành viên?")) return;
    try {
      const data = await clientDeleteGroup(groupId);
      if (data.success) {
        if (selectedGroupId === groupId) setSelectedGroupId("");
        fetchGroups();
        fetchStats();
        fetchMembers(1);
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  // Direct JSON Import
  const handleDirectImport = async () => {
    if (!rawJsonInput.trim()) return;
    setIsImportingJson(true);
    setJsonImportResult(null);
    try {
      const parsed = JSON.parse(rawJsonInput);
      const data = await clientImportZaloData(parsed);
      setJsonImportResult(data);
      if (data.success) {
        fetchStats();
        fetchGroups();
        fetchMembers(1);
      }
    } catch (err: any) {
      setJsonImportResult({ success: false, error: "Lỗi phân tích JSON: " + err.message });
    } finally {
      setIsImportingJson(false);
    }
  };

  // Gemini AI Message Rewriter Handlers
  const handleSaveGeminiKey = async () => {
    const key = tempGeminiKey.trim();
    setGeminiApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("zalo_gemini_api_key", key);
      localStorage.setItem("zalo_gemini_model", geminiModel);
    }
    const updated = { ...settings, gemini_api_key: key, gemini_model: geminiModel };
    setSettings(updated);
    try {
      await clientUpdateSettings(updated);
    } catch (err) {
      console.warn("Could not sync gemini key to Firestore", err);
    }
    setShowAiKeyModal(false);
    setAiNotice({ text: "Đã lưu Google Gemini API Key thành công!", isError: false });
    setTimeout(() => setAiNotice(null), 3500);
  };

  const handleAiRewrite = async (stylePrompt: string) => {
    if (!campaignForm.message_template || !campaignForm.message_template.trim()) {
      setAiNotice({ text: "Vui lòng nhập nội dung tin nhắn trước khi yêu cầu AI viết lại!", isError: true });
      return;
    }
    const activeKey = geminiApiKey || (typeof window !== "undefined" ? localStorage.getItem("zalo_gemini_api_key") || "" : "") || "";
    if (!activeKey) {
      setAiNotice({ text: "Vui lòng cài đặt Google Gemini API Key để bắt đầu viết lại!", isError: true });
      setShowAiKeyModal(true);
      return;
    }

    setIsAiRewriting(true);
    setAiNotice(null);

    // Save current text to history for undo
    setAiRewriteHistory((prev) => [campaignForm.message_template, ...prev.slice(0, 9)]);

    try {
      const result = await rewriteZaloMessage({
        apiKey: activeKey,
        model: geminiModel,
        stylePrompt,
        originalText: campaignForm.message_template,
      });

      if (result.success && result.text) {
        setCampaignForm((prev) => ({ ...prev, message_template: result.text! }));
        setAiNotice({
          text: `✨ AI (${result.modelUsed}) đã viết lại tin nhắn thành công!${result.fallbackOccurred ? " (Chế độ Flash tối ưu)" : ""}`,
          isError: false,
        });
        setTimeout(() => setAiNotice(null), 5000);
      } else {
        setAiNotice({ text: result.error || "Lỗi viết lại bằng AI", isError: true });
      }
    } catch (err: any) {
      setAiNotice({ text: "Lỗi AI: " + (err.message || String(err)), isError: true });
    } finally {
      setIsAiRewriting(false);
    }
  };

  const handleUndoAiRewrite = () => {
    if (aiRewriteHistory.length === 0) return;
    const [previous, ...rest] = aiRewriteHistory;
    setCampaignForm((prev) => ({ ...prev, message_template: previous }));
    setAiRewriteHistory(rest);
    setAiNotice({ text: "Đã hoàn tác lại nội dung trước đó!", isError: false });
    setTimeout(() => setAiNotice(null), 3000);
  };

  // Campaign: Create or Update
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCampaign(true);
    setCampaignNotice("");
    try {
      const isEditing = editingCampaignId !== null;
      const data = await clientSaveCampaign(isEditing ? String(editingCampaignId) : null, campaignForm);
      if (data.success) {
        setCampaignNotice(isEditing ? "Đã cập nhật chiến dịch thành công!" : "Đã tạo chiến dịch thành công!");
        setEditingCampaignId(null);
        setCampaignForm(initialCampaignForm);
        fetchCampaigns();
        fetchStats();
      } else {
        setCampaignNotice("Lỗi tạo chiến dịch");
      }
    } catch (err: any) {
      setCampaignNotice("Lỗi: " + err.message);
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, expectedType?: "image" | "video" | "document") => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // Reset input so user can re-pick same file if desired

    setMediaUploadError("");
    setIsUploadingMedia(true);

    try {
      const result = await uploadMediaFile(file);
      setUploadedMediaInfo({
        name: result.name,
        size: result.size,
        mediaType: result.mediaType,
        previewUrl: result.base64 || result.url,
      });

      if (result.mediaType === "image") {
        setCampaignForm((prev) => ({
          ...prev,
          image_url: result.url,
          media_url: result.url,
          media_type: "image",
          file_name: result.name,
          video_url: "",
          document_url: "",
        }));
      } else if (result.mediaType === "video") {
        setCampaignForm((prev) => ({
          ...prev,
          video_url: result.url,
          media_url: result.url,
          media_type: "video",
          file_name: result.name,
          image_url: "",
          document_url: "",
        }));
      } else {
        // Document: PDF, Word, Excel, etc.
        setCampaignForm((prev) => ({
          ...prev,
          document_url: result.url,
          media_url: result.url,
          media_type: "document",
          file_name: result.name,
          image_url: "",
          video_url: "",
        }));
      }
    } catch (err: any) {
      console.error("Media upload error:", err);
      setMediaUploadError(err.message || "Lỗi tải tệp lên");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRemoveMedia = () => {
    setUploadedMediaInfo(null);
    setMediaUploadError("");
    setCampaignForm((prev) => ({
      ...prev,
      image_url: "",
      video_url: "",
      document_url: "",
      media_url: "",
      media_type: "none",
      file_name: "",
    }));
  };

  const handleSyncFriendStatus = async () => {
    if (isSyncingFriends) return;

    const defaultPhone = accounts.length > 0 ? accounts[0].phone : "";
    const confirmMsg = `Hệ thống sẽ kết nối với n8n để lấy danh sách bạn bè & lời mời kết bạn từ tài khoản Zalo${
      defaultPhone ? ` (${defaultPhone})` : ""
    }, sau đó tự động đối soát và cập nhật trạng thái bạn bè cho toàn bộ thành viên đã cào trong hệ thống.\n\nBạn có muốn tiếp tục?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSyncingFriends(true);
    setFriendSyncNotice("Đang kết nối n8n và đối soát trạng thái bạn bè...");

    try {
      const res = await clientSyncFriendStatus(defaultPhone);
      setFriendSyncNotice(res.message);
      await fetchMembers(memberPagination.page);
      await fetchStats();
      setTimeout(() => setFriendSyncNotice(""), 8000);
    } catch (err: any) {
      console.error("Sync friend status error:", err);
      setFriendSyncNotice(`Lỗi đồng bộ: ${err.message || err}`);
      setTimeout(() => setFriendSyncNotice(""), 8000);
    } finally {
      setIsSyncingFriends(false);
    }
  };

  const fetchAutoFriendPreview = async () => {
    setIsLoadingAutoFriendPreview(true);
    try {
      const data = await clientGetMembers({
        groupId: autoFriendGroupId && autoFriendGroupId !== "all" ? autoFriendGroupId : undefined,
        friendStatus: "not_friend",
        role: "member",
        limit: autoFriendLimit,
      });
      if (data.success) {
        setAutoFriendPreviewMembers(data.members || []);
        setAutoFriendAvailableCount(data.pagination?.total || (data.members || []).length);
      }
    } catch (err) {
      console.error("fetchAutoFriendPreview error:", err);
    } finally {
      setIsLoadingAutoFriendPreview(false);
    }
  };

  const handleSendFriendRequests = async () => {
    if (isSendingFriendRequests) return;
    const phoneToUse = autoFriendAccountPhone || (accounts.length > 0 ? accounts[0].phone : "");
    const selectedGroupTitle =
      autoFriendGroupId === "all"
        ? "Tất cả các nhóm"
        : groups.find((g) => g.group_id === autoFriendGroupId)?.name || autoFriendGroupId;

    if (autoFriendPreviewMembers.length === 0) {
      alert("Không có thành viên nào chưa kết bạn phù hợp với bộ lọc hiện tại.");
      return;
    }

    const countToSend = Math.min(autoFriendLimit, autoFriendPreviewMembers.length);
    const confirmMsg =
      `Xác nhận gửi lời mời kết bạn:\n\n` +
      `• Tài khoản Zalo gửi: ${phoneToUse || "Mặc định n8n"}\n` +
      `• Nguồn thành viên: ${selectedGroupTitle}\n` +
      `• Số lượng gửi đợt này: ${countToSend} người\n` +
      `• Giãn cách ngẫu nhiên: ${autoFriendDelayMin}s - ${autoFriendDelayMax}s (chống checkpoint Zalo)\n` +
      `• Lời nhắn: "${autoFriendMessage || "(Mặc định của Zalo)"}"\n\n` +
      `Sau khi gửi, các thành viên này sẽ được tự động chuyển sang trạng thái "⏳ Đang chờ xác nhận".\n\nBạn có muốn bắt đầu?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSendingFriendRequests(true);
    setAutoFriendNotice("Đang kích hoạt n8n gửi lời mời kết bạn...");

    try {
      const res = await clientTriggerSendFriendRequests({
        targetGroupId: autoFriendGroupId,
        limit: autoFriendLimit,
        delayMin: autoFriendDelayMin,
        delayMax: autoFriendDelayMax,
        accountPhone: phoneToUse,
        friendMessage: autoFriendMessage,
      });

      setAutoFriendNotice(res.message);
      await fetchAutoFriendPreview();
      await fetchStats();
      setTimeout(() => setAutoFriendNotice(""), 12000);
    } catch (err: any) {
      console.error("handleSendFriendRequests error:", err);
      setAutoFriendNotice(`Lỗi: ${err.message || err}`);
      setTimeout(() => setAutoFriendNotice(""), 12000);
    } finally {
      setIsSendingFriendRequests(false);
    }
  };

  const handleEditCampaign = (c: any) => {
    setEditingCampaignId(c.id);
    setMediaUploadError("");
    if (c.image_url) {
      setUploadedMediaInfo({
        name: "Hình ảnh đính kèm",
        size: 0,
        mediaType: "image",
        previewUrl: c.image_url || c.media_url,
      });
    } else if (c.video_url || c.media_type === "video") {
      setUploadedMediaInfo({
        name: c.file_name || "Video đính kèm",
        size: 0,
        mediaType: "video",
        previewUrl: c.video_url || c.media_url,
      });
    } else if (c.document_url || c.media_type === "document") {
      setUploadedMediaInfo({
        name: c.file_name || "Tài liệu đính kèm",
        size: 0,
        mediaType: "document",
        previewUrl: c.document_url || c.media_url,
      });
    } else {
      setUploadedMediaInfo(null);
    }

    setCampaignForm({
      name: c.name || "",
      message_template: c.message_template || "",
      target_group_id: c.target_group_id || "all",
      account_phone: c.account_phone || "",
      friend_filter: c.friend_filter || "all",
      customer_filter: c.customer_filter || "all",
      max_recipients: c.max_recipients || 100,
      cooldown_days: c.cooldown_days !== undefined ? Number(c.cooldown_days) : 0,
      auto_friend_first: c.auto_friend_first || 0,
      delay_seconds: c.delay_seconds || 15,
      image_url: c.image_url || "",
      video_url: c.video_url || "",
      document_url: c.document_url || "",
      media_url: c.media_url || "",
      media_type: c.media_type || "none",
      file_name: c.file_name || "",
      cta_link: c.cta_link || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEditCampaign = () => {
    setEditingCampaignId(null);
    setUploadedMediaInfo(null);
    setMediaUploadError("");
    setCampaignForm(initialCampaignForm);
  };


  const handleDeleteCampaign = async (campaignId: any) => {
    if (!confirm("Bạn có chắc chắn muốn xóa chiến dịch này?")) return;
    try {
      const data = await clientDeleteCampaign(String(campaignId));
      if (data.success) {
        if (editingCampaignId === campaignId) handleCancelEditCampaign();
        fetchCampaigns();
        fetchStats();
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleSendCampaign = async (campaignId: any) => {
    if (!confirm("Xác nhận kích hoạt workflow gửi tin nhắn n8n cho chiến dịch này?")) return;
    try {
      const data = await clientTriggerSendCampaign(String(campaignId));
      alert(data.message || (data.success ? "Đã gửi lệnh sang n8n thành công!" : "Lỗi"));
      fetchCampaigns();
      fetchStats();
      fetchMembers(memberPagination.page);
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsNotice("");
    try {
      const sanitizedSettings = {
        ...settings,
        n8n_scrape_webhook: (settings.n8n_scrape_webhook || "").trim(),
        n8n_send_webhook: (settings.n8n_send_webhook || "").trim(),
        n8n_friend_webhook: (settings.n8n_friend_webhook || "").trim(),
        n8n_sync_webhook: (settings.n8n_sync_webhook || "").trim(),
      };
      setSettings(sanitizedSettings);
      const data = await clientUpdateSettings(sanitizedSettings);
      if (data.success) {
        setSettingsNotice("Đã lưu cấu hình thành công!");
      }
    } catch (err: any) {
      setSettingsNotice("Lỗi: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filter groups in group directory
  const filteredGroupsList = groups.filter((g) => {
    if (!groupSearchQuery) return true;
    const q = groupSearchQuery.toLowerCase();
    return g.name?.toLowerCase().includes(q) || g.group_id?.includes(q);
  });

  const selectedGroupObj = groups.find((g) => g.group_id === selectedGroupId);
  const activeAccountObj = accounts.find((a) => a.phone === activeAccountPhone);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-white tracking-tight">Zalo Member Hub & Automation</h1>
                <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Multi-Account n8n
                </span>
              </div>
              <p className="text-xs text-slate-400">Lọc bỏ Trưởng/Phó nhóm • Quản lý nhiều SĐT cào • Chống Spam tiếp thị</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Account Switcher (Avatar Dropdown) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 px-2.5 py-1.5 rounded-2xl transition cursor-pointer shadow-sm text-left group"
                title="Bấm để chuyển đổi tài khoản Zalo"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-1 ring-white/10">
                    {activeAccountObj?.name ? (
                      activeAccountObj.name.slice(0, 1).toUpperCase()
                    ) : (
                      <Phone className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse"></span>
                </div>
                <div className="hidden md:block min-w-0 pr-1">
                  <div className="text-xs font-semibold text-white truncate max-w-[120px] leading-tight">
                    {activeAccountObj ? (activeAccountObj.name || activeAccountObj.phone) : "Tài Khoản Zalo"}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono leading-tight truncate max-w-[120px]">
                    {activeAccountObj ? activeAccountObj.phone : "Chung hệ thống"}
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${
                    isAccountMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Account Dropdown Popover */}
              {isAccountMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAccountMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-slate-800 text-xs">
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Chuyển Đổi Tài Khoản Zalo</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Chọn tài khoản thao tác cho cào nhóm, gửi tin & kết bạn
                      </p>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1 py-1 pr-1 scrollbar-thin">
                      {/* Option: Default Webhook */}
                      <button
                        type="button"
                        onClick={() => handleSwitchAccount("")}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer border ${
                          activeAccountPhone === ""
                            ? "bg-blue-600/15 border-blue-500/50 text-blue-300 font-medium"
                            : "bg-slate-950/40 border-transparent text-slate-300 hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                            🌐
                          </div>
                          <div>
                            <div className="font-semibold text-white">Tài khoản mặc định</div>
                            <div className="text-[10px] text-slate-500 font-mono">Dùng Webhook hệ thống</div>
                          </div>
                        </div>
                        {activeAccountPhone === "" && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                      </button>

                      {/* User Accounts List */}
                      {accounts.map((acc) => (
                        <button
                          key={acc.phone}
                          type="button"
                          onClick={() => handleSwitchAccount(acc.phone)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer border ${
                            activeAccountPhone === acc.phone
                              ? "bg-emerald-600/15 border-emerald-500/50 text-emerald-300 font-medium"
                              : "bg-slate-950/40 border-transparent text-slate-300 hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {acc.name ? acc.name.slice(0, 1).toUpperCase() : "Z"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">{acc.name || "Zalo"}</div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">{acc.phone}</div>
                            </div>
                          </div>
                          {activeAccountPhone === acc.phone && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      ))}

                      {accounts.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-500">
                          Chưa có tài khoản nào được thêm.
                        </div>
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          setActiveTab("accounts");
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 font-medium py-1.5 px-2 rounded-lg hover:bg-emerald-500/10 cursor-pointer w-full transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Quản Lý / Thêm Tài Khoản</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="hidden xl:flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Firestore:</span>
              <span className="font-mono text-amber-400 font-medium">zalosale2</span>
            </div>

            <button
              onClick={() => setShowJsonModal(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Nạp JSON Test</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation: "Tổng Quan Báo Cáo" placed on the FAR LEFT! */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/60 overflow-x-auto scrollbar-none">
          {/* TAB 1: TỔNG QUAN (OUTERMOST LEFT) */}
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Tổng Quan Báo Cáo</span>
          </button>

          {/* TAB 2: THÀNH VIÊN & BỘ LỌC NHÓM */}
          <button
            onClick={() => setActiveTab("members_hub")}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === "members_hub"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>Thành Viên & Bộ Lọc Nhóm</span>
            <span className="bg-blue-500/20 text-blue-300 text-[11px] px-1.5 py-0.2 rounded-full font-semibold">
              {stats.targetMembers}
            </span>
          </button>

          {/* TAB 3: GỬI KẾT BẠN (AUTO-FRIEND) */}
          <button
            onClick={() => setActiveTab("auto_friend")}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === "auto_friend"
                ? "border-pink-500 text-pink-400 bg-pink-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-4 h-4 text-pink-400" />
            <span>Gửi Kết Bạn (Auto-Friend)</span>
          </button>

          {/* TAB 4: TÀI KHOẢN SĐT CÀO */}
          <button
            onClick={() => setActiveTab("accounts")}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === "accounts"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Tài Khoản SĐT Cào ({accounts.length})</span>
          </button>

          {/* TAB 4: THÊM & CÀO NHÓM */}
          <button
            onClick={() => setActiveTab("groups")}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === "groups"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Thêm & Cào Nhóm ({groups.length})</span>
          </button>

          {/* TAB 5: CHIẾN DỊCH TIẾP THỊ */}
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === "campaigns"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Send className="w-4 h-4 text-amber-400" />
            <span>Chiến Dịch Tiếp Thị ({campaigns.length})</span>
          </button>

          {/* TAB 6: CÀI ĐẶT */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === "settings"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Cài Đặt Webhook</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ================= TAB: OVERVIEW (OUTERMOST) ================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 4 Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tài Khoản SĐT Cào</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{stats.totalAccounts || 0}</span>
                  <span className="text-xs text-slate-400">tài khoản SĐT</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Mỗi SĐT có webhook cào riêng</p>
              </div>

              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-sm bg-gradient-to-b from-slate-900 to-emerald-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Thành Viên Tiềm Năng</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-400">{stats.targetMembers || 0}</span>
                  <span className="text-xs text-emerald-500">thành viên sạch</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Đã khử trùng & lọc bỏ admin</p>
              </div>

              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-sm bg-gradient-to-b from-slate-900 to-amber-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Trưởng & Phó Đã Lọc</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <UserX className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-amber-400">{stats.filteredAdmins || 0}</span>
                  <span className="text-xs text-amber-500">người</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Được cách ly khỏi tiếp thị</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Nhóm Đã Cào</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{stats.totalGroups || 0}</span>
                  <span className="text-xs text-slate-400">nhóm</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Lưu trữ trên Cloud Firestore</p>
              </div>
            </div>

            {/* Sub Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Đã gửi tin chiến dịch</div>
                  <div className="text-lg font-bold text-white">{stats.campaignSentMembers || stats.messagedCount || 0} thành viên</div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Đã kết bạn thành công</div>
                  <div className="text-lg font-bold text-white">{stats.friendsCount || 0} thành viên</div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-amber-500/20 bg-amber-950/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-amber-300/80 font-medium">Khách Tiềm Năng</div>
                  <div className="text-lg font-bold text-amber-400">{stats.potentialCount || 0} người</div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-red-500/20 bg-red-950/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-red-300/80 font-medium">Bị Chặn (Blacklist)</div>
                  <div className="text-lg font-bold text-red-400">{stats.blockedCount || 0} người</div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Chặn tin nhắn lạ</div>
                  <div className="text-lg font-bold text-white">{stats.strangerBlockedCount || 0} người</div>
                </div>
              </div>
            </div>

            {/* Quick Guide & Actions */}
            <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-slate-900 border border-blue-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  Quy trình Cào & Gửi Tin Nhắn Tự Động Qua n8n
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                  1. Thêm SĐT Zalo & link Webhook n8n tương ứng $\rightarrow$ 2. Nhập UID hoặc Link mời để n8n cào thành viên $\rightarrow$ 3. Bấm vào nhóm để lọc thành viên $\rightarrow$ 4. Lên chiến dịch chống spam & bắn sang n8n gửi tin.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveTab("groups")}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Bắt Đầu Cào Nhóm Mới
                </button>
                <button
                  onClick={() => setActiveTab("members_hub")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-blue-400" />
                  Xem Danh Sách Thành Viên
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: MEMBERS HUB (EXPANDED GROUP DIRECTORY + MEMBERS) ================= */}
        {activeTab === "members_hub" && (
          <div className="space-y-4">
            {/* 2-Column Responsive Layout: Left = Large Group Directory (Scales to 100+ groups), Right = Master Member Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: LARGE GROUP DIRECTORY (Takes 4 cols on large screens) */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Danh Sách Nhóm ({groups.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab("groups")}
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Cào thêm
                  </button>
                </div>

                {/* Search input for groups to easily filter among hundreds of groups */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh nhóm (UID, tên)..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {groupSearchQuery && (
                    <button onClick={() => setGroupSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs">
                      ✕
                    </button>
                  )}
                </div>

                {/* Group Selector List (Vertical scrollable container with ample space for 100+ groups) */}
                <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
                  {/* Master Button: All Groups */}
                  <button
                    onClick={() => setSelectedGroupId("")}
                    className={`w-full text-left p-3 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer border ${
                      selectedGroupId === ""
                        ? "bg-blue-600/15 border-blue-500/60 text-blue-300 font-semibold shadow-sm"
                        : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedGroupId === "" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-slate-100">Tất cả các nhóm</div>
                        <div className="text-[11px] text-slate-400">Toàn bộ kho thành viên</div>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${selectedGroupId === "" ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                      {stats.targetMembers ?? stats.filtered_members ?? 0} người
                    </span>
                  </button>

                  {/* Filtered Individual Groups */}
                  {filteredGroupsList.map((g) => (
                    <button
                      key={g.group_id}
                      onClick={() => setSelectedGroupId(g.group_id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer border ${
                        selectedGroupId === g.group_id
                          ? "bg-indigo-600/20 border-indigo-500/80 text-indigo-300 font-semibold shadow-sm"
                          : "bg-slate-950/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {g.avatar ? (
                          <img src={g.avatar} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-700" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                            {g.name?.slice(0, 1) || "Z"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-200 truncate">{g.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">UID: {g.group_id}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <div className="text-[11px] font-bold text-emerald-400">{g.filtered_member_count} sạch</div>
                        <div className="text-[10px] text-amber-400/80">{g.admin_count} admin lọc</div>
                      </div>
                    </button>
                  ))}

                  {groups.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Chưa có nhóm nào. Bấm "Thêm & Cào Nhóm" để bắt đầu.
                    </div>
                  )}

                  {groups.length > 0 && filteredGroupsList.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Không tìm thấy nhóm phù hợp với từ khóa "{groupSearchQuery}".
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: MEMBERS TABLE (Takes 8 cols on large screens) */}
              <div className="lg:col-span-8 space-y-4">
                {/* Header & Filter Controls for Members */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedGroupObj?.avatar && (
                        <img
                          src={selectedGroupObj.avatar}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                      )}
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>Đang xem thành viên:</span>
                          <span className="text-blue-400 truncate">
                            {selectedGroupObj ? selectedGroupObj.name : "Toàn Bộ Các Nhóm"}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          {selectedGroupObj
                            ? `Nhóm UID: ${selectedGroupObj.group_id} • Có ${selectedGroupObj.filtered_member_count} thành viên sạch (${selectedGroupObj.admin_count} Trưởng/Phó nhóm đã bị lọc)`
                            : `Tổng số ${stats.targetMembers ?? stats.filtered_members ?? 0} thành viên sạch trên toàn bộ hệ thống`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleSyncFriendStatus}
                          disabled={isSyncingFriends}
                          className="text-xs text-emerald-300 hover:text-white bg-emerald-600/20 hover:bg-emerald-600/30 px-3 py-1.5 rounded-lg border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-medium transition-all shadow-sm shadow-emerald-950"
                          title="Gọi n8n lấy danh sách bạn bè & đối soát để cập nhật trạng thái 🤝 Bạn bè cho toàn bộ thành viên đã cào"
                        >
                          {isSyncingFriends ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{isSyncingFriends ? "Đang đối soát..." : "Cập Nhật Trạng Thái Kết Bạn (🤝)"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTempSyncWebhookUrl(settings.n8n_sync_webhook || "");
                            setSyncWebhookModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition cursor-pointer"
                          title="Cài đặt nhanh Webhook Cập Nhật Bạn Bè n8n (nhỏ gọn)"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setAutoFriendGroupId(selectedGroupId || "all");
                          setActiveTab("auto_friend");
                        }}
                        className="text-xs text-pink-300 hover:text-white bg-pink-600/20 hover:bg-pink-600/30 px-3 py-1.5 rounded-lg border border-pink-500/40 flex items-center gap-1.5 cursor-pointer font-medium transition-all shadow-sm"
                        title="Chuyển sang công cụ gửi lời mời kết bạn hàng loạt cho nhóm này"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-pink-400" />
                        <span>Gửi Kết Bạn Nhóm Này</span>
                      </button>

                      {selectedGroupObj && (
                        <button
                          onClick={() => handleEditGroup(selectedGroupObj)}
                          className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-lg border border-amber-500/30 flex items-center gap-1.5 cursor-pointer"
                          title="Đổi tên và ảnh đại diện nhóm"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Đổi tên & Avatar</span>
                        </button>
                      )}
                      {selectedGroupId && (
                        <button
                          onClick={handleDeleteMembersInCurrentGroup}
                          disabled={isDeletingMembers}
                          className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg border border-red-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Xóa toàn bộ thành viên trong nhóm này khỏi hệ thống"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa TV Nhóm</span>
                        </button>
                      )}
                      {selectedGroupId && (
                        <button
                          onClick={() => setSelectedGroupId("")}
                          className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
                        >
                          ✕ Xóa bộ lọc
                        </button>
                      )}
                      {!selectedGroupId && members.length > 0 && (
                        <button
                          onClick={handleDeleteAllMembers}
                          disabled={isDeletingMembers}
                          className="text-xs text-rose-400/80 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 px-2.5 py-1.5 rounded-lg border border-rose-800/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Xóa sạch toàn bộ kho thành viên trong hệ thống"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa Sạch Kho</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {friendSyncNotice && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center gap-2.5 animate-fadeIn shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">{friendSyncNotice}</span>
                    </div>
                  )}


                  {/* Quick Classification Status Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/60 mt-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <button
                        onClick={() => setMemberFilterCustomer("all")}
                        className={`px-3 py-1 text-xs rounded-xl transition cursor-pointer font-medium flex items-center gap-1.5 ${
                          memberFilterCustomer === "all"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                        }`}
                      >
                        <span>Tất cả</span>
                        <span className="text-[10px] opacity-75">({stats.targetMembers ?? stats.filtered_members ?? 0})</span>
                      </button>

                      <button
                        onClick={() => setMemberFilterCustomer("potential")}
                        className={`px-3 py-1 text-xs rounded-xl transition cursor-pointer font-medium flex items-center gap-1.5 ${
                          memberFilterCustomer === "potential"
                            ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                            : "bg-amber-500/10 text-amber-300 hover:text-amber-200 border border-amber-500/20"
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>Khách Tiềm Năng</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-200 font-bold">
                          {stats.potentialCount || 0}
                        </span>
                      </button>

                      <button
                        onClick={() => setMemberFilterCustomer("blocked")}
                        className={`px-3 py-1 text-xs rounded-xl transition cursor-pointer font-medium flex items-center gap-1.5 ${
                          memberFilterCustomer === "blocked"
                            ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                            : "bg-red-500/10 text-red-300 hover:text-red-200 border border-red-500/20"
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        <span>Danh Sách Chặn (Blacklist)</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-200 font-bold">
                          {stats.blockedCount || 0}
                        </span>
                      </button>

                      <button
                        onClick={() => setMemberFilterCustomer("standard")}
                        className={`px-3 py-1 text-xs rounded-xl transition cursor-pointer font-medium flex items-center gap-1.5 ${
                          memberFilterCustomer === "standard"
                            ? "bg-slate-700 text-white shadow-sm"
                            : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                        }`}
                      >
                        <span>Chưa phân loại</span>
                      </button>
                    </div>

                    {/* Button to Open Blacklist / Leads Manager Modal */}
                    <button
                      onClick={() => setShowBlacklistModal(true)}
                      className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white px-3 py-1 rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition shadow-sm shrink-0 ml-auto"
                      title="Quản lý danh sách đen và nhập UID/SĐT hàng loạt"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>Quản Lý Blacklist & Tiềm Năng</span>
                    </button>
                  </div>

                  {/* Filter Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3">
                    {/* Role Filter */}
                    <select
                      value={memberFilterRole}
                      onChange={(e) => setMemberFilterRole(e.target.value)}
                      className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="member">Thành viên thường (Tệp gửi tin)</option>
                      <option value="admin_only">Trưởng & Phó nhóm (Đã lọc)</option>
                      <option value="all">Tất cả thành viên & Admin</option>
                    </select>

                    {/* Customer Classification Filter */}
                    <select
                      value={memberFilterCustomer}
                      onChange={(e) => setMemberFilterCustomer(e.target.value)}
                      className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="all">⭐ Phân loại: Tất cả</option>
                      <option value="potential">⭐ Khách hàng tiềm năng</option>
                      <option value="blocked">🚫 Bị chặn (Blacklist)</option>
                      <option value="standard">👥 Chưa phân loại (Thường)</option>
                    </select>

                    {/* Sent Status */}
                    <select
                      value={memberFilterSent}
                      onChange={(e) => setMemberFilterSent(e.target.value)}
                      className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">✉️ Tin nhắn: Tất cả</option>
                      <option value="not_sent">Chưa từng gửi tin</option>
                      <option value="sent">Đã từng gửi tin chiến dịch</option>
                    </select>

                    {/* Friend Status */}
                    <select
                      value={memberFilterFriend}
                      onChange={(e) => setMemberFilterFriend(e.target.value)}
                      className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">🤝 Kết bạn: Tất cả</option>
                      <option value="friend">🤝 Đã là bạn bè</option>
                      <option value="pending">⏳ Đã gửi lời mời (Chờ duyệt)</option>
                      <option value="not_friend">➕ Chưa kết bạn</option>
                    </select>

                    {/* Stranger Block Status */}
                    <select
                      value={memberFilterStranger}
                      onChange={(e) => setMemberFilterStranger(e.target.value)}
                      className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">🛡️ Chặn tin lạ: Tất cả</option>
                      <option value="allowed">Cho phép nhận tin lạ</option>
                      <option value="blocked">Chặn tin nhắn người lạ</option>
                    </select>

                    {/* Sort Order */}
                    <select
                      value={memberSortBy}
                      onChange={(e) => setMemberSortBy(e.target.value)}
                      className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="newest">⚡ Sắp xếp: Mới nhất</option>
                      <option value="friend_first">🤝 Ưu tiên Bạn bè trước</option>
                      <option value="pending_first">⏳ Ưu tiên Đang gửi lời mời</option>
                      <option value="not_friend_first">➕ Ưu tiên Chưa kết bạn</option>
                    </select>
                  </div>

                  {/* Search Bar */}
                  <div className="pt-3 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm thành viên theo tên hoặc Zalo UID..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchMembers(1)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => fetchMembers(1)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      Tìm
                    </button>
                  </div>
                </div>

                {/* Members Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>
                        Tổng số: <strong className="text-white">{memberPagination.total}</strong> thành viên
                      </span>
                      {isLoadingMembers && (
                        <span className="text-[11px] text-blue-400 flex items-center gap-1.5 animate-pulse font-medium">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Đang cập nhật...</span>
                        </span>
                      )}
                      <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 pl-4 border-l border-slate-800">
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-emerald-400" /> Đã gửi tin</span>
                        <span className="flex items-center gap-1"><UserPlus className="w-3 h-3 text-blue-400" /> Bạn bè</span>
                        <span className="flex items-center gap-1"><UserPlus className="w-3 h-3 text-amber-400" /> Đã gửi lời mời</span>
                        <span className="flex items-center gap-1"><UserPlus className="w-3 h-3 text-slate-500" /> Chưa kết bạn</span>
                        <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-red-400" /> Chặn tin lạ</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchMembers(memberPagination.page, true)}
                        className="p-1 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title="Làm mới lại dữ liệu từ Cloud Firestore"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMembers ? "animate-spin text-blue-400" : ""}`} />
                      </button>
                      <span>
                        Trang {memberPagination.page} / {memberPagination.totalPages || 1}
                      </span>
                    </div>
                  </div>

                  {/* Bulk Actions Banner */}
                  {selectedMemberIds.length > 0 && (
                    <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 animate-fadeIn shadow-lg">
                      <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                        <span>Đã chọn: <strong className="text-white bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300">{selectedMemberIds.length}</strong> thành viên</span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2">
                        {/* Đánh dấu tiềm năng hàng loạt */}
                        <button
                          onClick={() => handleBatchSetCustomerStatus("potential")}
                          className="text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-medium px-2.5 py-1.5 rounded-lg border border-amber-500/40 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>Đặt Tiềm Năng</span>
                        </button>

                        {/* Đưa vào Blacklist hàng loạt */}
                        <button
                          onClick={() => handleBatchSetCustomerStatus("blocked")}
                          className="text-xs bg-red-500/15 hover:bg-red-500/25 text-red-300 font-medium px-2.5 py-1.5 rounded-lg border border-red-500/40 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                          <span>Đưa Vào Blacklist</span>
                        </button>

                        {/* Bỏ phân loại hàng loạt */}
                        <button
                          onClick={() => handleBatchSetCustomerStatus("standard")}
                          className="text-xs bg-slate-700/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-600 flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Bỏ phân loại</span>
                        </button>

                        {/* Xóa thành viên */}
                        <button
                          onClick={handleDeleteSelectedMembers}
                          disabled={isDeletingMembers}
                          className="text-xs bg-red-600/90 hover:bg-red-600 text-white font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>

                        <button
                          onClick={() => setSelectedMemberIds([])}
                          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg border border-slate-700 bg-slate-850 cursor-pointer transition"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                  )}

                  {isLoadingMembers && members.length === 0 ? (
                    <div className="p-12 text-center">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Đang tải danh sách thành viên...</p>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      Không tìm thấy thành viên nào phù hợp.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={members.length > 0 && members.every((m) => selectedMemberIds.includes(m.zalo_id))}
                                onChange={handleToggleSelectAllPage}
                                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                                title="Chọn tất cả thành viên trên trang này"
                              />
                            </th>
                            <th className="py-3 px-4">Thành viên Zalo</th>
                            <th className="py-3 px-4">Zalo UID</th>
                            <th className="py-3 px-3 text-center">Phân Loại Khách</th>
                            <th className="py-3 px-4 text-center">Trạng Thái (Icons)</th>
                            <th className="py-3 px-4">Thuộc nhóm</th>
                            <th className="py-3 px-4">Gửi tin gần nhất</th>
                            <th className="py-3 px-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {members.map((m) => (
                            <tr
                              key={m.zalo_id}
                              className={`transition ${selectedMemberIds.includes(m.zalo_id) ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-slate-800/30"}`}
                            >
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedMemberIds.includes(m.zalo_id)}
                                  onChange={() => handleToggleSelectMember(m.zalo_id)}
                                  className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={m.avatar || "https://s160-ava-talk.zadn.vn/default"}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                                    onError={(e: any) => { e.target.src = "https://s160-ava-talk.zadn.vn/default"; }}
                                  />
                                  <div>
                                    <div className="font-semibold text-slate-200">{m.display_name}</div>
                                    {m.zalo_name && m.zalo_name !== m.display_name && (
                                      <div className="text-[10px] text-slate-400">Tên: {m.zalo_name}</div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 font-mono text-slate-300">
                                {m.zalo_id}
                              </td>

                              {/* Customer Classification */}
                              <td className="py-3 px-3 text-center">
                                {m.customer_status === "potential" ? (
                                  <button
                                    onClick={() => handleSetSingleCustomerStatus(m.zalo_id, "standard")}
                                    title="Đang là Khách Tiềm Năng (Bấm để chuyển về thường)"
                                    className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition cursor-pointer font-medium inline-flex items-center gap-1.5 text-[11px] shadow-sm"
                                  >
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span>Tiềm Năng</span>
                                  </button>
                                ) : m.customer_status === "blocked" ? (
                                  <button
                                    onClick={() => handleSetSingleCustomerStatus(m.zalo_id, "standard")}
                                    title="Đang bị chặn / Blacklist khỏi tiếp thị (Bấm để mở chặn)"
                                    className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition cursor-pointer font-medium inline-flex items-center gap-1.5 text-[11px] shadow-sm"
                                  >
                                    <ShieldAlert className="w-3 h-3 text-red-400" />
                                    <span>Bị Chặn</span>
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                                    <button
                                      onClick={() => handleSetSingleCustomerStatus(m.zalo_id, "potential")}
                                      title="Đánh dấu Khách Tiềm Năng"
                                      className="p-1 rounded text-slate-500 hover:text-amber-300 hover:bg-amber-500/10 transition cursor-pointer"
                                    >
                                      <Star className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleSetSingleCustomerStatus(m.zalo_id, "blocked")}
                                      title="Đưa vào Danh Sách Chặn (Blacklist)"
                                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                    >
                                      <ShieldAlert className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Icons */}
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span
                                    title={m.campaign_sent_count > 0 ? `Đã gửi ${m.campaign_sent_count} lần (gần nhất: ${m.last_campaign_sent_at})` : "Chưa gửi tin chiến dịch"}
                                    className={`w-6 h-6 rounded flex items-center justify-center border ${
                                      m.campaign_sent_count > 0
                                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                        : "bg-slate-800/60 border-slate-700/50 text-slate-500"
                                    }`}
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </span>

                                  <button
                                    onClick={() => {
                                      const nextStatus = m.is_friend === 1 ? 2 : m.is_friend === 2 ? 0 : 1;
                                      handleToggleMember(m.zalo_id, { is_friend: nextStatus });
                                    }}
                                    title={
                                      m.is_friend === 1
                                        ? "🤝 Đã là bạn bè (Bấm để chuyển sang Đang chờ)"
                                        : m.is_friend === 2
                                        ? "⏳ Đã gửi lời mời (Bấm để chuyển sang Chưa kết bạn)"
                                        : "➕ Chưa kết bạn (Bấm để chuyển sang Bạn bè)"
                                    }
                                    className={`w-6 h-6 rounded flex items-center justify-center border transition cursor-pointer ${
                                      m.is_friend === 1
                                        ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                                        : m.is_friend === 2
                                        ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                        : "bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleToggleMember(m.zalo_id, { block_stranger_msg: m.block_stranger_msg === 1 ? 0 : 1 })}
                                    title={m.block_stranger_msg === 1 ? "Đang chặn tin nhắn người lạ (Bấm để đổi)" : "Cho phép nhận tin lạ"}
                                    className={`w-6 h-6 rounded flex items-center justify-center border transition cursor-pointer ${
                                      m.block_stranger_msg === 1
                                        ? "bg-red-500/15 border-red-500/30 text-red-400"
                                        : "bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-slate-300"
                                    }`}
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                              {(() => {
                                const matched = groups.find((g) => (m.group_ids || []).includes(g.group_id));
                                const displayGroup = (m.groups_list && !m.groups_list.startsWith("GROUP_")) ? m.groups_list : (matched?.name || m.groups_list || "Chưa gán");
                                return (
                                  <td className="py-3 px-4 text-slate-300 max-w-[160px] truncate" title={displayGroup}>
                                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[11px] border border-slate-700/60 text-slate-200">
                                      {displayGroup}
                                    </span>
                                  </td>
                                );
                              })()}

                              <td className="py-3 px-4 text-slate-400 text-[11px]">
                                {m.last_campaign_sent_at || "Chưa gửi"}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => copyToClipboard(m.zalo_id)}
                                    className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 px-2 py-1 rounded border border-slate-700 transition cursor-pointer inline-flex items-center gap-1 text-[11px]"
                                    title="Sao chép UID"
                                  >
                                    {copiedUid === m.zalo_id ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    <span>UID</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSingleMember(m.zalo_id, m.display_name)}
                                    className="text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-750 p-1.5 rounded border border-slate-700 transition cursor-pointer"
                                    title="Xóa thành viên này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  {memberPagination.totalPages > 1 && (
                    <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                      <button
                        disabled={memberPagination.page <= 1}
                        onClick={() => fetchMembers(memberPagination.page - 1)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                      >
                        Trang trước
                      </button>
                      <span className="text-xs text-slate-400">
                        Trang {memberPagination.page} / {memberPagination.totalPages}
                      </span>
                      <button
                        disabled={memberPagination.page >= memberPagination.totalPages}
                        onClick={() => fetchMembers(memberPagination.page + 1)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                      >
                        Trang sau
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: AUTO FRIEND (GỬI KẾT BẠN HÀNG LOẠT) ================= */}
        {activeTab === "auto_friend" && (
          <div className="space-y-6">
            {/* Header & Quick Action */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-pink-400" />
                  <span>Gửi Lời Mời Kết Bạn Zalo Tự Động (Anti-Checkpoint)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Chọn số lượng & nhóm cần gửi lời mời kết bạn. n8n tự động giãn cách ngẫu nhiên 15 - 30s giữa mỗi người để bảo vệ nick Zalo.
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncFriendStatus}
                  disabled={isSyncingFriends}
                  className="text-xs text-emerald-300 hover:text-white bg-emerald-600/20 hover:bg-emerald-600/30 px-3.5 py-2 rounded-xl border border-emerald-500/40 flex items-center gap-2 cursor-pointer disabled:opacity-50 font-medium transition-all shadow-sm"
                  title="Gọi n8n lấy danh sách bạn bè & đối soát với toàn bộ thành viên cào trong hệ thống"
                >
                  {isSyncingFriends ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{isSyncingFriends ? "Đang đối soát..." : "Cập Nhật Trạng Thái Kết Bạn (🤝)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempSyncWebhookUrl(settings.n8n_sync_webhook || "");
                    setSyncWebhookModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-700 transition cursor-pointer"
                  title="Cài đặt nhanh Webhook Cập Nhật Bạn Bè n8n (nhỏ gọn)"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            {autoFriendNotice && (
              <div
                className={`p-4 rounded-2xl text-xs flex items-center gap-3 border shadow-sm ${
                  autoFriendNotice.includes("Lỗi")
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                {autoFriendNotice.includes("Lỗi") ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="font-medium">{autoFriendNotice}</span>
              </div>
            )}

            {friendSyncNotice && (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{friendSyncNotice}</span>
              </div>
            )}

            {/* Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Đã là bạn bè (🤝)</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{stats.friendsCount}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Nhắn tin không bị chặn tin lạ</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Chưa kết bạn (Sẵn sàng gửi)</p>
                  <p className="text-xl font-bold text-pink-400 mt-1">{autoFriendAvailableCount}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Trong tệp đang chọn</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Đã gửi lời mời (⏳ Chờ duyệt)</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">
                    {Math.max(0, (stats.targetMembers || 0) - (stats.friendsCount || 0) - autoFriendAvailableCount)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Đang chờ đối phương đồng ý</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Config & Action Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-pink-400" />
                Cấu Hình Đợt Gửi Lời Mời Kết Bạn
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tài khoản Zalo gửi */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Tài khoản SĐT Zalo thực hiện kết bạn
                  </label>
                  <select
                    value={autoFriendAccountPhone}
                    onChange={(e) => setAutoFriendAccountPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    {accounts.length === 0 ? (
                      <option value="">Tài khoản mặc định n8n</option>
                    ) : (
                      accounts.map((acc) => (
                        <option key={acc.phone} value={acc.phone}>
                          {acc.name || "Zalo"} ({acc.phone})
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tài khoản Zalo sẽ gửi lời mời tới các thành viên được chọn.
                  </p>
                </div>

                {/* Chọn nguồn nhóm */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Nguồn thành viên cần kết bạn
                    </label>
                    {autoFriendGroupId !== "all" && (
                      <button
                        type="button"
                        onClick={() => {
                          const grp = groups.find((g) => g.group_id === autoFriendGroupId);
                          if (grp) openEditGroupModal(grp);
                        }}
                        className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer font-medium"
                        title="Đổi tên nhóm này để dễ nhận diện thay vì UID"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Đổi tên nhóm</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={autoFriendGroupId}
                      onChange={(e) => setAutoFriendGroupId(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                    >
                      <option value="all">🌐 Tất cả các nhóm (Toàn bộ kho thành viên cào)</option>
                      {groups.map((g) => (
                        <option key={g.group_id} value={g.group_id}>
                          {g.name} ({g.filtered_member_count || 0} thành viên sạch)
                        </option>
                      ))}
                    </select>

                    {autoFriendGroupId !== "all" && (
                      <button
                        type="button"
                        onClick={() => {
                          const grp = groups.find((g) => g.group_id === autoFriendGroupId);
                          if (grp) openEditGroupModal(grp);
                        }}
                        className="px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition"
                        title="Bấm để đổi tên hiển thị của nhóm này thay vì số UID"
                      >
                        <Edit className="w-3.5 h-3.5 text-pink-400" />
                        <span className="hidden sm:inline">Đổi tên nhóm</span>
                      </button>
                    )}
                  </div>

                  {autoFriendGroupId !== "all" && (() => {
                    const currentGrp = groups.find((g) => g.group_id === autoFriendGroupId);
                    const isDefaultName = currentGrp?.name && (currentGrp.name.includes(currentGrp.group_id) || currentGrp.name.startsWith("Nhóm Zalo"));
                    if (isDefaultName) {
                      return (
                        <div className="mt-2 p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300 flex items-center justify-between gap-2 animate-fadeIn">
                          <span className="text-[11px] leading-relaxed">
                            💡 Nhóm này đang hiển thị theo số UID Zalo. Bấm nút bên để đặt tên thực tế:
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditGroupModal(currentGrp)}
                            className="bg-pink-600 hover:bg-pink-500 text-white font-semibold px-2.5 py-1 rounded-lg text-[11px] shrink-0 cursor-pointer shadow-sm transition"
                          >
                            ✏️ Đặt tên nhóm
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <p className="text-[11px] text-slate-500 mt-1">
                    Chỉ lọc những thành viên chưa kết bạn (loại bỏ Admin và người đã gửi).
                  </p>
                </div>
              </div>

              {/* Số lượng gửi & Giãn cách */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Số lượng người gửi đợt này
                    </label>
                    <span className="text-xs font-bold text-pink-400">
                      {autoFriendLimit} người
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[10, 20, 30, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAutoFriendLimit(preset)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          autoFriendLimit === preset
                            ? "bg-pink-600 text-white border-pink-500 shadow-sm"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    💡 Khuyến nghị: 20-30 người/ngày mỗi tài khoản để giữ an toàn tuyệt đối cho nick Zalo.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Giãn cách ngẫu nhiên giữa 2 lần gửi (giây)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min={5}
                        max={120}
                        value={autoFriendDelayMin}
                        onChange={(e) => setAutoFriendDelayMin(Number(e.target.value) || 15)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                      />
                      <span className="text-[11px] text-slate-500 absolute right-3 top-1/2 -translate-y-1/2">
                        s (Tối thiểu)
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={autoFriendDelayMax}
                        onChange={(e) => setAutoFriendDelayMax(Number(e.target.value) || 30)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                      />
                      <span className="text-[11px] text-slate-500 absolute right-3 top-1/2 -translate-y-1/2">
                        s (Tối đa)
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Mỗi lần gửi n8n sẽ random từ {autoFriendDelayMin}s đến {autoFriendDelayMax}s mô phỏng thao tác người thật.
                  </p>
                </div>
              </div>

              {/* Lời nhắn kết bạn */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Lời nhắn gửi kèm lời mời kết bạn
                </label>
                <textarea
                  rows={2}
                  value={autoFriendMessage}
                  onChange={(e) => setAutoFriendMessage(e.target.value)}
                  placeholder="Chào bạn, mình cùng trong nhóm Zalo, kết bạn trao đổi nhé!"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 self-center">Mẫu gợi ý:</span>
                  {[
                    "Chào bạn, mình cùng nhóm Zalo, kết bạn trao đổi nhé!",
                    "Chào bạn, mình kết bạn giao lưu hỗ trợ nhé!",
                    "Chào bạn!",
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setAutoFriendMessage(tpl)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md border border-slate-700 cursor-pointer"
                    >
                      {tpl}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAutoFriendMessage("")}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded-md border border-slate-700 cursor-pointer"
                  >
                    Bỏ trống (Mặc định Zalo)
                  </button>
                </div>
              </div>

              {/* Compact Webhook Friend Request Settings */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowFriendWebhookQuick(!showFriendWebhookQuick)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition cursor-pointer py-1"
                  >
                    <Settings className="w-3 h-3 text-slate-500" />
                    <span>⚙️ Cài đặt Webhook Kết Bạn n8n (nhỏ gọn)</span>
                    <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${showFriendWebhookQuick ? "rotate-180" : ""}`} />
                  </button>
                  {settings.n8n_friend_webhook && (
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs hidden sm:inline">
                      {settings.n8n_friend_webhook}
                    </span>
                  )}
                </div>
                {showFriendWebhookQuick && (
                  <div className="mt-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="https://n8n.qmath.io.vn/webhook/zalo-friend-request"
                      value={settings.n8n_friend_webhook || ""}
                      onChange={(e) => setSettings({ ...settings, n8n_friend_webhook: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-pink-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickSaveWebhook("n8n_friend_webhook", settings.n8n_friend_webhook)}
                      className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-lg transition shrink-0 cursor-pointer shadow-sm"
                    >
                      Lưu URL
                    </button>
                  </div>
                )}
              </div>

              {/* Nút thực thi chính */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-800/80">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cơ chế an toàn: tự động đổi trạng thái sang ⏳ Đang chờ xác nhận ngay khi kích hoạt.</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSyncFriendStatus}
                    disabled={isSyncingFriends}
                    className="px-4 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
                  >
                    {isSyncingFriends ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>Cập Nhật Trạng Thái Kết Bạn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempSyncWebhookUrl(settings.n8n_sync_webhook || "");
                      setSyncWebhookModalOpen(true);
                    }}
                    className="p-2.5 text-slate-400 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-700 transition cursor-pointer"
                    title="Cài đặt nhanh Webhook Cập Nhật Bạn Bè n8n (nhỏ gọn)"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSendFriendRequests}
                    disabled={isSendingFriendRequests || autoFriendPreviewMembers.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition shadow-lg shadow-pink-900/30"
                  >
                    {isSendingFriendRequests ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang kích hoạt n8n...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Bắt Đầu Gửi Kết Bạn ({Math.min(autoFriendLimit, autoFriendPreviewMembers.length)} người)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Danh Sách Xem Trước Thành Viên Sẽ Nhận Lời Mời */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Danh Sách Thành Viên Sẽ Gửi Lời Mời (Tối Đa {autoFriendLimit} Người Đợt Này)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hệ thống đã tự động lọc chỉ lấy thành viên chưa kết bạn (➕) và không phải Admin nhóm.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchAutoFriendPreview}
                  disabled={isLoadingAutoFriendPreview}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAutoFriendPreview ? "animate-spin text-blue-400" : ""}`} />
                  <span>Làm mới DS</span>
                </button>
              </div>

              {isLoadingAutoFriendPreview ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-pink-400" />
                  <span>Đang tải danh sách thành viên...</span>
                </div>
              ) : autoFriendPreviewMembers.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                  <UserCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-70" />
                  <p className="text-slate-300 font-medium">Không có thành viên nào cần gửi kết bạn!</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tất cả thành viên trong nhóm này đã là bạn bè hoặc đã được gửi lời mời kết bạn trước đó.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">STT</th>
                        <th className="px-4 py-3">Thành viên</th>
                        <th className="px-4 py-3">Zalo UID</th>
                        <th className="px-4 py-3">Nhóm gốc</th>
                        <th className="px-4 py-3 text-center">Trạng thái hiện tại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                      {autoFriendPreviewMembers.map((m, idx) => (
                        <tr key={m.zalo_id || m.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 flex items-center gap-3">
                            {m.avatar ? (
                              <img
                                src={m.avatar}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {m.display_name?.slice(0, 1) || "U"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate max-w-[200px]">
                                {m.display_name || "Thành viên"}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {m.gender === "male" ? "Nam" : m.gender === "female" ? "Nữ" : "Ẩn giới tính"}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            <span className="flex items-center gap-1.5">
                              {m.zalo_id || m.id}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(m.zalo_id || m.id)}
                                className="text-slate-500 hover:text-white cursor-pointer"
                                title="Copy UID"
                              >
                                {copiedUid === (m.zalo_id || m.id) ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">
                            {m.group_name || m.group_id || "Chung"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              ➕ Chưa kết bạn
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: ACCOUNTS MANAGEMENT ================= */}
        {activeTab === "accounts" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Thêm Số Điện Thoại Zalo & Cấu Hình Webhook</span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Mỗi tài khoản Zalo có thể cấu hình trọn bộ Webhook n8n cho: <strong>Cào nhóm</strong>, <strong>Gửi tin tiếp thị</strong>, <strong>Gửi kết bạn</strong> và <strong>Đồng bộ bạn bè</strong>.
              </p>

              {/* Note on 2-webhook vs 4-webhook */}
              <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                <span className="text-base leading-none">💡</span>
                <div className="leading-relaxed">
                  <strong>Tùy chọn cấu hình Webhook linh hoạt:</strong><br />
                  • <strong>Nếu dùng 2 Webhook n8n (gộp):</strong> Chỉ cần điền <strong>Webhook Cào</strong> (tự động kiêm luôn Đồng bộ bạn bè) và <strong>Webhook Gửi Tin</strong> (tự động kiêm luôn Gửi kết bạn). Hai ô bên dưới để trống!<br />
                  • <strong>Nếu dùng 4 Webhook n8n riêng biệt:</strong> Điền đầy đủ cả 4 đường link Webhook tương ứng bên dưới.
                </div>
              </div>

              <form onSubmit={handleAddAccount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Số Điện Thoại Zalo (*)</label>
                    <input
                      type="text"
                      placeholder="vd: 0912345678"
                      value={newAccount.phone}
                      onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tên Gợi Nhớ Tài Khoản</label>
                    <input
                      type="text"
                      placeholder="vd: Zalo Marketing 01, CSKH 02"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      1. Webhook n8n Cào Nhóm Zalo (*)
                    </label>
                    <input
                      type="url"
                      placeholder="https://n8n.domain.com/webhook/zalo-scrape"
                      value={newAccount.scrape_webhook_url}
                      onChange={(e) => setNewAccount({ ...newAccount, scrape_webhook_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Dùng để quét danh sách thành viên nhóm Zalo</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      2. Webhook n8n Gửi Tin Tiếp Thị
                    </label>
                    <input
                      type="url"
                      placeholder="https://n8n.domain.com/webhook/zalo-send-campaign"
                      value={newAccount.send_webhook_url}
                      onChange={(e) => setNewAccount({ ...newAccount, send_webhook_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Dùng để gửi tin nhắn kèm ảnh/video hàng loạt</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      3. Webhook n8n Gửi Lời Mời Kết Bạn (Tùy chọn)
                    </label>
                    <input
                      type="url"
                      placeholder="https://n8n.domain.com/webhook/zalo-send-friend-requests (để trống nếu dùng chung Webhook 2)"
                      value={newAccount.friend_webhook_url}
                      onChange={(e) => setNewAccount({ ...newAccount, friend_webhook_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Để trống nếu dùng chung Webhook Gửi Tin n8n</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      4. Webhook n8n Đồng Bộ / Đối Soát Bạn Bè (Tùy chọn)
                    </label>
                    <input
                      type="url"
                      placeholder="https://n8n.domain.com/webhook/zalo-sync-friends (để trống nếu dùng chung Webhook 1)"
                      value={newAccount.sync_webhook_url}
                      onChange={(e) => setNewAccount({ ...newAccount, sync_webhook_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Để trống nếu dùng chung Webhook Cào n8n</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    * Khi bấm "Bắt đầu cào", bạn có thể chọn SĐT này để gọi đúng Webhook n8n tương ứng.
                  </span>
                  <button
                    type="submit"
                    disabled={isAddingAccount}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    {isAddingAccount ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Thêm Tài Khoản
                  </button>
                </div>

                {accountNotice && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-xl">
                    {accountNotice}
                  </div>
                )}
              </form>
            </div>

            {/* Accounts Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Danh Sách SĐT Zalo & Webhook Riêng Biệt ({accounts.length})
                </h4>
              </div>

              {accounts.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Chưa có số điện thoại nào.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Số Điện Thoại & Tên</th>
                        <th className="py-3 px-4">Webhook Cào & Đồng Bộ</th>
                        <th className="py-3 px-4">Webhook Gửi Tin & Kết Bạn</th>
                        <th className="py-3 px-4">Nhóm Đã Cào</th>
                        <th className="py-3 px-4">Tin Đã Gửi</th>
                        <th className="py-3 px-4">Trạng Thái</th>
                        <th className="py-3 px-4 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {accounts.map((a) => (
                        <tr key={a.phone} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-medium">
                            <div className="text-slate-100 font-semibold font-mono">{a.phone}</div>
                            <div className="text-[11px] text-slate-400">{a.name}</div>
                          </td>
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="text-[11px] text-slate-300 flex items-center gap-1">
                              <span className="text-blue-400 font-semibold">Cào:</span>
                              <span className="font-mono text-slate-400 truncate max-w-[180px]" title={a.scrape_webhook_url}>
                                {a.scrape_webhook_url || "Mặc định"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span className="text-emerald-400 font-semibold">Sync:</span>
                              <span className="font-mono text-slate-500 truncate max-w-[180px]" title={a.sync_webhook_url}>
                                {a.sync_webhook_url || "Chung với cào"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="text-[11px] text-slate-300 flex items-center gap-1">
                              <span className="text-indigo-400 font-semibold">Gửi:</span>
                              <span className="font-mono text-slate-400 truncate max-w-[180px]" title={a.send_webhook_url}>
                                {a.send_webhook_url || "Mặc định"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span className="text-pink-400 font-semibold">Kết bạn:</span>
                              <span className="font-mono text-slate-500 truncate max-w-[180px]" title={a.friend_webhook_url}>
                                {a.friend_webhook_url || "Chung với gửi"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded">
                              {a.total_scraped_groups || 0} nhóm
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded">
                              {a.total_sent_messages || 0} tin
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditAccount(a)}
                                className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1 text-xs"
                                title="Chỉnh sửa thông tin tài khoản SĐT này"
                              >
                                <Edit className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Sửa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(a.id || a.phone)}
                                className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: GROUPS MANAGEMENT (WITH "BẮT ĐẦU CÀO" BUTTON) ================= */}
        {activeTab === "groups" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-sm text-white mb-2 flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-400 fill-blue-400" />
                Thêm Nhóm Zalo Cần Cào Thành Viên
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Nhập UID nhóm hoặc link mời. Khi bấm <strong>"Bắt đầu cào"</strong>, hệ thống sẽ tự động thêm nhóm và gọi ngay n8n Webhook tương ứng để cào dữ liệu.
              </p>

              <form onSubmit={handleStartScrapeGroup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">UID Nhóm (Group ID)</label>
                    <input
                      type="text"
                      placeholder="vd: 2168952475069976002"
                      value={newGroupInput.group_id}
                      onChange={(e) => setNewGroupInput({ ...newGroupInput, group_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Link Mời (Invite Link)</label>
                    <input
                      type="text"
                      placeholder="vd: https://zalo.me/g/xxxxxx"
                      value={newGroupInput.invite_link}
                      onChange={(e) => setNewGroupInput({ ...newGroupInput, invite_link: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Chọn SĐT Zalo Đi Cào (*)</label>
                    <select
                      value={newGroupInput.account_phone}
                      onChange={(e) => setNewGroupInput({ ...newGroupInput, account_phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Dùng Webhook mặc định --</option>
                      {accounts.map((a) => (
                        <option key={a.phone} value={a.phone}>
                          {a.phone} ({a.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tên Gợi Nhớ Nhóm</label>
                    <input
                      type="text"
                      placeholder="vd: Nhóm Ôn Thi Toán 10"
                      value={newGroupInput.name}
                      onChange={(e) => setNewGroupInput({ ...newGroupInput, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    * Bấm "Bắt đầu cào" sẽ tự động kích hoạt Webhook n8n ngay lập tức.
                  </span>

                  <button
                    type="submit"
                    disabled={isAddingGroup}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/25 transition cursor-pointer flex items-center gap-2"
                  >
                    {isAddingGroup ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang gửi lệnh sang n8n...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Bắt đầu cào</span>
                      </>
                    )}
                  </button>
                </div>

                {groupNotice && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-xl">
                    {groupNotice}
                  </div>
                )}

                {/* Compact Webhook Scrape Settings */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowScrapeWebhookQuick(!showScrapeWebhookQuick)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition cursor-pointer py-1"
                    >
                      <Settings className="w-3 h-3 text-slate-500" />
                      <span>⚙️ Cài đặt Webhook Cào n8n (nhỏ gọn)</span>
                      <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${showScrapeWebhookQuick ? "rotate-180" : ""}`} />
                    </button>
                    {settings.n8n_scrape_webhook && (
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs hidden sm:inline">
                        {settings.n8n_scrape_webhook}
                      </span>
                    )}
                  </div>
                  {showScrapeWebhookQuick && (
                    <div className="mt-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 animate-fadeIn">
                      <input
                        type="text"
                        placeholder="https://n8n.qmath.io.vn/webhook/zalo-scrape"
                        value={settings.n8n_scrape_webhook || ""}
                        onChange={(e) => setSettings({ ...settings, n8n_scrape_webhook: e.target.value })}
                        className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickSaveWebhook("n8n_scrape_webhook", settings.n8n_scrape_webhook)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-lg transition shrink-0 cursor-pointer shadow-sm"
                      >
                        Lưu URL
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Groups Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Danh Sách Nhóm Đã Thu Thập ({groups.length})
                </h4>
              </div>

              {groups.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Chưa có nhóm nào.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Nhóm Zalo</th>
                        <th className="py-3 px-4">UID / Link</th>
                        <th className="py-3 px-4">SĐT Cào</th>
                        <th className="py-3 px-4">Tổng gốc</th>
                        <th className="py-3 px-4">Thành viên sạch</th>
                        <th className="py-3 px-4">Admin đã loại</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {groups.map((g) => (
                        <tr key={g.group_id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-medium text-slate-200">
                            <div className="flex items-center gap-2.5">
                              {g.avatar ? (
                                <img src={g.avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">Z</div>
                              )}
                              <div>
                                <div className="font-semibold text-slate-200">{g.name}</div>
                                {g.creator_id && <div className="text-[10px] text-slate-500">Trưởng: {g.creator_id}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">{g.group_id}</td>
                          <td className="py-3 px-4 font-mono text-emerald-400">
                            {g.account_phone ? `${g.account_phone} (${g.account_name || ""})` : "Mặc định"}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-300">{g.total_member}</td>
                          <td className="py-3 px-4">
                            <span className="bg-emerald-500/15 text-emerald-400 font-semibold px-2 py-0.5 rounded">
                              {g.filtered_member_count} người
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-amber-500/15 text-amber-400 font-semibold px-2 py-0.5 rounded">
                              {g.admin_count} người
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedGroupId(g.group_id);
                                  setActiveTab("members_hub");
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer"
                              >
                                Xem thành viên
                              </button>
                              <button
                                onClick={() => handleEditGroup(g)}
                                className="p-1 text-slate-400 hover:text-amber-400 bg-slate-800 rounded-lg cursor-pointer"
                                title="Đổi tên và ảnh đại diện nhóm"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleReScrape(g.group_id, g.invite_link, g.account_phone)}
                                className="p-1 text-slate-400 hover:text-blue-400 bg-slate-800 rounded-lg cursor-pointer"
                                title="Cào lại qua n8n"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteGroup(g.group_id)}
                                className="p-1 text-slate-400 hover:text-red-400 bg-slate-800 rounded-lg cursor-pointer"
                                title="Xóa nhóm"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: CAMPAIGNS (WITH EDIT & DELETE) ================= */}
        {activeTab === "campaigns" && (
          <div className="space-y-6">
            {/* Create or Edit Campaign Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-400" />
                  <span>{editingCampaignId ? "Chỉnh Sửa Chiến Dịch Tiếp Thị" : "Lên Chiến Dịch Mới (Chống Spam & Đa Phương Tiện)"}</span>
                </h3>
                {editingCampaignId && (
                  <button
                    type="button"
                    onClick={handleCancelEditCampaign}
                    className="text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveCampaign} className="space-y-4">
                {/* Row 1: Clean, modern, lightweight controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* Col 1: Campaign Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Tên Chiến Dịch (*)</label>
                    <input
                      type="text"
                      placeholder="vd: Quảng cáo Khóa học Toán 10"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  {/* Col 2: Sender Account */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Chọn SĐT Zalo Gửi Tin</label>
                    <div className="relative">
                      <select
                        value={campaignForm.account_phone}
                        onChange={(e) => setCampaignForm({ ...campaignForm, account_phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-normal text-slate-200 focus:outline-none transition-colors appearance-none pr-8 cursor-pointer"
                      >
                        <option value="" className="bg-slate-950 text-slate-300">-- Dùng Webhook Gửi mặc định --</option>
                        {accounts.map((a) => (
                          <option key={a.phone} value={a.phone} className="bg-slate-950 text-slate-200">
                            {a.phone} ({a.name || "Không tên"})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Col 3: Target Group Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>Tệp Nhận Tin</span>
                      </label>
                      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setCampaignForm({ ...campaignForm, target_group_id: "all" })}
                          className={`px-2 py-0.5 text-[10px] rounded-md transition font-medium cursor-pointer ${
                            campaignForm.target_group_id === "all"
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (campaignForm.target_group_id === "all" && groups.length > 0) {
                              setCampaignForm({ ...campaignForm, target_group_id: groups[0].group_id });
                            }
                          }}
                          className={`px-2 py-0.5 text-[10px] rounded-md transition font-medium cursor-pointer ${
                            campaignForm.target_group_id !== "all"
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Từng nhóm
                        </button>
                      </div>
                    </div>

                    {campaignForm.target_group_id === "all" ? (
                      <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 flex items-center justify-between shadow-inner">
                        <span className="truncate text-slate-200 font-normal">Toàn bộ nhóm</span>
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded ml-1 shrink-0">
                          {stats.targetMembers ?? stats.filtered_members ?? 0}
                        </span>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={campaignForm.target_group_id}
                          onChange={(e) => setCampaignForm({ ...campaignForm, target_group_id: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-normal text-slate-200 focus:outline-none transition-colors appearance-none pr-8 cursor-pointer"
                        >
                          {groups.map((g) => (
                            <option key={g.group_id} value={g.group_id} className="bg-slate-950 text-slate-200 py-1">
                              {g.name} ({g.filtered_member_count} người)
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Col 4: Customer Classification Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>Đối Tượng Khách</span>
                      </label>
                      <span className="text-[10px] font-medium text-amber-400">
                        {campaignForm.customer_filter === "potential_only" ? "⭐ Tiềm năng" : campaignForm.customer_filter === "standard_only" ? "👥 Thường" : "🌐 Tất cả"}
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        value={campaignForm.customer_filter || "all"}
                        onChange={(e) => setCampaignForm({ ...campaignForm, customer_filter: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-normal text-slate-200 focus:outline-none transition-colors appearance-none pr-8 cursor-pointer"
                      >
                        <option value="all" className="bg-slate-950 text-slate-200 py-1">🌐 Tất cả (Trừ người bị chặn)</option>
                        <option value="potential_only" className="bg-slate-950 text-slate-200 py-1">⭐ Chỉ gửi Khách Tiềm Năng</option>
                        <option value="standard_only" className="bg-slate-950 text-slate-200 py-1">👥 Chỉ gửi Khách thông thường</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      Tự động loại trừ 100% người bị chặn
                    </p>
                  </div>

                  {/* Col 5: Friend Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Phân Loại Bạn Bè</span>
                      </label>
                      <span className="text-[10px] font-medium text-emerald-400">
                        {campaignForm.friend_filter === "friends_first"
                          ? "⚡ Mix"
                          : campaignForm.friend_filter === "friends_only"
                          ? "🤝 Bạn bè"
                          : campaignForm.friend_filter === "not_friends_only"
                          ? "👤 Người lạ"
                          : "🌐 Tất cả"}
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        value={campaignForm.friend_filter || "all"}
                        onChange={(e) => setCampaignForm({ ...campaignForm, friend_filter: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-normal text-slate-200 focus:outline-none transition-colors appearance-none pr-8 cursor-pointer"
                      >
                        <option value="all" className="bg-slate-950 text-slate-200 py-1">🌐 Tất cả bạn & lạ</option>
                        <option value="friends_first" className="bg-slate-950 text-slate-200 py-1">⚡ Mix: Ưu tiên bạn bè trước</option>
                        <option value="friends_only" className="bg-slate-950 text-slate-200 py-1">🤝 Chỉ gửi bạn bè</option>
                        <option value="not_friends_only" className="bg-slate-950 text-slate-200 py-1">👤 Chỉ gửi người lạ</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      {campaignForm.friend_filter === "friends_first" && "Gửi bạn bè trước, sau đó gửi người lạ"}
                      {campaignForm.friend_filter === "friends_only" && "Chỉ gửi người đã là bạn bè"}
                      {campaignForm.friend_filter === "not_friends_only" && "Chỉ gửi người chưa kết bạn"}
                      {(!campaignForm.friend_filter || campaignForm.friend_filter === "all") && "Gửi cho cả bạn bè và người lạ"}
                    </p>
                  </div>
                </div>

                {/* Row 2: Anti-Spam Controls */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Cài Đặt Chống Spam & An Toàn Tài Khoản Zalo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Giới hạn người gửi đợt này</label>
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        value={campaignForm.max_recipients}
                        onChange={(e) => setCampaignForm({ ...campaignForm, max_recipients: parseInt(e.target.value) || 50 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-500">vd: 50 hoặc 100 người/đợt</span>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Loại trừ người đã gửi trong (ngày)</label>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={campaignForm.cooldown_days}
                        onChange={(e) => setCampaignForm({ ...campaignForm, cooldown_days: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-500">vd: 10 hoặc 15 ngày qua</span>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Giãn cách delay giữa các tin (giây)</label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={campaignForm.delay_seconds}
                        onChange={(e) => setCampaignForm({ ...campaignForm, delay_seconds: parseInt(e.target.value) || 15 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-500">Khuyên dùng: 15s - 45s</span>
                    </div>

                    <div className="flex flex-col justify-center">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200 mt-2">
                        <input
                          type="checkbox"
                          checked={Boolean(campaignForm.auto_friend_first)}
                          onChange={(e) => setCampaignForm({ ...campaignForm, auto_friend_first: e.target.checked ? 1 : 0 })}
                          className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4 bg-slate-900"
                        />
                        <span>Kết bạn trước khi gửi tin</span>
                      </label>
                      <span className="text-[10px] text-slate-500 mt-0.5">Vượt qua người chặn tin lạ</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: Rich Media Upload & Link */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>Đính Kèm Đa Phương Tiện (Ảnh Trực Tiếp / Video Nhẹ / Link)</span>
                    </div>
                    {isUploadingMedia && (
                      <span className="text-xs text-blue-400 flex items-center gap-1.5 animate-pulse font-medium">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tải & tối ưu tệp media...</span>
                      </span>
                    )}
                  </div>

                  {mediaUploadError && (
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{mediaUploadError}</span>
                    </div>
                  )}

                  {/* 3 Media Types: Image, Video, Document */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {/* Col 1: Hình Ảnh */}
                    <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                      <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-cyan-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>1. Hình Ảnh (Image)</span>
                        </span>
                        <span className="text-[10px] text-slate-500">JPG, PNG &lt; 10MB</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-500/50 rounded-xl px-3 py-2 text-xs cursor-pointer transition-all shadow-sm">
                          <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Chọn Ảnh Từ Máy</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => handleMediaFileUpload(e, "image")}
                            disabled={isUploadingMedia}
                          />
                        </label>
                      </div>

                      <input
                        type="url"
                        placeholder="Hoặc dán link: https://.../img.jpg"
                        value={campaignForm.image_url}
                        onChange={(e) => {
                          setCampaignForm({
                            ...campaignForm,
                            image_url: e.target.value,
                            media_url: e.target.value,
                            media_type: "image",
                            video_url: "",
                            document_url: "",
                          });
                          if (e.target.value) {
                            setUploadedMediaInfo({
                              name: "Link ảnh ngoài",
                              size: 0,
                              mediaType: "image",
                              previewUrl: e.target.value,
                            });
                          } else if (uploadedMediaInfo?.mediaType === "image") {
                            setUploadedMediaInfo(null);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>

                    {/* Col 2: Video */}
                    <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                      <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-rose-400">
                          <Video className="w-3.5 h-3.5" />
                          <span>2. Video Nhẹ (Dung lượng thấp)</span>
                        </span>
                        <span className="text-[10px] text-amber-400 font-semibold">&lt; 15MB</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500/50 rounded-xl px-3 py-2 text-xs cursor-pointer transition-all shadow-sm">
                          <UploadCloud className="w-3.5 h-3.5 text-rose-400" />
                          <span>Chọn Video Từ Máy</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={(e) => handleMediaFileUpload(e, "video")}
                            disabled={isUploadingMedia}
                          />
                        </label>
                      </div>

                      <input
                        type="url"
                        placeholder="Hoặc dán link: https://.../video.mp4"
                        value={campaignForm.video_url}
                        onChange={(e) => {
                          setCampaignForm({
                            ...campaignForm,
                            video_url: e.target.value,
                            media_url: e.target.value,
                            media_type: "video",
                            image_url: "",
                            document_url: "",
                          });
                          if (e.target.value) {
                            setUploadedMediaInfo({
                              name: "Link video ngoài",
                              size: 0,
                              mediaType: "video",
                              previewUrl: e.target.value,
                            });
                          } else if (uploadedMediaInfo?.mediaType === "video") {
                            setUploadedMediaInfo(null);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>

                    {/* Col 3: Tài Liệu PDF, Word */}
                    <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                      <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <FileText className="w-3.5 h-3.5" />
                          <span>3. Tài Liệu (PDF / Word / Doc)</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">&lt; 25MB</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700 hover:border-amber-500/50 rounded-xl px-3 py-2 text-xs cursor-pointer transition-all shadow-sm">
                          <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                          <span>Chọn PDF / Word Từ Máy</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                            className="hidden"
                            onChange={(e) => handleMediaFileUpload(e, "document")}
                            disabled={isUploadingMedia}
                          />
                        </label>
                      </div>

                      <input
                        type="url"
                        placeholder="Hoặc dán link file: https://.../file.pdf"
                        value={campaignForm.document_url}
                        onChange={(e) => {
                          setCampaignForm({
                            ...campaignForm,
                            document_url: e.target.value,
                            media_url: e.target.value,
                            media_type: "document",
                            image_url: "",
                            video_url: "",
                          });
                          if (e.target.value) {
                            setUploadedMediaInfo({
                              name: "Link tài liệu ngoài",
                              size: 0,
                              mediaType: "document",
                              previewUrl: e.target.value,
                            });
                          } else if (uploadedMediaInfo?.mediaType === "document") {
                            setUploadedMediaInfo(null);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* CTA Link Bar */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                    <span className="flex items-center gap-1.5 text-blue-400 text-xs font-medium shrink-0">
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Link Kêu Gọi / Landing Page (Tùy chọn):</span>
                    </span>
                    <input
                      type="url"
                      placeholder="https://yourlandingpage.com (Tự động đính kèm nút xem thêm vào cuối tin)"
                      value={campaignForm.cta_link}
                      onChange={(e) => setCampaignForm({ ...campaignForm, cta_link: e.target.value })}
                      className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Active Media Badge */}
                  {(campaignForm.image_url || campaignForm.video_url || campaignForm.document_url || uploadedMediaInfo) && (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-750 flex items-center justify-between text-xs text-slate-200">
                      <div className="flex items-center gap-2.5 truncate">
                        {campaignForm.video_url || uploadedMediaInfo?.mediaType === "video" ? (
                          <Video className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : campaignForm.document_url || uploadedMediaInfo?.mediaType === "document" ? (
                          <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                        )}
                        <span className="font-medium truncate">
                          Đã chọn{" "}
                          {campaignForm.video_url || uploadedMediaInfo?.mediaType === "video"
                            ? "Video:"
                            : campaignForm.document_url || uploadedMediaInfo?.mediaType === "document"
                            ? "Tài liệu (PDF/Word):"
                            : "Ảnh:"}{" "}
                          {uploadedMediaInfo?.name || campaignForm.file_name || "Tệp đính kèm"}
                        </span>
                        {uploadedMediaInfo?.size ? (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                            {uploadedMediaInfo.size > 1024 * 1024
                              ? `${(uploadedMediaInfo.size / (1024 * 1024)).toFixed(2)} MB`
                              : `${(uploadedMediaInfo.size / 1024).toFixed(0)} KB`}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                        title="Xóa tệp đính kèm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Row 4: Text Content with Gemini AI Rewriter & Live Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    {/* Header with Title & Token badge */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span>Nội dung tin nhắn</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Chèn <code className="text-blue-400 bg-slate-950 px-1 py-0.5 rounded font-mono">{"{name}"}</code> để cá nhân hóa
                      </span>
                    </div>

                    {/* AI Toolbar Ribbon */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/50 border border-indigo-800/50 shadow-sm space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                          </div>
                          <span className="text-xs font-semibold text-white">Trợ Lý AI Viết Lại</span>
                        </div>

                        {/* Model selector & Key settings button */}
                        <div className="flex items-center gap-1.5">
                          <select
                            value={geminiModel}
                            onChange={(e) => setGeminiModel(e.target.value)}
                            className="bg-slate-900 border border-indigo-700/60 text-[11px] text-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400 font-medium cursor-pointer"
                            title="Chọn phiên bản mô hình Gemini Flash"
                          >
                            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                            <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                            <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                            <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => setShowAiKeyModal(true)}
                            className={`px-2 py-1 text-[11px] rounded-lg border transition flex items-center gap-1 cursor-pointer font-medium ${
                              geminiApiKey
                                ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60"
                                : "bg-amber-950/60 border-amber-700/60 text-amber-300 hover:bg-amber-900/60 animate-pulse"
                            }`}
                            title="Cài đặt API Key Gemini"
                          >
                            <Key className="w-3 h-3" />
                            <span>{geminiApiKey ? "API Key" : "Nhập Key"}</span>
                          </button>

                          {aiRewriteHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={handleUndoAiRewrite}
                              className="px-2 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition flex items-center gap-1 cursor-pointer"
                              title="Hoàn tác nội dung trước khi AI viết lại"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Hoàn tác</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick AI Style Rewrite Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          disabled={isAiRewriting}
                          onClick={() => handleAiRewrite("Kêu gọi hành động hấp dẫn (Tăng tỷ lệ tương tác & chuyển đổi sales, kích thích trả lời)")}
                          className="px-2 py-1 text-[11px] bg-slate-900/90 hover:bg-indigo-900/50 border border-slate-700/70 hover:border-indigo-500/70 text-slate-200 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          <Wand2 className="w-3 h-3 text-indigo-400" />
                          <span>🎯 Viết lại hấp dẫn</span>
                        </button>
                        <button
                          type="button"
                          disabled={isAiRewriting}
                          onClick={() => handleAiRewrite("Tự nhiên, thân thiện như bạn bè tâm tình trao đổi, không lộ liễu mùi quảng cáo")}
                          className="px-2 py-1 text-[11px] bg-slate-900/90 hover:bg-emerald-900/50 border border-slate-700/70 hover:border-emerald-500/70 text-slate-200 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          <span>💬 Thân thiện & Tự nhiên</span>
                        </button>
                        <button
                          type="button"
                          disabled={isAiRewriting}
                          onClick={() => handleAiRewrite("Cực kỳ ngắn gọn, súc tích dưới 3 câu, vào thẳng vấn đề để đọc nhanh trên thông báo Zalo")}
                          className="px-2 py-1 text-[11px] bg-slate-900/90 hover:bg-amber-900/50 border border-slate-700/70 hover:border-amber-500/70 text-slate-200 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          <span>⚡ Ngắn gọn súc tích</span>
                        </button>
                        <button
                          type="button"
                          disabled={isAiRewriting}
                          onClick={() => handleAiRewrite("Tặng quà, chia sẻ tài liệu hữu ích miễn phí để tạo thiện cảm và thu hút người nhận")}
                          className="px-2 py-1 text-[11px] bg-slate-900/90 hover:bg-pink-900/50 border border-slate-700/70 hover:border-pink-500/70 text-slate-200 hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          <span>🎁 Tặng quà / Chia sẻ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAiCustomPrompt(!showAiCustomPrompt)}
                          className="px-2 py-1 text-[11px] bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-slate-400 hover:text-slate-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>⚙️ Tự nhập prompt</span>
                        </button>
                      </div>

                      {/* Custom Prompt Drawer */}
                      {showAiCustomPrompt && (
                        <div className="p-2.5 bg-slate-950/90 border border-indigo-800/60 rounded-xl space-y-1.5 animate-fadeIn">
                          <label className="block text-[11px] text-indigo-300 font-medium">
                            Yêu cầu cụ thể cho AI (vd: &quot;Văn phong hài hước dí dỏm&quot;, &quot;Nhấn mạnh tặng bộ đề thi độc quyền hôm nay&quot;):
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Nhập phong cách hoặc chỉ dẫn bạn muốn..."
                              value={customAiPrompt}
                              onChange={(e) => setCustomAiPrompt(e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              disabled={isAiRewriting || !customAiPrompt.trim()}
                              onClick={() => handleAiRewrite(customAiPrompt)}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              {isAiRewriting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              <span>Viết</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Status / Notice */}
                      {isAiRewriting && (
                        <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2 animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                          <span>Gemini AI ({geminiModel}) đang suy nghĩ và viết lại tin nhắn cho bạn...</span>
                        </div>
                      )}

                      {aiNotice && (
                        <div className={`p-2 rounded-lg text-xs flex items-center justify-between ${
                          aiNotice.isError ? "bg-red-500/15 border border-red-500/30 text-red-300" : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                        }`}>
                          <span>{aiNotice.text}</span>
                          <button type="button" onClick={() => setAiNotice(null)} className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer">✕</button>
                        </div>
                      )}
                    </div>

                    {/* Textarea */}
                    <div className="relative">
                      <textarea
                        rows={6}
                        placeholder="Chào bạn {name}, mình gửi bạn đề thi thử môn Toán vào 10 mới nhất nhé..."
                        value={campaignForm.message_template}
                        onChange={(e) => setCampaignForm({ ...campaignForm, message_template: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-sans leading-relaxed"
                        required
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                        <span>Hệ thống tự động thay thế <code className="text-blue-400 font-mono">{"{name}"}</code> bằng tên thật người nhận.</span>
                        <span>{campaignForm.message_template?.length || 0} ký tự</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Xem trước tin nhắn Zalo gửi đi (Live Preview)
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2 max-h-[300px] overflow-y-auto">
                      {campaignForm.image_url && (
                        <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 max-h-36">
                          <img
                            src={uploadedMediaInfo?.previewUrl || campaignForm.image_url}
                            alt="Preview"
                            className="w-full h-36 object-cover"
                            onError={(e: any) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      {campaignForm.video_url && (
                        <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 max-h-36">
                          <video
                            src={uploadedMediaInfo?.previewUrl || campaignForm.video_url}
                            controls
                            className="w-full max-h-36 object-contain bg-black"
                          />
                        </div>
                      )}
                      {campaignForm.document_url && (
                        <div className="rounded-xl p-3 border border-amber-500/30 bg-amber-500/10 flex items-center gap-3 text-amber-300">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-amber-400" />
                          </div>
                          <div className="truncate flex-1">
                            <div className="font-semibold text-xs text-amber-200 truncate">
                              {uploadedMediaInfo?.name || campaignForm.file_name || "Tài liệu đính kèm"}
                            </div>
                            <div className="text-[10px] text-amber-400/80">Tệp đính kèm Zalo (PDF / Word)</div>
                          </div>
                        </div>
                      )}
                      <div className="text-slate-200 whitespace-pre-line leading-relaxed">
                        {campaignForm.message_template
                          ? campaignForm.message_template.replace("{name}", "Thanh Loan")
                          : "(Nội dung tin nhắn sẽ hiển thị tại đây...)"}
                      </div>
                      {campaignForm.cta_link && (
                        <div className="pt-1">
                          <a href="#" className="text-[11px] text-blue-400 underline flex items-center gap-1">
                            {campaignForm.cta_link} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    * Hệ thống sẽ kiểm tra và loại trừ người nhận theo các tiêu chuẩn chống spam đã chọn.
                  </span>
                  <div className="flex items-center gap-2">
                    {editingCampaignId && (
                      <button
                        type="button"
                        onClick={handleCancelEditCampaign}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl border border-slate-700 cursor-pointer"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmittingCampaign}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-blue-600/20"
                    >
                      {isSubmittingCampaign ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>{editingCampaignId ? "Cập Nhật Chiến Dịch" : "Tạo Chiến Dịch"}</span>
                    </button>
                  </div>
                </div>

                {campaignNotice && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
                    {campaignNotice}
                  </div>
                )}

                {/* Compact Webhook Send Settings */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowSendWebhookQuick(!showSendWebhookQuick)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition cursor-pointer py-1"
                    >
                      <Settings className="w-3 h-3 text-slate-500" />
                      <span>⚙️ Cài đặt Webhook Gửi Tin n8n (nhỏ gọn)</span>
                      <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${showSendWebhookQuick ? "rotate-180" : ""}`} />
                    </button>
                    {settings.n8n_send_webhook && (
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs hidden sm:inline">
                        {settings.n8n_send_webhook}
                      </span>
                    )}
                  </div>
                  {showSendWebhookQuick && (
                    <div className="mt-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 animate-fadeIn">
                      <input
                        type="text"
                        placeholder="https://n8n.qmath.io.vn/webhook/zalo-send-campaign"
                        value={settings.n8n_send_webhook || ""}
                        onChange={(e) => setSettings({ ...settings, n8n_send_webhook: e.target.value })}
                        className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickSaveWebhook("n8n_send_webhook", settings.n8n_send_webhook)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-lg transition shrink-0 cursor-pointer shadow-sm"
                      >
                        Lưu URL
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Campaigns Table with SỬA and XÓA buttons */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-400" />
                  Danh Sách Chiến Dịch Đã Lên Lịch ({campaigns.length})
                </h4>
              </div>

              {campaigns.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Chưa có chiến dịch nào.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {campaigns.map((c) => (
                    <div key={c.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-800/20 transition">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-slate-100">{c.name}</span>

                          {/* Interactive Group Badge */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAudienceModal(c)}
                            className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] px-2 py-0.5 rounded cursor-pointer border border-slate-700/60 transition flex items-center gap-1 shadow-sm"
                            title="Bấm để đổi nhanh tệp nhóm gửi"
                          >
                            <span>{c.group_name ? `Nhóm: ${c.group_name}` : "Tất cả nhóm"}</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>

                          {/* Customer Filter Badge */}
                          {c.customer_filter === "potential_only" && (
                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] px-2 py-0.5 rounded font-medium flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>Chỉ khách tiềm năng</span>
                            </span>
                          )}
                          {c.customer_filter === "standard_only" && (
                            <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded">
                              Khách thường
                            </span>
                          )}

                          {c.friend_filter === "friends_first" && (
                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] px-2 py-0.5 rounded font-medium">
                              🤝➡️➕ Mix: Bạn bè trước
                            </span>
                          )}
                          {c.friend_filter === "friends_only" && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] px-2 py-0.5 rounded font-medium">
                              🤝 Chỉ bạn bè
                            </span>
                          )}
                          {c.friend_filter === "not_friends_only" && (
                            <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[11px] px-2 py-0.5 rounded font-medium">
                              ➕ Chỉ người lạ
                            </span>
                          )}
                          {c.account_phone && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] px-2 py-0.5 rounded font-mono">
                              SĐT: {c.account_phone}
                            </span>
                          )}

                          {/* Interactive Target Count Badge */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAudienceModal(c)}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] px-2 py-0.5 rounded font-semibold cursor-pointer transition flex items-center gap-1 shadow-sm"
                            title="Bấm để chỉnh nhanh đối tượng & số lượng gửi"
                          >
                            <span>{c.target_count} người nhận thỏa mãn</span>
                            <ChevronDown className="w-3 h-3 text-blue-400" />
                          </button>
                        </div>

                        <div className="text-xs text-slate-400 italic line-clamp-1">
                          "{c.message_template}"
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>Loại trừ: {c.cooldown_days !== undefined ? c.cooldown_days : 0} ngày qua</span>
                          <span>• Giới hạn: tối đa {c.max_recipients || 100} người</span>
                          <span>• Delay: {c.delay_seconds || 15}s</span>
                          {Boolean(c.auto_friend_first) && <span className="text-blue-400 font-medium">• Tự kết bạn trước</span>}
                          {c.image_url && <span className="text-cyan-400">• Kèm Ảnh</span>}
                          {c.video_url && <span className="text-rose-400">• Kèm Video</span>}
                          {c.cta_link && <span className="text-indigo-400">• Kèm Link CTA</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        {/* Kích hoạt gửi */}
                        <button
                          onClick={() => handleSendCampaign(c.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi qua n8n</span>
                        </button>

                        {/* Thao tác nhanh đối tượng */}
                        <button
                          onClick={() => handleOpenQuickAudienceModal(c)}
                          className="bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-medium px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm hover:border-amber-500/60"
                          title="Đổi nhóm, lọc khách tiềm năng, chỉnh số lượng gửi ngay mà không cần bấm Sửa"
                        >
                          <Target className="w-3.5 h-3.5 text-amber-400" />
                          <span>Đổi Đối Tượng</span>
                        </button>

                        {/* Sửa chiến dịch */}
                        <button
                          onClick={() => handleEditCampaign(c)}
                          className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1 text-xs"
                          title="Sửa chiến dịch"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-400" />
                          <span>Sửa</span>
                        </button>

                        {/* Xóa chiến dịch */}
                        <button
                          onClick={() => handleDeleteCampaign(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition cursor-pointer"
                          title="Xóa chiến dịch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: SETTINGS ================= */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-sm text-white mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                Cơ Sở Dữ Liệu Cloud Firestore
              </h3>
              <div className="mt-2 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-400">
                Google Cloud Firestore Project: zalosale2 (Gói miễn phí 1GB, lưu trữ đám mây thời gian thực)
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-sm text-white mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                Cấu Hình Webhook Mặc Định
              </h3>

              <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                <span className="text-base leading-none">💡</span>
                <div className="leading-relaxed">
                  <strong>Mẹo cấu hình n8n Webhook:</strong> Luôn dùng <strong>Production URL</strong> (bắt đầu bằng <code className="bg-slate-900 px-1 py-0.5 rounded text-white font-mono text-[11px]">/webhook/</code>, ví dụ: <code className="bg-slate-900 px-1 py-0.5 rounded text-blue-200 font-mono text-[11px]">https://n8n.qmath.io.vn/webhook/zalo-scrape</code>).<br />
                  <span className="text-slate-400 text-[11px]">Tuyệt đối không dùng <code className="text-amber-400">/webhook-test/</code> để tránh bị lỗi 500 &amp; CORS khi n8n không mở chế độ Test step!</span>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    n8n Scrape Webhook URL (Dùng khi nhóm không chỉ định SĐT)
                  </label>
                  <input
                    type="text"
                    value={settings.n8n_scrape_webhook || ""}
                    onChange={(e) => setSettings({ ...settings, n8n_scrape_webhook: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    n8n Send Webhook URL (Dùng khi chiến dịch không chỉ định SĐT)
                  </label>
                  <input
                    type="text"
                    value={settings.n8n_send_webhook || ""}
                    onChange={(e) => setSettings({ ...settings, n8n_send_webhook: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    n8n Friend Webhook URL (Gửi lời mời kết bạn tự động)
                  </label>
                  <input
                    type="text"
                    placeholder="https://n8n.qmath.io.vn/webhook/zalo-send-friend-requests"
                    value={settings.n8n_friend_webhook || ""}
                    onChange={(e) => setSettings({ ...settings, n8n_friend_webhook: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    n8n Sync Friends Webhook URL (Đối soát trạng thái bạn bè & lời mời)
                  </label>
                  <input
                    type="text"
                    placeholder="https://n8n.qmath.io.vn/webhook/zalo-sync-friends"
                    value={settings.n8n_sync_webhook || ""}
                    onChange={(e) => setSettings({ ...settings, n8n_sync_webhook: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Webhook Secret Token</label>
                  <input
                    type="text"
                    value={settings.webhook_secret || ""}
                    onChange={(e) => setSettings({ ...settings, webhook_secret: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-400">{settingsNotice}</span>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    {isSavingSettings ? "Đang lưu..." : "Lưu Cài Đặt"}
                  </button>
                </div>
              </form>
            </div>

            {/* Gemini AI Settings Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Cấu Hình Trợ Lý AI Viết Lại Tin Nhắn (Google Gemini)
                </h3>
                <span className="text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  {geminiApiKey ? "🟢 Đã thiết lập Key" : "🟡 Chưa có Key"}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Tích hợp mô hình ngôn ngữ lớn Google Gemini để tự động viết lại tin nhắn tiếp thị theo nhiều phong cách (hấp dẫn, tự nhiên, ngắn gọn, tặng quà), tự động bảo tồn biến <code className="text-blue-400 font-mono">{"{name}"}</code> cho chiến dịch Zalo.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Google Gemini API Key
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="Dán mã API Key: AIzaSy..."
                      value={tempGeminiKey}
                      onChange={(e) => setTempGeminiKey(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveGeminiKey}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Lưu Key</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-slate-500">Key được lưu trữ an toàn trong trình duyệt & Cloud Firestore.</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Lấy API Key miễn phí tại Google AI Studio <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phiên Bản Mô Hình Gemini Flash Ưu Tiên
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => {
                      setGeminiModel(e.target.value);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("zalo_gemini_model", e.target.value);
                      }
                      setSettings({ ...settings, gemini_model: e.target.value });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Nhanh & Tối ưu)</option>
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash (Sáng tạo & Mượt mà)</option>
                    <option value="gemini-3.7-flash">Gemini 3.7 Flash (Mới nhất & Chuẩn xác)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (Mô hình mở rộng)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: DIRECT JSON IMPORT TEST ================= */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-400" />
                Nạp Dữ Liệu JSON Cào Được Từ n8n (Thử Nghiệm Trực Tiếp)
              </h3>
              <button
                onClick={() => { setShowJsonModal(false); setJsonImportResult(null); }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <p className="text-xs text-slate-300">
                Dán mảng JSON cào được từ n8n (gồm Group Info + mảng memberIds + profiles). Hệ thống sẽ tự động bóc tách, cách ly Trưởng/Phó nhóm và lưu trực tiếp vào Cloud Firestore:
              </p>

              <textarea
                rows={10}
                placeholder='Dán JSON dạng: [ { "success": true, "response": { "groupId": "...", "creatorId": "...", "adminIds": [...] } }, { "memberIds": [...], "profiles": {...} } ]'
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />

              {jsonImportResult && (
                <div className={`p-3 rounded-xl border text-xs ${
                  jsonImportResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}>
                  <div className="font-semibold">{jsonImportResult.success ? "Thành công!" : "Thất bại!"}</div>
                  <div className="mt-1">{jsonImportResult.message || jsonImportResult.error}</div>
                  {jsonImportResult.details && (
                    <div className="mt-2 text-[11px] font-mono opacity-90">
                      • Trưởng nhóm ID: {jsonImportResult.details.creatorId || "Không có"}<br />
                      • Phó nhóm IDs: {jsonImportResult.details.adminIds?.join(", ") || "Không có"}<br />
                      • Thành viên sạch: {jsonImportResult.details.regularMemberCount} người
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setRawJsonInput(`[
  {
    "success": true,
    "response": {
      "groupId": "2168952475069976002",
      "name": "ÔN THI TOÁN VÀO 10 - HƯNG YÊN - 2K11",
      "creatorId": "6406781528072469298",
      "adminIds": ["5641430423293988497"],
      "totalMember": 794
    }
  },
  {
    "success": true,
    "memberIds": [
      "512461634438828487",
      "4102390812639190069",
      "6788468032045605358",
      "4662040023026858089",
      "5641430423293988497",
      "6406781528072469298"
    ],
    "profiles": {
      "512461634438828487": { "displayName": "Thanh Loan", "avatar": "https://s120-26-ava-talk.zadn.vn/8/701301777abfd71e7d4d834278332cd9.jpg" },
      "4102390812639190069": { "displayName": "Tr Hương", "avatar": "https://s120-26-ava-talk.zadn.vn/10/f58f8a762b1f7afe0120ec13b987336a.jpg" },
      "6788468032045605358": { "displayName": "Loi Nguyen", "avatar": "https://s120-26-ava-talk.zadn.vn/6/c457d14091d30d2985926c297e3acd37.jpg" },
      "4662040023026858089": { "displayName": "Hoà Xuyến", "avatar": "https://s120-26-ava-talk.zadn.vn/17/94214699c03fe562d9f9accba7db57b1.jpg" },
      "5641430423293988497": { "displayName": "Phó Nhóm A (Admin)", "avatar": "" },
      "6406781528072469298": { "displayName": "Trưởng Nhóm B (Creator)", "avatar": "" }
    }
  }
]`);
                }}
                className="text-xs text-blue-400 hover:underline cursor-pointer"
              >
                Tải mẫu JSON thực tế
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isImportingJson || !rawJsonInput.trim()}
                  onClick={handleDirectImport}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  {isImportingJson ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  Bắt đầu nạp & Lọc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT GROUP NAME & AVATAR ================= */}
      {editingGroupModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-pink-400" />
                <span>Đổi Tên Hiển Thị Nhóm Zalo</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingGroupModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-slate-400">UID nhóm Zalo:</span>
              <span className="font-mono text-slate-200 ml-1.5 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {editingGroupModal.group_id}
              </span>
            </div>

            <form onSubmit={handleSaveGroupModal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tên nhóm hiển thị mới (*)
                </label>
                <input
                  type="text"
                  required
                  placeholder="vd: Nhóm Khách Hàng VIP, Nhóm Ôn Thi..."
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Tên này sẽ hiển thị trong tất cả danh sách chọn nhóm, bảng thành viên và chiến dịch thay vì số UID.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  URL ảnh đại diện nhóm (Avatar link - Tùy chọn)
                </label>
                <input
                  type="url"
                  placeholder="https://... (để trống nếu giữ nguyên)"
                  value={editingGroupAvatar}
                  onChange={(e) => setEditingGroupAvatar(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingGroupModal(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingGroupEdit}
                  className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-pink-900/30"
                >
                  {isSavingGroupEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Lưu Tên Nhóm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK SETTINGS FOR FRIEND SYNC WEBHOOK ================= */}
      {syncWebhookModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Cài Đặt Webhook Cập Nhật Bạn Bè n8n</span>
              </h3>
              <button
                type="button"
                onClick={() => setSyncWebhookModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Webhook này được gọi khi bấm nút <strong>"Cập Nhật Trạng Thái Kết Bạn (🤝)"</strong> để n8n quét danh sách bạn bè và lời mời đã gửi từ Zalo.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  URL Webhook n8n (Sync Friends)
                </label>
                <input
                  type="text"
                  placeholder="https://n8n.qmath.io.vn/webhook/zalo-sync-friends"
                  value={tempSyncWebhookUrl}
                  onChange={(e) => setTempSyncWebhookUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSyncWebhookModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleQuickSaveWebhook("n8n_sync_webhook", tempSyncWebhookUrl);
                  setSyncWebhookModalOpen(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Lưu Cài Đặt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT ACCOUNT INFO ================= */}
      {editingAccountModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-400" />
                <span>Chỉnh Sửa Thông Tin Tài Khoản Zalo & Webhook</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingAccountModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccountModal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Số Điện Thoại Zalo (*)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAccountForm.phone}
                    onChange={(e) => setEditingAccountForm({ ...editingAccountForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Đổi SĐT sẽ tự động cập nhật lại hệ thống</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tên Gợi Nhớ Tài Khoản
                  </label>
                  <input
                    type="text"
                    placeholder="vd: Zalo Marketing 01, CSKH 02"
                    value={editingAccountForm.name}
                    onChange={(e) => setEditingAccountForm({ ...editingAccountForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    1. Webhook n8n Cào Nhóm Zalo
                  </label>
                  <input
                    type="url"
                    placeholder="https://n8n.domain.com/webhook/zalo-scrape"
                    value={editingAccountForm.scrape_webhook_url}
                    onChange={(e) => setEditingAccountForm({ ...editingAccountForm, scrape_webhook_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    2. Webhook n8n Gửi Tin Tiếp Thị
                  </label>
                  <input
                    type="url"
                    placeholder="https://n8n.domain.com/webhook/zalo-send-campaign"
                    value={editingAccountForm.send_webhook_url}
                    onChange={(e) => setEditingAccountForm({ ...editingAccountForm, send_webhook_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    3. Webhook n8n Gửi Lời Mời Kết Bạn (Tùy chọn)
                  </label>
                  <input
                    type="url"
                    placeholder="Để trống nếu dùng chung Webhook 2"
                    value={editingAccountForm.friend_webhook_url}
                    onChange={(e) => setEditingAccountForm({ ...editingAccountForm, friend_webhook_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Để trống nếu dùng chung Webhook Gửi Tin</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    4. Webhook n8n Đồng Bộ / Đối Soát Bạn Bè (Tùy chọn)
                  </label>
                  <input
                    type="url"
                    placeholder="Để trống nếu dùng chung Webhook 1"
                    value={editingAccountForm.sync_webhook_url}
                    onChange={(e) => setEditingAccountForm({ ...editingAccountForm, sync_webhook_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Để trống nếu dùng chung Webhook Cào</p>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAccountModal(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccountEdit}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingAccountEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GEMINI API KEY SETUP ================= */}
      {showAiKeyModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Cấu Hình Google Gemini API Key</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAiKeyModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Google Gemini API Key được dùng để kích hoạt tính năng viết lại nội dung tin nhắn tiếp thị bằng AI (Gemini 3.5 Flash, 3.6 Flash, 3.7 Flash, 3.8 Flash) với khả năng giữ nguyên biến <code className="text-blue-400 font-mono">{"{name}"}</code>.
              </p>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <span>🎁 Hoàn toàn miễn phí:</span>
                </div>
                <div>
                  Bạn có thể lấy API Key hoàn toàn miễn phí từ Google AI Studio tại:
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:underline font-mono pt-1"
                >
                  https://aistudio.google.com/app/apikey <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Gemini API Key của bạn:
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={tempGeminiKey}
                  onChange={(e) => setTempGeminiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mô hình Gemini ưu tiên:
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Nhanh & Tối ưu)</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash (Sáng tạo & Mượt mà)</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Mới nhất & Chuẩn xác)</option>
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Mô hình mở rộng)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAiKeyModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveGeminiKey}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu API Key</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK AUDIENCE SELECTOR ================= */}
      {quickAudienceModalCampaign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white flex items-center gap-1.5">
                    <span>Thao Tác Nhanh Đối Tượng Gửi Tin</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Chiến dịch: <span className="text-amber-300 font-medium font-mono">"{quickAudienceModalCampaign.name}"</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickAudienceModalCampaign(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* 1. Tệp Nhóm */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>1. Tệp Nhóm Áp Dụng</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleQuickAudienceChange({ target_group_id: "all" })}
                      className={`px-2 py-0.5 text-[10px] rounded-md transition font-medium cursor-pointer ${
                        quickAudienceForm.target_group_id === "all"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Tất cả nhóm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (quickAudienceForm.target_group_id === "all" && groups.length > 0) {
                          handleQuickAudienceChange({ target_group_id: groups[0].group_id });
                        }
                      }}
                      className={`px-2 py-0.5 text-[10px] rounded-md transition font-medium cursor-pointer ${
                        quickAudienceForm.target_group_id !== "all"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Từng nhóm
                    </button>
                  </div>
                </div>

                {quickAudienceForm.target_group_id === "all" ? (
                  <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 flex items-center justify-between">
                    <span>Toàn bộ thành viên sạch các nhóm</span>
                    <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded">
                      {stats.targetMembers ?? stats.filtered_members ?? 0} người
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={quickAudienceForm.target_group_id}
                      onChange={(e) => handleQuickAudienceChange({ target_group_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none appearance-none pr-8 cursor-pointer"
                    >
                      {groups.map((g) => (
                        <option key={g.group_id} value={g.group_id} className="bg-slate-950 text-slate-200">
                          {g.name} ({g.filtered_member_count} thành viên)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* 2 & 3: Phân Loại Khách Hàng & Bạn Bè */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer Classification */}
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>2. Phân Loại Khách</span>
                  </label>
                  <div className="relative">
                    <select
                      value={quickAudienceForm.customer_filter || "all"}
                      onChange={(e) => handleQuickAudienceChange({ customer_filter: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none appearance-none pr-8 cursor-pointer"
                    >
                      <option value="all" className="bg-slate-950 text-slate-200">🌐 Tất cả (Trừ người bị chặn)</option>
                      <option value="potential_only" className="bg-slate-950 text-slate-200">⭐ Chỉ gửi Khách Tiềm Năng</option>
                      <option value="standard_only" className="bg-slate-950 text-slate-200">👥 Chỉ gửi Khách thường</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Tự động loại trừ người trong Blacklist</p>
                </div>

                {/* Friend Filter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-emerald-400" />
                    <span>3. Phân Loại Bạn Bè</span>
                  </label>
                  <div className="relative">
                    <select
                      value={quickAudienceForm.friend_filter || "all"}
                      onChange={(e) => handleQuickAudienceChange({ friend_filter: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none appearance-none pr-8 cursor-pointer"
                    >
                      <option value="all" className="bg-slate-950 text-slate-200">🌐 Tất cả bạn bè & người lạ</option>
                      <option value="friends_first" className="bg-slate-950 text-slate-200">⚡ Mix: Bạn bè trước ➔ Lạ sau</option>
                      <option value="friends_only" className="bg-slate-950 text-slate-200">🤝 Chỉ gửi người đã là bạn bè</option>
                      <option value="not_friends_only" className="bg-slate-950 text-slate-200">👤 Chỉ gửi người chưa kết bạn</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 4. Giới Hạn & Giãn Cách */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Giới hạn người nhận</label>
                      <div className="flex items-center gap-1">
                        {[20, 50, 100].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleQuickAudienceChange({ max_recipients: num })}
                            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                              quickAudienceForm.max_recipients === num
                                ? "bg-blue-600 text-white font-bold"
                                : "bg-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      value={quickAudienceForm.max_recipients}
                      onChange={(e) => handleQuickAudienceChange({ max_recipients: parseInt(e.target.value) || 50 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Loại trừ đã gửi trong</label>
                      <div className="flex items-center gap-1">
                        {[0, 3, 7].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => handleQuickAudienceChange({ cooldown_days: days })}
                            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                              quickAudienceForm.cooldown_days === days
                                ? "bg-emerald-600 text-white font-bold"
                                : "bg-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {days === 0 ? "0d (Ngay)" : `${days}d`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={quickAudienceForm.cooldown_days}
                      onChange={(e) => handleQuickAudienceChange({ cooldown_days: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(quickAudienceForm.auto_friend_first)}
                    onChange={(e) => handleQuickAudienceChange({ auto_friend_first: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4 bg-slate-900"
                  />
                  <span>Tự kết bạn trước khi gửi tin (vượt qua rào chặn tin nhắn người lạ)</span>
                </label>
              </div>

              {/* Real-time Counter Preview */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-950 border border-blue-500/30 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-slate-200 font-medium">Số người nhận thỏa mãn sẵn sàng gửi:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isCalculatingQuickAudience ? (
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : (
                    <span className="text-base font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 rounded-lg font-mono">
                      {quickAudienceCalculatedCount} người
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setQuickAudienceModalCampaign(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveQuickAudience}
                disabled={isSavingQuickAudience}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-600 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {isSavingQuickAudience ? "Đang lưu..." : "Lưu Đối Tượng"}
              </button>
              <button
                type="button"
                onClick={handleQuickAudienceSendNow}
                disabled={isQuickSending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isQuickSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Lưu & Gửi n8n Ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BLACKLIST & POTENTIAL LEADS MANAGER ================= */}
      {showBlacklistModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white flex items-center gap-1.5">
                    <span>Quản Lý Phân Loại & Danh Sách Đen (Blacklist)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bảo vệ tài khoản, phân loại tệp khách hàng tiềm năng và cách ly người bị chặn khỏi tiếp thị
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowBlacklistModal(false); setCustomerNotice(""); }}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setBlacklistModalTab("blocked")}
                className={`px-3 py-1.5 text-xs rounded-xl transition cursor-pointer font-medium flex items-center gap-1.5 ${
                  blacklistModalTab === "blocked"
                    ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Danh Sách Chặn / Blacklist ({stats.blockedCount || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setBlacklistModalTab("potential")}
                className={`px-3 py-1.5 text-xs rounded-xl transition cursor-pointer font-medium flex items-center gap-1.5 ${
                  blacklistModalTab === "potential"
                    ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>Khách Hàng Tiềm Năng ({stats.potentialCount || 0})</span>
              </button>
            </div>

            {/* Notice */}
            {customerNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{customerNotice}</span>
              </div>
            )}

            {/* Fast Batch Paste Box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-200">
                Nhập nhanh danh sách Zalo UID hoặc SĐT (mỗi dòng hoặc phân tách bằng dấu phẩy):
              </label>
              <textarea
                rows={3}
                placeholder="vd: 5641430423293988497&#10;6406781528072469298&#10;0912345678"
                value={bulkUidInput}
                onChange={(e) => setBulkUidInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Hành động:</span>
                  <select
                    value={bulkTargetAction}
                    onChange={(e: any) => setBulkTargetAction(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none"
                  >
                    <option value="blocked">🚫 Đưa vào Danh sách Chặn (Blacklist)</option>
                    <option value="potential">⭐ Đặt làm Khách Tiềm Năng</option>
                    <option value="standard">👥 Bỏ phân loại (Về thường)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleProcessBulkUids}
                  disabled={isProcessingBulkCustomer || !bulkUidInput.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isProcessingBulkCustomer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Áp Dụng Danh Sách</span>
                </button>
              </div>
            </div>

            {/* List of members currently in this tab */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>
                  {blacklistModalTab === "blocked"
                    ? `Danh sách thành viên đang bị chặn tiếp thị (${members.filter((m) => m.customer_status === "blocked").length}):`
                    : `Danh sách khách hàng tiềm năng (${members.filter((m) => m.customer_status === "potential").length}):`}
                </span>
                <span className="text-[11px] text-slate-500">Bấm nút bên phải để gỡ bỏ</span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800 rounded-xl bg-slate-950/50">
                {members.filter((m) => m.customer_status === blacklistModalTab).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Chưa có thành viên nào trong danh sách này.
                  </div>
                ) : (
                  members
                    .filter((m) => m.customer_status === blacklistModalTab)
                    .map((m) => (
                      <div key={m.zalo_id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-850/40">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={m.avatar || "https://s160-ava-talk.zadn.vn/default"}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                            onError={(e: any) => { e.target.src = "https://s160-ava-talk.zadn.vn/default"; }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-200 truncate">{m.display_name}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">UID: {m.zalo_id}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSetSingleCustomerStatus(m.zalo_id, "standard")}
                          className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer shrink-0"
                          title="Gỡ bỏ khỏi danh sách này"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setShowBlacklistModal(false); setCustomerNotice(""); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
