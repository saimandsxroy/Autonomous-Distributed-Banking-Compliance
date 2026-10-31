package com.runestone.treasury.repository;

import com.runestone.treasury.entity.SettlementBatch;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SettlementBatchRepository extends JpaRepository<SettlementBatch, Long> {

  Optional<SettlementBatch> findByBatchReference(String batchReference);

  Optional<SettlementBatch> findByFileSha256Hash(String fileSha256Hash);

  List<SettlementBatch> findAllByOrderByCreatedAtDesc();
}
