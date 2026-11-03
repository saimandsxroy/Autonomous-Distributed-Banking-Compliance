package com.runestone.treasury.repository;

import com.runestone.treasury.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OutboxEventRepository
    extends JpaRepository<OutboxEvent, Long>, OutboxEventRepositoryCustom {
  long countByStatus(String status);
}
