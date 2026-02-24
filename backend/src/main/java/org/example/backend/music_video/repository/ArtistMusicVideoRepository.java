package org.example.backend.music_video.repository;

import org.example.backend.music_video.entity.ArtistMusicVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ArtistMusicVideoRepository extends JpaRepository<ArtistMusicVideo, Long> {

    boolean existsByArtistIdAndVideoId(Long artistId, String videoId);

    List<ArtistMusicVideo> findAllByArtistIdOrderByCreatedAtDesc(Long artistId);

    Optional<ArtistMusicVideo> findByIdAndArtistId(Long id, Long artistId);

    @Query("SELECT m FROM ArtistMusicVideo m WHERE m.artistId = :artistId " +
           "AND (LOWER(m.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(m.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY m.createdAt DESC")
    List<ArtistMusicVideo> searchByArtistIdAndKeyword(@Param("artistId") Long artistId,
                                                      @Param("keyword") String keyword);
}
