package org.example.backend.live_session.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.live_session.enums.LiveSessionStatus;

import java.time.Instant;

/**
 * LiveSession 단건/목록 응답.
 * id = liveSessionId = roomId (채팅/Replay에서 사용).
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveSessionResponse {

	private Long id;
	private Long artistId;
	private String artistNickname;
	private String channelArn;
	private Boolean isPaid;
	private String title;
	private LiveSessionStatus status;
	private Instant startedAt;
	private Instant endedAt;
	private String streamId;
	private String recordingS3Bucket;
	private String recordingS3Prefix;
	private Instant expiresAt;
}
