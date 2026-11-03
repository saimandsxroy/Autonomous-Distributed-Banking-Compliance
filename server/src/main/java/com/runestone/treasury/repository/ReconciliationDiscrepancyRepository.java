package com.runestone.treasury.repository;

import com.runestone.treasury.entity.ReconciliationDiscrepancy;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReconciliationDiscrepancyRepository
    extends JpaRepository<ReconciliationDiscrepancy, Long> {

  List<ReconciliationDiscrepancy> findByRunId(Long runId);

  List<ReconciliationDiscrepancy> findByRunIdOrderByIdAsc(Long runId);

  long countByResolutionStatus(String resolutionStatus);
}
