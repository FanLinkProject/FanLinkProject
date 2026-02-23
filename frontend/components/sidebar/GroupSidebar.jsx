"use client";

/** Group 계정 사이드바: 아티스트와 동일 메뉴, DM 제외 */
import ArtistSidebar from "./ArtistSidebar";

export default function GroupSidebar() {
  return <ArtistSidebar hideDm />;
}
