package com.runestone.treasury.repository;

import com.runestone.treasury.entity.HitlApprovalRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HitlApprovalRequestRepository extends JpaRepository<HitlApprovalRequest, Long> {

  List<HitlApprovalRequest> findByStatusOrderByCreatedAtDesc(String status);

  Optional<HitlApprovalRequest> findByBalanceHoldId(Long balanceHoldId);

  Optional<HitlApprovalRequest> findByInvestigationId(Long investigationId);
}
