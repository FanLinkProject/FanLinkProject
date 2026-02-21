package org.example.backend.concert.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.concert.dto.location.LocationResponse;
import org.example.backend.concert.dto.location.LocationUpsertRequest;
import org.example.backend.concert.entity.Location;
import org.example.backend.concert.repository.LocationRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class LocationService {

	private final LocationRepository locationRepository;

	/**
	 * provider + placeId가 있으면 기존 Location 조회 후 display 정보만 갱신, 없으면 신규 생성.
	 * placeId가 비어 있으면 중복 비교 없이 신규 생성.
	 * Unique 충돌 시 한 번 더 조회하여 반환(동시성 안전).
	 */
	public LocationResponse upsert(LocationUpsertRequest req) {
		String provider = req.getProvider();
		String placeId = req.getPlaceId() != null ? req.getPlaceId().trim() : null;
		boolean hasPlaceId = StringUtils.hasText(placeId);

		if (hasPlaceId) {
			var existing = locationRepository.findByProviderAndPlaceId(provider, placeId);
			if (existing.isPresent()) {
				Location loc = existing.get();
				loc.updateDisplayInfo(req.getPlaceName(), req.getFullAddress());
				return LocationResponse.from(loc);
			}
		}

		Location newLocation = Location.builder()
				.provider(provider)
				.placeId(placeId)
				.placeName(req.getPlaceName())
				.fullAddress(req.getFullAddress())
				.latitude(req.getLatitude())
				.longitude(req.getLongitude())
				.country(req.getCountry())
				.state(req.getState())
				.city(req.getCity())
				.district(req.getDistrict())
				.street(req.getStreet())
				.zipcode(req.getZipcode())
				.build();

		try {
			Location saved = locationRepository.save(newLocation);
			return LocationResponse.from(saved);
		} catch (DataIntegrityViolationException e) {
			// 동시 삽입으로 unique 충돌 시 기존 엔티티 조회하여 반환
			if (hasPlaceId) {
				return locationRepository.findByProviderAndPlaceId(provider, placeId)
						.map(LocationResponse::from)
						.orElseThrow(() -> e);
			}
			throw e;
		}
	}
}
