package org.example.backend.concert.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.concert.dto.request.ConcertCreateRequest;
import org.example.backend.concert.dto.request.ConcertUpdateRequest;
import org.example.backend.concert.dto.response.ConcertListItemResponse;
import org.example.backend.concert.dto.response.ConcertMediaAssetResponse;
import org.example.backend.concert.dto.response.ConcertResponse;
import org.example.backend.concert.entity.Concert;
import org.example.backend.concert.entity.ConcertArtist;
import org.example.backend.concert.entity.ConcertMediaAsset;
import org.example.backend.concert.entity.ConcertMediaAssetType;
import org.example.backend.concert.entity.Location;
import org.example.backend.concert.exception.ConcertErrorCode;
import org.example.backend.concert.exception.ConcertException;
import org.example.backend.concert.repository.ConcertArtistRepository;
import org.example.backend.concert.repository.ConcertMediaAssetRepository;
import org.example.backend.concert.repository.ConcertRepository;
import org.example.backend.concert.repository.LocationRepository;
import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetStatus;
import org.example.backend.media_asset.repository.MediaAssetRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ConcertService {

    private final ConcertRepository concertRepository;
    private final LocationRepository locationRepository;
    private final ConcertArtistRepository concertArtistRepository;
    private final ConcertMediaAssetRepository concertMediaAssetRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final UserRepository userRepository;
    private final AwsProperties awsProperties;

    /**
     * 공연 생성
     */
    public ConcertResponse createConcert(Long creatorId, ConcertCreateRequest request) {
        // 아티스트 권한 확인
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ConcertException(ConcertErrorCode.NOT_ARTIST_USER));
        if (creator.getRole() != UserRole.ARTIST) {
            throw new ConcertException(ConcertErrorCode.NOT_ARTIST_USER);
        }

        // 날짜 검증
        validateDateRange(request.getStartDateTime(), request.getEndDateTime());
        validateSalePeriod(request);

        // 위치 조회
        Location location = null;
        if (request.getLocationId() != null) {
            location = locationRepository.findById(request.getLocationId())
                    .orElseThrow(() -> new ConcertException(ConcertErrorCode.LOCATION_NOT_FOUND));
        }

        // 공연 생성
        Concert concert = Concert.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .startDateTime(request.getStartDateTime())
                .endDateTime(request.getEndDateTime())
                .timezone(request.getTimezone())
                .venueName(request.getVenueName())
                .location(location)
                .presaleTicketCount(request.getPresaleTicketCount() != null ? request.getPresaleTicketCount() : 0)
                .saleTicketCount(request.getSaleTicketCount() != null ? request.getSaleTicketCount() : 0)
                .presaleStartDateTime(request.getPresaleStartDateTime())
                .presaleEndDateTime(request.getPresaleEndDateTime())
                .saleStartDateTime(request.getSaleStartDateTime())
                .saleEndDateTime(request.getSaleEndDateTime())
                .build();

        Concert savedConcert = concertRepository.save(concert);

        if (request.getPosterMediaAssetId() != null && request.getPosterMediaAssetId() > 0) {
            MediaAsset posterAsset = validatePosterMediaAsset(request.getPosterMediaAssetId(), creatorId);
            ConcertMediaAsset cma = new ConcertMediaAsset(savedConcert, ConcertMediaAssetType.POSTER, posterAsset);
            savedConcert.addMediaAsset(cma);
            concertMediaAssetRepository.save(cma);
        }

        // 아티스트 추가 (artistIds가 없으면 생성자 본인을 추가)
        List<Long> artistIds = request.getArtistIds();
        if (artistIds == null || artistIds.isEmpty()) {
            artistIds = List.of(creatorId);
        }
        addArtistsToConcert(savedConcert, artistIds);

        return buildConcertResponse(savedConcert);
    }

    /**
     * 공연 조회 (단일) - location fetch join으로 N+1 방지
     */
    @Transactional(readOnly = true)
    public ConcertResponse getConcert(Long concertId) {
        Concert concert = concertRepository.findByIdWithLocation(concertId)
                .orElseThrow(() -> new ConcertException(ConcertErrorCode.CONCERT_NOT_FOUND));
        return buildConcertResponse(concert);
    }

    /**
     * 공연 목록 조회 - 다가오는 공연만, startDateTime 오름차순, 2쿼리 전략(N+1 방지)
     */
    @Transactional(readOnly = true)
    public List<ConcertListItemResponse> getAllConcerts() {
        Instant now = Instant.now();
        List<Concert> concerts = concertRepository.findUpcomingConcerts(now);
        return buildConcertListItems(concerts);
    }

    /**
     * 지도 bounds 내 공연 목록 조회 - 다가오는 공연만, 목록 DTO 동일
     */
    @Transactional(readOnly = true)
    public List<ConcertListItemResponse> getConcertsInBounds(Double swLat, Double swLng, Double neLat, Double neLng) {
        if (swLat == null || swLng == null || neLat == null || neLng == null) {
            return Collections.emptyList();
        }
        Instant now = Instant.now();
        List<Concert> concerts = concertRepository.findUpcomingConcertsInBounds(swLat, swLng, neLat, neLng, now);
        return buildConcertListItems(concerts);
    }

    /**
     * 2쿼리 전략: Concert 목록 기준으로 artistNames, posterUrl 한 번에 조회 후 DTO 생성
     */
    private List<ConcertListItemResponse> buildConcertListItems(List<Concert> concerts) {
        if (CollectionUtils.isEmpty(concerts)) {
            return Collections.emptyList();
        }
        List<Long> concertIds = concerts.stream().map(Concert::getId).collect(Collectors.toList());

        List<ConcertArtist> artists = concertArtistRepository.findByConcertIdIn(concertIds);
        Map<Long, List<String>> artistNamesMap = artists.stream()
                .collect(Collectors.groupingBy(
                        ca -> ca.getConcert().getId(),
                        LinkedHashMap::new,
                        Collectors.mapping(
                                ca -> ca.getArtist().getNickname() != null && !ca.getArtist().getNickname().isBlank()
                                        ? ca.getArtist().getNickname()
                                        : ca.getArtist().getName(),
                                Collectors.toList()
                        )
                ));

        List<ConcertMediaAsset> posters = concertMediaAssetRepository.findByConcertIdInAndType(concertIds, ConcertMediaAssetType.POSTER);
        String cdnBaseUrl = getCdnBaseUrl();
        String base = cdnBaseUrl != null && !cdnBaseUrl.isBlank() ? (cdnBaseUrl.endsWith("/") ? cdnBaseUrl : cdnBaseUrl + "/") : "";
        Map<Long, String> posterUrlMap = posters.stream()
                .collect(Collectors.toMap(
                        cma -> cma.getConcert().getId(),
                        cma -> base + cma.getMediaAsset().getObjectKey(),
                        (a, b) -> a
                ));

        List<ConcertListItemResponse> result = new ArrayList<>(concerts.size());
        for (Concert c : concerts) {
            List<String> names = artistNamesMap.getOrDefault(c.getId(), Collections.emptyList());
            String imageUrl = posterUrlMap.get(c.getId());
            result.add(ConcertListItemResponse.of(c, imageUrl, names));
        }
        return result;
    }

    /**
     * 공연 수정
     */
    public ConcertResponse updateConcert(Long concertId, Long userId, ConcertUpdateRequest request) {
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new ConcertException(ConcertErrorCode.CONCERT_NOT_FOUND));

        // 공연 시작 여부 확인
        Instant now = Instant.now();
        if (concert.isStarted(now)) {
            throw new ConcertException(ConcertErrorCode.CANNOT_MODIFY_STARTED_CONCERT);
        }

        // 날짜 검증
        validateDateRange(request.getStartDateTime(), request.getEndDateTime());
        validateSalePeriod(request);

        // 위치 업데이트
        if (request.getLocationId() != null) {
            Location location = locationRepository.findById(request.getLocationId())
                    .orElseThrow(() -> new ConcertException(ConcertErrorCode.LOCATION_NOT_FOUND));
            concert.updateLocation(location);
        }

        // 공연 정보 업데이트
        concert.updateInfo(
                request.getTitle(),
                request.getDescription(),
                request.getStartDateTime(),
                request.getEndDateTime(),
                request.getTimezone(),
                request.getVenueName()
        );

        if (request.getPosterMediaAssetId() != null && request.getPosterMediaAssetId() > 0) {
            concertMediaAssetRepository.deleteAllByConcertIdAndType(concert.getId(), ConcertMediaAssetType.POSTER);
            MediaAsset posterAsset = validatePosterMediaAsset(request.getPosterMediaAssetId(), userId);
            ConcertMediaAsset cma = new ConcertMediaAsset(concert, ConcertMediaAssetType.POSTER, posterAsset);
            concert.addMediaAsset(cma);
            concertMediaAssetRepository.save(cma);
        }

        // 티켓 정보 업데이트
        concert.updateTicketInfo(
                request.getPresaleTicketCount() != null ? request.getPresaleTicketCount() : concert.getPresaleTicketCount(),
                request.getSaleTicketCount() != null ? request.getSaleTicketCount() : concert.getSaleTicketCount(),
                request.getPresaleStartDateTime(),
                request.getPresaleEndDateTime(),
                request.getSaleStartDateTime(),
                request.getSaleEndDateTime()
        );

        // 아티스트 업데이트
        if (request.getArtistIds() != null) {
            updateArtists(concert, request.getArtistIds());
        }

        return buildConcertResponse(concert);
    }

    private String getCdnBaseUrl() {
        if (awsProperties.getCloudfront() == null) {
            return null;
        }
        String domain = awsProperties.getCloudfront().getDomain();
        if (domain == null || domain.isBlank()) {
            return null;
        }
        return domain.startsWith("http") ? domain : "https://" + domain;
    }

    private MediaAsset validatePosterMediaAsset(Long mediaAssetId, Long ownerUserId) {
        MediaAsset asset = mediaAssetRepository.findById(mediaAssetId)
                .orElseThrow(() -> new ConcertException(ConcertErrorCode.MEDIA_ASSET_NOT_FOUND));
        if (!asset.getOwnerUserId().equals(ownerUserId)) {
            throw new ConcertException(ConcertErrorCode.NOT_ARTIST_USER);
        }
        if (asset.getStatus() != MediaAssetStatus.READY) {
            throw new ConcertException(ConcertErrorCode.MEDIA_ASSET_NOT_READY);
        }
        return asset;
    }

    private ConcertResponse buildConcertResponse(Concert concert) {
        List<ConcertMediaAsset> mediaAssetList = concertMediaAssetRepository.findAllByConcertIdOrderById(concert.getId());
        String cdnBaseUrl = getCdnBaseUrl();
        String posterImageUrl = null;
        List<ConcertMediaAssetResponse> mediaAssetResponses = Collections.emptyList();
        if (!CollectionUtils.isEmpty(mediaAssetList)) {
            mediaAssetResponses = mediaAssetList.stream()
                    .map(cma -> ConcertMediaAssetResponse.from(cma.getMediaAsset(), cma.getType(), cdnBaseUrl))
                    .collect(Collectors.toList());
            posterImageUrl = mediaAssetList.stream()
                    .filter(cma -> cma.getType() == ConcertMediaAssetType.POSTER)
                    .findFirst()
                    .map(cma -> {
                        String base = cdnBaseUrl != null && !cdnBaseUrl.isBlank()
                                ? (cdnBaseUrl.endsWith("/") ? cdnBaseUrl : cdnBaseUrl + "/")
                                : "";
                        return base + cma.getMediaAsset().getObjectKey();
                    })
                    .orElse(null);
        }
        return ConcertResponse.from(concert, posterImageUrl, mediaAssetResponses);
    }

    /**
     * 공연 삭제
     */
    public void deleteConcert(Long concertId) {
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new ConcertException(ConcertErrorCode.CONCERT_NOT_FOUND));

        // 공연 시작 여부 확인
        Instant now = Instant.now();
        if (concert.isStarted(now)) {
            throw new ConcertException(ConcertErrorCode.CANNOT_DELETE_STARTED_CONCERT);
        }

        concertRepository.delete(concert);
    }

    /**
     * 공연에 아티스트 추가
     */
    private void addArtistsToConcert(Concert concert, List<Long> artistIds) {
        for (Long artistId : artistIds) {
            User artist = userRepository.findById(artistId)
                    .orElseThrow(() -> new ConcertException(ConcertErrorCode.NOT_ARTIST_USER));

            // 중복 확인
            if (concertArtistRepository.existsByConcertIdAndArtistId(concert.getId(), artistId)) {
                continue;
            }

            ConcertArtist concertArtist = ConcertArtist.builder()
                    .concert(concert)
                    .artist(artist)
                    .build();

            concert.addArtist(concertArtist);
            concertArtistRepository.save(concertArtist);
        }
    }

    /**
     * 공연의 아티스트 목록 업데이트
     */
    private void updateArtists(Concert concert, List<Long> artistIds) {
        if (artistIds.isEmpty()) {
            throw new ConcertException(ConcertErrorCode.EMPTY_ARTIST_LIST);
        }

        // 기존 아티스트 관계 삭제
        List<ConcertArtist> existingArtists = concertArtistRepository.findByConcertId(concert.getId());
        for (ConcertArtist existing : existingArtists) {
            concert.removeArtist(existing);
            concertArtistRepository.delete(existing);
        }

        // 새로운 아티스트 추가
        addArtistsToConcert(concert, artistIds);
    }

    /**
     * 날짜 범위 검증
     */
    private void validateDateRange(Instant startDateTime, Instant endDateTime) {
        if (startDateTime.isAfter(endDateTime) || startDateTime.equals(endDateTime)) {
            throw new ConcertException(ConcertErrorCode.INVALID_DATE_RANGE);
        }
    }

    /**
     * 예매 기간 검증
     */
    private void validateSalePeriod(ConcertCreateRequest request) {
        Instant startDateTime = request.getStartDateTime();
        Instant endDateTime = request.getEndDateTime();
        Instant presaleStart = request.getPresaleStartDateTime();
        Instant presaleEnd = request.getPresaleEndDateTime();
        Instant saleStart = request.getSaleStartDateTime();
        Instant saleEnd = request.getSaleEndDateTime();

        // 선예매 기간 검증
        if (presaleStart.isAfter(presaleEnd) || presaleStart.equals(presaleEnd)) {
            throw new ConcertException(ConcertErrorCode.INVALID_SALE_PERIOD);
        }

        // 일반 예매 기간 검증
        if (saleStart.isAfter(saleEnd) || saleStart.equals(saleEnd)) {
            throw new ConcertException(ConcertErrorCode.INVALID_SALE_PERIOD);
        }

        // 선예매 종료 후 일반 예매 시작 확인
        if (presaleEnd.isAfter(saleStart)) {
            throw new ConcertException(ConcertErrorCode.INVALID_SALE_PERIOD);
        }

        // 예매 종료는 공연 시작 전이어야 함
        if (saleEnd.isAfter(startDateTime)) {
            throw new ConcertException(ConcertErrorCode.INVALID_SALE_PERIOD);
        }
    }

    /**
     * 예매 기간 검증 (Update용)
     */
    private void validateSalePeriod(ConcertUpdateRequest request) {
        Instant startDateTime = request.getStartDateTime();
        Instant endDateTime = request.getEndDateTime();
        Instant presaleStart = request.getPresaleStartDateTime();
        Instant presaleEnd = request.getPresaleEndDateTime();
        Instant saleStart = request.getSaleStartDateTime();
        Instant saleEnd = request.getSaleEndDateTime();

        // 선예매 기간 검증
        if (presaleStart.isAfter(presaleEnd) || presaleStart.equals(presaleEnd)) {
            throw new ConcertException(ConcertErrorCode.INVALID_SALE_PERIOD);
        }

        // 일반 예매 기간 검증
        if (saleStart.isAfter(saleEnd) || saleStart.equals(saleEnd)) {
            throw new ConcertException(ConcertErrorCode.INVALID_SALE_PERIOD);
        }

        // 선예매 종료 후 일반 예매 시작 확인
        if (presaleEnd.isAfter(saleStart)) {
            throw new ConcertException(ConcertErrorCode.INVALID_SALE_PERIOD);
        }

        // 예매 종료는 공연 시작 전이어야 함
        if (saleEnd.isAfter(startDateTime)) {
            throw new ConcertException(ConcertErrorCode.INVALID_SALE_PERIOD);
        }
    }
}
