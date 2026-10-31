package com.runestone.treasury.repository;

import com.runestone.treasury.entity.TreasuryAccount;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TreasuryAccountRepository
    extends JpaRepository<TreasuryAccount, Long>, TreasuryAccountRepositoryCustom {
  Optional<TreasuryAccount> findByAccountNumber(String accountNumber);

  List<TreasuryAccount> findByUserId(Long userId);
}
