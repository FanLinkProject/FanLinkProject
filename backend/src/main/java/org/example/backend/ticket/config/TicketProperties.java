package org.example.backend.ticket.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "ticket")
public class TicketProperties {

    /** 파일 경로 (ticket.private-key-path 또는 TICKET_PRIVATE_KEY_PATH) */
    private String privateKeyPath;
    /** 파일 경로 (ticket.public-key-path 또는 TICKET_PUBLIC_KEY_PATH) */
    private String publicKeyPath;

    /**
     * PEM 내용 직접 지정. env에 넣을 때 \n을 실제 줄바꿈으로 치환해서 사용.
     * privateKey가 있으면 privateKeyPath보다 우선.
     */
    private String privateKey;
    /**
     * PEM 내용 직접 지정. env에 넣을 때 \n을 실제 줄바꿈으로 치환해서 사용.
     * publicKey가 있으면 publicKeyPath보다 우선.
     */
    private String publicKey;

    private int qrExpireHours = 48;
}
