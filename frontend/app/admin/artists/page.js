"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { redirectToGuestHome } from "@/lib/authRedirect";

import { BASE_URL } from "@/lib/api";
const PAGE_SIZE = 10;

const ACCOUNT_TYPE_INDIVIDUAL = "individual";
const ACCOUNT_TYPE_GROUP_MEMBER = "group_member";
const ACCOUNT_TYPE_GROUP = "group";

const defaultArtistCreateForm = () => ({
  accountType: ACCOUNT_TYPE_INDIVIDUAL,
  email: "",
  nickname: "",
  name: "",
  password: "",
  gender: "",
  birth: "",
  phonePart1: "010",
  phonePart2: "",
  phonePart3: "",
  privacyPolicyAgreed: true,
  groupId: null,
  channelArn: "",
});

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function AdminArtistsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showArtistCreateModal, setShowArtistCreateModal] = useState(false);
  const [artistCreateForm, setArtistCreateForm] = useState(defaultArtistCreateForm());
  const [artistCreateLoading, setArtistCreateLoading] = useState(false);
  const [artistCreateMessage, setArtistCreateMessage] = useState("");
  const [groupsList, setGroupsList] = useState([]);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      redirectToGuestHome();
      return;
    }
    setLoading(true);
    const params = { page, size: PAGE_SIZE };
    if (search.trim()) params.keyword = search.trim();
    axios
      .get(`${BASE_URL}/api/admin/artists`, { headers, params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 403 ? "관리자만 접근할 수 있습니다." : "목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  useEffect(() => {
    if (!showArtistCreateModal) return;
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios
      .get(`${BASE_URL}/api/admin/artists`, { headers, params: { page: 0, size: 200 } })
      .then((res) => {
        const list = (res.data?.content ?? []).filter((a) => a.role === "GROUP");
        setGroupsList(list);
      })
      .catch(() => setGroupsList([]));
  }, [showArtistCreateModal]);

  const openArtistCreateModal = () => {
    setArtistCreateForm(defaultArtistCreateForm());
    setArtistCreateMessage("");
    setShowArtistCreateModal(true);
  };

  const handleArtistCreate = async () => {
    setArtistCreateMessage("");
    setArtistCreateLoading(true);
    try {
      const headers = getAuthHeaders();
      const phoneNumber = [artistCreateForm.phonePart1, artistCreateForm.phonePart2, artistCreateForm.phonePart3]
        .filter(Boolean)
        .join("-");
      if (!phoneNumber) {
        setArtistCreateMessage("전화번호를 입력하세요.");
        setArtistCreateLoading(false);
        return;
      }
      const isGroup = artistCreateForm.accountType === ACCOUNT_TYPE_GROUP;
      const groupId =
        artistCreateForm.accountType === ACCOUNT_TYPE_GROUP_MEMBER ? artistCreateForm.groupId ?? undefined : undefined;
      const payload = {
        email: artistCreateForm.email,
        nickname: artistCreateForm.nickname,
        name: artistCreateForm.name,
        password: artistCreateForm.password,
        gender: artistCreateForm.gender,
        birth: artistCreateForm.birth,
        privacyPolicyAgreed: artistCreateForm.privacyPolicyAgreed,
        phoneNumber,
        isGroup,
        groupId: groupId ?? null,
        channelArn: artistCreateForm.channelArn?.trim() || null,
      };
      await axios.post(`${BASE_URL}/api/admin/artists`, payload, { headers });
      setArtistCreateMessage("아티스트 계정이 생성되었습니다.");
      setShowArtistCreateModal(false);
      setArtistCreateForm(defaultArtistCreateForm());
      setPage(0);
      setSearch("");
      setSearchInput("");
      setLoading(true);
      axios
        .get(`${BASE_URL}/api/admin/artists`, { headers: getAuthHeaders(), params: { page: 0, size: PAGE_SIZE } })
        .then((res) => setData(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch (e) {
      setArtistCreateMessage(e.response?.data?.message ?? "생성에 실패했습니다.");
    } finally {
      setArtistCreateLoading(false);
    }
  };

  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const content = data?.content ?? [];

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <SectionTitle className="text-2xl font-bold">아티스트 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">등록된 아티스트 및 그룹을 검토하고 승인합니다.</p>
        </div>
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/55 text-lg">search</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="닉네임 검색..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#201a33] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 font-medium text-sm text-white placeholder:text-white/40"
            />
          </form>
          <Button
            variant="primary"
            className="text-xs uppercase tracking-widest"
            onClick={openArtistCreateModal}
          >
            아티스트 계정 생성
          </Button>
          <Button variant="ghost" href="/admin" className="text-xs uppercase tracking-widest">
            대시보드
          </Button>
        </div>
      </header>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <Surface variant="primary" className="p-12 text-center">
          <p className="text-sm text-white/55">불러오는 중...</p>
        </Surface>
      ) : content.length === 0 ? (
        <Surface variant="primary" className="p-12 text-center">
          <p className="text-sm text-white/50">등록된 아티스트/그룹이 없습니다.</p>
        </Surface>
      ) : (
        <div className="space-y-4">
          {content.map((artist) => (
            <Surface
              key={artist.id}
              variant="primary"
              className="p-8 flex items-center gap-6 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(150,100,255,0.08)] transition-shadow"
            >
              <img
                src={artist.profileImageUrl || getDefaultAvatarUrl(artist.nickname)}
                alt=""
                className="size-16 rounded-2xl border border-white/[0.08] object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-white">{artist.nickname}</h3>
                <p className="text-[10px] text-white/55 font-medium mt-0.5">{artist.email}</p>
                <p className="text-[10px] text-white/55 font-black uppercase tracking-widest mt-1">
                  {artist.role} · 가입일 {formatDate(artist.createdAt)}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                승인됨
              </span>
              <Link href={`/artists/${artist.id}`}>
                <Button variant="ghost" className="px-4 py-2 text-[10px] uppercase tracking-widest">
                  상세
                </Button>
              </Link>
            </Surface>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-[10px] text-white/55 font-medium">
                전체 {totalElements}명 · {page + 1} / {totalPages} 페이지
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/80 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.1] transition-colors"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/80 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.1] transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showArtistCreateModal && (
        <Surface variant="primary" className="p-8 max-w-lg fixed inset-4 md:inset-8 m-auto max-h-[90vh] overflow-y-auto z-50">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-lg font-black text-white">아티스트 계정 생성</h3>
            <button
              type="button"
              onClick={() => setShowArtistCreateModal(false)}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="모달 닫기"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
          <p className="text-[11px] text-white/55 font-medium mb-6">
            개인 아티스트, 그룹 멤버, 그룹 중 유형을 선택하고 정보를 입력하세요.
          </p>
          {artistCreateMessage && (
            <p className={`text-sm mb-4 ${artistCreateMessage.includes("실패") ? "text-red-400" : "text-emerald-400"}`}>
              {artistCreateMessage}
            </p>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">계정 유형</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: ACCOUNT_TYPE_INDIVIDUAL, label: "개인 아티스트" },
                  { value: ACCOUNT_TYPE_GROUP_MEMBER, label: "그룹 멤버" },
                  { value: ACCOUNT_TYPE_GROUP, label: "그룹" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setArtistCreateForm((f) => ({ ...f, accountType: opt.value, groupId: null }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      artistCreateForm.accountType === opt.value
                        ? "bg-violet-500 text-white"
                        : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {artistCreateForm.accountType === ACCOUNT_TYPE_GROUP_MEMBER && (
              <div>
                <label className="text-[10px] font-black uppercase text-white/55 block mb-1">소속 그룹</label>
                <select
                  value={artistCreateForm.groupId ?? ""}
                  onChange={(e) =>
                    setArtistCreateForm((f) => ({
                      ...f,
                      groupId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                >
                  <option value="">그룹 선택</option>
                  {groupsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nickname}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">이메일</label>
              <input
                type="email"
                value={artistCreateForm.email}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="artist@example.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">
                닉네임 {artistCreateForm.accountType === ACCOUNT_TYPE_GROUP ? "(그룹명)" : "(예명)"}
              </label>
              <input
                type="text"
                value={artistCreateForm.nickname}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, nickname: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="공백 없이 2자 이상"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">
                이름 {artistCreateForm.accountType === ACCOUNT_TYPE_GROUP ? "(그룹명, 한/영/숫자 가능)" : "(실명)"}
              </label>
              <input
                type="text"
                value={artistCreateForm.name}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="2자 이상"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">비밀번호</label>
              <input
                type="password"
                value={artistCreateForm.password}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="초기 비밀번호"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">성별</label>
              <select
                value={artistCreateForm.gender}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, gender: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
              >
                <option value="">선택</option>
                <option value="MALE">남성</option>
                <option value="FEMALE">여성</option>
                <option value="OTHER">기타</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">생년월일</label>
              <input
                type="text"
                value={artistCreateForm.birth}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, birth: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">전화번호</label>
              <div className="flex gap-2">
                <select
                  value={artistCreateForm.phonePart1}
                  onChange={(e) => setArtistCreateForm((f) => ({ ...f, phonePart1: e.target.value }))}
                  className="w-20 px-2 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                >
                  <option value="010">010</option>
                  <option value="011">011</option>
                  <option value="016">016</option>
                  <option value="017">017</option>
                  <option value="018">018</option>
                  <option value="019">019</option>
                </select>
                <input
                  type="text"
                  value={artistCreateForm.phonePart2}
                  onChange={(e) => setArtistCreateForm((f) => ({ ...f, phonePart2: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  className="flex-1 px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                  placeholder="1234"
                  maxLength={4}
                />
                <input
                  type="text"
                  value={artistCreateForm.phonePart3}
                  onChange={(e) => setArtistCreateForm((f) => ({ ...f, phonePart3: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  className="flex-1 px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                  placeholder="5678"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="privacyPolicyAgreed"
                checked={artistCreateForm.privacyPolicyAgreed}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, privacyPolicyAgreed: e.target.checked }))}
                className="rounded border-white/30 bg-[#201a33] text-violet-500"
              />
              <label htmlFor="privacyPolicyAgreed" className="text-[11px] text-white/70">
                개인정보 처리 방침 동의
              </label>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/55 block mb-1">채널 ARN (선택)</label>
              <input
                type="text"
                value={artistCreateForm.channelArn}
                onChange={(e) => setArtistCreateForm((f) => ({ ...f, channelArn: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                placeholder="라이브 연동용"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="primary"
                className="flex-1 py-2.5 text-xs uppercase tracking-widest"
                onClick={handleArtistCreate}
                disabled={artistCreateLoading}
              >
                {artistCreateLoading ? "생성 중..." : "계정 생성"}
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
    </div>
  );
}
