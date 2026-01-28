package org.example.backend.product.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.product.dto.ProductRequest;
import org.example.backend.product.entity.Product;
import org.example.backend.product.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;

    public Optional<Product> findById(Long id) {
        return productRepository.findById(id);
    }

    public List<Product> findAll() {
        return productRepository.findAll();
    }

    @Transactional
    public Product create(ProductRequest req) {
        Product product = new Product(req.name(), req.price(), req.stock(), req.artistId());
        return productRepository.save(product);
    }

    @Transactional
    public Product update(Long id, ProductRequest req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
        product.setName(req.name());
        product.setPrice(req.price());
        product.setStock(req.stock());
        product.setArtistId(req.artistId());
        return productRepository.save(product);
    }

    @Transactional
    public void deleteById(Long id) {
        productRepository.deleteById(id);
    }
}
