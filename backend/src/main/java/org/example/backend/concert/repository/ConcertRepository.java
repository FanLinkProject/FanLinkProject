package org.example.backend.concert.repository;

import org.example.backend.concert.entity.Concert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

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
}
