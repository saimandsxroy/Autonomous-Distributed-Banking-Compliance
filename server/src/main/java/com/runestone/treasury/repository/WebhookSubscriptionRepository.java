package com.runestone.treasury.repository;

import com.runestone.treasury.entity.WebhookSubscription;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WebhookSubscriptionRepository extends JpaRepository<WebhookSubscription, Long> {
  List<WebhookSubscription> findByUserNameAndActiveTrue(String userName);
}
