package org.example.backend.product.repository;

import org.example.backend.product.entity.ProductMediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductMediaAssetRepository extends JpaRepository<ProductMediaAsset, Long> {

    List<ProductMediaAsset> findAllByProduct_IdOrderById(Long productId);

    void deleteAllByProduct_Id(Long productId);
}
