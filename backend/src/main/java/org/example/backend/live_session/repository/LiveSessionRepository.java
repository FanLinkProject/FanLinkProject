package org.example.backend.live_session.repository;

import org.example.backend.live_session.entity.LiveSession;
import org.example.backend.live_session.enums.LiveSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/**
 * roomId = liveSessionId = LiveSession.id (PK) 계약.
 */
public interface LiveSessionRepository extends JpaRepository<LiveSession, Long> {

	/**
	 * 목록 조회: artistId 일치, status in (RECORDED, READY), expiresAt 미만료, 최신순.
	 */
	@Query("SELECT s FROM LiveSession s WHERE s.artistId = :artistId AND s.status IN :statuses " +
		"AND (s.expiresAt IS NULL OR s.expiresAt > :now) ORDER BY s.createdAt DESC")
	List<LiveSession> findByArtistIdAndStatusInAndNotExpired(
		@Param("artistId") Long artistId,
		@Param("statuses") List<LiveSessionStatus> statuses,
		@Param("now") OffsetDateTime now);
}
