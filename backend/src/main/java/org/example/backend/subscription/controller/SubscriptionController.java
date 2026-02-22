package org.example.backend.subscription.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.repository.ChatRoomRepository;
import org.example.backend.chat.service.ChatDMService;
import org.example.backend.subscription.dto.CheckDmResponse;
import org.example.backend.subscription.dto.CreateCandySubscriptionRequest;
import org.example.backend.subscription.dto.CreateCashSubscriptionRequest;
import org.example.backend.subscription.dto.SubscriptionResponse;
import org.example.backend.subscription.entity.Subscription;
import org.example.backend.subscription.service.SubscriptionService;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.example.backend.global.security.details.PrincipalDetails;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

        private final SubscriptionService subscriptionService;
        private final ChatDMService chatDMService;
        private final ChatRoomRepository chatRoomRepository;
        private final UserRepository userRepository;

        /**
         * 현금 구독 생성 (캔디 정기 충전)
         * 빌링키 발급 후 첫 결제를 수행합니다.
         *
         * @param request   구독할 상품 ID, PG 인증 키(authKey, customerKey), orderNo
         * @param principal 인증된 사용자 (구독자 ID는 principal.getUser().getId()로 전달)
         * @return 생성된 구독 정보
         */
        @PostMapping("/cash")
        public ResponseEntity<SubscriptionResponse> createCashSubscription(
                        @RequestBody CreateCashSubscriptionRequest request,
                        @AuthenticationPrincipal PrincipalDetails principal) {
                Subscription subscription = subscriptionService.createCashSubscription(
                                principal.getUser().getId(),
                                request.getProductId(),
                                request.getAuthKey(),
                                request.getCustomerKey(),
                                request.getOrderNo());

                return ResponseEntity.ok(SubscriptionResponse.fromEntity(subscription));
        }

        /**
         * 캔디 구독 생성 (멤버십/DM)
         * 유저의 보유 캔디를 차감하여 구독을 시작합니다.
         * 아티스트 상품인 경우 정산 대기 데이터(SettlementPending)가 생성됩니다.
         *
         * @param request   구독할 상품 ID
         * @param principal 인증된 사용자 (구독자 ID는 principal.getUser().getId()로 전달)
         * @return 생성된 구독 정보
         */
        @PostMapping("/candy")
        public ResponseEntity<SubscriptionResponse> createCandySubscription(
                        @RequestBody CreateCandySubscriptionRequest request,
                        @AuthenticationPrincipal PrincipalDetails principal) {
                Subscription subscription = subscriptionService.createCandySubscription(
                                principal.getUser().getId(),
                                request.getProductId());

                return ResponseEntity.ok(SubscriptionResponse.fromEntity(subscription));
        }

        /**
         * 구독을 해지합니다.
         *
         * @param subscriptionId 구독 ID
         * @param principal      인증된 사용자 (본인 확인용)
         */
        @DeleteMapping("/{subscriptionId}")
        public ResponseEntity<Void> cancelSubscription(
                        @PathVariable Long subscriptionId,
                        @AuthenticationPrincipal PrincipalDetails principal) {
                subscriptionService.cancelSubscription(subscriptionId, principal.getUser().getId());
                return ResponseEntity.noContent().build();
        }

        /**
         * 내 구독 목록을 조회합니다.
         * 현재 활성화된(isActive=true) 구독만 반환합니다.
         */
        @GetMapping("/me")
        public ResponseEntity<List<SubscriptionResponse>> getMySubscriptions(
                        @AuthenticationPrincipal PrincipalDetails principal) {
                List<Subscription> subscriptions = subscriptionService.getMySubscriptions(principal.getUser().getId());
                List<SubscriptionResponse> responses = subscriptions.stream()
                                .map(SubscriptionResponse::fromEntity)
                                .collect(Collectors.toList());

                return ResponseEntity.ok(responses);
        }

        /**
         * 해당 아티스트와의 DM 구독 여부 및 채팅방 ID 조회.
         * 구독 중이면 채팅방 입장을 위해 join 후 roomId를 반환합니다.
         */
        @GetMapping("/check-dm")
        public ResponseEntity<CheckDmResponse> checkDmSubscription(
                        @RequestParam Long artistId,
                        @AuthenticationPrincipal PrincipalDetails principal) {
                Long userId = principal.getUser().getId();
                if (!subscriptionService.hasActiveDmSubscription(userId, artistId)) {
                        return ResponseEntity.ok(CheckDmResponse.notSubscribed());
                }
                chatDMService.joinChatDMRoom(userId, artistId);
                User artist = userRepository.findById(artistId)
                        .orElseThrow(() -> new IllegalArgumentException("아티스트를 찾을 수 없습니다."));
                ChatRoom room = chatRoomRepository.findByOwner(artist)
                        .orElseThrow(() -> new IllegalStateException("DM 채팅방을 찾을 수 없습니다."));
                return ResponseEntity.ok(CheckDmResponse.subscribed(room.getId()));
        }
}
