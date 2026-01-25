package org.example.backend.post.entity;

import org.example.backend.global.entity.BaseTimeEntity;
import org.example.backend.post.enums.PostStatus;
import org.example.backend.post.enums.WriterType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "posts")
@SQLDelete(sql = "UPDATE posts SET deleted_at = NOW(), status = 'DELETED' WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
public class Post extends BaseTimeEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1. 게시판 주인 (어떤 아티스트의 커뮤니티인가?)
    @Column(name = "channel_artist_id", nullable = false)
    private Long channelArtistId;

    // 2. 작성자 정보 (User 혹은 Artist)
    @Column(name = "writer_id", nullable = false)
    private Long writerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "writer_type", nullable = false)
    private WriterType writerType; // USER or ARTIST

    // 3. 게시글 정보
    @Column(nullable = false)
    private String title;

    @Lob
    @Column(nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus status;

    @Column(name = "like_count")
    private Long likeCount;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public Post(Long channelArtistId, Long writerId, WriterType writerType, String title, String content) {
        this.channelArtistId = channelArtistId;
        this.writerId = writerId;
        this.writerType = writerType;
        this.title = title;
        this.content = content;
        this.status = PostStatus.PUBLIC;
        this.likeCount = 0L;
    }

    // --- 비즈니스 로직 ---
    // 게시글 수정
    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }

    // 게시글 삭제(soft)
    public void delete() {
        this.status = PostStatus.DELETED; // 상태를 삭제됨으로 변경
        this.deletedAt = LocalDateTime.now(); // 삭제된 시간 기록
    }

}