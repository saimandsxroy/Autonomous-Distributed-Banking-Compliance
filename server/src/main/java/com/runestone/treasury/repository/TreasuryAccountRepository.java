package com.runestone.treasury.repository;

import com.runestone.treasury.entity.TreasuryAccount;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface TreasuryAccountRepository
    extends JpaRepository<TreasuryAccount, Long>, TreasuryAccountRepositoryCustom {
  Optional<TreasuryAccount> findByAccountNumber(String accountNumber);

  List<TreasuryAccount> findByUserId(Long userId);

  @Query("SELECT COALESCE(SUM(t.postedBalance), 0) FROM TreasuryAccount t WHERE t.currency = 'USD'")
  BigDecimal sumUsdPostedBalance();
}
