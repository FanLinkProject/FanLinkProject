package org.example.backend.subproduct.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.subproduct.dto.SubProductRequest;
import org.example.backend.subproduct.entity.SubProduct;
import org.example.backend.subproduct.repository.SubProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubProductService {

    private final SubProductRepository subProductRepository;

    public Optional<SubProduct> findById(Long id) {
        return subProductRepository.findById(id);
    }

    public List<SubProduct> findAll() {
        return subProductRepository.findAll();
    }

    @Transactional
    public SubProduct create(SubProductRequest req) {
        SubProduct subProduct = new SubProduct(req.name(), req.price(), req.durationDays(), req.candyAmount());
        return subProductRepository.save(subProduct);
    }

    @Transactional
    public SubProduct update(Long id, SubProductRequest req) {
        SubProduct subProduct = subProductRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("SubProduct not found: " + id));
        subProduct.setName(req.name());
        subProduct.setPrice(req.price());
        subProduct.setDurationDays(req.durationDays());
        subProduct.setCandyAmount(req.candyAmount());
        return subProductRepository.save(subProduct);
    }

    @Transactional
    public void deleteById(Long id) {
        subProductRepository.deleteById(id);
    }
}
