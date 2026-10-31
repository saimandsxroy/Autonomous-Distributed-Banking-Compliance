package com.runestone.treasury.repository;

import com.runestone.treasury.entity.WebhookDelivery;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WebhookDeliveryRepository extends JpaRepository<WebhookDelivery, Long> {
  Optional<WebhookDelivery> findByEventId(String eventId);

  List<WebhookDelivery> findAllByOrderByCreatedAtDesc();
}
