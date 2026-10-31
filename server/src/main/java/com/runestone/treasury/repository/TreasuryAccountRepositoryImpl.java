package com.runestone.treasury.repository;

import com.runestone.treasury.entity.TreasuryAccount;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class TreasuryAccountRepositoryImpl implements TreasuryAccountRepositoryCustom {

  @PersistenceContext private EntityManager entityManager;

  @Override
  public List<TreasuryAccount> lockAccountsInOrder(List<Long> accountIds) {
    if (accountIds == null || accountIds.isEmpty()) {
      return Collections.emptyList();
    }
    String sql = "SELECT a FROM TreasuryAccount a WHERE a.id IN :ids ORDER BY a.id ASC";
    TypedQuery<TreasuryAccount> query = entityManager.createQuery(sql, TreasuryAccount.class);
    query.setParameter("ids", accountIds);
    query.setLockMode(LockModeType.PESSIMISTIC_WRITE);
    return query.getResultList();
  }
}
