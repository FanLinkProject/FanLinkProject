package org.example.backend.replay.policy;

import org.example.backend.replay.entity.Replay;
import org.example.backend.replay.entity.ReplayAccessType;
import org.example.backend.replay.entity.ReplayStatus;
import org.springframework.stereotype.Component;

@Component
public class ReplayAccessPolicy {

    // 재생 접근 가능 여부를 판단한다.
    public boolean canIssueAccess(Replay replay, boolean isSubscribed) {
        if (replay.getStatus() != ReplayStatus.PUBLISHED && replay.getStatus() != ReplayStatus.READY) {
            return false;
        }
        if (replay.getAccessType() == ReplayAccessType.FREE) {
            return true;
        }
        return isSubscribed;
    }
}
