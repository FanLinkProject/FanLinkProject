package org.example.backend.user.repository;

import org.example.backend.user.entity.Block;
import org.example.backend.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BlockRepository extends JpaRepository<Block, Long> {
    
    /**
     * 차단 관계 존재 여부 확인
     * 
     * @param blocker 차단한 유저
     * @param blocked 차단당한 유저
     * @return 차단 관계 존재 여부
     */
    boolean existsByBlockerAndBlocked(User blocker, User blocked);
    
    /**
     * 차단 관계 조회
     * 
     * @param blocker 차단한 유저
     * @param blocked 차단당한 유저
     * @return 차단 관계
     */
    Optional<Block> findByBlockerAndBlocked(User blocker, User blocked);
    
    /**
     * 차단한 유저 목록 조회 (내가 차단한 사람들)
     * 
     * @param blocker 차단한 유저
     * @param pageable 페이징 정보
     * @return 차단한 유저 목록
     */
    Page<Block> findByBlocker(User blocker, Pageable pageable);
}
