package org.example.backend.concert.repository;

import org.example.backend.concert.entity.ConcertMediaAsset;
import org.example.backend.concert.entity.ConcertMediaAssetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConcertMediaAssetRepository extends JpaRepository<ConcertMediaAsset, Long> {

    List<ConcertMediaAsset> findAllByConcertIdOrderById(Long concertId);

    List<ConcertMediaAsset> findAllByConcertIdAndTypeOrderById(Long concertId, ConcertMediaAssetType type);

    void deleteAllByConcertId(Long concertId);

    void deleteAllByConcertIdAndType(Long concertId, ConcertMediaAssetType type);
}
