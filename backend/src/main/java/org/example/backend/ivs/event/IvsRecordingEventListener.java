package org.example.backend.ivs.event;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.ivs.config.IvsRecordingEventProperties;
import org.example.backend.live_session.entity.LiveSession;
import org.example.backend.live_session.repository.LiveSessionRepository;
import org.example.backend.replay.entity.Replay;
import org.example.backend.replay.entity.ReplayAccessType;
import org.example.backend.replay.entity.ReplayStatus;
import org.example.backend.replay.repository.ReplayRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@ConditionalOnProperty(prefix = "ivs.recording-events", name = "enabled", havingValue = "true")
public class IvsRecordingEventListener {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final SqsClient sqsClient;
    private final IvsRecordingEventProperties properties;
    private final LiveSessionRepository liveSessionRepository;
    private final ReplayRepository replayRepository;
    private final ObjectMapper objectMapper;

    public IvsRecordingEventListener(
            @Qualifier("ivsRecordingSqsClient") SqsClient sqsClient,
            IvsRecordingEventProperties properties,
            LiveSessionRepository liveSessionRepository,
            ReplayRepository replayRepository,
            ObjectMapper objectMapper) {
        this.sqsClient = sqsClient;
        this.properties = properties;
        this.liveSessionRepository = liveSessionRepository;
        this.replayRepository = replayRepository;
        this.objectMapper = objectMapper;
    }

    // IVS 녹화 이벤트 SQS를 폴링한다.
    @Scheduled(fixedDelayString = "${ivs.recording-events.poll-fixed-delay-ms:5000}")
    public void poll() {
        if (properties.getQueueUrl() == null || properties.getQueueUrl().isBlank()) {
            return;
        }
        ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                .queueUrl(properties.getQueueUrl())
                .maxNumberOfMessages(properties.getMaxMessages())
                .waitTimeSeconds(properties.getWaitSeconds())
                .visibilityTimeout(properties.getVisibilityTimeoutSeconds())
                .build();
        for (Message message : sqsClient.receiveMessage(request).messages()) {
            handleMessage(message);
        }
    }

    @Transactional
    protected void handleMessage(Message message) {
        try {
            Map<String, Object> payload = parseMessageBody(message.body());
            Map<String, Object> detail = asMap(payload.get("detail"));
            String channelArn = firstNonBlank(
                    getString(detail, "channel_arn"),
                    getString(detail, "channelArn"),
                    getString(payload, "channel_arn"),
                    getString(payload, "channelArn")
            );
            String recordingBucket = firstNonBlank(
                    getString(detail, "recording_s3_bucket_name"),
                    getString(detail, "recordingS3Bucket"),
                    getString(detail, "recording_s3_bucket"),
                    getString(detail, "recordingS3BucketName")
            );
            String recordingPrefix = firstNonBlank(
                    getString(detail, "recording_s3_key_prefix"),
                    getString(detail, "recordingS3KeyPrefix"),
                    getString(detail, "recording_s3_prefix"),
                    getString(detail, "recordingS3Prefix")
            );

            if (channelArn == null || channelArn.isBlank()) {
                log.warn("IVS recording event without channelArn. messageId={}", message.messageId());
                deleteMessage(message);
                return;
            }

            Optional<LiveSession> optionalSession = liveSessionRepository.findByChannelArn(channelArn);
            if (optionalSession.isEmpty()) {
                log.warn("No LiveSession found for channelArn={}. messageId={}", channelArn, message.messageId());
                deleteMessage(message);
                return;
            }

            LiveSession session = optionalSession.get();
            session.markRecorded(recordingBucket, recordingPrefix);
            liveSessionRepository.save(session);
            createReplayIfAbsent(session);
            deleteMessage(message);
        } catch (Exception ex) {
            log.error("Failed to handle IVS recording event. messageId={}", message.messageId(), ex);
        }
    }

    private Map<String, Object> parseMessageBody(String body) throws Exception {
        if (body == null || body.isBlank()) {
            return Collections.emptyMap();
        }
        return objectMapper.readValue(body, MAP_TYPE);
    }

    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return objectMapper.convertValue(map, MAP_TYPE);
        }
        return Collections.emptyMap();
    }

    private String getString(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value instanceof String str ? str : null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private void deleteMessage(Message message) {
        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(properties.getQueueUrl())
                .receiptHandle(message.receiptHandle())
                .build());
    }

    // 자동 녹화본에 대한 Replay를 생성한다(존재하면 스킵).
    private void createReplayIfAbsent(LiveSession session) {
        if (session == null || session.getId() == null) {
            return;
        }
        if (replayRepository.existsByLiveSessionId(session.getId())) {
            return;
        }
        ReplayAccessType accessType = session.isPaid() ? ReplayAccessType.PAID : ReplayAccessType.FREE;
        Replay replay = new Replay(
                session.getArtistId(),
                session.getId(),
                accessType,
                ReplayStatus.READY,
                session.getRecordingS3Bucket(),
                session.getRecordingS3Prefix(),
                Instant.now()
        );
        replayRepository.save(replay);
    }
}
