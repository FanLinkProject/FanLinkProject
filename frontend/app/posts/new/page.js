"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { MOCK_ARTISTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const BASE_URL = "http://localhost:8080";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

export default function NewPostPage() {
  const router = useRouter();
  const artist = MOCK_ARTISTS[0];
  const [artistId, setArtistId] = useState(null);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    router.push(artistId ? "/posts" : "/home");
  };

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios.get(`${BASE_URL}/api/artist/mypage`, { headers })
      .then((res) => { const id = res.data?.profile?.id; if (id != null) setArtistId(id); })
      .catch(() => setArtistId(null));
  }, []);

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Button variant="ghost" href="/posts" className="size-10 rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div>
          <SectionTitle className="text-2xl font-bold">새 글 작성</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">아티스트 소식을 팬들과 공유하세요.</p>
        </div>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Surface variant="primary" className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <img src={artist.avatar} className="size-12 rounded-full border border-white/[0.08]" alt="" />
            <div>
              <p className="font-bold text-white">{artist.name}</p>
              <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">Official Artist</p>
            </div>
          </div>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">내용</span>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="팬들에게 전할 말을 적어주세요." className="w-full min-h-[200px] bg-[#16102a] border border-white/[0.08] rounded-2xl p-4 text-white placeholder:text-white/40 font-medium outline-none focus:ring-2 focus:ring-violet-500/20 resize-y" required />
          </label>
          <div className="mt-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">사진 첨부</span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {!imagePreview ? (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                <span className="text-sm font-bold">클릭하여 사진 추가</span>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
                <img src={imagePreview} alt="미리보기" className="w-full max-h-80 object-contain bg-black/20" />
                <button type="button" onClick={removeImage} className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            )}
          </div>
        </Surface>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" href="/posts">취소</Button>
          <Button type="submit" variant="primary" className="px-8 py-3">게시하기</Button>
        </div>
      </form>
    </div>
  );
}
