package org.example.backend.product.repository;

import jakarta.persistence.LockModeType;
import org.example.backend.product.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.example.backend.product.enums.ProductPaymentMethod;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    List<Product> findByArtistId(Long artistId);

    List<Product> findByArtistIdAndPaymentMethod(Long artistId, ProductPaymentMethod paymentMethod);

    List<Product> findByArtistIdIn(List<Long> artistIds);

    List<Product> findByArtistIdIsNull();

    List<Product> findByArtistIdIsNotNull();
}
