package org.example.backend.ticket.repository;

import org.example.backend.ticket.entity.Ticket;
import org.example.backend.ticket.entity.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Optional<Ticket> findByTicketCode(String ticketCode);

    List<Ticket> findByUserIdOrderByIssuedAtDesc(Long userId);

    List<Ticket> findByTicketCodeIn(List<String> ticketCodes);

    boolean existsByOrderId(Long orderId);
}
