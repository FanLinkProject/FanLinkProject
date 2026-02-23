package org.example.backend.product.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetStatus;
import org.example.backend.media_asset.gateway.FanPageGateway;
import org.example.backend.media_asset.repository.MediaAssetRepository;
import org.example.backend.product.dto.request.ProductRequestDto;
import org.example.backend.product.dto.response.ProductDetailResponse;
import org.example.backend.product.dto.response.ProductMediaAssetResponse;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.product.enums.ProductType;
import org.example.backend.product.entity.Product;
import org.example.backend.product.entity.ProductMediaAsset;
import org.example.backend.product.exception.ProductErrorCode;
import org.example.backend.product.exception.ProductException;
import org.example.backend.product.repository.ProductMediaAssetRepository;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.user.entity.GroupMember;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductMediaAssetRepository productMediaAssetRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final AwsProperties awsProperties;
    private final FanPageGateway fanPageGateway;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;

    public List<ProductDetailResponse> getAllProducts() {
        List<Product> products = productRepository.findAll();
        List<ProductDetailResponse> responses = new ArrayList<>();
        for (Product product : products) {
            responses.add(toSummaryResponse(product));
        }
        return responses;
    }

    /**
     * 마켓 전체 굿즈 탐색용.
     * - 아티스트/그룹 상품 (artistId != null)
     * - 플랫폼 제공 상품 (artistId null, paymentMethod CANDY_ONLY, type CANDY) 포함.
     * 캔디 충전 상품(CASH)은 제외.
     */
    public List<ProductDetailResponse> getMarketProducts() {
        List<Product> artistProducts = productRepository.findByArtistIdIsNotNull();
        List<Product> platformCandy = productRepository.findByArtistIdIsNull().stream()
                .filter(p -> ProductPaymentMethod.CANDY_ONLY.equals(p.getPaymentMethod())
                        && ProductType.CANDY.equals(p.getType()))
                .toList();
        List<Product> combined = new ArrayList<>(artistProducts);
        combined.addAll(platformCandy);
        return combined.stream().map(this::toSummaryResponse).toList();
    }

    public List<ProductDetailResponse> getProductsByArtistId(Long artistId) {
        if (artistId == null) {
            return List.of();
        }
        List<Product> products = productRepository.findByArtistId(artistId);
        return products.stream().map(this::toSummaryResponse).toList();
    }

    public List<ProductDetailResponse> getProductsByArtistIds(List<Long> artistIds) {
        if (artistIds == null || artistIds.isEmpty()) {
            return List.of();
        }
        List<Product> products = productRepository.findByArtistIdIn(artistIds);
        return products.stream().map(this::toSummaryResponse).toList();
    }

    /**
     * 아티스트/그룹 ID로 상품 목록 조회.
     * 그룹인 경우 그룹+멤버 상품, 개인 아티스트인 경우 해당 아티스트 상품만 반환.
     */
    public List<ProductDetailResponse> getProductsByArtistOrGroupId(Long artistIdOrGroupId) {
        if (artistIdOrGroupId == null) {
            return List.of();
        }
        List<Long> artistIds = resolveArtistIdsForProducts(artistIdOrGroupId);
        return getProductsByArtistIds(artistIds);
    }

    /**
     * 캔디 충전 상품 목록 조회 (artistId가 null인 플랫폼 상품).
     * 정기결제(isSubscription=true)와 단건결제(isSubscription=false) 상품이 포함됩니다.
     */
    public List<ProductDetailResponse> getCandyRechargeProducts() {
        List<Product> products = productRepository.findByArtistIdIsNull();
        return products.stream().map(this::toSummaryResponse).toList();
    }

    private List<Long> resolveArtistIdsForProducts(Long artistIdOrGroupId) {
        User user = userRepository.findById(artistIdOrGroupId).orElse(null);
        if (user == null) {
            return List.of();
        }
        if (user.getRole() == UserRole.GROUP) {
            List<Long> ids = new ArrayList<>();
            ids.add(user.getId());
            List<GroupMember> members = groupMemberRepository.findByGroup(user);
            for (GroupMember gm : members) {
                ids.add(gm.getMember().getId());
            }
            return ids;
        }
        return List.of(user.getId());
    }

    @Transactional
    public ProductDetailResponse createProduct(Long userId, UserRole role, ProductRequestDto request) {
        validateManageAccountForArtist(request.artistId(), userId, role);
        validateNoDuplicateDmProduct(request, userId);

        boolean isMembershipOnly = request.isMembershipOnly() != null && request.isMembershipOnly();
        boolean isMembership = request.isMembership() != null && request.isMembership();
        // 멤버십 전용/멤버십 상품인 경우, 단독 상품 여부도 true로 설정
        boolean isExclusive = isMembershipOnly || isMembership || (request.isExclusive() != null && request.isExclusive());
        validateRepresentativeMediaAssetId(request.mediaAssetIds(), request.representativeMediaAssetId());

        Product product = Product.builder()
                .artistId(request.artistId())
                .name(request.name())
                .price(request.price())
                .candyPrice(request.candyPrice() != null ? request.candyPrice() : 0L)
                .type(request.type())
                .paymentMethod(request.paymentMethod())
                .isSubscription(request.isSubscription())
                .quantity(request.quantity())
                .isMembershipOnly(isMembershipOnly)
                .isExclusive(isExclusive)
                .isMembership(isMembership)
                .concertId(request.concertId())
                .representativeMediaAssetId(request.representativeMediaAssetId())
                .build();

        Product savedProduct = productRepository.save(product);

        List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(request.mediaAssetIds());
        for (MediaAsset asset : mediaAssets) {
            productMediaAssetRepository.save(new ProductMediaAsset(savedProduct, asset));
        }

        return toDetailResponse(savedProduct);
    }

    private List<MediaAsset> validateAndFetchMediaAssets(List<Long> mediaAssetIds) {
        if (CollectionUtils.isEmpty(mediaAssetIds)) {
            return Collections.emptyList();
        }
        List<MediaAsset> assets = new ArrayList<>();
        for (Long id : mediaAssetIds) {
            MediaAsset asset = mediaAssetRepository.findById(id)
                    .orElseThrow(() -> new ProductException(ProductErrorCode.MEDIA_ASSET_NOT_FOUND));
            if (asset.getStatus() != MediaAssetStatus.READY) {
                throw new ProductException(ProductErrorCode.MEDIA_ASSET_NOT_READY);
            }
            if (asset.getCategory() != MediaAssetCategory.PRODUCT_IMAGE && asset.getCategory() != MediaAssetCategory.PRODUCT_DESCRIBE_IMAGE) {
                throw new ProductException(ProductErrorCode.INVALID_MEDIA_ASSET_CATEGORY);
            }
            assets.add(asset);
        }
        return assets;
    }

    public Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ProductException(ProductErrorCode.PRODUCT_NOT_FOUND));
    }

    public ProductDetailResponse getProductDetail(Long id) {
        Product product = getProduct(id);
        return toDetailResponse(product);
    }

    @Transactional
    public ProductDetailResponse updateProduct(Long id, Long userId, UserRole role, ProductRequestDto request) {
        Product product = getProduct(id);
        validateManageAccountForArtist(product.getArtistId(), userId, role);

        boolean isMembershipOnly = request.isMembershipOnly() != null && request.isMembershipOnly();
        boolean isMembership = request.isMembership() != null && request.isMembership();
        // 멤버십 전용/멤버십 상품인 경우, 단독 상품 여부도 true로 설정
        boolean isExclusive = isMembershipOnly || isMembership || (request.isExclusive() != null && request.isExclusive());
        validateRepresentativeMediaAssetId(request.mediaAssetIds(), request.representativeMediaAssetId());

        product.update(
                request.name(),
                request.price(),
                request.candyPrice() != null ? request.candyPrice() : 0L,
                request.type(),
                request.paymentMethod(),
                request.isSubscription(),
                request.quantity(),
                isMembershipOnly,
                isExclusive,
                isMembership,
                request.representativeMediaAssetId(),
                request.concertId());

        if (request.mediaAssetIds() != null) {
            productMediaAssetRepository.deleteAllByProduct_Id(id);
            List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(request.mediaAssetIds());
            for (MediaAsset asset : mediaAssets) {
                productMediaAssetRepository.save(new ProductMediaAsset(product, asset));
            }
        }

        return toDetailResponse(product);
    }

    @Transactional
    public void increaseStock(Long id, Long amount) {
        Product product = getProduct(id);
        product.increaseStock(amount);
    }

    @Transactional
    public void decreaseStock(Long id, Long amount) {
        Product product = getProduct(id);
        product.decreaseStock(amount);
    }

    @Transactional
    public void deleteProduct(Long id, Long userId, UserRole role) {
        Product product = getProduct(id);
        validateManageAccountForArtist(product.getArtistId(), userId, role);
        productMediaAssetRepository.deleteAllByProduct_Id(id);
        productRepository.delete(product);
    }

    private void validateNoDuplicateDmProduct(ProductRequestDto request, Long userId) {
        if (request.artistId() == null || request.artistId().equals(userId)) {
            return;
        }
        if (!ProductPaymentMethod.CANDY_ONLY.equals(request.paymentMethod())
                || !Boolean.TRUE.equals(request.isSubscription())) {
            return;
        }
        List<Product> candyProducts = productRepository.findByArtistIdAndPaymentMethod(
                request.artistId(), ProductPaymentMethod.CANDY_ONLY);
        boolean hasDmProduct = candyProducts.stream()
                .anyMatch(p -> Boolean.TRUE.equals(p.getIsSubscription()));
        if (hasDmProduct) {
            throw new ProductException(ProductErrorCode.DUPLICATE_DM_PRODUCT);
        }
    }

    private void validateManageAccountForArtist(Long artistId, Long userId, UserRole role) {
        if (artistId == null) {
            return;
        }
        if (userId == null || role == null) {
            throw new ProductException(ProductErrorCode.PRODUCT_ACCESS_DENIED);
        }
        if (role == UserRole.GROUP && userId.equals(artistId)) {
            return;
        }
        if (role == UserRole.GROUP) {
            if (groupMemberRepository.existsByGroupIdAndMemberId(userId, artistId)) {
                return;
            }
        }
        Long ownerUserId = fanPageGateway.getOwnerUserId(artistId);
        if (!ownerUserId.equals(userId)) {
            throw new ProductException(ProductErrorCode.PRODUCT_ACCESS_DENIED);
        }
    }

    private ProductDetailResponse toDetailResponse(Product product) {
        List<ProductMediaAsset> links = productMediaAssetRepository.findAllByProduct_IdOrderById(product.getId());
        String cdnBaseUrl = resolveCdnBaseUrl();
        List<ProductMediaAssetResponse> attachments = links.stream()
                .map(link -> ProductMediaAssetResponse.from(link.getMediaAsset(), cdnBaseUrl))
                .toList();
        String artistName = resolveArtistName(product.getArtistId());
        Long groupIdResolved;
        String groupNameResolved;
        User artist = product.getArtistId() != null ? userRepository.findById(product.getArtistId()).orElse(null) : null;
        if (artist != null) {
            if (artist.getRole() == UserRole.GROUP) {
                groupIdResolved = artist.getId();
                groupNameResolved = artist.getName() != null && !artist.getName().isBlank() ? artist.getName() : artist.getNickname();
            } else {
                var groupMemberOpt = groupMemberRepository.findByMember(artist);
                if (groupMemberOpt.isPresent()) {
                    User group = groupMemberOpt.get().getGroup();
                    groupIdResolved = group.getId();
                    groupNameResolved = group.getName() != null && !group.getName().isBlank() ? group.getName() : group.getNickname();
                } else {
                    groupIdResolved = null;
                    groupNameResolved = null;
                }
            }
        } else {
            groupIdResolved = null;
            groupNameResolved = null;
        }
        return ProductDetailResponse.from(product, attachments, artistName, groupIdResolved, groupNameResolved);
    }

    private ProductDetailResponse toSummaryResponse(Product product) {
        List<ProductMediaAsset> links = productMediaAssetRepository.findAllByProduct_IdOrderById(product.getId());
        String cdnBaseUrl = resolveCdnBaseUrl();
        List<ProductMediaAssetResponse> attachments = resolveRepresentativeAttachment(links, cdnBaseUrl, product.getRepresentativeMediaAssetId());
        String artistName = resolveArtistName(product.getArtistId());
        Long groupIdResolved;
        String groupNameResolved;
        User artist = product.getArtistId() != null ? userRepository.findById(product.getArtistId()).orElse(null) : null;
        if (artist != null) {
            if (artist.getRole() == UserRole.GROUP) {
                groupIdResolved = artist.getId();
                groupNameResolved = artist.getName() != null && !artist.getName().isBlank() ? artist.getName() : artist.getNickname();
            } else {
                var groupMemberOpt = groupMemberRepository.findByMember(artist);
                if (groupMemberOpt.isPresent()) {
                    User group = groupMemberOpt.get().getGroup();
                    groupIdResolved = group.getId();
                    groupNameResolved = group.getName() != null && !group.getName().isBlank() ? group.getName() : group.getNickname();
                } else {
                    groupIdResolved = null;
                    groupNameResolved = null;
                }
            }
        } else {
            groupIdResolved = null;
            groupNameResolved = null;
        }
        return ProductDetailResponse.from(product, attachments, artistName, groupIdResolved, groupNameResolved);
    }

    private String resolveArtistName(Long artistId) {
        if (artistId == null) return null;
        return userRepository.findById(artistId)
                .map(u -> u.getName() != null && !u.getName().isBlank() ? u.getName() : u.getNickname())
                .orElse(null);
    }

    private void validateRepresentativeMediaAssetId(List<Long> mediaAssetIds, Long representativeMediaAssetId) {
        if (representativeMediaAssetId == null) {
            return;
        }
        if (CollectionUtils.isEmpty(mediaAssetIds) || !mediaAssetIds.contains(representativeMediaAssetId)) {
            throw new ProductException(ProductErrorCode.INVALID_MEDIA_ASSET_CATEGORY);
        }
    }

    private List<ProductMediaAssetResponse> resolveRepresentativeAttachment(List<ProductMediaAsset> links,
                                                                           String cdnBaseUrl,
                                                                           Long representativeMediaAssetId) {
        if (links == null || links.isEmpty()) {
            return List.of();
        }
        if (representativeMediaAssetId != null) {
            for (ProductMediaAsset link : links) {
                MediaAsset mediaAsset = link.getMediaAsset();
                if (mediaAsset != null && representativeMediaAssetId.equals(mediaAsset.getId())) {
                    return List.of(ProductMediaAssetResponse.from(mediaAsset, cdnBaseUrl));
                }
            }
        }
        return List.of(ProductMediaAssetResponse.from(links.get(0).getMediaAsset(), cdnBaseUrl));
    }

    private String resolveCdnBaseUrl() {
        String domain = awsProperties.getCloudfront().getDomain();
        if (domain == null || domain.isBlank()) {
            return null;
        }
        String normalized = domain.trim();
        if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
            return normalized;
        }
        return "https://" + normalized;
    }
}
