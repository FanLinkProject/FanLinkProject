package org.example.backend.order.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.order.dto.OrderCreateRequest;
import org.example.backend.order.dto.OrderUpdateRequest;
import org.example.backend.order.entity.Order;
import org.example.backend.order.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;

    public Optional<Order> findById(Long id) {
        return orderRepository.findById(id);
    }

    public List<Order> findAll() {
        return orderRepository.findAll();
    }

    @Transactional
    public Order create(OrderCreateRequest req) {
        Order order = new Order(req.userId(), req.totalAmount());
        return orderRepository.save(order);
    }

    @Transactional
    public Order update(Long id, OrderUpdateRequest req) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + id));
        order.changeStatus(req.orderStatus());
        return orderRepository.save(order);
    }

    @Transactional
    public void deleteById(Long id) {
        orderRepository.deleteById(id);
    }
}
