package org.example.backend.music_video.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.global.util.SecurityContextUtil;
import org.example.backend.music_video.dto.CreateMusicVideoRequest;
import org.example.backend.music_video.dto.MusicVideoResponse;
import org.example.backend.music_video.entity.ArtistMusicVideo;
import org.example.backend.music_video.entity.VideoProvider;
import org.example.backend.music_video.exception.MusicVideoErrorCode;
import org.example.backend.music_video.exception.MusicVideoException;
import org.example.backend.music_video.repository.ArtistMusicVideoRepository;
import org.example.backend.music_video.util.YoutubeUrlParser;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.service.ArtistPermissionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArtistMusicVideoService {

    private static final String COMMENT_TARGET_TYPE = "MEDIA";

    private final ArtistMusicVideoRepository artistMusicVideoRepository;
    private final YoutubeUrlParser youtubeUrlParser;
    private final UserRepository userRepository;
    private final SecurityContextUtil securityContextUtil;
    private final ArtistPermissionService artistPermissionService;

    // MV 등록을 처리한다.
    @Transactional
    public MusicVideoResponse create(Long artistId, CreateMusicVideoRequest request) {
        UserContext userContext = resolveUserContext();
        validateArtistPermission(userContext, artistId);
        validateArtistExists(artistId);

        String videoId = youtubeUrlParser.parseVideoId(request.url());

        if (artistMusicVideoRepository.existsByArtistIdAndVideoId(artistId, videoId)) {
            throw new MusicVideoException(MusicVideoErrorCode.DUPLICATE_MUSIC_VIDEO);
        }
        ArtistMusicVideo musicVideo = new ArtistMusicVideo(
                artistId,
                VideoProvider.YOUTUBE,
                videoId,
                request.title(),
                request.description(),
                request.url()
        );

        ArtistMusicVideo saved = artistMusicVideoRepository.save(musicVideo);
        return toResponse(saved);
    }

    // 아티스트 MV 목록을 최신순으로 조회한다. keyword가 주어지면 제목/설명 검색.
    public List<MusicVideoResponse> list(Long artistId, String keyword) {
        validateArtistExists(artistId);
        List<ArtistMusicVideo> videos = (keyword != null && !keyword.isBlank())
                ? artistMusicVideoRepository.searchByArtistIdAndKeyword(artistId, keyword.trim())
                : artistMusicVideoRepository.findAllByArtistIdOrderByCreatedAtDesc(artistId);
        return videos.stream().map(this::toResponse).toList();
    }

    // MV 상세 조회를 처리한다.
    public MusicVideoResponse getDetail(Long artistId, Long id) {
        ArtistMusicVideo musicVideo = getMusicVideo(artistId, id);
        return toResponse(musicVideo);
    }

    // MV 삭제를 처리한다.
    @Transactional
    public void delete(Long artistId, Long id) {
        UserContext userContext = resolveUserContext();
        validateArtistPermission(userContext, artistId);
        ArtistMusicVideo musicVideo = getMusicVideo(artistId, id);

        artistMusicVideoRepository.delete(musicVideo);
    }

    // 아티스트 존재 여부를 확인한다.
    private void validateArtistExists(Long artistId) {
        User artist = userRepository.findById(artistId)
                .orElseThrow(() -> new MusicVideoException(MusicVideoErrorCode.ARTIST_NOT_FOUND));
        if (artist.getRole() != UserRole.ARTIST && artist.getRole() != UserRole.GROUP) {
            throw new MusicVideoException(MusicVideoErrorCode.ARTIST_NOT_FOUND);
        }
    }

    // MV 단건을 조회하며 artistId 유효성을 함께 검증한다.
    private ArtistMusicVideo getMusicVideo(Long artistId, Long id) {
        validateArtistExists(artistId);
        return artistMusicVideoRepository.findByIdAndArtistId(id, artistId)
                .orElseThrow(() -> new MusicVideoException(MusicVideoErrorCode.MUSIC_VIDEO_NOT_FOUND));
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
                entity.getDescription(),
                embedUrl,
                thumbnailUrl,
                COMMENT_TARGET_TYPE,
                entity.getId(),
                entity.getCreatedAt()
        );
    }

    // 솔로=본인만, 그룹=그룹계정+소속멤버. ADMIN은 통과.
    private void validateArtistPermission(UserContext userContext, Long artistId) {
        if (userContext == null) {
            throw new MusicVideoException(MusicVideoErrorCode.FORBIDDEN_OPERATION);
        }
        if (userContext.role == UserRole.ADMIN) {
            return;
        }
        if (!artistPermissionService.canManagePage(artistId, userContext.userId, userContext.role, true)) {
            throw new MusicVideoException(MusicVideoErrorCode.FORBIDDEN_OPERATION);
        }
    }

    // SecurityContext에서 사용자 정보를 최소 형태로 추출한다.
    private UserContext resolveUserContext() {
        PrincipalDetails principalDetails = securityContextUtil.getPrincipalDetails();
        if (principalDetails != null) {
            return new UserContext(principalDetails.getUserId(), principalDetails.getUser().getRole());
        }
        return null;
    }

    private record UserContext(Long userId, UserRole role) {
    }
}
