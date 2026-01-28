package org.example.backend.payment.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.payment.dto.PaymentRequest;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentRepository paymentRepository;

    public Optional<Payment> findById(Long id) {
        return paymentRepository.findById(id);
    }

    public List<Payment> findAll() {
        return paymentRepository.findAll();
    }

    @Transactional
    public Payment create(PaymentRequest req) {
        Payment payment = new Payment();
        payment.setPaymentKey(req.paymentKey());
        payment.setOrderId(req.orderId());
        payment.setAmount(req.amount());
        payment.setStatus(req.status());
        payment.setPaymentType(req.paymentType());
        payment.setOrderName(req.orderName());
        payment.setPaidAt(req.paidAt());
        payment.setUserId(req.userId());
        payment.setProductId(req.productId());
        payment.setSubscriptionId(req.subscriptionId());
        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment update(Long id, PaymentRequest req) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + id));
        payment.setPaymentKey(req.paymentKey());
        payment.setOrderId(req.orderId());
        payment.setAmount(req.amount());
        payment.setStatus(req.status());
        payment.setPaymentType(req.paymentType());
        payment.setOrderName(req.orderName());
        payment.setPaidAt(req.paidAt());
        payment.setUserId(req.userId());
        payment.setProductId(req.productId());
        payment.setSubscriptionId(req.subscriptionId());
        return paymentRepository.save(payment);
    }

    @Transactional
    public void deleteById(Long id) {
        paymentRepository.deleteById(id);
    }
}
