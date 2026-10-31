package com.runestone.treasury.repository;

import com.runestone.treasury.entity.SettlementBatchItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SettlementBatchItemRepository extends JpaRepository<SettlementBatchItem, Long> {

  List<SettlementBatchItem> findByBatchIdOrderByRowNumberAsc(Long batchId);
}
