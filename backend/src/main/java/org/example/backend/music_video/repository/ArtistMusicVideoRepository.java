package org.example.backend.music_video.repository;

import org.example.backend.music_video.entity.ArtistMusicVideo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ArtistMusicVideoRepository extends JpaRepository<ArtistMusicVideo, Long> {

    // 동일 아티스트의 동일 videoId 중복 여부를 확인한다.
    boolean existsByArtistIdAndVideoId(Long artistId, String videoId);

    // 아티스트별 MV 목록을 최신순으로 조회한다.
    List<ArtistMusicVideo> findAllByArtistIdOrderByCreatedAtDesc(Long artistId);

    // 아티스트 소유 MV 단건을 조회한다.
    Optional<ArtistMusicVideo> findByIdAndArtistId(Long id, Long artistId);
}
