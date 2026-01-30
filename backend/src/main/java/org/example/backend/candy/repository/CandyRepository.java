package org.example.backend.candy.repository;

import org.example.backend.candy.entity.Candy;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandyRepository extends JpaRepository<Candy, Long> {
}
