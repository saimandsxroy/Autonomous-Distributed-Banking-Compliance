package com.runestone.treasury.repository;

import com.runestone.treasury.entity.OutboxEvent;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.util.List;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class OutboxEventRepositoryImpl implements OutboxEventRepositoryCustom {

  @PersistenceContext private EntityManager entityManager;

  @Override
  @Transactional
  @SuppressWarnings("unchecked")
  public List<OutboxEvent> pollPendingEvents(int limit) {
    String sql =
        "SELECT * FROM outbox_events"
            + " WHERE status = 'PENDING' AND next_attempt_at <= NOW(6)"
            + " ORDER BY created_at ASC"
            + " LIMIT :limit"
            + " FOR UPDATE SKIP LOCKED";
    Query query = entityManager.createNativeQuery(sql, OutboxEvent.class);
    query.setParameter("limit", limit);
    return query.getResultList();
  }
}
