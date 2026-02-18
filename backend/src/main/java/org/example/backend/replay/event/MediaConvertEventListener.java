package org.example.backend.replay.event;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.replay.config.MediaConvertProperties;
import org.example.backend.replay.entity.Replay;
import org.example.backend.replay.entity.ReplayStatus;
import org.example.backend.replay.repository.ReplayRepository;
import org.example.backend.replay.service.MediaConvertJobService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "mediaconvert.events", name = "enabled", havingValue = "true")
public class MediaConvertEventListener {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final SqsClient sqsClient;
    private final MediaConvertProperties properties;
    private final ReplayRepository replayRepository;
    private final MediaConvertJobService jobService;
    private final ObjectMapper objectMapper;

    // MediaConvert 완료 이벤트 SQS를 폴링한다.
    @Scheduled(fixedDelayString = "${mediaconvert.events.poll-fixed-delay-ms:5000}")
    public void poll() {
        String queueUrl = properties.getEvents().getQueueUrl();
        if (queueUrl == null || queueUrl.isBlank()) {
            return;
        }
        ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                .queueUrl(queueUrl)
                .maxNumberOfMessages(properties.getEvents().getMaxMessages())
                .waitTimeSeconds(properties.getEvents().getWaitSeconds())
                .visibilityTimeout(properties.getEvents().getVisibilityTimeoutSeconds())
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
            String jobId = firstNonBlank(
                    getString(detail, "jobId"),
                    getString(detail, "job_id")
            );
            String status = firstNonBlank(
                    getString(detail, "status"),
                    getString(detail, "state")
            );

            if (jobId == null || jobId.isBlank()) {
                log.warn("MediaConvert event without jobId. messageId={}", message.messageId());
                deleteMessage(message);
                return;
            }

            Optional<Replay> optionalReplay = replayRepository.findByMediaConvertJobId(jobId);
            if (optionalReplay.isEmpty()) {
                log.warn("No Replay found for MediaConvert jobId={}. messageId={}", jobId, message.messageId());
                deleteMessage(message);
                return;
            }

            Replay replay = optionalReplay.get();
            if (isSuccessStatus(status)) {
                replay.changeStatus(ReplayStatus.READY);
                String manifestKey = extractMasterManifestKey(detail);
                if (manifestKey == null || manifestKey.isBlank()) {
                    manifestKey = jobService.buildDerivedMasterKey(replay.getId());
                }
                if (manifestKey == null || manifestKey.isBlank()) {
                    log.warn("MediaConvert success but manifest not resolved. replayId={}, jobId={}",
                            replay.getId(), jobId);
                } else {
                    replay.updateHlsMasterManifestKey(manifestKey);
                }
                replay.updateRejectReason(null);
            } else if (status != null) {
                replay.markRejected("MediaConvert status=" + status);
            }
            replayRepository.save(replay);
            deleteMessage(message);
        } catch (Exception ex) {
            log.error("Failed to handle MediaConvert event. messageId={}", message.messageId(), ex);
        }
    }

    private boolean isSuccessStatus(String status) {
        return status != null && (status.equalsIgnoreCase("COMPLETE") || status.equalsIgnoreCase("SUCCEEDED"));
    }

    @SuppressWarnings("unchecked")
    private String extractMasterManifestKey(Map<String, Object> detail) {
        if (detail == null) {
            return null;
        }
        Object groups = detail.get("outputGroupDetails");
        if (!(groups instanceof Iterable<?> iterable)) {
            return null;
        }
        String candidate = null;
        for (Object group : iterable) {
            if (!(group instanceof Map<?, ?> groupMap)) {
                continue;
            }
            Object outputs = groupMap.get("outputDetails");
            if (!(outputs instanceof Iterable<?> outputIterable)) {
                continue;
            }
            for (Object output : outputIterable) {
                if (!(output instanceof Map<?, ?> outputMap)) {
                    continue;
                }
                Object paths = outputMap.get("outputFilePaths");
                if (!(paths instanceof Iterable<?> pathIterable)) {
                    continue;
                }
                for (Object path : pathIterable) {
                    if (!(path instanceof String pathStr)) {
                        continue;
                    }
                    if (!pathStr.endsWith(".m3u8")) {
                        continue;
                    }
                    String key = toObjectKey(pathStr);
                    if (candidate == null || key.length() < candidate.length()) {
                        candidate = key;
                    }
                }
            }
        }
        return candidate;
    }

    private String toObjectKey(String s3Path) {
        String normalized = s3Path == null ? "" : s3Path.trim();
        if (normalized.startsWith("s3://")) {
            int idx = normalized.indexOf('/', "s3://".length());
            if (idx > 0 && idx + 1 < normalized.length()) {
                return normalized.substring(idx + 1);
            }
        }
        return normalized;
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
                .queueUrl(properties.getEvents().getQueueUrl())
                .receiptHandle(message.receiptHandle())
                .build());
    }
}
