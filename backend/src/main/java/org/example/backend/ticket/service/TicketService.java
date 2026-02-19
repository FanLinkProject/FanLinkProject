package org.example.backend.ticket.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.concert.entity.Concert;
import org.example.backend.concert.repository.ConcertRepository;
import org.example.backend.ticket.dto.response.TicketQrResponse;
import org.example.backend.ticket.dto.response.TicketResponse;
import org.example.backend.ticket.entity.Ticket;
import org.example.backend.ticket.entity.TicketStatus;
import org.example.backend.ticket.exception.TicketErrorCode;
import org.example.backend.ticket.exception.TicketException;
import org.example.backend.ticket.repository.TicketRepository;
import org.example.backend.ticket.util.TicketJwtSigner;
import org.example.backend.ticket.util.TicketQrGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TicketService {

    private final TicketRepository ticketRepository;
    private final ConcertRepository concertRepository;
    private final TicketJwtSigner ticketJwtSigner;
    private final TicketQrGenerator ticketQrGenerator;

    public List<TicketResponse> getMyTickets(Long userId) {
        List<Ticket> tickets = ticketRepository.findByUserIdOrderByIssuedAtDesc(userId);
        return tickets.stream()
                .map(ticket -> {
                    Concert concert = ticket.getConcertId() != null
                            ? concertRepository.findById(ticket.getConcertId()).orElse(null)
                            : null;
                    return TicketResponse.from(ticket, concert);
                })
                .collect(Collectors.toList());
    }

    public TicketQrResponse getTicketQr(Long userId, String ticketCode) {
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new TicketException(TicketErrorCode.TICKET_NOT_FOUND));

        if (!ticket.getUserId().equals(userId)) {
            throw new TicketException(TicketErrorCode.TICKET_ACCESS_DENIED);
        }
        if (ticket.getStatus() == TicketStatus.USED) {
            throw new TicketException(TicketErrorCode.TICKET_ALREADY_USED);
        }
        if (ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new TicketException(TicketErrorCode.TICKET_CANCELLED);
        }

        String jwt = ticketJwtSigner.createTicketJwt(ticket);
        String qrBase64 = ticketQrGenerator.generateQrImageBase64(jwt);

        return TicketQrResponse.builder()
                .qrImageBase64(qrBase64)
                .token(jwt)
                .build();
    }

    public byte[] getTicketQrImage(Long userId, String ticketCode) {
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new TicketException(TicketErrorCode.TICKET_NOT_FOUND));

        if (!ticket.getUserId().equals(userId)) {
            throw new TicketException(TicketErrorCode.TICKET_ACCESS_DENIED);
        }
        if (ticket.getStatus() == TicketStatus.USED) {
            throw new TicketException(TicketErrorCode.TICKET_ALREADY_USED);
        }
        if (ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new TicketException(TicketErrorCode.TICKET_CANCELLED);
        }

        String jwt = ticketJwtSigner.createTicketJwt(ticket);
        return ticketQrGenerator.generateQrImage(jwt);
    }

    @Transactional
    public void verifyAndUseTicket(String token) {
        TicketVerificationResult result = verifyToken(token);
        if (!result.isValid()) {
            throw new TicketException(result.getErrorCode());
        }

        Ticket ticket = result.getTicket();
        ticket.markUsed(LocalDateTime.now());
    }

    @Transactional
    public void syncTickets(List<String> ticketCodes) {
        if (ticketCodes == null || ticketCodes.isEmpty()) {
            return;
        }

        List<Ticket> tickets = ticketRepository.findByTicketCodeIn(ticketCodes);
        LocalDateTime now = LocalDateTime.now();
        for (Ticket ticket : tickets) {
            if (ticket.getStatus() == TicketStatus.ISSUED) {
                ticket.markUsed(now);
            }
        }
    }

    public TicketVerificationResult verifyToken(String token) {
        if (token == null || token.isBlank()) {
            return TicketVerificationResult.invalid(TicketErrorCode.TICKET_NOT_FOUND);
        }

        if (!ticketJwtSigner.isConfigured()) {
            return TicketVerificationResult.invalid(TicketErrorCode.TICKET_SIGNING_NOT_CONFIGURED);
        }

        try {
            var claims = io.jsonwebtoken.Jwts.parser()
                    .verifyWith(ticketJwtSigner.getPublicKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String tid = claims.get("tid", String.class);
            Long eid = claims.get("eid", Long.class);

            Ticket ticket = ticketRepository.findByTicketCode(tid)
                    .orElse(null);
            if (ticket == null) {
                return TicketVerificationResult.invalid(TicketErrorCode.TICKET_NOT_FOUND);
            }
            if (ticket.getStatus() == TicketStatus.USED) {
                return TicketVerificationResult.invalid(TicketErrorCode.TICKET_ALREADY_USED);
            }
            if (ticket.getStatus() == TicketStatus.CANCELLED) {
                return TicketVerificationResult.invalid(TicketErrorCode.TICKET_CANCELLED);
            }
            if (!ticket.getConcertId().equals(eid)) {
                return TicketVerificationResult.invalid(TicketErrorCode.TICKET_INVALID_SIGNATURE);
            }

            return TicketVerificationResult.valid(ticket);
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            return TicketVerificationResult.invalid(TicketErrorCode.TICKET_EXPIRED);
        } catch (Exception e) {
            return TicketVerificationResult.invalid(TicketErrorCode.TICKET_INVALID_SIGNATURE);
        }
    }

    public String getPublicKeyPem() {
        if (!ticketJwtSigner.isConfigured()) {
            throw new TicketException(TicketErrorCode.TICKET_SIGNING_NOT_CONFIGURED);
        }
        java.security.PublicKey key = ticketJwtSigner.getPublicKey();
        byte[] encoded = key.getEncoded();
        String base64 = java.util.Base64.getEncoder().encodeToString(encoded);
        return "-----BEGIN PUBLIC KEY-----\n" + base64.replaceAll("(.{64})", "$1\n") + "\n-----END PUBLIC KEY-----";
    }

    @lombok.Getter
    public static class TicketVerificationResult {
        private final boolean valid;
        private final Ticket ticket;
        private final TicketErrorCode errorCode;

        private TicketVerificationResult(boolean valid, Ticket ticket, TicketErrorCode errorCode) {
            this.valid = valid;
            this.ticket = ticket;
            this.errorCode = errorCode;
        }

        public static TicketVerificationResult valid(Ticket ticket) {
            return new TicketVerificationResult(true, ticket, null);
        }

        public static TicketVerificationResult invalid(TicketErrorCode errorCode) {
            return new TicketVerificationResult(false, null, errorCode);
        }
    }
}
