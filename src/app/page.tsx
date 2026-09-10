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
} from "lucide-react";
import {
  clientGetStats,
  clientGetAccounts,
  clientSaveAccount,
  clientDeleteAccount,
  clientGetGroups,
  clientSaveGroup,
  clientDeleteGroup,
  clientGetMembers,
  clientUpdateMember,
  clientGetCampaigns,
  clientSaveCampaign,
  clientDeleteCampaign,
  clientGetSettings,
  clientUpdateSettings,
  clientTriggerScrape,
  clientTriggerSendCampaign,
  clientImportZaloData,
} from "@/lib/client-api";

export default function Home() {
  // Tab navigation: "overview" is now on the far left!
  const [activeTab, setActiveTab] = useState<"overview" | "members_hub" | "accounts" | "groups" | "campaigns" | "settings">("overview");

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
  const [newAccount, setNewAccount] = useState({ phone: "", name: "", scrape_webhook_url: "", send_webhook_url: "" });
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");

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
  const [memberFilterFriend, setMemberFilterFriend] = useState("all"); // all | friend | not_friend
  const [memberFilterStranger, setMemberFilterStranger] = useState("all"); // all | allowed | blocked
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPagination, setMemberPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 1 });
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Campaigns Tab (Create & Edit & Delete)
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    message_template: "",
    target_group_id: "all",
    account_phone: "",
    max_recipients: 100,
    cooldown_days: 10,
    auto_friend_first: 0,
    delay_seconds: 15,
    image_url: "",
    video_url: "",
    cta_link: "",
  });
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [campaignNotice, setCampaignNotice] = useState("");

  // Settings Tab
  const [settings, setSettings] = useState<any>({
    n8n_scrape_webhook: "",
    n8n_send_webhook: "",
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
    }
  }, [activeTab, selectedGroupId, memberFilterRole, memberFilterSent, memberFilterFriend, memberFilterStranger]);

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
        setAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error(e);
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

  const fetchMembers = async (page = 1) => {
    setIsLoadingMembers(true);
    try {
      const data = await clientGetMembers({
        groupId: selectedGroupId,
        role: memberFilterRole,
        sentStatus: memberFilterSent,
        friendStatus: memberFilterFriend,
        strangerBlock: memberFilterStranger,
        search: memberSearch,
        page,
        limit: 30,
      });
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

  // Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingAccount(true);
    setAccountNotice("");
    try {
      const data = await clientSaveAccount(newAccount);
      if (data.success) {
        setAccountNotice("Đã thêm tài khoản SĐT Zalo thành công!");
        setNewAccount({ phone: "", name: "", scrape_webhook_url: "", send_webhook_url: "" });
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

  // Add & Start Scrape Group ("Bắt đầu cào")
  const handleStartScrapeGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingGroup(true);
    setGroupNotice("");
    try {
      await clientSaveGroup(newGroupInput);
      let scrapeNotice = "";
      try {
        const scrapeRes = await clientTriggerScrape(newGroupInput);
        scrapeNotice = scrapeRes.message;
      } catch (scrapeErr: any) {
        scrapeNotice = "Đã lưu nhóm vào Firestore (" + scrapeErr.message + ")";
      }
      setGroupNotice(scrapeNotice || "Đã thêm nhóm và gọi n8n thành công!");
      setNewGroupInput({ group_id: "", name: "", invite_link: "", account_phone: "" });
      fetchGroups();
      fetchStats();
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
        setCampaignForm({
          name: "",
          message_template: "",
          target_group_id: "all",
          account_phone: "",
          max_recipients: 100,
          cooldown_days: 10,
          auto_friend_first: 0,
          delay_seconds: 15,
          image_url: "",
          video_url: "",
          cta_link: "",
        });
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

  const handleEditCampaign = (c: any) => {
    setEditingCampaignId(c.id);
    setCampaignForm({
      name: c.name || "",
      message_template: c.message_template || "",
      target_group_id: c.target_group_id || "all",
      account_phone: c.account_phone || "",
      max_recipients: c.max_recipients || 100,
      cooldown_days: c.cooldown_days || 10,
      auto_friend_first: c.auto_friend_first || 0,
      delay_seconds: c.delay_seconds || 15,
      image_url: c.image_url || "",
      video_url: c.video_url || "",
      cta_link: c.cta_link || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEditCampaign = () => {
    setEditingCampaignId(null);
    setCampaignForm({
      name: "",
      message_template: "",
      target_group_id: "all",
      account_phone: "",
      max_recipients: 100,
      cooldown_days: 10,
      auto_friend_first: 0,
      delay_seconds: 15,
      image_url: "",
      video_url: "",
      cta_link: "",
    });
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
      const data = await clientUpdateSettings(settings);
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

          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Firebase Firestore:</span>
              <span className="font-mono text-amber-400 font-medium">zalosale2 (Cloud 1GB Free)</span>
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

          {/* TAB 3: TÀI KHOẢN SĐT CÀO */}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Đã gửi tin chiến dịch</div>
                  <div className="text-xl font-bold text-white">{stats.messagedCount || 0} thành viên</div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Đã kết bạn thành công</div>
                  <div className="text-xl font-bold text-white">{stats.friendsCount || 0} thành viên</div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Chặn tin nhắn người lạ</div>
                  <div className="text-xl font-bold text-white">{stats.strangerBlockedCount || 0} thành viên</div>
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
                      {stats.targetMembers} người
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
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>Đang xem thành viên:</span>
                        <span className="text-blue-400">
                          {selectedGroupObj ? selectedGroupObj.name : "Toàn Bộ Các Nhóm"}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedGroupObj
                          ? `Nhóm UID: ${selectedGroupObj.group_id} • Có ${selectedGroupObj.filtered_member_count} thành viên sạch (${selectedGroupObj.admin_count} Trưởng/Phó nhóm đã bị lọc)`
                          : `Tổng số ${stats.targetMembers} thành viên sạch trên toàn bộ hệ thống`}
                      </p>
                    </div>

                    {selectedGroupId && (
                      <button
                        onClick={() => setSelectedGroupId("")}
                        className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1.5 rounded-lg border border-slate-700 self-start sm:self-auto cursor-pointer"
                      >
                        ✕ Xóa bộ lọc nhóm
                      </button>
                    )}
                  </div>

                  {/* Filter Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-3">
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
                      <option value="friend">Đã kết bạn</option>
                      <option value="not_friend">Chưa kết bạn</option>
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
                      <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 pl-4 border-l border-slate-800">
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-emerald-400" /> Đã gửi tin</span>
                        <span className="flex items-center gap-1"><UserPlus className="w-3 h-3 text-blue-400" /> Đã kết bạn</span>
                        <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-red-400" /> Chặn tin lạ</span>
                      </div>
                    </div>
                    <div>
                      Trang {memberPagination.page} / {memberPagination.totalPages || 1}
                    </div>
                  </div>

                  {isLoadingMembers ? (
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
                            <th className="py-3 px-4">Thành viên Zalo</th>
                            <th className="py-3 px-4">Zalo UID</th>
                            <th className="py-3 px-4 text-center">Trạng Thái (Icons)</th>
                            <th className="py-3 px-4">Thuộc nhóm</th>
                            <th className="py-3 px-4">Gửi tin gần nhất</th>
                            <th className="py-3 px-4 text-right">Sao chép</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {members.map((m) => (
                            <tr key={m.zalo_id} className="hover:bg-slate-800/30 transition">
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
                                    onClick={() => handleToggleMember(m.zalo_id, { is_friend: m.is_friend === 1 ? 0 : 1 })}
                                    title={m.is_friend === 1 ? "Đã là bạn bè (Bấm để đổi)" : "Chưa kết bạn (Bấm để đổi)"}
                                    className={`w-6 h-6 rounded flex items-center justify-center border transition cursor-pointer ${
                                      m.is_friend === 1
                                        ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
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

                              <td className="py-3 px-4 text-slate-300 max-w-[160px] truncate" title={m.groups_list}>
                                {m.groups_list || "Chưa gán"}
                              </td>

                              <td className="py-3 px-4 text-slate-400 text-[11px]">
                                {m.last_campaign_sent_at || "Chưa gửi"}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => copyToClipboard(m.zalo_id)}
                                  className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 px-2 py-1 rounded border border-slate-700 transition cursor-pointer inline-flex items-center gap-1 text-[11px]"
                                >
                                  {copiedUid === m.zalo_id ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  <span>UID</span>
                                </button>
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

        {/* ================= TAB: ACCOUNTS MANAGEMENT ================= */}
        {activeTab === "accounts" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-sm text-white mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                Thêm Số Điện Thoại Zalo Cào & Gửi Tin
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Mỗi số điện thoại Zalo sẽ đi kèm một URL Webhook n8n cào và gửi tin riêng biệt.
              </p>

              <form onSubmit={handleAddAccount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Số Điện Thoại Zalo (*)</label>
                    <input
                      type="text"
                      placeholder="vd: 0912345678"
                      value={newAccount.phone}
                      onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tên Gợi Nhớ Tài Khoản</label>
                    <input
                      type="text"
                      placeholder="vd: Zalo Marketing 01"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Link Webhook n8n Đi Cào Của SĐT Này (*)
                    </label>
                    <input
                      type="url"
                      placeholder="https://n8n.domain.com/webhook/scrape-acc-01"
                      value={newAccount.scrape_webhook_url}
                      onChange={(e) => setNewAccount({ ...newAccount, scrape_webhook_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Link Webhook n8n Gửi Tin Nhắn Của SĐT Này
                    </label>
                    <input
                      type="url"
                      placeholder="https://n8n.domain.com/webhook/send-acc-01"
                      value={newAccount.send_webhook_url}
                      onChange={(e) => setNewAccount({ ...newAccount, send_webhook_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
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
                        <th className="py-3 px-4">Webhook Cào n8n</th>
                        <th className="py-3 px-4">Webhook Gửi Tin n8n</th>
                        <th className="py-3 px-4">Nhóm Đã Cào</th>
                        <th className="py-3 px-4">Tin Đã Gửi</th>
                        <th className="py-3 px-4">Trạng Thái</th>
                        <th className="py-3 px-4 text-right">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {accounts.map((a) => (
                        <tr key={a.phone} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-medium">
                            <div className="text-slate-100 font-semibold font-mono">{a.phone}</div>
                            <div className="text-[11px] text-slate-400">{a.name}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300 max-w-xs truncate" title={a.scrape_webhook_url}>
                            {a.scrape_webhook_url}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 max-w-xs truncate" title={a.send_webhook_url}>
                            {a.send_webhook_url || "Chưa cấu hình"}
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
                            <button
                              onClick={() => handleDeleteAccount(a.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 rounded-lg transition cursor-pointer"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tên Chiến Dịch (*)</label>
                    <input
                      type="text"
                      placeholder="vd: Quảng cáo Khóa học Toán 10"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Chọn SĐT Zalo Gửi Tin</label>
                    <select
                      value={campaignForm.account_phone}
                      onChange={(e) => setCampaignForm({ ...campaignForm, account_phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Dùng Webhook Gửi mặc định --</option>
                      {accounts.map((a) => (
                        <option key={a.phone} value={a.phone}>
                          {a.phone} ({a.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tệp Nhận Tin Mục Tiêu</label>
                    <select
                      value={campaignForm.target_group_id}
                      onChange={(e) => setCampaignForm({ ...campaignForm, target_group_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Toàn bộ thành viên sạch ({stats.targetMembers} người)</option>
                      {groups.map((g) => (
                        <option key={g.group_id} value={g.group_id}>
                          Theo nhóm: {g.name} ({g.filtered_member_count} người)
                        </option>
                      ))}
                    </select>
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

                {/* Row 3: Rich Media */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Link Hình Ảnh (Image URL)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/banner.jpg"
                      value={campaignForm.image_url}
                      onChange={(e) => setCampaignForm({ ...campaignForm, image_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-rose-400" />
                      <span>Link Video (Video URL)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/video.mp4"
                      value={campaignForm.video_url}
                      onChange={(e) => setCampaignForm({ ...campaignForm, video_url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>Link Web / CTA (Action URL)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://yourlandingpage.com"
                      value={campaignForm.cta_link}
                      onChange={(e) => setCampaignForm({ ...campaignForm, cta_link: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Row 4: Text Content & Live Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Nội dung tin nhắn (Chèn <code className="text-blue-400 bg-slate-950 px-1 py-0.5 rounded font-mono">{"{name}"}</code> để cá nhân hóa)
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Chào bạn {name}, mình gửi bạn đề thi thử môn Toán vào 10 mới nhất nhé..."
                      value={campaignForm.message_template}
                      onChange={(e) => setCampaignForm({ ...campaignForm, message_template: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                      required
                    />
                  </div>

                  {/* Live Preview Box */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Xem trước tin nhắn Zalo gửi đi (Live Preview)
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2 max-h-[140px] overflow-y-auto">
                      {campaignForm.image_url && (
                        <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 max-h-24">
                          <img src={campaignForm.image_url} alt="Preview" className="w-full h-24 object-cover" onError={(e: any) => { e.target.style.display = 'none'; }} />
                        </div>
                      )}
                      <div className="text-slate-200 whitespace-pre-line">
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
                          <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded">
                            {c.group_name ? `Nhóm: ${c.group_name}` : "Tất cả nhóm"}
                          </span>
                          {c.account_phone && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] px-2 py-0.5 rounded font-mono">
                              SĐT: {c.account_phone}
                            </span>
                          )}
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] px-2 py-0.5 rounded font-semibold">
                            {c.target_count} người nhận thỏa mãn
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 italic line-clamp-1">
                          "{c.message_template}"
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>Loại trừ: {c.cooldown_days || 10} ngày qua</span>
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
    </div>
  );
}
