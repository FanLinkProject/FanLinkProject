package org.example.backend.replay.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.replay.config.MediaConvertProperties;
import org.example.backend.replay.entity.Replay;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;
import software.amazon.awssdk.services.mediaconvert.model.CreateJobRequest;
import software.amazon.awssdk.services.mediaconvert.model.CreateJobResponse;
import software.amazon.awssdk.services.mediaconvert.model.Input;
import software.amazon.awssdk.services.mediaconvert.model.JobSettings;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaConvertJobService {

    private final ObjectProvider<MediaConvertClient> mediaConvertClientProvider;
    private final MediaConvertProperties properties;
    private final AwsProperties awsProperties;

    // MediaConvert job을 생성하고 jobId를 반환한다.
    public String submitReplayJob(Replay replay, String inputKey) {
        if (!properties.isEnabled()) {
            log.warn("MediaConvert is disabled. replayId={}", replay != null ? replay.getId() : null);
            return null;
        }
        MediaConvertClient client = mediaConvertClientProvider.getIfAvailable();
        if (client == null) {
            log.warn("MediaConvert client is not configured. replayId={}", replay != null ? replay.getId() : null);
            return null;
        }
        if (replay == null || replay.getId() == null) {
            return null;
        }
        if (inputKey == null || inputKey.isBlank()) {
            return null;
        }
        String inputUrl = "s3://" + awsProperties.getS3().getBucketName() + "/" + trimLeadingSlash(inputKey);
        JobSettings settings = JobSettings.builder()
                .inputs(Input.builder().fileInput(inputUrl).build())
                .build();

        CreateJobRequest.Builder requestBuilder = CreateJobRequest.builder()
                .role(properties.getRoleArn())
                .jobTemplate(properties.getJobTemplate())
                .settings(settings)
                .userMetadata(Map.of(
                        "replayId", replay.getId().toString(),
                        "source", "manual"
                ));
        if (properties.getQueueArn() != null && !properties.getQueueArn().isBlank()) {
            requestBuilder.queue(properties.getQueueArn());
        }
        CreateJobResponse response = client.createJob(requestBuilder.build());
        String jobId = response.job().id();
        log.info("MediaConvert job created. replayId={}, jobId={}", replay.getId(), jobId);
        return jobId;
    }

    public String buildDerivedMasterKey(Long replayId) {
        String prefix = properties.getOutputPrefix() == null ? "derived/replays" : properties.getOutputPrefix();
        String subpath = properties.getOutputSubpath() == null ? "cmaf" : properties.getOutputSubpath();
        String master = properties.getMasterManifest();
        if (master == null || master.isBlank()) {
            return null;
        }
        return trimTrailingSlash(prefix) + "/" + replayId + "/" + trimLeadingSlash(subpath) + "/" + master;
    }

    private String trimLeadingSlash(String value) {
        if (value == null) {
            return "";
        }
        return value.startsWith("/") ? value.substring(1) : value;
    }

    private String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
