package org.example.backend.candy.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.candy.dto.CandyRequest;
import org.example.backend.candy.entity.Candy;
import org.example.backend.candy.repository.CandyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CandyService {

    private final CandyRepository candyRepository;

    public Optional<Candy> findById(Long id) {
        return candyRepository.findById(id);
    }

    public List<Candy> findAll() {
        return candyRepository.findAll();
    }

    @Transactional
    public Candy create(CandyRequest req) {
        Candy candy = new Candy(req.userId(), req.amount(), req.type(), req.paymentId());
        return candyRepository.save(candy);
    }

    @Transactional
    public Candy update(Long id, CandyRequest req) {
        Candy candy = candyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Candy not found: " + id));
        candy.setUserId(req.userId());
        candy.setAmount(req.amount());
        candy.setType(req.type());
        candy.setPaymentId(req.paymentId());
        return candyRepository.save(candy);
    }

    @Transactional
    public void deleteById(Long id) {
        candyRepository.deleteById(id);
    }
}
