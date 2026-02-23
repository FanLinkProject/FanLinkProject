package org.example.backend.concert.repository;

import org.example.backend.concert.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LocationRepository extends JpaRepository<Location, Long> {

	Optional<Location> findByProviderAndPlaceId(String provider, String placeId);
}
