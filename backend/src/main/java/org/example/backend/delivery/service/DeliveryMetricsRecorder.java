package org.example.backend.delivery.service;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class DeliveryMetricsRecorder {

    private final MeterRegistry meterRegistry;

    public void incrementWebhookReceived(String provider) {
        meterRegistry.counter("delivery.webhook.received", "provider", normalize(provider)).increment();
    }

    public void incrementWebhookProcessed(String provider) {
        meterRegistry.counter("delivery.webhook.processed", "provider", normalize(provider)).increment();
    }

    public void incrementWebhookFailed(String provider, String reason) {
        meterRegistry.counter(
                "delivery.webhook.failed",
                "provider", normalize(provider),
                "reason", normalize(reason)
        ).increment();
    }

    public void recordTrackingApiLatency(String tracker, String outcome, Duration duration) {
        Timer.builder("delivery.tracking.api.latency")
                .tag("tracker", normalize(tracker))
                .tag("outcome", normalize(outcome))
                .publishPercentiles(0.5, 0.95)
                .register(meterRegistry)
                .record(duration);
    }

    public void incrementTrackingApiFailed(String tracker, String reason) {
        meterRegistry.counter(
                "delivery.tracking.api.failed",
                "tracker", normalize(tracker),
                "reason", normalize(reason)
        ).increment();
    }

    public void incrementStatusTransition(DeliveryStatus from, DeliveryStatus to, String reason) {
        meterRegistry.counter(
                "delivery.status.transition",
                "from", from != null ? from.name() : "UNKNOWN",
                "to", to != null ? to.name() : "UNKNOWN",
                "reason", normalize(reason)
        ).increment();
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.trim().toLowerCase();
    }
}
