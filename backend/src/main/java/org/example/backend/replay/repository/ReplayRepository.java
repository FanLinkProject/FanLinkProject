package org.example.backend.replay.repository;

import org.example.backend.replay.entity.Replay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReplayRepository extends JpaRepository<Replay, Long> {

    // liveSessionId로 Replay 존재 여부를 확인한다.
    boolean existsByLiveSessionId(Long liveSessionId);

    // liveSessionId로 Replay를 조회한다.
    Optional<Replay> findByLiveSessionId(Long liveSessionId);

    // 아티스트별 Replay 목록을 최신순으로 조회한다.
    List<Replay> findAllByArtistIdOrderByCreatedAtDesc(Long artistId);
}
