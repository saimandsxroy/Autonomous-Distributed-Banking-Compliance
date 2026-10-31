package com.runestone.treasury.repository;

import com.runestone.treasury.entity.TreasuryAccount;
import java.util.List;

public interface TreasuryAccountRepositoryCustom {
  List<TreasuryAccount> lockAccountsInOrder(List<Long> accountIds);
}
