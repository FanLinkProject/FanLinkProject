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
import org.example.backend.product.entity.Product;
import org.example.backend.product.entity.ProductMediaAsset;
import org.example.backend.product.exception.ProductErrorCode;
import org.example.backend.product.exception.ProductException;
import org.example.backend.product.repository.ProductMediaAssetRepository;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.service.ArtistPermissionService;
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
    private final ArtistPermissionService artistPermissionService;

    public List<ProductDetailResponse> getAllProducts() {
        List<Product> products = productRepository.findAll();
        List<ProductDetailResponse> responses = new ArrayList<>();
        for (Product product : products) {
            responses.add(toSummaryResponse(product));
        }
        return responses;
    }

    @Transactional
    public ProductDetailResponse createProduct(Long userId, UserRole role, ProductRequestDto request) {
        validateManageAccountForArtist(request.artistId(), userId, role);

        boolean isMembershipOnly = request.isMembershipOnly() != null && request.isMembershipOnly();
        // 멤버십 전용 상품인 경우, 단독 상품 여부도 true로 설정
        boolean isExclusive = isMembershipOnly || (request.isExclusive() != null && request.isExclusive());
        boolean isMembership = request.isMembership() != null && request.isMembership();
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
        // 멤버십 전용 상품인 경우, 단독 상품 여부도 true로 설정
        boolean isExclusive = isMembershipOnly || (request.isExclusive() != null && request.isExclusive());
        boolean isMembership = request.isMembership() != null && request.isMembership();
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
                request.representativeMediaAssetId());

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

    private void validateManageAccountForArtist(Long artistId, Long userId, UserRole role) {
        if (artistId == null) {
            return;
        }
        if (userId == null || role == null) {
            throw new ProductException(ProductErrorCode.PRODUCT_ACCESS_DENIED);
        }
        Long ownerUserId = fanPageGateway.getOwnerUserId(artistId);
        if (!ownerUserId.equals(userId)) {
            throw new ProductException(ProductErrorCode.PRODUCT_ACCESS_DENIED);
        }
        if (!artistPermissionService.isManageAccount(userId, role)) {
            throw new ProductException(ProductErrorCode.PRODUCT_ACCESS_DENIED);
        }
    }

    private ProductDetailResponse toDetailResponse(Product product) {
        List<ProductMediaAsset> links = productMediaAssetRepository.findAllByProduct_IdOrderById(product.getId());
        String cdnBaseUrl = resolveCdnBaseUrl();
        List<ProductMediaAssetResponse> attachments = links.stream()
                .map(link -> ProductMediaAssetResponse.from(link.getMediaAsset(), cdnBaseUrl))
                .toList();
        return ProductDetailResponse.from(product, attachments);
    }

    private ProductDetailResponse toSummaryResponse(Product product) {
        List<ProductMediaAsset> links = productMediaAssetRepository.findAllByProduct_IdOrderById(product.getId());
        String cdnBaseUrl = resolveCdnBaseUrl();
        List<ProductMediaAssetResponse> attachments = resolveRepresentativeAttachment(links, cdnBaseUrl, product.getRepresentativeMediaAssetId());
        return ProductDetailResponse.from(product, attachments);
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
