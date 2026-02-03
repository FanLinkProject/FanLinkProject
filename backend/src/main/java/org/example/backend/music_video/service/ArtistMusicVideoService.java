package org.example.backend.music_video.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.music_video.dto.CreateMusicVideoRequest;
import org.example.backend.music_video.dto.MusicVideoResponse;
import org.example.backend.music_video.entity.ArtistMusicVideo;
import org.example.backend.music_video.entity.VideoProvider;
import org.example.backend.music_video.exception.MusicVideoErrorCode;
import org.example.backend.music_video.exception.MusicVideoException;
import org.example.backend.music_video.repository.ArtistMusicVideoRepository;
import org.example.backend.music_video.util.YoutubeUrlParser;
import org.example.backend.user.enums.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArtistMusicVideoService {

    private static final String COMMENT_TARGET_TYPE = "MUSIC_VIDEO";

    private final ArtistMusicVideoRepository artistMusicVideoRepository;
    private final YoutubeUrlParser youtubeUrlParser = new YoutubeUrlParser();

    // MV 등록을 처리한다.
    @Transactional
    public MusicVideoResponse create(Long artistId, CreateMusicVideoRequest request) {
        UserContext userContext = resolveUserContext();
        validateArtistPermission(userContext, artistId);

        String videoId = youtubeUrlParser.parseVideoId(request.url());

        if (artistMusicVideoRepository.existsByArtistIdAndVideoId(artistId, videoId)) {
            throw new MusicVideoException(MusicVideoErrorCode.DUPLICATE_MUSIC_VIDEO);
        }

        ArtistMusicVideo musicVideo = new ArtistMusicVideo(
                artistId,
                VideoProvider.YOUTUBE,
                videoId,
                request.title(),
                request.url()
        );

        ArtistMusicVideo saved = artistMusicVideoRepository.save(musicVideo);
        return toResponse(saved);
    }

    // 아티스트 MV 목록을 최신순으로 조회한다.
    public List<MusicVideoResponse> list(Long artistId) {
        return artistMusicVideoRepository.findAllByArtistIdOrderByCreatedAtDesc(artistId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // MV 삭제를 처리한다.
    @Transactional
    public void delete(Long artistId, Long id) {
        UserContext userContext = resolveUserContext();
        validateArtistPermission(userContext, artistId);

        ArtistMusicVideo musicVideo = artistMusicVideoRepository.findByIdAndArtistId(id, artistId)
                .orElseThrow(() -> new MusicVideoException(MusicVideoErrorCode.MUSIC_VIDEO_NOT_FOUND));

        artistMusicVideoRepository.delete(musicVideo);
    }

    // 응답 DTO를 구성한다.
    private MusicVideoResponse toResponse(ArtistMusicVideo entity) {
        String embedUrl = "https://www.youtube.com/embed/" + entity.getVideoId();
        String thumbnailUrl = "https://img.youtube.com/vi/" + entity.getVideoId() + "/hqdefault.jpg";
        return new MusicVideoResponse(
                entity.getId(),
                entity.getArtistId(),
                entity.getProvider(),
                entity.getVideoId(),
                entity.getTitle(),
                embedUrl,
                thumbnailUrl,
                COMMENT_TARGET_TYPE,
                entity.getId(),
                entity.getCreatedAt()
        );
    }

    // ARTIST 본인 또는 ADMIN 권한인지 확인한다.
    private void validateArtistPermission(UserContext userContext, Long artistId) {
        if (userContext == null) {
            throw new MusicVideoException(MusicVideoErrorCode.FORBIDDEN_OPERATION);
        }
        if (userContext.role == UserRole.ADMIN) {
            return;
        }
        if (userContext.role != UserRole.ARTIST || !artistId.equals(userContext.userId)) {
            throw new MusicVideoException(MusicVideoErrorCode.FORBIDDEN_OPERATION);
        }
    }

    // SecurityContext에서 사용자 정보를 최소 형태로 추출한다.
    private UserContext resolveUserContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof PrincipalDetails principalDetails) {
            return new UserContext(principalDetails.getUserId(), principalDetails.getUser().getRole());
        }
        return null;
    }

    private record UserContext(Long userId, UserRole role) {
    }
}
