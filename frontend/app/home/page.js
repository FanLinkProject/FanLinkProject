"use client";

import Link from "next/link";
import {
  MOCK_ARTISTS,
  MOCK_LIVES,
  MOCK_PRODUCTS,
  MOCK_POSTS,
} from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";

export default function HomePage() {
  const subscribedArtists = MOCK_ARTISTS.filter((a) => a.isSubscribed);
  const subscribedPosts = MOCK_POSTS.filter((p) =>
    subscribedArtists.some((a) => a.id === p.artistId),
  );
  const liveSessions = MOCK_LIVES.filter((l) => l.status === "LIVE");
  const featuredProduct = MOCK_PRODUCTS[0];
  const featuredLive =
    MOCK_LIVES.find((l) => l.status === "LIVE") || MOCK_LIVES[0];
  const featuredLiveArtist = MOCK_ARTISTS.find(
    (a) => a.id === featuredLive.artistId,
  );

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-16 pb-20">
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[400px]">
          <Link
            href="/market"
            className="relative rounded-2xl overflow-hidden group cursor-pointer block border border-white/[0.06] shadow-[0_6px_20px_rgba(0,0,0,0.45),0_0_12px_rgba(140,90,255,0.12)]">
            <img
              src={featuredProduct.image}
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-[1.02] transition-transform duration-500"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0814]/95 via-[#1a0f2e]/50 to-transparent p-10 flex flex-col justify-end">
              <span className="bg-white/10 text-white/90 text-[10px] font-black px-3 py-1 rounded-full w-fit uppercase mb-3">
                NEW MERCH
              </span>
              <h2 className="text-white text-3xl font-black mb-1">
                {featuredProduct.name}
              </h2>
              <p className="text-white/80 text-base mb-6 font-medium">
                {featuredProduct.artistName}의 시그니처 아이템
              </p>
              <span className="inline-flex items-center justify-center bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full px-8 py-3 font-black text-sm w-fit hover:brightness-110 transition-all">
                둘러보기
              </span>
            </div>
          </Link>

          <Link
            href={`/live/${featuredLive.id}`}
            className="relative rounded-2xl overflow-hidden group cursor-pointer block border border-white/[0.06] shadow-[0_6px_20px_rgba(0,0,0,0.45),0_0_12px_rgba(140,90,255,0.12)]">
            <img
              src={featuredLive.thumbnail}
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-[1.02] transition-transform duration-500"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0814]/95 via-[#1a0f2e]/50 to-transparent p-10 flex flex-col justify-end">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-red-500/80 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                  LIVE NOW
                </span>
                <span className="text-white/55 text-[10px] font-black uppercase tracking-widest">
                  {featuredLiveArtist?.name}
                </span>
              </div>
              <h2 className="text-white text-3xl font-black mb-1">
                {featuredLive.title}
              </h2>
              <p className="text-white/80 text-base mb-6 font-medium">
                아티스트와 실시간으로 소통하세요
              </p>
              <span className="inline-flex items-center justify-center bg-red-500 text-white rounded-full px-8 py-3 font-black text-sm w-fit hover:brightness-110 transition-all">
                시청하기
              </span>
            </div>
          </Link>
        </div>
      </section>

      <section>
        <SectionTitle className="mb-6">내 아티스트</SectionTitle>
        <div className="flex gap-8 overflow-x-auto pb-4 -mx-1 px-1">
          {subscribedArtists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="w-44 shrink-0">
              <Surface
                variant="card"
                className="p-6 flex flex-col items-center text-center group h-full">
                <div className="relative mb-4">
                  <img
                    src={artist.avatar}
                    className="size-20 rounded-2xl border border-white/[0.08] group-hover:scale-[1.02] transition-transform"
                    alt=""
                  />
                </div>
                <h3 className="font-medium text-white text-sm truncate w-full">
                  {artist.name}
                </h3>
              </Surface>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <SectionTitle>아티스트 피드</SectionTitle>
          <div className="space-y-8">
            {subscribedPosts.length > 0 ? (
              subscribedPosts.map((post) => (
                <Surface
                  key={post.id}
                  variant="card"
                  className="overflow-hidden p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={post.authorAvatar}
                      className="size-12 rounded-full border border-white/[0.08]"
                      alt=""
                    />
                    <div>
                      <h4 className="font-medium text-white flex items-center gap-1.5 leading-none">
                        {post.authorName}
                        <span className="material-symbols-outlined text-violet-300 text-lg fill-icon">
                          verified
                        </span>
                      </h4>
                      {post.authorMemberName && (
                        <p className="text-[10px] text-white/55 font-bold uppercase tracking-widest mt-1">
                          작성: {post.authorMemberName}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-white/80 text-lg leading-relaxed mb-6 font-normal">
                    {post.content}
                  </p>
                  {post.image && (
                    <div className="rounded-2xl overflow-hidden mb-6">
                      <img
                        src={post.image}
                        className="w-full h-auto object-cover max-h-[500px]"
                        alt=""
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-8 pt-4 border-t border-white/10 text-white/55 text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl">
                        favorite
                      </span>{" "}
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl">
                        chat_bubble
                      </span>{" "}
                      {post.comments}
                    </span>
                  </div>
                </Surface>
              ))
            ) : (
              <Surface variant="primary" className="p-12 text-center">
                <p className="text-white/55 font-medium italic">
                  구독 중인 아티스트의 게시물이 아직 없습니다.
                </p>
              </Surface>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <SectionTitle>라이브</SectionTitle>
          <div className="space-y-5">
            {liveSessions.length > 0 ? (
              liveSessions.map((live) => {
                const artist = MOCK_ARTISTS.find((a) => a.id === live.artistId);
                return (
                  <Link key={live.id} href={`/live/${live.id}`} className="block">
                    <Surface variant="card" className="overflow-hidden group cursor-pointer">
                      <div className="relative aspect-video">
                        <img
                          src={live.thumbnail}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200 ease-out"
                          alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#201a33]/90 to-transparent" />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="bg-red-500/90 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase backdrop-blur-sm">
                            LIVE
                          </span>
                          {live.viewerCount && (
                            <span className="bg-black/40 backdrop-blur-md text-white text-[9px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">visibility</span>
                              {live.viewerCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="text-violet-300 text-[10px] font-black uppercase tracking-widest mb-1">
                          {artist?.name}
                        </p>
                        <h4 className="font-medium text-white truncate">{live.title}</h4>
                      </div>
                    </Surface>
                  </Link>
                );
              })
            ) : (
              <Surface variant="primary" className="p-8 text-center">
                <p className="text-white/55 text-sm">진행 중인 라이브가 없습니다.</p>
              </Surface>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
