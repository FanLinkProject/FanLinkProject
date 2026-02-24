package org.example.backend.media_asset.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.config.AwsProperties;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URL;
import java.time.Duration;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class S3MediaClient {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final AwsProperties awsProperties;

    // S3에 대한 presigned PUT URL을 생성한다.
    // Content-Type을 서명에 넣지 않아, 클라이언트가 보내는 Content-Type과 불일치로 403이 나지 않도록 함.
    // 클라이언트는 응답의 requiredHeaders(Content-Type)를 PUT 요청에 넣어 객체 메타데이터를 설정할 수 있다.
    public PresignedUpload presignPut(String objectKey, String contentType, Duration duration) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(awsProperties.getS3().getBucketName())
                .key(objectKey)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(duration)
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presignRequest);
        URL url = presigned.url();
        return new PresignedUpload(url.toString(), Map.of("Content-Type", contentType));
    }

    // S3 HEAD로 객체 메타데이터를 조회한다. 없으면 null 반환.
    public HeadObjectInfo headObject(String objectKey) {
        HeadObjectRequest request = HeadObjectRequest.builder()
                .bucket(awsProperties.getS3().getBucketName())
                .key(objectKey)
                .build();
        try {
            HeadObjectResponse response = s3Client.headObject(request);
            return new HeadObjectInfo(response.contentType(), response.contentLength());
        } catch (NoSuchKeyException e) {
            return null;
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                return null;
            }
            throw e;
        }
    }

    // S3 객체를 멱등적으로 삭제한다(실패는 무시).
    public void deleteObjectQuietly(String objectKey) {
        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(awsProperties.getS3().getBucketName())
                .key(objectKey)
                .build();
        try {
            s3Client.deleteObject(request);
        } catch (SdkException ignored) {
            // ignore idempotent delete failures
        }
    }

    public record PresignedUpload(String uploadUrl, Map<String, String> requiredHeaders) {
    }

    public record HeadObjectInfo(String contentType, long contentLength) {
    }
}
