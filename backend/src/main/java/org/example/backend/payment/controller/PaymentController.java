package org.example.backend.payment.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.payment.dto.PaymentRequest;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public List<Payment> findAll() {
        return paymentService.findAll();
    }

    @GetMapping("/{id}")
    public Payment findById(@PathVariable Long id) {
        return paymentService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Payment create(@RequestBody PaymentRequest req) {
        return paymentService.create(req);
    }

    @PutMapping("/{id}")
    public Payment update(@PathVariable Long id, @RequestBody PaymentRequest req) {
        return paymentService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        paymentService.deleteById(id);
    }
}
