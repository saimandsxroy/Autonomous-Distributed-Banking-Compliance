package com.runestone.treasury.repository;

import com.runestone.treasury.entity.BalanceHold;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BalanceHoldRepository extends JpaRepository<BalanceHold, Long> {
  Optional<BalanceHold> findByIdempotencyKey(String idempotencyKey);

  List<BalanceHold> findByStatus(String status);
}
