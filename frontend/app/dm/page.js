"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Surface from "@/components/ui/Surface";

const MOCK_ARTIST = {
  id: "luna-ray",
  name: "루나 레이",
  members: [
    {
      id: "luna",
      name: "루나",
      avatar: "https://picsum.photos/seed/luna-member/100/100",
      lastMessage: "팬 여러분, 오늘도 행복한 하루 되세요!",
      lastMessageTime: "오후 10:45",
    },
    {
      id: "ray",
      name: "레이",
      avatar: "https://picsum.photos/seed/ray-member/100/100",
      lastMessage: "연습 끝나고 한 컷!",
      lastMessageTime: "어제",
    },
  ],
};

export default function DMPage() {
  const [selectedMember, setSelectedMember] = useState(
    MOCK_ARTIST.members[0]
  );
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    setMessages([
      {
        id: "m1",
        senderId: selectedMember.id,
        text: `안녕하세요! ${selectedMember.name}입니다. 응원해주셔서 감사해요!`,
        timestamp: "오후 10:45",
        isMe: false,
      },
      {
        id: "m2",
        senderId: "me",
        text: `${selectedMember.name}님! 항상 응원하고 있어요.`,
        timestamp: "오후 10:48",
        isMe: true,
      },
    ]);
  }, [selectedMember]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      senderId: "me",
      text: input,
      timestamp: "방금 전",
      isMe: true,
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <aside className="w-80 shrink-0 flex flex-col border-r border-white/[0.06]">
        <Surface variant="secondary" className="rounded-none border-0 border-r-0 shadow-none flex-1 flex flex-col">
          <header className="h-16 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0">
            <h3 className="font-black text-sm text-white/90 uppercase tracking-widest">
              {MOCK_ARTIST.name} Members
            </h3>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {MOCK_ARTIST.members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedMember(member)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left ${
                  selectedMember.id === member.id
                    ? "bg-white/[0.08] border border-violet-500/30"
                    : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <img
                  src={member.avatar}
                  className="size-12 rounded-2xl border border-white/[0.08]"
                  alt=""
                />
                <div className="min-w-0">
                  <p
                    className={`font-bold text-sm truncate ${
                      selectedMember.id === member.id
                        ? "text-violet-300"
                        : "text-white"
                    }`}
                  >
                    {member.name}
                  </p>
                  <p className="text-[10px] text-white/55 truncate mt-0.5">
                    {member.lastMessage || "대화를 시작해보세요"}
                  </p>
                </div>
                {member.lastMessageTime && (
                  <span className="ml-auto text-[8px] font-bold text-white/45 whitespace-nowrap">
                    {member.lastMessageTime}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Surface>
      </aside>

      <section className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/[0.06] shrink-0 bg-[#16102a]/80 backdrop-blur-sm z-10">
          <div className="max-w-4xl mx-auto h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/home"
                className="p-1 mr-2 text-white/55 hover:text-white transition-colors lg:hidden"
                aria-label="뒤로"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <div className="relative">
                <img
                  src={selectedMember.avatar}
                  className="size-10 rounded-full border border-white/[0.08]"
                  alt=""
                />
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-[#16102a] rounded-full" />
              </div>
              <div>
                <h3 className="font-bold text-white leading-none">
                  {selectedMember.name}
                </h3>
                <p className="text-[10px] text-white/55 font-bold uppercase tracking-widest mt-1.5">
                  {MOCK_ARTIST.name} Official Member
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex justify-center mb-10">
              <span className="px-4 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full text-[10px] font-black text-white/55 uppercase tracking-widest">
                DM Session Started
              </span>
            </div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.isMe ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[75%] ${
                    msg.isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {!msg.isMe && (
                    <img
                      src={selectedMember.avatar}
                      className="size-8 rounded-full mt-auto mb-1 shrink-0 border border-white/[0.08]"
                      alt=""
                    />
                  )}
                  <div
                    className={`flex flex-col ${
                      msg.isMe ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`p-4 rounded-2xl ${
                        msg.isMe
                          ? "bg-violet-600/90 text-white rounded-br-none"
                          : "bg-[#201a33] text-white/90 rounded-bl-none border border-white/[0.06]"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      {msg.image && (
                        <img
                          src={msg.image}
                          className="mt-3 rounded-xl border border-white/[0.08] max-w-full h-auto"
                          alt=""
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-white/55 font-bold uppercase mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="border-t border-white/[0.06] shrink-0 bg-[#16102a]/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto p-6 flex items-center gap-3">
            <button
              type="button"
              className="size-12 rounded-2xl bg-white/[0.06] text-white/55 hover:bg-white/[0.1] transition-all flex items-center justify-center border border-white/[0.06]"
              aria-label="첨부"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`${selectedMember.name}님에게 메시지 보내기...`}
              className="flex-1 bg-[#201a33] border border-white/[0.06] rounded-2xl px-6 py-3.5 text-sm focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all outline-none font-medium text-white"
            />
            <button
              type="button"
              onClick={sendMessage}
              className="size-12 bg-[#6d28d9] text-white rounded-2xl flex items-center justify-center hover:brightness-110 hover:shadow-[0_0_12px_rgba(140,90,255,0.25)] active:brightness-95 transition-all duration-200"
              aria-label="보내기"
            >
              <span className="material-symbols-outlined fill-icon">send</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
