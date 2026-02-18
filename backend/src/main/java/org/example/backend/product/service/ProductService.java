package org.example.backend.product.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetStatus;
import org.example.backend.media_asset.repository.MediaAssetRepository;
import org.example.backend.product.dto.request.ProductRequestDto;
import org.example.backend.product.entity.Product;
import org.example.backend.product.entity.ProductMediaAsset;
import org.example.backend.product.exception.ProductErrorCode;
import org.example.backend.product.exception.ProductException;
import org.example.backend.product.repository.ProductMediaAssetRepository;
import org.example.backend.product.repository.ProductRepository;
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

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Transactional
    public Product createProduct(ProductRequestDto request) {
        boolean isMembershipOnly = request.isMembershipOnly() != null && request.isMembershipOnly();
        // 멤버십 전용 상품인 경우, 단독 상품 여부도 true로 설정
        boolean isExclusive = isMembershipOnly || (request.isExclusive() != null && request.isExclusive());
        boolean isMembership = request.isMembership() != null && request.isMembership();

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
                .build();

        Product savedProduct = productRepository.save(product);

        List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(request.mediaAssetIds());
        for (MediaAsset asset : mediaAssets) {
            productMediaAssetRepository.save(new ProductMediaAsset(savedProduct, asset));
        }

        return savedProduct;
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

    @Transactional
    public Product updateProduct(Long id, ProductRequestDto request) {
        Product product = getProduct(id);

        boolean isMembershipOnly = request.isMembershipOnly() != null && request.isMembershipOnly();
        // 멤버십 전용 상품인 경우, 단독 상품 여부도 true로 설정
        boolean isExclusive = isMembershipOnly || (request.isExclusive() != null && request.isExclusive());
        boolean isMembership = request.isMembership() != null && request.isMembership();

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
                isMembership);

        if (request.mediaAssetIds() != null) {
            productMediaAssetRepository.deleteAllByProduct_Id(id);
            List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(request.mediaAssetIds());
            for (MediaAsset asset : mediaAssets) {
                productMediaAssetRepository.save(new ProductMediaAsset(product, asset));
            }
        }

        return product;
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
    public void deleteProduct(Long id) {
        Product product = getProduct(id);
        productMediaAssetRepository.deleteAllByProduct_Id(id);
        productRepository.delete(product);
    }
}
