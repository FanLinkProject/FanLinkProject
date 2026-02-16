package org.example.backend.media_asset.metadata;

import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.media_asset.config.MediaProperties;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.core.sync.ResponseTransformer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Component
public class FfprobeVideoMetadataExtractor implements VideoMetadataExtractor {

    private final S3Client s3Client;
    private final String bucketName;
    private final String ffprobePath;
    private final Duration timeout;

    // S3에서 파일을 내려받아 ffprobe로 길이를 추출한다.
    public FfprobeVideoMetadataExtractor(S3Client s3Client,
                                         AwsProperties awsProperties,
                                         MediaProperties mediaProperties) {
        this.s3Client = s3Client;
        this.bucketName = awsProperties.getS3().getBucketName();
        this.ffprobePath = mediaProperties.getMetadata().getFfprobePath();
        this.timeout = Duration.ofSeconds(mediaProperties.getMetadata().getFfprobeTimeoutSeconds());
    }

    @Override
    // objectKey로부터 실제 영상 길이를 추출한다.
    public Optional<Long> extractDurationSeconds(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return Optional.empty();
        }
        if (bucketName == null || bucketName.isBlank()) {
            return Optional.empty();
        }
        if (ffprobePath == null || ffprobePath.isBlank()) {
            return Optional.empty();
        }
        Path tempFile = null;
        try {
            tempFile = Files.createTempFile("media-asset-", ".mp4");
            downloadToTempFile(objectKey, tempFile);
            Double duration = runFfprobe(tempFile);
            if (duration == null) {
                return Optional.empty();
            }
            long seconds = (long) Math.ceil(duration);
            return Optional.of(seconds);
        } catch (IOException | RuntimeException ex) {
            return Optional.empty();
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException ignored) {
                    // cleanup 실패는 무시한다.
                }
            }
        }
    }

    // S3에서 objectKey 파일을 다운로드한다.
    private void downloadToTempFile(String objectKey, Path target) {
        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .build();
            s3Client.getObject(request, ResponseTransformer.toFile(target));
        } catch (S3Exception ex) {
            throw new IllegalStateException("S3 파일 다운로드 실패: " + ex.getMessage(), ex);
        }
    }

    // ffprobe 실행 결과에서 duration 값을 파싱한다.
    private Double runFfprobe(Path target) {
        ProcessBuilder builder = new ProcessBuilder(
                ffprobePath,
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                target.toString()
        );
        builder.redirectErrorStream(true);
        try {
            Process process = builder.start();
            boolean finished = process.waitFor(timeout.toSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return null;
            }
            if (process.exitValue() != 0) {
                return null;
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line == null || line.isBlank()) {
                    return null;
                }
                return Double.parseDouble(line.trim());
            }
        } catch (IOException | InterruptedException | NumberFormatException ex) {
            Thread.currentThread().interrupt();
            return null;
        }
    }
}
