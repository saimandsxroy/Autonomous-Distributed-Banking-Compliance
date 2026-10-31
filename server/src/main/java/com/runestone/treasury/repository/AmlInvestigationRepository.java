package com.runestone.treasury.repository;

import com.runestone.treasury.entity.AmlInvestigation;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AmlInvestigationRepository extends JpaRepository<AmlInvestigation, Long> {

  Optional<AmlInvestigation> findByBalanceHoldId(Long balanceHoldId);
}
