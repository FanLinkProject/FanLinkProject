package org.example.backend.concert.repository;

import org.example.backend.concert.entity.Concert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConcertRepository extends JpaRepository<Concert, Long> {

    /**
     * 특정 시간 이후 시작하는 공연 목록 조회
     */
    List<Concert> findByStartDateTimeAfterOrderByStartDateTimeAsc(Instant startDateTime);

    /**
     * 특정 시간 이전에 종료된 공연 목록 조회
     */
    List<Concert> findByEndDateTimeBeforeOrderByEndDateTimeDesc(Instant endDateTime);

    /**
     * 현재 진행 중인 공연 목록 조회
     */
    List<Concert> findByStartDateTimeBeforeAndEndDateTimeAfterOrderByStartDateTimeAsc(
            Instant now, Instant now2
    );

    @Query("select c from Concert c left join fetch c.location where c.id = :id")
    Optional<Concert> findByIdWithLocation(@Param("id") Long id);

    @Query("select distinct c from Concert c left join fetch c.location")
    List<Concert> findAllWithLocation();

    /** 다가오는 공연만 (endDateTime > now), startDateTime 오름차순 */
    @Query("select c from Concert c left join fetch c.location where c.endDateTime > :now order by c.startDateTime asc")
    List<Concert> findUpcomingConcerts(@Param("now") Instant now);

    /** bounds 내 다가오는 공연, location fetch */
    @Query("select c from Concert c join fetch c.location l where l.latitude between :swLat and :neLat and l.longitude between :swLng and :neLng and c.endDateTime > :now")
    List<Concert> findUpcomingConcertsInBounds(
            @Param("swLat") Double swLat,
            @Param("swLng") Double swLng,
            @Param("neLat") Double neLat,
            @Param("neLng") Double neLng,
            @Param("now") Instant now
    );

    /** 다가오는 공연 중 특정 아티스트(들)가 참여한 공연만 조회 (그룹 소속이면 그룹+멤버 공연, 아니면 본인 공연만) */
    @Query("select distinct c from Concert c left join fetch c.location join c.artists ca where ca.artist.id in :artistIds and c.endDateTime > :now order by c.startDateTime asc")
    List<Concert> findUpcomingConcertsByArtistIdsIn(@Param("artistIds") List<Long> artistIds, @Param("now") Instant now);

    /** 종료된 공연만 (endDateTime <= now), endDateTime 내림차순 */
    @Query("select c from Concert c left join fetch c.location where c.endDateTime <= :now order by c.endDateTime desc")
    List<Concert> findEndedConcerts(@Param("now") Instant now);

    /** 특정 아티스트(들)가 참여한 종료된 공연만 (endDateTime <= now), endDateTime 내림차순 */
    @Query("select distinct c from Concert c left join fetch c.location join c.artists ca where ca.artist.id in :artistIds and c.endDateTime <= :now order by c.endDateTime desc")
    List<Concert> findEndedConcertsByArtistIdsIn(@Param("artistIds") List<Long> artistIds, @Param("now") Instant now);

}
