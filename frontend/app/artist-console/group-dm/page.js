"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MOCK_ARTISTS } from "@/lib/mockData";

const fanReplies = {
  gm1: [
    {
      id: "r1",
      fanName: "별하늘",
      fanAvatar: "https://picsum.photos/seed/fan1/100/100",
      text: "진짜 너무 좋았어요! 최고였음!!",
      timestamp: "오후 10:46",
    },
    {
      id: "r2",
      fanName: "MusicLover",
      fanAvatar: "https://picsum.photos/seed/fan2/100/100",
      text: "노래 너무 감동적이었어요 ㅠㅠ",
      timestamp: "오후 10:47",
    },
  ],
  gm2: [
    {
      id: "r4",
      fanName: "K-PopFan",
      fanAvatar: "https://picsum.photos/seed/fan4/100/100",
      text: "선물 뭔지 너무 궁금해요!!",
      timestamp: "오후 11:11",
    },
  ],
};

export default function ArtistGroupDMPage() {
  const artist = MOCK_ARTISTS[0];
  const [input, setInput] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: "gm1",
      senderId: artist.id,
      text: "팬 여러분, 오늘 라이브 정말 즐거웠어요! 다들 잘 보셨나요? ✨",
      timestamp: "오후 10:45",
      isMe: true,
    },
    {
      id: "gm2",
      senderId: artist.id,
      text: "내일은 깜짝 선물을 준비했으니 기대해주세요! 🎁",
      timestamp: "오후 11:10",
      isMe: true,
    },
  ]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        senderId: artist.id,
        text: input,
        timestamp: "방금 전",
        isMe: true,
      },
    ]);
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0b0814] relative">
      <aside className="w-80 bg-[#16102a] border-r border-white/[0.06] flex flex-col shrink-0 z-20 relative">
        {selectedBundleId ? (
          <div className="flex flex-col h-full">
            <header className="h-16 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBundleId(null)}
                  className="p-1 text-white/60 hover:text-violet-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                </button>
                <h3 className="font-black text-xs text-white uppercase tracking-widest">팬 답장 목록</h3>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {(fanReplies[selectedBundleId] || []).map((reply) => (
                <div
                  key={reply.id}
                  className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-2 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={reply.fanAvatar}
                      className="size-6 rounded-full border border-white/10"
                      alt=""
                    />
                    <span className="text-[11px] font-bold text-white">{reply.fanName}</span>
                    <span className="text-[9px] text-white/50 font-bold ml-auto">
                      {reply.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed font-medium">{reply.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <header className="h-16 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <h3 className="font-black text-xs text-white uppercase tracking-widest">Studio Channels</h3>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              <button
                type="button"
                className="w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left bg-violet-500/15 border border-violet-500/30"
              >
                <div className="size-12 rounded-2xl bg-violet-500/80 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">campaign</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-violet-300 truncate">Group Channel</p>
                  <p className="text-[10px] text-white/55 truncate mt-0.5">전체 팬 대상 메시지</p>
                </div>
              </button>
              {artist.members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left hover:bg-white/[0.04] opacity-70"
                >
                  <img
                    src={member.avatar}
                    className="size-12 rounded-2xl border border-white/10 grayscale-[50%]"
                    alt=""
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-white truncate">{member.name}</p>
                    <p className="text-[10px] text-white/55 truncate mt-0.5">준비 중인 채널입니다</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <section className="flex-1 flex flex-col bg-[#201a33] overflow-hidden">
        <header className="h-16 border-b border-white/[0.06] shrink-0 z-10 px-8 flex items-center justify-between bg-[#16102a]/80">
          <div className="flex items-center gap-4">
            <Link href="/artist-console" className="p-2 text-white/60 hover:text-violet-300 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div className="flex flex-col">
              <h3 className="font-black text-white flex items-center gap-2">
                {artist.name} Group Channel
                <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-[9px] font-black uppercase tracking-widest rounded-md">
                  Broadcast
                </span>
              </h3>
              <p className="text-[10px] text-white/55 font-bold uppercase tracking-widest">메시지는 모든 구독 팬에게 전달됩니다.</p>
            </div>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-[#0b0814]/40"
        >
          <div className="flex justify-center mb-6">
            <span className="px-6 py-2 bg-white/[0.04] border border-white/[0.06] rounded-full text-[10px] font-black text-white/50 uppercase tracking-widest">
              Channel History Started
            </span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="max-w-[70%] flex flex-col items-end">
                  <div className="bg-violet-500/90 text-white p-5 rounded-[2rem] rounded-br-none relative">
                    <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                    <span className="absolute -bottom-5 right-1 text-[9px] font-black text-white/40 uppercase">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              </div>
              {fanReplies[msg.id] && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] flex flex-col items-start">
                    <button
                      type="button"
                      onClick={() => setSelectedBundleId(msg.id)}
                      className={`p-4 rounded-[2rem] rounded-bl-none border transition-all text-left group flex items-center gap-3 ${
                        selectedBundleId === msg.id
                          ? "bg-violet-500/15 border-violet-500/40"
                          : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div
                        className={`size-8 rounded-full flex items-center justify-center transition-colors ${
                          selectedBundleId === msg.id
                            ? "bg-violet-500/30 text-violet-300"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">forum</span>
                      </div>
                      <div>
                        <p
                          className={`text-xs font-bold ${selectedBundleId === msg.id ? "text-violet-300" : "text-white"}`}
                        >
                          팬들의 답장을 확인해보세요
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <footer className="border-t border-white/[0.06] shrink-0 p-6 bg-[#16102a]/80">
          <div className="max-w-4xl mx-auto flex items-center gap-4 bg-[#201a33] p-2 rounded-[2rem] border border-white/[0.08]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="전체 팬에게 보낼 메시지를 입력하세요..."
              className="flex-1 bg-transparent border-none px-6 py-3 text-sm text-white focus:ring-0 placeholder:text-white/40 font-medium"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              className="size-12 bg-violet-500/90 text-white rounded-full flex items-center justify-center hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined fill-icon">send</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
