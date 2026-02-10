package org.example.backend.live_session.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.user.enums.UserRole;

/**
 * 라이브 시작(세션 생성) 요청.
 * roomId = liveSessionId = 생성 후 반환되는 id.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class LiveSessionCreateRequest {
	@NotNull
	private String channelArn;

	@NotNull
	private String title;

	@NotNull
	private Boolean isPaid;
}
