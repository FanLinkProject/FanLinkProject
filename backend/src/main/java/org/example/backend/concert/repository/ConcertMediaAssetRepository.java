package org.example.backend.concert.repository;

import org.example.backend.concert.entity.ConcertMediaAsset;
import org.example.backend.concert.entity.ConcertMediaAssetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ConcertMediaAssetRepository extends JpaRepository<ConcertMediaAsset, Long> {

    /** 여러 공연의 포스터 한 번에 조회 (N+1 방지, mediaAsset fetch) */
    @Query("select cma from ConcertMediaAsset cma join fetch cma.mediaAsset where cma.concert.id in :concertIds and cma.type = :type")
    List<ConcertMediaAsset> findByConcertIdInAndType(@Param("concertIds") List<Long> concertIds, @Param("type") ConcertMediaAssetType type);

    List<ConcertMediaAsset> findAllByConcertIdOrderById(Long concertId);

    List<ConcertMediaAsset> findAllByConcertIdAndTypeOrderById(Long concertId, ConcertMediaAssetType type);

    void deleteAllByConcertId(Long concertId);

    void deleteAllByConcertIdAndType(Long concertId, ConcertMediaAssetType type);
}
