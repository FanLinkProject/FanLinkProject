package org.example.backend.ticket.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.product.entity.Product;
import org.example.backend.settlement.event.PaymentCompletedEvent;
import org.example.backend.ticket.entity.Ticket;
import org.example.backend.ticket.entity.TicketStatus;
import org.example.backend.ticket.repository.TicketRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TicketIssuanceListener {

    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        Long orderId = event.getOrder().getId();

        log.debug("티켓 발급 처리: orderId={}", orderId);

        if (ticketRepository.existsByOrderId(orderId)) {
            log.debug("이미 티켓이 발급된 주문입니다. 스킵: orderId={}", orderId);
            return;
        }

        Order order = orderRepository.findByIdWithOrderItemsAndProducts(orderId)
                .orElse(null);
        if (order == null) {
            log.warn("주문을 찾을 수 없어 티켓 발급 스킵: orderId={}", orderId);
            return;
        }

        List<Ticket> ticketsToSave = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (OrderItem item : order.getOrderItems()) {
            Product product = item.getProduct();
            if (product.getConcertId() == null) {
                continue;
            }

            for (int i = 0; i < item.getQuantity(); i++) {
                String ticketCode = UUID.randomUUID().toString();
                Ticket ticket = Ticket.builder()
                        .ticketCode(ticketCode)
                        .orderId(order.getId())
                        .orderItemId(item.getId())
                        .userId(order.getUserId())
                        .productId(product.getId())
                        .concertId(product.getConcertId())
                        .status(TicketStatus.ISSUED)
                        .issuedAt(now)
                        .build();
                ticketsToSave.add(ticket);
            }
        }

        if (!ticketsToSave.isEmpty()) {
            ticketRepository.saveAll(ticketsToSave);
            log.info("티켓 발급 완료: orderId={}, count={}", orderId, ticketsToSave.size());
        }
    }
}
