package org.example.backend.settlement.event;

import lombok.Getter;
import org.example.backend.order.entity.Order;
import org.example.backend.payment.entity.Payment;
import org.springframework.context.ApplicationEvent;

/**
 * 결제 완료 이벤트
 * 결제가 성공적으로 완료되었을 때 발행되며, 정산 대기 데이터 생성 등의 후속 처리를 트리거합니다.
 */
@Getter
public class PaymentCompletedEvent extends ApplicationEvent {

    private final Payment payment;
    private final Order order;

    /**
     * 결제 완료 이벤트 생성자
     *
     * @param source  이벤트를 발행한 소스 객체
     * @param payment 완료된 결제 정보
     * @param order   주문 정보 (구독 결제인 경우 가상 주문)
     */
    public PaymentCompletedEvent(Object source, Payment payment, Order order) {
        super(source);
        this.payment = payment;
        this.order = order;
    }
}
