package com.runestone.treasury.repository;

import com.runestone.treasury.entity.ReconciliationRun;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReconciliationRunRepository extends JpaRepository<ReconciliationRun, Long> {

  Optional<ReconciliationRun> findByStatementReference(String statementReference);

  List<ReconciliationRun> findAllByOrderByCreatedAtDesc();
}
