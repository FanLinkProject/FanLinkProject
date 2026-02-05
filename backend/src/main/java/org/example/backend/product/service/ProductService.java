package org.example.backend.product.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.product.entity.Product;
import org.example.backend.product.exception.ProductErrorCode;
import org.example.backend.product.exception.ProductException;
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

    public Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ProductException(ProductErrorCode.PRODUCT_NOT_FOUND));
    }

    @Transactional
    public Product updateProduct(Long id, ProductRequestDto request) {
        Product product = getProduct(id);

        product.update(
                request.name(),
                request.price(),
                request.candyPrice() != null ? request.candyPrice() : 0L,
                request.type(),
                request.paymentMethod(),
                request.isSubscription());

        return product;
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = getProduct(id);
        productRepository.delete(product);
    }
}
