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
import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetStatus;
import org.example.backend.media_asset.repository.MediaAssetRepository;
import org.example.backend.media_asset.service.CdnUrlResolver;
import org.example.backend.product.dto.request.ProductRequestDto;
import org.example.backend.product.entity.Product;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.product.enums.ProductType;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.product.service.ProductService;
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
    private final ProductService productService;
    private final ProductRepository productRepository;
    private final CdnUrlResolver cdnUrlResolver;

    /**
     * 공연 생성
     */
    public ConcertResponse createConcert(Long creatorId, ConcertCreateRequest request) {
        // 아티스트/그룹 권한 확인
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ConcertException(ConcertErrorCode.NOT_ARTIST_USER));
        if (creator.getRole() != UserRole.ARTIST && creator.getRole() != UserRole.GROUP) {
            throw new ConcertException(ConcertErrorCode.NOT_ARTIST_USER);
        }

        // 날짜 검증
        validateDateRange(request.getStartDateTime(), request.getEndDateTime());
        validateSalePeriod(request);

        // 선예매 입력 시 해당 아티스트(또는 그룹)의 멤버십 상품 필요
        int presaleCount = request.getPresaleTicketCount() != null ? request.getPresaleTicketCount() : 0;
        if (presaleCount > 0 && !productRepository.existsByArtistIdAndIsMembershipTrue(creatorId)) {
            throw new ConcertException(ConcertErrorCode.NO_MEMBERSHIP_PRODUCT);
        }

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

        // 아티스트 추가: 개인 아티스트는 미선택 시 본인 자동 추가, 그룹 계정은 참여 아티스트 필수
        List<Long> artistIds = request.getArtistIds();
        if (artistIds == null || artistIds.isEmpty()) {
            if (creator.getRole() == UserRole.GROUP) {
                throw new ConcertException(ConcertErrorCode.EMPTY_ARTIST_LIST);
            }
            artistIds = List.of(creatorId);
        }
        addArtistsToConcert(savedConcert, artistIds);

        // 티켓 상품 자동 생성 (선예매/일반 2종). productArtistId = 콘서트 등록자(그룹 계정이면 그룹 ID, 개인 아티스트면 개인 ID)
        createTicketProductsForConcert(savedConcert, creatorId, creator.getRole(), request);

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
     * 아티스트 콘솔용: 로그인한 아티스트(또는 그룹+소속 멤버)가 참여한 다가오는 공연만 조회
     */
    @Transactional(readOnly = true)
    public List<ConcertListItemResponse> getUpcomingConcertsForArtistIds(List<Long> artistIds) {
        if (artistIds == null || artistIds.isEmpty()) {
            return Collections.emptyList();
        }
        Instant now = Instant.now();
        List<Concert> concerts = concertRepository.findUpcomingConcertsByArtistIdsIn(artistIds, now);
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

        // 선예매 입력 시 해당 아티스트(또는 그룹)의 멤버십 상품 필요 (수정 요청자 = 공연 소유자로 간주)
        int presaleCount = request.getPresaleTicketCount() != null ? request.getPresaleTicketCount() : (concert.getPresaleTicketCount() != null ? concert.getPresaleTicketCount() : 0);
        if (presaleCount > 0 && !productRepository.existsByArtistIdAndIsMembershipTrue(userId)) {
            throw new ConcertException(ConcertErrorCode.NO_MEMBERSHIP_PRODUCT);
        }

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

        // 티켓 상품 가격 업데이트 (선예매/일반)
        updateTicketProductPrices(concert.getId(), request.getPresaleTicketPrice(), request.getSaleTicketPrice());

        return buildConcertResponse(concert);
    }

    private String getCdnBaseUrl() {
        return cdnUrlResolver.getBaseUrl();
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
        Long presaleTicketPrice = null;
        Long saleTicketPrice = null;
        List<Product> ticketProducts = productRepository.findByConcertId(concert.getId());
        for (Product p : ticketProducts) {
            if (Boolean.TRUE.equals(p.getIsMembershipOnly())) {
                presaleTicketPrice = p.getPrice();
            } else {
                saleTicketPrice = p.getPrice();
            }
        }
        return ConcertResponse.from(concert, posterImageUrl, mediaAssetResponses, presaleTicketPrice, saleTicketPrice);
    }

    /**
     * 해당 공연의 티켓 상품(선예매/일반) 가격만 업데이트
     */
    private void updateTicketProductPrices(Long concertId, Long presaleTicketPrice, Long saleTicketPrice) {
        if (presaleTicketPrice == null && saleTicketPrice == null) {
            return;
        }
        List<Product> ticketProducts = productRepository.findByConcertId(concertId);
        for (Product p : ticketProducts) {
            Long newPrice = Boolean.TRUE.equals(p.getIsMembershipOnly()) ? presaleTicketPrice : saleTicketPrice;
            if (newPrice == null || newPrice < 0) {
                continue;
            }
            p.update(
                    p.getName(),
                    newPrice,
                    p.getCandyPrice() != null ? p.getCandyPrice() : 0L,
                    p.getType(),
                    p.getPaymentMethod(),
                    p.getIsSubscription(),
                    p.getQuantity(),
                    p.getIsMembershipOnly(),
                    p.getIsExclusive(),
                    p.getIsMembership(),
                    p.getRepresentativeMediaAssetId(),
                    p.getConcertId()
            );
        }
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
     * 공연 생성 시 티켓 상품 자동 생성 (선예매/일반 2종).
     * productArtistId: 그룹 계정으로 등록 시 그룹 ID, 그룹에 속하지 않은 개인 아티스트로 등록 시 개인 아티스트 ID (= creatorId)
     */
    private void createTicketProductsForConcert(Concert concert, Long creatorId, UserRole creatorRole, ConcertCreateRequest request) {
        Long productArtistId = creatorId;

        String title = concert.getTitle() != null ? concert.getTitle() : "공연";
        int presaleCount = concert.getPresaleTicketCount() != null ? concert.getPresaleTicketCount() : 0;
        int saleCount = concert.getSaleTicketCount() != null ? concert.getSaleTicketCount() : 0;
        Long presalePrice = (request != null && request.getPresaleTicketPrice() != null && request.getPresaleTicketPrice() >= 0)
                ? request.getPresaleTicketPrice() : 0L;
        Long salePrice = (request != null && request.getSaleTicketPrice() != null && request.getSaleTicketPrice() >= 0)
                ? request.getSaleTicketPrice() : 0L;

        if (presaleCount > 0) {
            ProductRequestDto presaleRequest = new ProductRequestDto(
                    productArtistId,
                    title + " 선예매 티켓",
                    presalePrice,
                    0L,
                    ProductType.CASH,
                    ProductPaymentMethod.CASH_ONLY,
                    false,
                    (long) presaleCount,
                    true,
                    true,
                    false,
                    concert.getId(),
                    null,
                    null
            );
            productService.createProduct(creatorId, creatorRole, presaleRequest);
        }
        if (saleCount > 0) {
            ProductRequestDto saleRequest = new ProductRequestDto(
                    productArtistId,
                    title + " 일반 예매 티켓",
                    salePrice,
                    0L,
                    ProductType.CASH,
                    ProductPaymentMethod.CASH_ONLY,
                    false,
                    (long) saleCount,
                    false,
                    true,
                    false,
                    concert.getId(),
                    null,
                    null
            );
            productService.createProduct(creatorId, creatorRole, saleRequest);
        }
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
