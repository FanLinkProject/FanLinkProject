package org.example.backend.milestone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoUpgradeResultResponse {
    private int artistCount;
    private int fanProcessedCount;
}
