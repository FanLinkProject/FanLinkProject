package org.example.backend.live_session.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * IVS 녹화 종료 이벤트 요청 (internal API).
 * channelArn + artistId로 세션 매칭 후 RECORDED 전환 및 S3 정보 저장.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RecordingEndRequest {

	@NotNull
	private String channelArn;

	@NotNull
	private Long artistId;

	@NotNull
	private Boolean isPaid;

	@NotNull
	private String recordingS3Bucket;

	@NotNull
	private String recordingS3Prefix;

	private OffsetDateTime startedAt;
	private OffsetDateTime endedAt;
}
