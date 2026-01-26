package org.example.backend.order.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.order.dto.OrderCreateRequest;
import org.example.backend.order.dto.OrderUpdateRequest;
import org.example.backend.order.entity.Order;
import org.example.backend.order.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public List<Order> findAll() {
        return orderService.findAll();
    }

    @GetMapping("/{id}")
    public Order findById(@PathVariable Long id) {
        return orderService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Order create(@RequestBody OrderCreateRequest req) {
        return orderService.create(req);
    }

    @PutMapping("/{id}")
    public Order update(@PathVariable Long id, @RequestBody OrderUpdateRequest req) {
        return orderService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        orderService.deleteById(id);
    }
}
