package org.example.backend.media_asset.gateway;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.exception.MediaAssetErrorCode;
import org.example.backend.media_asset.exception.MediaAssetException;
import org.example.backend.product.repository.ProductRepository;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DefaultProductGateway implements ProductGateway {

    private final ProductRepository productRepository;

    // 상품 소속 아티스트 ID를 조회한다.
    @Override
    public Long getArtistIdByProductId(Long productId) {
        if (productId == null || productId <= 0) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY, "productId가 필요합니다.");
        }
        return productRepository.findById(productId)
                .map(product -> product.getArtistId())
                .filter(artistId -> artistId != null && artistId > 0)
                .orElseThrow(() -> new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED, "상품의 artistId를 찾을 수 없습니다."));
    }
}
