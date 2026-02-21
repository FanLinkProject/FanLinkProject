package org.example.backend.concert.repository;

import org.example.backend.concert.entity.ConcertArtist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConcertArtistRepository extends JpaRepository<ConcertArtist, Long> {

    /**
     * 여러 공연의 아티스트를 한 번에 조회 (N+1 방지, artist fetch)
     */
    @Query("select ca from ConcertArtist ca join fetch ca.artist where ca.concert.id in :concertIds order by ca.concert.id, ca.id")
    List<ConcertArtist> findByConcertIdIn(@Param("concertIds") List<Long> concertIds);

    /**
     * 공연 ID로 참여 아티스트 목록 조회
     */
    List<ConcertArtist> findByConcertId(Long concertId);

    /**
     * 아티스트 ID로 참여 공연 목록 조회
     */
    List<ConcertArtist> findByArtistId(Long artistId);

    /**
     * 공연과 아티스트로 관계 조회
     */
    Optional<ConcertArtist> findByConcertIdAndArtistId(Long concertId, Long artistId);

    /**
     * 공연에 참여하는 아티스트 존재 여부 확인
     */
    boolean existsByConcertIdAndArtistId(Long concertId, Long artistId);

    /**
     * 공연의 모든 아티스트 관계 삭제
     */
    void deleteByConcertId(Long concertId);

    /**
     * 아티스트의 모든 공연 관계 삭제
     */
    void deleteByArtistId(Long artistId);
}
