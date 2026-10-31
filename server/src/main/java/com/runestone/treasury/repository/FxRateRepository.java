package com.runestone.treasury.repository;

import com.runestone.treasury.entity.FxRate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FxRateRepository extends JpaRepository<FxRate, Long> {

  Optional<FxRate> findByBaseCurrencyAndTargetCurrency(String baseCurrency, String targetCurrency);

  List<FxRate> findAll();
}
