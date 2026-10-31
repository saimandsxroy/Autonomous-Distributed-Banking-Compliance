package com.runestone.treasury.repository;

import com.runestone.treasury.entity.OutboxEvent;
import java.util.List;

public interface OutboxEventRepositoryCustom {
  List<OutboxEvent> pollPendingEvents(int limit);
}
