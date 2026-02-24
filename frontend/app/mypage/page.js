"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/ui/SectionTitle";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { redirectToGuestHome } from "@/lib/authRedirect";
import { signout } from "@/lib/authApi";
import { BASE_URL, request, getAuthHeaders } from "@/lib/api";
import { useMediaUpload } from "@/lib/useMediaUpload";
import { MediaAssetCategory, MediaAssetScope } from "@/lib/mediaAssetApi";
import ProfileImageModal from "@/components/common/ProfileImageModal";
import WithdrawConfirmModal from "@/components/common/WithdrawConfirmModal";

/** JWT payload에서 관리자 여부 판단 (API 호출 없이, 403 방지) */
function getIsAdminFromToken() {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  if (!pure) return false;
  try {
    const payload = JSON.parse(atob(pure.split(".")[1]));
    return payload?.role === "ROLE_ADMIN";
  } catch {
    return false;
  }
}

function MyPageContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [artistProfile, setArtistProfile] = useState(null);
  const [artistTeamInfo, setArtistTeamInfo] = useState(null);
  const [artistFanGraph, setArtistFanGraph] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState("");

  const [showProfileImageModal, setShowProfileImageModal] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  const [showArtistProfileEdit, setShowArtistProfileEdit] = useState(false);
  const [artistProfileEdit, setArtistProfileEdit] = useState({
    bio: "",
    profileImageUrl: "",
    bannerImageUrl: "",
    profileImageMediaAssetId: null,
    bannerImageMediaAssetId: null,
    profileImagePreviewUrl: null,
    bannerImagePreviewUrl: null,
  });
  const [artistProfileEditLoading, setArtistProfileEditLoading] = useState(false);
  const [artistProfileEditMessage, setArtistProfileEditMessage] = useState("");
  const artistProfileRefInput = useRef(null);
  const artistBannerRefInput = useRef(null);

  const [showOfficialLinksModal, setShowOfficialLinksModal] = useState(false);
  const [officialLinksList, setOfficialLinksList] = useState([]);
  const [newLinkType, setNewLinkType] = useState("instagram");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkCustomLabel, setNewLinkCustomLabel] = useState("");
  const [officialLinksSaveLoading, setOfficialLinksSaveLoading] = useState(false);
  const [officialLinksMessage, setOfficialLinksMessage] = useState("");

  const [fanTab, setFanTab] = useState("profile");
  const [nicknameEdit, setNicknameEdit] = useState("");
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [ticketQrModal, setTicketQrModal] = useState({ open: false, title: "", qrBase64: null, loading: false });

  const artistIdForCover = artistProfile?.groupId ?? artistProfile?.id;
  const profilePresignItem = {
    category: MediaAssetCategory.PROFILE_IMAGE,
    scope: MediaAssetScope.PUBLIC,
  };
  const coverPresignItem = {
    category: MediaAssetCategory.ARTIST_COVER_IMAGE,
    scope: MediaAssetScope.PUBLIC,
    artistId: artistIdForCover ?? undefined,
  };
  const { upload: uploadProfileImage } = useMediaUpload(profilePresignItem);
  const { upload: uploadCoverImage } = useMediaUpload(coverPresignItem);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      redirectToGuestHome();
      return;
    }
    const isAdminUser = getIsAdminFromToken();
    setIsAdmin(isAdminUser);

    axios
      .get(`${BASE_URL}/api/user/mypage?page=0&size=20`, { headers })
      .then((res) => setData(res.data))
      .catch(() => setError("마이페이지 정보를 불러오지 못했습니다."))
      .finally(() => {
        if (!isAdminUser) {
          axios
            .get(`${BASE_URL}/api/home`, { headers })
            .then((res) => res.data)
            .then((payload) => {
              const isArtistHome =
                payload != null &&
                Array.isArray(payload.recentPosts) &&
                payload.followedArtists == null;
              if (isArtistHome) {
                return axios.get(`${BASE_URL}/api/artist/mypage`, { headers });
              }
              return null;
            })
            .then((res) => {
              if (res?.data) {
                setArtistProfile(res.data?.profile ?? null);
                setArtistTeamInfo(res.data?.teamInfo ?? null);
                setArtistFanGraph(res.data?.fanDailyGraph ?? null);
              }
            })
            .catch(() => {
              setArtistProfile(null);
              setArtistTeamInfo(null);
              setArtistFanGraph(null);
            })
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });
  }, []);

  const openedArtistProfileFromQuery = useRef(false);
  useEffect(() => {
    if (loading || openedArtistProfileFromQuery.current) return;
    if (searchParams.get("open") === "artist-profile" && artistProfile != null) {
      openedArtistProfileFromQuery.current = true;
      setArtistProfileEdit({
        bio: artistProfile?.bio ?? "",
        profileImageUrl: artistProfile?.profileImageUrl ?? "",
        bannerImageUrl: artistProfile?.bannerImageUrl ?? "",
        profileImageMediaAssetId: null,
        bannerImageMediaAssetId: null,
        profileImagePreviewUrl: null,
        bannerImagePreviewUrl: null,
      });
      setArtistProfileEditMessage("");
      setShowArtistProfileEdit(true);
    }
  }, [searchParams, loading, artistProfile]);

  useEffect(() => {
    if (loading || isAdmin || artistTeamInfo?.type || fanTab !== "ticket") return;
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios
      .get(`${BASE_URL}/api/tickets/my`, { headers })
      .then((res) => setMyTickets(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMyTickets([]));
  }, [loading, isAdmin, artistTeamInfo?.type, fanTab]);

  const handleChangePassword = async () => {
    setPwMessage("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMessage("모든 비밀번호 항목을 입력해주세요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }
    setPwLoading(true);
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${BASE_URL}/api/user/password`,
        { currentPassword, newPassword },
        { headers }
      );
      setPwMessage("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      const msg = e.response?.data?.message ?? e.message ?? "비밀번호 변경에 실패했습니다.";
      setPwMessage(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const handleWithdrawConfirm = async (password) => {
    await signout(password);
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/home";
    }
  };

  const handleProfileImageSuccess = (newUrl) => {
    setData((prev) =>
      prev && prev.profile
        ? { ...prev, profile: { ...prev.profile, profileImageUrl: newUrl } }
        : prev
    );
  };

  const handleNicknameSave = async () => {
    const val = (nicknameEdit || (data?.profile?.nickname ?? "")).trim();
    if (!val || val.length < 2) {
      setNicknameMessage("닉네임은 2자 이상 입력해 주세요.");
      return;
    }
    setNicknameMessage("");
    setNicknameLoading(true);
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${BASE_URL}/api/user/profile`,
        { nickname: val, profileImageUrl: data?.profile?.profileImageUrl ?? null },
        { headers }
      );
      setData((prev) =>
        prev && prev.profile ? { ...prev, profile: { ...prev.profile, nickname: val } } : prev
      );
      setNicknameEdit("");
      setNicknameMessage("저장되었습니다.");
    } catch (e) {
      setNicknameMessage(e.response?.data?.message ?? "저장에 실패했습니다.");
    } finally {
      setNicknameLoading(false);
    }
  };

  const handleArtistProfileSubmit = async () => {
    setArtistProfileEditMessage("");
    setArtistProfileEditLoading(true);
    try {
      const body = {
        bio: artistProfileEdit.bio || null,
        profileImageUrl: artistProfileEdit.profileImageMediaAssetId ? null : (artistProfileEdit.profileImageUrl || null),
        bannerImageUrl: artistProfileEdit.bannerImageMediaAssetId ? null : (artistProfileEdit.bannerImageUrl || null),
        profileImageMediaAssetId: artistProfileEdit.profileImageMediaAssetId || null,
        bannerImageMediaAssetId: artistProfileEdit.bannerImageMediaAssetId || null,
        officialLinks: null,
      };
      const res = await request("/api/artist/profile", {
        method: "PATCH",
        body,
      });
      setArtistProfile(res ?? artistProfile);
      setArtistProfileEditMessage("저장되었습니다.");
      setShowArtistProfileEdit(false);
    } catch (e) {
      setArtistProfileEditMessage(e?.data?.message ?? e?.message ?? "저장에 실패했습니다.");
    } finally {
      setArtistProfileEditLoading(false);
    }
  };

  const handleArtistProfileImageUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !file.type.startsWith("image/") || !uploadProfileImage) return;
    const result = await uploadProfileImage(file);
    if (result?.mediaAssetId && result?.url) {
      setArtistProfileEdit((p) => ({
        ...p,
        profileImageMediaAssetId: result.mediaAssetId,
        profileImageUrl: "",
        profileImagePreviewUrl: result.url,
      }));
    }
    e.target.value = "";
  };

  const handleArtistBannerUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !file.type.startsWith("image/") || !uploadCoverImage || !artistIdForCover) return;
    const result = await uploadCoverImage(file);
    if (result?.mediaAssetId && result?.url) {
      setArtistProfileEdit((p) => ({
        ...p,
        bannerImageMediaAssetId: result.mediaAssetId,
        bannerImageUrl: "",
        bannerImagePreviewUrl: result.url,
      }));
    }
    e.target.value = "";
  };

  const OFFICIAL_LINK_TYPES = [
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "twitter", label: "Twitter (X)" },
    { value: "facebook", label: "Facebook" },
    { value: "tiktok", label: "TikTok" },
    { value: "website", label: "웹사이트" },
    { value: "other", label: "기타" },
  ];

  const openOfficialLinksModal = () => {
    try {
      const raw = artistProfile?.officialLinks;
      if (!raw) {
        setOfficialLinksList([]);
      } else {
        const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
        const types = OFFICIAL_LINK_TYPES.map((t) => t.value);
        setOfficialLinksList(
          Object.entries(obj || {})
            .filter(([, u]) => u)
            .map(([key, url]) => ({
              type: types.includes(key) ? key : "other",
              url,
              customLabel: types.includes(key) ? null : key,
            }))
        );
      }
    } catch {
      setOfficialLinksList([]);
    }
    setNewLinkType("instagram");
    setNewLinkUrl("");
    setNewLinkCustomLabel("");
    setOfficialLinksMessage("");
    setShowOfficialLinksModal(true);
  };

  const addOfficialLink = () => {
    const url = newLinkUrl?.trim();
    if (!url) return;
    const key = newLinkType === "other" ? (newLinkCustomLabel?.trim() || "기타") : newLinkType;
    if (officialLinksList.some((l) => (l.type === "other" ? l.customLabel : l.type) === key)) {
      setOfficialLinksMessage("이미 같은 타입의 링크가 있습니다.");
      return;
    }
    setOfficialLinksList((prev) => [...prev, { type: newLinkType, url, customLabel: newLinkType === "other" ? (newLinkCustomLabel?.trim() || "기타") : null }]);
    setNewLinkUrl("");
    setNewLinkCustomLabel("");
    setOfficialLinksMessage("");
  };

  const removeOfficialLink = (index) => {
    setOfficialLinksList((prev) => prev.filter((_, i) => i !== index));
  };

  const saveOfficialLinks = async () => {
    setOfficialLinksMessage("");
    setOfficialLinksSaveLoading(true);
    try {
      const headers = getAuthHeaders();
      const obj = {};
      officialLinksList.forEach((item) => {
        const key = item.type === "other" ? (item.customLabel || "기타") : item.type;
        obj[key] = item.url;
      });
      const officialLinks = Object.keys(obj).length ? JSON.stringify(obj) : null;
      const res = await axios.patch(
        `${BASE_URL}/api/artist/profile`,
        { officialLinks },
        { headers }
      );
      if (res.data) setArtistProfile(res.data);
      setShowOfficialLinksModal(false);
    } catch (e) {
      setOfficialLinksMessage(e.response?.data?.message ?? "저장에 실패했습니다.");
    } finally {
      setOfficialLinksSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-6xl mx-auto flex items-center justify-center min-h-[40vh]">
        <p className="text-white/60">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 lg:p-12 max-w-6xl mx-auto">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const profile = data?.profile ?? null;
  const followedArtists = data?.followedArtists ?? [];
  const memberships = data?.memberships ?? [];
  const purchaseHistory = data?.purchaseHistory ?? [];
  const myPosts = data?.myPosts ?? [];
  const myComments = data?.myComments ?? [];
  const myLikedPosts = data?.myLikedPosts ?? [];
  const teamType = artistTeamInfo?.type;
  const isArtistAccount = !!teamType;
  /** ARTIST이면서 소속 그룹이 있는 경우(그룹 멤버) — 프로필 관리·공식 링크 비노출 */
  const isGroupMember = teamType === "ARTIST" && !!artistTeamInfo?.groupName;

  const isFan = !isArtistAccount && !isAdmin;
  const fanTabs = [
    { id: "profile", label: "\uD504\uB85C\uD544 \uC124\uC815" },
    { id: "posts", label: "MY POSTS" },
    { id: "comments", label: "MY COMMENTS" },
    { id: "like", label: "LIKE" },
    { id: "ticket", label: "TICKET" },
    { id: "followingArtist", label: "\uD314\uB85C\uC6B0 \uC544\uD2F0\uC2A4\uD2B8" },
    { id: "payments", label: "\uACB0\uC81C\uB0B4\uC5ED" },
    { id: "memberships", label: "\uBA64\uBC84\uC2ED(\uACB0\uC81C)\uAD6C\uB3C5" },
  ];

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-10">
      <SectionTitle className="text-2xl font-bold">
        {isAdmin ? "\uAD00\uB9AC\uC790 \uB9C8\uC774\uD398\uC774\uC9C0" : "\uB9C8\uC774\uD398\uC774\uC9C0"}
      </SectionTitle>

      {isFan && (
        <>
          <Surface variant="primary" className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="size-20 rounded-2xl overflow-hidden border-2 border-white/[0.08] bg-white/[0.04]">
                  <img
                    src={profile?.profileImageUrl || getDefaultAvatarUrl(profile?.nickname)}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileImageModal(true)}
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
                >
                  {"\uC0AC\uC9C4 \uBCC0\uACBD"}
                </button>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55 mb-1">Account</p>
                <h2 className="text-2xl font-black text-white mb-1">{profile?.nickname || "\uC0AC\uC6A9\uC790"}</h2>
                <p className="text-sm text-white/70">{profile?.email}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-right text-xs text-white/60">
              <p>{"\uD314\uB85C\uC6B0 \uC544\uD2F0\uC2A4\uD2B8"}: <span className="font-bold text-white/90">{data?.totalFollowingsCount ?? 0}</span></p>
              <p>{"\uBA64\uBC84\uC2ED(\uACB0\uC81C)\uAD6C\uB3C5"}: <span className="font-bold text-white/90">{data?.totalMembershipsCount ?? 0}</span></p>
            </div>
          </Surface>

          <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] w-fit max-w-full overflow-x-auto no-scrollbar">
            {fanTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFanTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  fanTab === tab.id
                    ? "bg-violet-500/30 text-violet-300 border border-violet-500/40"
                    : "text-white/70 hover:text-white hover:bg-white/[0.06] border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {fanTab === "profile" && (
            <div className="space-y-8">
              <Surface variant="primary" className="p-8">
                <h3 className="text-lg font-semibold tracking-tight text-white mb-4">{"\uB2C9\uB124\uC784 \uBCC0\uACBD"}</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">{"\uB2C9\uB124\uC784"}</label>
                    <input
                      type="text"
                      value={nicknameEdit || profile?.nickname || ""}
                      onChange={(e) => setNicknameEdit(e.target.value)}
                      placeholder={"2\uC790 \uC774\uC0C1"}
                      className="w-full px-5 py-3.5 rounded-2xl text-sm font-bold bg-[#201a33] text-white border border-white/[0.06] focus:ring-2 focus:ring-violet-500/20 outline-none"
                    />
                  </div>
                  <Button variant="primary" className="py-3 text-xs uppercase tracking-widest" onClick={handleNicknameSave} disabled={nicknameLoading}>
                    {nicknameLoading ? "\uC800\uC7A5 \uC911..." : "\uC800\uC7A5"}
                  </Button>
                </div>
                {nicknameMessage && <p className="text-xs text-white/70 mt-2">{nicknameMessage}</p>}
              </Surface>

              <Surface variant="primary" className="p-8">
                <h3 className="text-lg font-semibold tracking-tight text-white mb-6">{"\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD"}</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">{"\uD604\uC7AC \uBE44\uBC00\uBC88\uD638"}</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-5 py-3.5 rounded-2xl text-sm font-bold bg-[#201a33] text-white border border-white/[0.06] focus:ring-2 focus:ring-violet-500/20 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">{"\uC0C8 \uBE44\uBC00\uBC88\uD638"}</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-5 py-3.5 rounded-2xl text-sm font-bold bg-[#201a33] text-white border border-white/[0.06] focus:ring-2 focus:ring-violet-500/20 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">{"\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778"}</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-5 py-3.5 rounded-2xl text-sm font-bold bg-[#201a33] text-white border border-white/[0.06] focus:ring-2 focus:ring-violet-500/20 outline-none" />
                  </div>
                  {pwMessage && <p className="text-xs text-white/70 mt-1 whitespace-pre-line">{pwMessage}</p>}
                  <div className="pt-2">
                    <Button variant="primary" className="w-full py-3 text-xs uppercase tracking-widest" onClick={handleChangePassword} disabled={pwLoading}>
                      {pwLoading ? "\uBCC0\uACBD \uC911..." : "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD"}
                    </Button>
                  </div>
                </div>
              </Surface>

              <Surface variant="primary" className="p-8">
                <h3 className="text-lg font-black tracking-tight text-white mb-2">{"\uD68C\uC6D0\uD0C8\uD1F4"}</h3>
                <p className="text-[11px] text-white/55 font-medium mb-6">{"\uD0C8\uD1F4\uD558\uBA74 \uACC4\uC815 \uC815\uBCF4\uB97C \uBCF5\uAD6C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBE44\uBC00\uBC88\uD638 \uD655\uC778 \uD6C4 \uC9C4\uD589\uB429\uB2C8\uB2E4."}</p>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl text-sm font-bold bg-red-500/90 text-white hover:bg-red-500 transition-colors"
                >
                  {"\uD68C\uC6D0\uD0C8\uD1F4 \uC9C4\uD589"}
                </button>
              </Surface>
            </div>
          )}

          {fanTab === "followingArtist" && (
            <Surface variant="primary" className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">{"\uD314\uB85C\uC6B0 \uC544\uD2F0\uC2A4\uD2B8"}</h3>
                  <p className="text-[11px] text-white/55 font-medium">{"\uBA64\uBC84\uC2ED \uC5EC\uBD80\uC640 \uAD00\uACC4\uC5C6\uC774, \uB0B4\uAC00 \uD314\uB85C\uD55C \uC544\uD2F0\uC2A4\uD2B8 \uBAA9\uB85D\uC785\uB2C8\uB2E4."}</p>
                </div>
                <Link href="/artists" className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline">{"\uC544\uD2F0\uC2A4\uD2B8 \uB458\uB7EC\uBCF4\uAE30"}</Link>
              </div>
              {followedArtists.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                  <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">{"\uD314\uB85C\uC6B0 \uC911\uC778 \uC544\uD2F0\uC2A4\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followedArtists.map((a) => (
                    <Link key={a.artistId} href={`/artists/${a.artistId}`} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/[0.06]">
                      <img src={a.profileImageUrl || `https://picsum.photos/seed/artist-${a.artistId}/100/100`} className="size-10 rounded-full border border-white/[0.08] object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white group-hover:text-violet-300 transition-colors truncate">{a.nickname}</p>
                      </div>
                      <span className="material-symbols-outlined text-white/45 group-hover:text-violet-300 transition-colors text-base">chevron_right</span>
                    </Link>
                  ))}
                </div>
              )}
            </Surface>
          )}

          {fanTab === "payments" && (
            <Surface variant="primary" className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">{"\uACB0\uC81C \uB0B4\uC5ED"}</h3>
                  <p className="text-[11px] text-white/55 font-medium">{"\uCD5C\uADFC \uACB0\uC81C \uB0B4\uC5ED\uC785\uB2C8\uB2E4."}</p>
                </div>
                <Link href="/mypage/history" className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline">{"\uC804\uCCB4 \uACB0\uC81C\uB0B4\uC5ED\uBCF4\uAE30"}</Link>
              </div>
              {(() => {
                const formatDate = (str) => {
                  if (!str) return "-";
                  try {
                    const d = new Date(str);
                    return isNaN(d.getTime())
                      ? str
                      : d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
                  } catch {
                    return str;
                  }
                };

                const goodsList = purchaseHistory.map((o) => ({
                  id: o.orderNo,
                  date: o.createdAt,
                  name: o.orderName,
                  amount: o.totalAmount != null ? `${Number(o.totalAmount).toLocaleString()}\uC6D0` : "-",
                  status: o.status ?? "COMPLETED",
                }));

                const membershipList = memberships.map((m) => {
                  const candyPrice = m.candyPrice ?? m.candy_price;
                  const price = m.price;
                  const amountStr =
                    candyPrice != null
                      ? `${Number(candyPrice).toLocaleString()} \uCEA4\uB514`
                      : price != null && price > 0
                        ? `${Number(price).toLocaleString()}\uC6D0`
                        : "\uCEA4\uB514";

                  return {
                    id: `SUB-${m.subscriptionId}`,
                    date: m.endDate ?? m.createdAt,
                    name: m.productName,
                    amount: amountStr,
                    status: m.isActive ? "\uAD6C\uB3C5 \uC911" : "\uB9CC\uB8CC",
                  };
                });

                const combined = [...goodsList, ...membershipList]
                  .filter((item) => item.date)
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 10);

                if (combined.length === 0) {
                  return (
                    <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                      <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">{"\uACB0\uC81C \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {combined.map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-white/45 uppercase tracking-[0.2em]">{formatDate(item.date)}</span>
                            <span className="text-[10px] font-black text-violet-300 uppercase tracking-widest">#{String(item.id).replace(/^SUB-/, "")}</span>
                          </div>
                          <p className="font-bold text-white truncate mt-1">{item.name}</p>
                          <p className="text-sm text-violet-300 font-bold mt-0.5">{item.amount}</p>
                        </div>
                        <span
                          className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            ["COMPLETED", "\uBC30\uC1A1 \uC644\uB8CC", "\uAD6C\uB3C5 \uC911"].includes(item.status)
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-violet-500/20 text-violet-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Surface>
          )}

          {fanTab === "memberships" && (
            <Surface variant="primary" className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">{"\uBA64\uBC84\uC2ED(\uACB0\uC81C)\uAD6C\uB3C5"}</h3>
                  <p className="text-[11px] text-white/55 font-medium">{"\uC720\uB8CC \uACB0\uC81C\uAC00 \uD65C\uC131\uD654\uB41C \uBA64\uBC84\uC2ED \uBAA9\uB85D\uC785\uB2C8\uB2E4."}</p>
                </div>
                <Link href="/candy/recharge" className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline">{"\uACB0\uC81C \uAD00\uB9AC"}</Link>
              </div>
              {memberships.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                  <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">{"\uD65C\uC131\uD654\uB41C \uBA64\uBC84\uC2ED(\uACB0\uC81C) \uAD6C\uB3C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memberships.map((m) => (
                    <div key={m.subscriptionId} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                      <div className="flex flex-col">
                        <p className="text-sm font-bold text-white truncate">{m.productName}</p>
                        <p className="text-[10px] text-white/55 font-medium">{"\uC0C1\uD0DC"}: {m.isActive ? "\uD65C\uC131" : "\uB9CC\uB8CC"}</p>
                      </div>
                      {m.endDate && <p className="text-[10px] text-white/45 font-medium">{"\uC885\uB8CC\uC77C"}: {m.endDate}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          )}

          {fanTab === "posts" && (
            <Surface variant="primary" className="p-8">
              <h3 className="text-lg font-black tracking-tight text-white mb-2">{"\uB0B4\uAC00 \uC791\uC131\uD55C \uAE00"}</h3>
              <p className="text-[11px] text-white/55 font-medium mb-6">{"\uB0B4\uAC00 \uC791\uC131\uD55C \uAE00 \uBAA9\uB85D\uC785\uB2C8\uB2E4."}</p>
              {myPosts.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                  <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">{"\uC791\uC131\uD55C \uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPosts.map((post) => (
                    <Link key={post.postId} href={`/posts/${post.postId}?type=FAN&from=mypage`} className="block p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all group">
                      <p className="font-bold text-white group-hover:text-violet-300 transition-colors truncate">{post.title}</p>
                      {post.content && <p className="text-[11px] text-white/60 mt-1 line-clamp-2">{post.content}</p>}
                      <p className="text-[10px] text-white/45 mt-2">{post.createdAt}</p>
                    </Link>
                  ))}
                </div>
              )}
            </Surface>
          )}

          {fanTab === "comments" && (
            <Surface variant="primary" className="p-8">
              <h3 className="text-lg font-black tracking-tight text-white mb-2">{"\uB0B4\uAC00 \uC791\uC131\uD55C \uB313\uAE00"}</h3>
              <p className="text-[11px] text-white/55 font-medium mb-6">{"\uB0B4\uAC00 \uC791\uC131\uD55C \uB313\uAE00 \uBAA9\uB85D\uC785\uB2C8\uB2E4."}</p>
              {myComments.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                  <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">{"\uC791\uC131\uD55C \uB313\uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myComments.map((c) => {
                    const commentHref =
                      c.targetType === "ARTIST" || c.targetType === "FAN"
                        ? `/posts/${c.targetId}?type=${c.targetType}&from=mypage`
                        : c.targetType === "LIVE"
                          ? `/live/${c.targetId}`
                          : "/home";
                    return (
                      <Link key={c.commentId} href={commentHref} className="block p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all group">
                        <p className="text-[11px] text-white/70 line-clamp-2">{c.content}</p>
                        <p className="text-[10px] text-white/45 mt-2">{c.targetType} · {c.createdAt}</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Surface>
          )}

          {fanTab === "like" && (
            <Surface variant="primary" className="p-8">
              <h3 className="text-lg font-black tracking-tight text-white mb-2">{"\uC88B\uC544\uC694 \uB204\uB978 \uAE00"}</h3>
              <p className="text-[11px] text-white/55 font-medium mb-6">{"\uB0B4\uAC00 \uC88B\uC544\uC694\uD55C \uAC8C\uC2DC\uAE00 \uBAA9\uB85D\uC785\uB2C8\uB2E4."}</p>
              {myLikedPosts.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                  <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">{"\uC88B\uC544\uC694\uD55C \uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myLikedPosts.map((item) => {
                    const likePostType = item.postType === "ARTIST_POST" ? "ARTIST" : "FAN";
                    return (
                      <Link key={`${item.postType}-${item.postId}`} href={`/posts/${item.postId}?type=${likePostType}&from=mypage`} className="block p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all group">
                        <p className="text-[10px] text-violet-300/80 font-bold uppercase tracking-wider mb-1">{item.postType === "ARTIST_POST" ? "ARTIST POST" : "FAN POST"}</p>
                        <p className="font-bold text-white group-hover:text-violet-300 transition-colors truncate">{item.title}</p>
                        {item.content && <p className="text-[11px] text-white/60 mt-1 line-clamp-2">{item.content}</p>}
                        <p className="text-[10px] text-white/45 mt-2">{"\uC88B\uC544\uC694"}: {item.likedAt}</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Surface>
          )}

          {fanTab === "ticket" && (
            <Surface variant="primary" className="p-8">
              <h3 className="text-lg font-black tracking-tight text-white mb-2">TICKET</h3>
              <p className="text-[11px] text-white/55 font-medium mb-6">{"\uAD6C\uB9E4\uD55C \uCF58\uC11C\uD2B8 \uD2F0\uCF13 \uBAA9\uB85D\uC785\uB2C8\uB2E4."}</p>
              {myTickets.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                  <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">{"\uAD6C\uB9E4\uD55C \uD2F0\uCF13\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTickets.map((ticket) => {
                    const startStr = ticket.concert?.startDateTime
                      ? new Date(ticket.concert.startDateTime).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })
                      : "-";
                    const endStr = ticket.concert?.endDateTime
                      ? new Date(ticket.concert.endDateTime).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })
                      : "-";
                    return (
                      <div
                        key={ticket.id}
                        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white truncate">{ticket.concert?.title ?? "\uCF58\uC11C\uD2B8"}</p>
                          <p className="text-[11px] text-white/60 mt-1">
                            {startStr} ~ {endStr}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTicketQrModal({ open: true, title: ticket.concert?.title ?? "\uD2F0\uCF13", qrBase64: null, loading: true });
                            const headers = getAuthHeaders();
                            axios
                              .get(`${BASE_URL}/api/tickets/${ticket.ticketCode}/qr`, { headers })
                              .then((res) => {
                                const base64 = res.data?.qrImageBase64 ?? null;
                                setTicketQrModal((prev) => ({ ...prev, qrBase64: base64, loading: false }));
                              })
                              .catch(() => setTicketQrModal((prev) => ({ ...prev, qrBase64: null, loading: false })));
                          }}
                          className="shrink-0 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
                        >
                          {"\uC785\uC7A5 QR"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Surface>
          )}
        </>
      )}

      {!isFan && (
        <>
      <Surface variant="primary" className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="size-20 rounded-2xl overflow-hidden border-2 border-white/[0.08] bg-white/[0.04]">
              <img
                src={
                  profile?.profileImageUrl ||
                  getDefaultAvatarUrl(artistProfile?.nickname || profile?.nickname)
                }
                alt="프로필"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowProfileImageModal(true)}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
            >
              사진 변경
            </button>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55 mb-1">
              Account
            </p>
            <h2 className="text-2xl font-black text-white mb-1">
              {artistProfile?.nickname || profile?.nickname || "사용자"}
            </h2>
            <p className="text-sm text-white/70">{profile?.email}</p>
          </div>
        </div>
        {!isAdmin && (
          <div className="flex flex-col gap-2 text-right text-xs text-white/60">
            {isArtistAccount ? (
              <p>
                팔로우한 팬: <span className="font-bold text-white/90">{artistFanGraph?.totalFollowers ?? 0}</span>
              </p>
            ) : (
              <p>
                팔로우 아티스트: <span className="font-bold text-white/90">{data?.totalFollowingsCount ?? 0}</span>
              </p>
            )}
            {!isArtistAccount && (
              <p>
                멤버십(결제) 구독: <span className="font-bold text-white/90">{data?.totalMembershipsCount ?? 0}</span>
              </p>
            )}
          </div>
        )}
      </Surface>
        </>
      )}

      <ProfileImageModal
        isOpen={showProfileImageModal}
        onClose={() => setShowProfileImageModal(false)}
        currentImageUrl={profile?.profileImageUrl}
        mode={isArtistAccount ? "artist" : "fan"}
        nickname={data?.profile?.nickname ?? ""}
        onSuccess={handleProfileImageSuccess}
      />
      <WithdrawConfirmModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onConfirm={handleWithdrawConfirm}
      />

      {!isFan && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-6 space-y-6">
          <Surface variant="primary" className="p-8">
            <h3 className="text-lg font-semibold tracking-tight text-white mb-6">
              비밀번호 변경
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl text-sm font-bold bg-[#201a33] text-white border border-white/[0.06] focus:ring-2 focus:ring-violet-500/20 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl text-sm font-bold bg-[#201a33] text-white border border-white/[0.06] focus:ring-2 focus:ring-violet-500/20 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl text-sm font-bold bg-[#201a33] text-white border border-white/[0.06] focus:ring-2 focus:ring-violet-500/20 outline-none"
                />
              </div>
              {pwMessage && (
                <p className="text-xs text-white/70 mt-1 whitespace-pre-line">{pwMessage}</p>
              )}
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full py-3 text-xs uppercase tracking-widest"
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                >
                  {pwLoading ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </div>
            </div>
          </Surface>
        </section>

        <section className="lg:col-span-6 space-y-8">
          {isArtistAccount && !isAdmin && (
            <>
              {/* 팬 수 변화 그래프 */}
              {artistFanGraph && (
                <Surface variant="primary" className="p-8">
                  <h3 className="text-lg font-black tracking-tight text-white mb-2">팬 수 변화</h3>
                  <p className="text-[11px] text-white/55 font-medium mb-6">
                    최근 7일 일별 신규 팔로워 · 총 팬 {artistFanGraph.totalFollowers?.toLocaleString() ?? 0}명
                  </p>
                  <div className="flex items-end gap-2 h-32">
                    {(artistFanGraph.dailyNewFollowers || []).map((point, i) => {
                      const maxNew = Math.max(1, ...(artistFanGraph.dailyNewFollowers || []).map((p) => p.newFollowers || 0));
                      const pct = Math.max(4, (Number(point.newFollowers) / maxNew) * 100);
                      return (
                      <div key={point.date || i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-violet-500/60 min-h-[4px] transition-all"
                          style={{ height: `${pct}%` }}
                        />
                        <span className="text-[10px] text-white/50">{point.date?.slice(5) || ""}</span>
                        <span className="text-xs font-bold text-white/80">{point.newFollowers}</span>
                      </div>
                    ); })}
                  </div>
                </Surface>
              )}

              {/* 프로필 관리 (그룹 멤버 계정은 비노출) */}
              {!isGroupMember && (
              <Surface variant="primary" className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white">프로필 관리</h3>
                    <p className="text-[11px] text-white/55 font-medium">
                      소개, 프로필 이미지, 배너를 수정할 수 있습니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setArtistProfileEdit({
                        bio: artistProfile?.bio ?? "",
                        profileImageUrl: artistProfile?.profileImageUrl ?? "",
                        bannerImageUrl: artistProfile?.bannerImageUrl ?? "",
                        profileImageMediaAssetId: null,
                        bannerImageMediaAssetId: null,
                        profileImagePreviewUrl: null,
                        bannerImagePreviewUrl: null,
                      });
                      setArtistProfileEditMessage("");
                      setShowArtistProfileEdit(true);
                    }}
                    className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                  >
                    수정
                  </button>
                </div>
                <div className="space-y-4">
                  {artistProfile?.bio && (
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{artistProfile.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-6">
                    {artistProfile?.profileImageUrl && (
                      <div>
                        <p className="text-[10px] text-white/55 mb-1">프로필 이미지</p>
                        <img
                          src={artistProfile.profileImageUrl}
                          alt="프로필"
                          className="size-20 rounded-xl object-cover border border-white/10"
                        />
                      </div>
                    )}
                    {artistProfile?.bannerImageUrl && (
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-[10px] text-white/55 mb-1">배너</p>
                        <img
                          src={artistProfile.bannerImageUrl}
                          alt="배너"
                          className="w-full h-20 rounded-xl object-cover border border-white/10"
                        />
                      </div>
                    )}
                  </div>
                  {!artistProfile?.bio && !artistProfile?.profileImageUrl && !artistProfile?.bannerImageUrl && (
                    <p className="text-[11px] text-white/55 italic">등록된 프로필이 없습니다. 수정 버튼에서 입력하세요.</p>
                  )}
                </div>
              </Surface>
              )}

              {/* 공식 링크 (그룹 멤버 계정은 비노출) */}
              {!isGroupMember && (
              <Surface variant="primary" className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white mb-1">공식 링크</h3>
                    <p className="text-[11px] text-white/55 font-medium">
                      SNS, 유튜브 등 공식 링크를 추가·수정할 수 있습니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openOfficialLinksModal}
                    className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                  >
                    링크 추가/수정
                  </button>
                </div>
                {artistProfile?.officialLinks ? (
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      try {
                        const links = typeof artistProfile.officialLinks === "string"
                          ? JSON.parse(artistProfile.officialLinks)
                          : artistProfile.officialLinks;
                        return Object.entries(links || {}).map(([key, url]) =>
                          url ? (
                            <a
                              key={key}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-violet-300 hover:bg-white/[0.1] text-sm font-medium"
                            >
                              {key}
                              <span className="material-symbols-outlined text-base">open_in_new</span>
                            </a>
                          ) : null
                        );
                      } catch {
                        return <p className="text-[11px] text-white/55">링크 형식을 확인해 주세요.</p>;
                      }
                    })()}
                  </div>
                ) : (
                  <p className="text-[11px] text-white/55 italic">등록된 공식 링크가 없습니다. 링크 추가/수정에서 등록하세요.</p>
                )}
              </Surface>
              )}
            </>
          )}
        </section>
      </div>
      )}

      {showArtistProfileEdit && (
        <Surface variant="primary" className="p-8 max-w-lg fixed inset-4 md:inset-8 m-auto max-h-[90vh] overflow-y-auto z-50">
          <h3 className="text-lg font-bold text-white mb-4">프로필 수정</h3>
          {artistProfileEditMessage && (
            <p className="text-sm text-white/70 mb-4">{artistProfileEditMessage}</p>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">소개</label>
              <textarea
                value={artistProfileEdit.bio}
                onChange={(e) => setArtistProfileEdit((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm resize-y"
                placeholder="아티스트 소개를 입력하세요"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">프로필 이미지</label>
              <input
                ref={artistProfileRefInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleArtistProfileImageUpload}
              />
              {artistProfileEdit.profileImagePreviewUrl || artistProfileEdit.profileImageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={artistProfileEdit.profileImagePreviewUrl || artistProfileEdit.profileImageUrl}
                    alt="프로필 미리보기"
                    className="size-20 rounded-xl object-cover border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setArtistProfileEdit((p) => ({ ...p, profileImagePreviewUrl: null, profileImageMediaAssetId: null, profileImageUrl: "" }))}
                    className="absolute -top-1 -right-1 size-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => artistProfileRefInput.current?.click()}
                  className="py-4 px-6 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-violet-500/40 hover:text-violet-300 text-sm"
                >
                  파일 업로드
                </button>
              )}
              <input
                type="url"
                value={artistProfileEdit.profileImageUrl}
                onChange={(e) => setArtistProfileEdit((p) => ({ ...p, profileImageUrl: e.target.value, profileImageMediaAssetId: null }))}
                className="mt-2 w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="또는 URL 입력"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">배너 이미지</label>
              <input
                ref={artistBannerRefInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleArtistBannerUpload}
              />
              {artistProfileEdit.bannerImagePreviewUrl || artistProfileEdit.bannerImageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={artistProfileEdit.bannerImagePreviewUrl || artistProfileEdit.bannerImageUrl}
                    alt="배너 미리보기"
                    className="w-full max-h-24 rounded-xl object-cover border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setArtistProfileEdit((p) => ({ ...p, bannerImagePreviewUrl: null, bannerImageMediaAssetId: null, bannerImageUrl: "" }))}
                    className="absolute top-1 right-1 size-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => artistBannerRefInput.current?.click()}
                  className="py-4 px-6 rounded-xl border-2 border-dashed border-white/20 text-white/60 hover:border-violet-500/40 hover:text-violet-300 text-sm"
                >
                  파일 업로드
                </button>
              )}
              <input
                type="url"
                value={artistProfileEdit.bannerImageUrl}
                onChange={(e) => setArtistProfileEdit((p) => ({ ...p, bannerImageUrl: e.target.value, bannerImageMediaAssetId: null }))}
                className="mt-2 w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="또는 URL 입력"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="primary"
                className="flex-1 py-2.5 text-xs"
                onClick={handleArtistProfileSubmit}
                disabled={artistProfileEditLoading}
              >
                {artistProfileEditLoading ? "저장 중..." : "저장"}
              </Button>
              <Button
                variant="ghost"
                className="py-2.5 text-xs border border-white/10"
                onClick={() => setShowArtistProfileEdit(false)}
              >
                취소
              </Button>
            </div>
          </div>
        </Surface>
      )}

      {showOfficialLinksModal && (
        <Surface variant="primary" className="p-8 max-w-lg fixed inset-4 md:inset-8 m-auto max-h-[90vh] overflow-y-auto z-50">
          <h3 className="text-lg font-bold text-white mb-4">공식 링크 추가/수정</h3>
          {officialLinksMessage && (
            <p className="text-sm text-white/70 mb-4">{officialLinksMessage}</p>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-white/55">등록된 링크</p>
              {officialLinksList.length === 0 ? (
                <p className="text-[11px] text-white/55 italic">등록된 링크가 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {officialLinksList.map((item, i) => {
                    const label = item.type === "other" ? (item.customLabel || "기타") : OFFICIAL_LINK_TYPES.find((t) => t.value === item.type)?.label ?? item.type;
                    return (
                      <li key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                        <span className="text-sm font-medium text-white/90 shrink-0 w-24">{label}</span>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-sm text-violet-300 hover:underline">
                          {item.url}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeOfficialLink(i)}
                          className="p-1.5 text-white/50 hover:text-red-400 rounded-lg hover:bg-white/5"
                          aria-label="삭제"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="pt-4 border-t border-white/[0.06]">
              <p className="text-[10px] font-black uppercase text-white/55 mb-2">링크 추가</p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="w-32 shrink-0">
                  <label className="text-[9px] text-white/45 block mb-0.5">종류</label>
                  <select
                    value={newLinkType}
                    onChange={(e) => setNewLinkType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#201a33] text-white border border-white/[0.06] text-sm"
                  >
                    {OFFICIAL_LINK_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                {newLinkType === "other" && (
                  <div className="w-24 shrink-0">
                    <label className="text-[9px] text-white/45 block mb-0.5">이름</label>
                    <input
                      type="text"
                      value={newLinkCustomLabel}
                      onChange={(e) => setNewLinkCustomLabel(e.target.value)}
                      placeholder="예: 블로그"
                      className="w-full px-3 py-2 rounded-lg bg-[#201a33] text-white border border-white/[0.06] text-sm"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-[180px]">
                  <label className="text-[9px] text-white/45 block mb-0.5">URL</label>
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addOfficialLink()}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-[#201a33] text-white border border-white/[0.06] text-sm"
                  />
                </div>
                <Button variant="primary" className="py-2 text-xs shrink-0" onClick={addOfficialLink}>
                  추가
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="primary"
                className="flex-1 py-2.5 text-xs"
                onClick={saveOfficialLinks}
                disabled={officialLinksSaveLoading}
              >
                {officialLinksSaveLoading ? "저장 중..." : "저장"}
              </Button>
              <Button
                variant="ghost"
                className="py-2.5 text-xs border border-white/10"
                onClick={() => setShowOfficialLinksModal(false)}
              >
                취소
              </Button>
            </div>
          </div>
        </Surface>
      )}

      {ticketQrModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" aria-hidden onClick={() => setTicketQrModal((prev) => ({ ...prev, open: false }))} />
          <Surface variant="primary" className="relative p-8 max-w-sm w-full text-center">
            <h3 className="text-lg font-bold text-white mb-4 truncate">{ticketQrModal.title}</h3>
            {ticketQrModal.loading ? (
              <p className="text-white/60 py-8">QR 코드 생성 중...</p>
            ) : ticketQrModal.qrBase64 ? (
              <div className="flex justify-center mb-6">
                <img src={`data:image/png;base64,${ticketQrModal.qrBase64}`} alt="입장 QR" className="w-48 h-48 object-contain bg-white rounded-xl" />
              </div>
            ) : (
              <p className="text-white/60 py-8">QR 코드를 불러오지 못했습니다.</p>
            )}
            <Button variant="primary" className="w-full py-2.5 text-sm" onClick={() => setTicketQrModal((prev) => ({ ...prev, open: false }))}>
              닫기
            </Button>
          </Surface>
        </div>
      )}
    </div>
  );
}

export default function MyPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="p-8 lg:p-12 max-w-6xl mx-auto">
        <p className="text-white/55">로딩 중...</p>
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="p-8 lg:p-12 max-w-6xl mx-auto"><p className="text-white/55">로딩 중...</p></div>}>
      <MyPageContent />
    </Suspense>
  );
}
