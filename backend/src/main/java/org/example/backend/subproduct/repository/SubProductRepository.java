package org.example.backend.subproduct.repository;

import org.example.backend.subproduct.entity.SubProduct;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubProductRepository extends JpaRepository<SubProduct, Long> {
}
