package org.example.backend.concert.repository;

import org.example.backend.concert.entity.ConcertArtist;
import org.example.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConcertArtistRepository extends JpaRepository<ConcertArtist, Long> {

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
