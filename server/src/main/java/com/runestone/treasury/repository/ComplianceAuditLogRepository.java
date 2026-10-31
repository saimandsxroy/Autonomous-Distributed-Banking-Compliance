package com.runestone.treasury.repository;

import com.runestone.treasury.entity.ComplianceAuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplianceAuditLogRepository extends JpaRepository<ComplianceAuditLog, Long> {
  List<ComplianceAuditLog> findByActorUserNameOrderByCreatedAtDesc(String actorUserName);

  List<ComplianceAuditLog> findAllByOrderByIdAsc();
}
