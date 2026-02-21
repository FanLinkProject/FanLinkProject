"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/ui/SectionTitle";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { redirectToGuestHome } from "@/lib/authRedirect";
import { BASE_URL } from "@/lib/api";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

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

export default function MyPage() {
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

  const [showProfileImageEdit, setShowProfileImageEdit] = useState(false);
  const [profileImageUrlInput, setProfileImageUrlInput] = useState("");
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const [profileImageMessage, setProfileImageMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [showArtistCreateModal, setShowArtistCreateModal] = useState(false);
  const [artistCreateForm, setArtistCreateForm] = useState({
    email: "",
    nickname: "",
    name: "",
    password: "",
    gender: "",
    birth: "",
    phoneNumber: "",
    phonePart1: "010",
    phonePart2: "",
    phonePart3: "",
    privacyPolicyAgreed: true,
    isGroup: false,
    groupId: null,
    channelArn: "",
  });
  const [artistCreateLoading, setArtistCreateLoading] = useState(false);
  const [artistCreateMessage, setArtistCreateMessage] = useState("");

  const [showArtistProfileEdit, setShowArtistProfileEdit] = useState(false);
  const [artistProfileEdit, setArtistProfileEdit] = useState({
    bio: "",
    profileImageUrl: "",
    bannerImageUrl: "",
  });
  const [artistProfileEditLoading, setArtistProfileEditLoading] = useState(false);
  const [artistProfileEditMessage, setArtistProfileEditMessage] = useState("");

  const [showOfficialLinksModal, setShowOfficialLinksModal] = useState(false);
  const [officialLinksList, setOfficialLinksList] = useState([]);
  const [newLinkType, setNewLinkType] = useState("instagram");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkCustomLabel, setNewLinkCustomLabel] = useState("");
  const [officialLinksSaveLoading, setOfficialLinksSaveLoading] = useState(false);
  const [officialLinksMessage, setOfficialLinksMessage] = useState("");

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
      await axios.patch(
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

  const handleProfileImageSubmit = async () => {
    setProfileImageMessage("");
    setProfileImageLoading(true);
    try {
      const headers = getAuthHeaders();
      await axios.patch(
        `${BASE_URL}/api/user/profile`,
        { profileImageUrl: profileImageUrlInput },
        { headers }
      );
      setData((prev) =>
        prev && prev.profile
          ? { ...prev, profile: { ...prev.profile, profileImageUrl: profileImageUrlInput } }
          : prev
      );
      setProfileImageMessage("저장되었습니다.");
      setShowProfileImageEdit(false);
    } catch (e) {
      setProfileImageMessage(e.response?.data?.message ?? "저장에 실패했습니다.");
    } finally {
      setProfileImageLoading(false);
    }
  };

  const handleArtistCreate = async () => {
    setArtistCreateMessage("");
    setArtistCreateLoading(true);
    try {
      const headers = getAuthHeaders();
      const payload = {
        ...artistCreateForm,
        phoneNumber: [artistCreateForm.phonePart1, artistCreateForm.phonePart2, artistCreateForm.phonePart3].filter(Boolean).join("-") || null,
      };
      await axios.post(`${BASE_URL}/api/admin/artists`, payload, { headers });
      setArtistCreateMessage("아티스트 계정이 생성되었습니다.");
      setShowArtistCreateModal(false);
      setArtistCreateForm({
        email: "",
        nickname: "",
        name: "",
        password: "",
        gender: "",
        birth: "",
        phoneNumber: "",
        phonePart1: "010",
        phonePart2: "",
        phonePart3: "",
        privacyPolicyAgreed: true,
        isGroup: false,
        groupId: null,
        channelArn: "",
      });
    } catch (e) {
      setArtistCreateMessage(e.response?.data?.message ?? "생성에 실패했습니다.");
    } finally {
      setArtistCreateLoading(false);
    }
  };

  const handleArtistProfileSubmit = async () => {
    setArtistProfileEditMessage("");
    setArtistProfileEditLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await axios.patch(
        `${BASE_URL}/api/artist/profile`,
        {
          bio: artistProfileEdit.bio || null,
          profileImageUrl: artistProfileEdit.profileImageUrl || null,
          bannerImageUrl: artistProfileEdit.bannerImageUrl || null,
        },
        { headers }
      );
      setArtistProfile(res.data ?? artistProfile);
      setArtistProfileEditMessage("저장되었습니다.");
      setShowArtistProfileEdit(false);
    } catch (e) {
      setArtistProfileEditMessage(e.response?.data?.message ?? "저장에 실패했습니다.");
    } finally {
      setArtistProfileEditLoading(false);
    }
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
  const myPosts = data?.myPosts ?? [];
  const myComments = data?.myComments ?? [];
  const myLikedPosts = data?.myLikedPosts ?? [];
  const teamType = artistTeamInfo?.type;
  const isArtistAccount = !!teamType;

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-10">
      <SectionTitle className="text-2xl font-bold">
        {isAdmin ? "관리자 마이페이지" : "마이페이지"}
      </SectionTitle>

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
              onClick={() => {
                setShowProfileImageEdit(true);
                setProfileImageUrlInput(profile?.profileImageUrl || "");
                setProfileImageMessage("");
              }}
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

      {showProfileImageEdit && (
        <Surface variant="primary" className="p-6 max-w-md">
          <h3 className="text-lg font-semibold text-white mb-4">프로필 이미지 변경</h3>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1 block">
              이미지 URL
            </label>
            <input
              type="url"
              value={profileImageUrlInput}
              onChange={(e) => setProfileImageUrlInput(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl text-sm bg-[#201a33] text-white border border-white/[0.06] focus:ring-2 focus:ring-violet-500/20 outline-none"
            />
            {profileImageMessage && (
              <p className="text-xs text-white/70">{profileImageMessage}</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                className="flex-1 py-2.5 text-xs"
                onClick={handleProfileImageSubmit}
                disabled={profileImageLoading}
              >
                {profileImageLoading ? "저장 중..." : "저장"}
              </Button>
              <Button
                variant="ghost"
                className="py-2.5 text-xs border border-white/10"
                onClick={() => {
                  setShowProfileImageEdit(false);
                  setProfileImageUrlInput("");
                  setProfileImageMessage("");
                }}
              >
                취소
              </Button>
            </div>
          </div>
        </Surface>
      )}

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
          {isAdmin && (
            <Surface variant="primary" className="p-8">
              <h3 className="text-lg font-black tracking-tight text-white mb-2">아티스트 계정 관리</h3>
              <p className="text-[11px] text-white/55 font-medium mb-6">
                새 아티스트 또는 그룹 계정을 생성할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowArtistCreateModal(true);
                  setArtistCreateMessage("");
                }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-violet-500/40 bg-violet-500/10 text-violet-300 font-bold text-sm hover:bg-violet-500/20 transition-colors"
              >
                <span className="material-symbols-outlined">person_add</span>
                아티스트 계정 생성하기
              </button>
            </Surface>
          )}

          {!isArtistAccount && !isAdmin && (
            <>
              <Surface variant="primary" className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white">
                      멤버십(결제) 구독
                    </h3>
                    <p className="text-[11px] text-white/55 font-medium">
                      유료 결제가 활성화된 멤버십 목록입니다.
                    </p>
                  </div>
                  <Link
                    href="/candy/recharge"
                    className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                  >
                    결제 관리
                  </Link>
                </div>
                {memberships.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                    <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">
                      활성화된 멤버십(결제) 구독이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberships.map((m) => (
                      <div
                        key={m.subscriptionId}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
                      >
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-white truncate">
                            {m.productName}
                          </p>
                          <p className="text-[10px] text-white/55 font-medium">
                            상태: {m.isActive ? "활성" : "만료"}
                          </p>
                        </div>
                        {m.endDate && (
                          <p className="text-[10px] text-white/45 font-medium">
                            종료일: {m.endDate}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Surface>

              <Surface variant="primary" className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white">
                      팔로우 중인 아티스트
                    </h3>
                    <p className="text-[11px] text-white/55 font-medium">
                      멤버십 여부와 관계 없이, 내가 팔로우한 아티스트 목록입니다.
                    </p>
                  </div>
                  <Link
                    href="/artists"
                    className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                  >
                    아티스트 둘러보기
                  </Link>
                </div>
                {followedArtists.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                    <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">
                      팔로우 중인 아티스트가 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followedArtists.map((a) => (
                      <Link
                        key={a.artistId}
                        href={`/artists/${a.artistId}`}
                        className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/[0.06]"
                      >
                        <img
                          src={
                            a.profileImageUrl ||
                            `https://picsum.photos/seed/artist-${a.artistId}/100/100`
                          }
                          className="size-10 rounded-full border border-white/[0.08] object-cover"
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                            {a.nickname}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-white/45 group-hover:text-violet-300 transition-colors text-base">
                          chevron_right
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </Surface>

              <Surface variant="primary" className="p-8">
                <h3 className="text-lg font-black tracking-tight text-white mb-2">좋아요 누른 글</h3>
                <p className="text-[11px] text-white/55 font-medium mb-6">
                  내가 좋아요한 게시글 목록입니다.
                </p>
                {myLikedPosts.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                    <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">
                      좋아요한 글이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myLikedPosts.map((item) => (
                      <Link
                        key={`${item.postType}-${item.postId}`}
                        href={`/posts/${item.postId}`}
                        className="block p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all group"
                      >
                        <p className="text-[10px] text-violet-300/80 font-bold uppercase tracking-wider mb-1">
                          {item.postType === "ARTIST_POST" ? "아티스트 글" : "팬글"}
                        </p>
                        <p className="font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                          {item.title}
                        </p>
                        {item.content && (
                          <p className="text-[11px] text-white/60 mt-1 line-clamp-2">
                            {item.content}
                          </p>
                        )}
                        <p className="text-[10px] text-white/45 mt-2">좋아요: {item.likedAt}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </Surface>

              <Surface variant="primary" className="p-8">
                <h3 className="text-lg font-black tracking-tight text-white mb-2">본인이 작성한 글</h3>
                <p className="text-[11px] text-white/55 font-medium mb-6">
                  내가 작성한 팬글 목록입니다.
                </p>
                {myPosts.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                    <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">
                      작성한 글이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPosts.map((post) => (
                      <Link
                        key={post.postId}
                        href={`/posts/${post.postId}`}
                        className="block p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all group"
                      >
                        <p className="font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                          {post.title}
                        </p>
                        {post.content && (
                          <p className="text-[11px] text-white/60 mt-1 line-clamp-2">
                            {post.content}
                          </p>
                        )}
                        <p className="text-[10px] text-white/45 mt-2">{post.createdAt}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </Surface>

              <Surface variant="primary" className="p-8">
                <h3 className="text-lg font-black tracking-tight text-white mb-2">본인이 작성한 댓글</h3>
                <p className="text-[11px] text-white/55 font-medium mb-6">
                  내가 작성한 댓글 목록입니다.
                </p>
                {myComments.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                    <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">
                      작성한 댓글이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myComments.map((c) => (
                      <Link
                        key={c.commentId}
                        href={`/posts/${c.targetId}`}
                        className="block p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all group"
                      >
                        <p className="text-[11px] text-white/70 line-clamp-2">
                          {c.content}
                        </p>
                        <p className="text-[10px] text-white/45 mt-2">
                          {c.targetType} · {c.createdAt}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </Surface>
            </>
          )}

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

              {/* 프로필 관리 (소개, 프로필 이미지, 배너) */}
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

              {/* 공식 링크 (SNS, 유튜브 등) */}
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

              {/* 그룹/멤버 정보 - 그룹이 있거나 멤버가 있을 때만 표시 */}
              {(artistTeamInfo?.type === "GROUP" || (artistTeamInfo?.members?.length > 0)) && (
                <Surface variant="primary" className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-white">그룹 / 멤버 정보</h3>
                      <p className="text-[11px] text-white/55 font-medium">아티스트 계정 정보입니다.</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-2">
                    <p className="text-sm font-bold text-white">
                      유형: {artistTeamInfo.type === "GROUP" ? "그룹" : "솔로"}
                    </p>
                    {artistTeamInfo.members && artistTeamInfo.members.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] text-white/55 uppercase tracking-wider mb-2">멤버</p>
                        <ul className="space-y-1">
                          {artistTeamInfo.members.map((m) => (
                            <li key={m.id ?? m.userId} className="text-sm text-white/80">
                              {m.nickname}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Surface>
              )}
            </>
          )}
        </section>
      </div>

      {showArtistCreateModal && (
        <Surface variant="primary" className="p-8 max-w-lg fixed inset-4 md:inset-8 m-auto max-h-[90vh] overflow-y-auto z-50">
          <h3 className="text-lg font-bold text-white mb-4">아티스트 계정 생성</h3>
          {artistCreateMessage && (
            <p className="text-sm text-white/70 mb-4">{artistCreateMessage}</p>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">이메일</label>
              <input
                type="email"
                value={artistCreateForm.email}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">닉네임</label>
              <input
                type="text"
                value={artistCreateForm.nickname}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, nickname: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">비밀번호</label>
              <input
                type="password"
                value={artistCreateForm.password}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="primary"
                className="flex-1 py-2.5 text-xs"
                onClick={handleArtistCreate}
                disabled={artistCreateLoading}
              >
                {artistCreateLoading ? "생성 중..." : "생성"}
              </Button>
              <Button
                variant="ghost"
                className="py-2.5 text-xs border border-white/10"
                onClick={() => setShowArtistCreateModal(false)}
              >
                취소
              </Button>
            </div>
          </div>
        </Surface>
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
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">프로필 이미지 URL</label>
              <input
                type="url"
                value={artistProfileEdit.profileImageUrl}
                onChange={(e) => setArtistProfileEdit((p) => ({ ...p, profileImageUrl: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">배너 이미지 URL</label>
              <input
                type="url"
                value={artistProfileEdit.bannerImageUrl}
                onChange={(e) => setArtistProfileEdit((p) => ({ ...p, bannerImageUrl: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="https://..."
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
    </div>
  );
}
