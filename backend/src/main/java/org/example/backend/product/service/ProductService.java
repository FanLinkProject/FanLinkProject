package org.example.backend.product.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.product.entity.Product;
import org.example.backend.product.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import org.example.backend.product.dto.request.ProductRequestDto;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Transactional
    public Product createProduct(ProductRequestDto request) {
        Product product = Product.builder()
                .artistId(request.artistId())
                .name(request.name())
                .price(request.price())
                .candyPrice(request.candyPrice() != null ? request.candyPrice() : 0L)
                .type(request.type())
                .paymentMethod(request.paymentMethod())
                .isSubscription(request.isSubscription())
                .build();

        return productRepository.save(product);
    }
}
