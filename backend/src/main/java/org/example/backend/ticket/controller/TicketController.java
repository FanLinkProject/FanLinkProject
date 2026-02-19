package org.example.backend.ticket.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.ticket.dto.request.TicketSyncRequest;
import org.example.backend.ticket.dto.request.TicketVerifyRequest;
import org.example.backend.ticket.dto.response.TicketQrResponse;
import org.example.backend.ticket.dto.response.TicketResponse;
import org.example.backend.ticket.service.TicketService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping("/my")
    public ResponseEntity<List<TicketResponse>> getMyTickets(
            @AuthenticationPrincipal PrincipalDetails principal) {
        Long userId = principal.getUserId();
        List<TicketResponse> tickets = ticketService.getMyTickets(userId);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/{ticketCode}/qr")
    public ResponseEntity<TicketQrResponse> getTicketQr(
            @AuthenticationPrincipal PrincipalDetails principal,
            @PathVariable String ticketCode) {
        Long userId = principal.getUserId();
        TicketQrResponse response = ticketService.getTicketQr(userId, ticketCode);
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/{ticketCode}/qr/image", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getTicketQrImage(
            @AuthenticationPrincipal PrincipalDetails principal,
            @PathVariable String ticketCode) {
        Long userId = principal.getUserId();
        byte[] imageBytes = ticketService.getTicketQrImage(userId, ticketCode);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(imageBytes);
    }

    @PostMapping("/verify")
    public ResponseEntity<Void> verifyTicket(@Valid @RequestBody TicketVerifyRequest request) {
        ticketService.verifyAndUseTicket(request.token());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sync")
    public ResponseEntity<Void> syncTickets(@RequestBody TicketSyncRequest request) {
        ticketService.syncTickets(request.ticketCodes());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/public-key")
    public ResponseEntity<String> getPublicKey() {
        String pem = ticketService.getPublicKeyPem();
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(pem);
    }
}
