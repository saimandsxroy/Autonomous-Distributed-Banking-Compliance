package com.runestone.treasury.service;

import com.runestone.treasury.entity.FxRate;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.repository.FxRateRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FxTreasuryService {

  private static final Logger log = LoggerFactory.getLogger(FxTreasuryService.class);

  @Autowired private FxRateRepository fxRateRepository;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  public List<FxRate> getAllRates() {
    return fxRateRepository.findAll();
  }

  public Optional<FxRate> getRate(String baseCurrency, String targetCurrency) {
    if (baseCurrency == null || targetCurrency == null) {
      return Optional.empty();
    }
    return fxRateRepository.findByBaseCurrencyAndTargetCurrency(
        baseCurrency.toUpperCase().trim(), targetCurrency.toUpperCase().trim());
  }

  public Map<String, Object> calculateQuote(
      String fromCurrency, String toCurrency, BigDecimal amount) {
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new IllegalArgumentException("FX quote amount must be greater than zero");
    }
    if (fromCurrency == null || toCurrency == null) {
      throw new IllegalArgumentException("Both fromCurrency and toCurrency must be provided");
    }

    String from = fromCurrency.toUpperCase().trim();
    String to = toCurrency.toUpperCase().trim();

    Map<String, Object> quote = new HashMap<>();
    quote.put("fromCurrency", from);
    quote.put("toCurrency", to);
    quote.put("sourceAmount", amount.setScale(4, RoundingMode.HALF_UP));
    quote.put("timestamp", LocalDateTime.now());

    if (from.equals(to)) {
      quote.put("spreadBps", 0);
      quote.put("spreadFeePercent", "0.00%");
      quote.put("feeAmount", BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP));
      quote.put("netPrincipal", amount.setScale(4, RoundingMode.HALF_UP));
      quote.put("exchangeRate", BigDecimal.ONE.setScale(6, RoundingMode.HALF_UP));
      quote.put("effectiveRate", BigDecimal.ONE.setScale(6, RoundingMode.HALF_UP));
      quote.put("convertedTargetAmount", amount.setScale(4, RoundingMode.HALF_UP));
      return quote;
    }

    Optional<FxRate> rateOpt = fxRateRepository.findByBaseCurrencyAndTargetCurrency(from, to);
    BigDecimal exchangeRate;
    int spreadBps = 50;

    if (rateOpt.isPresent()) {
      FxRate fxRate = rateOpt.get();
      exchangeRate = fxRate.getExchangeRate();
      if (fxRate.getSpreadBps() != null) {
        spreadBps = fxRate.getSpreadBps();
      }
    } else {
      // Check if reciprocal rate exists
      Optional<FxRate> reciprocalOpt =
          fxRateRepository.findByBaseCurrencyAndTargetCurrency(to, from);
      if (reciprocalOpt.isPresent()) {
        FxRate reciprocal = reciprocalOpt.get();
        exchangeRate = BigDecimal.ONE.divide(reciprocal.getExchangeRate(), 6, RoundingMode.HALF_UP);
        if (reciprocal.getSpreadBps() != null) {
          spreadBps = reciprocal.getSpreadBps();
        }
      } else {
        throw new IllegalStateException(
            "No FX exchange rate configured for currency pair: " + from + "/" + to);
      }
    }

    // spreadBps: 50 bps = 0.50%
    BigDecimal feeMultiplier =
        BigDecimal.valueOf(spreadBps).divide(BigDecimal.valueOf(10000), 6, RoundingMode.HALF_UP);
    BigDecimal feeAmount = amount.multiply(feeMultiplier).setScale(4, RoundingMode.HALF_UP);
    BigDecimal netPrincipal = amount.subtract(feeAmount).setScale(4, RoundingMode.HALF_UP);
    BigDecimal convertedAmount =
        netPrincipal.multiply(exchangeRate).setScale(4, RoundingMode.HALF_UP);
    BigDecimal effectiveRate = convertedAmount.divide(amount, 6, RoundingMode.HALF_UP);

    quote.put("spreadBps", spreadBps);
    quote.put("spreadFeePercent", String.format("%.2f%%", spreadBps / 100.0));
    quote.put("feeAmount", feeAmount);
    quote.put("netPrincipal", netPrincipal);
    quote.put("exchangeRate", exchangeRate);
    quote.put("effectiveRate", effectiveRate);
    quote.put("convertedTargetAmount", convertedAmount);

    return quote;
  }

  @Transactional
  public TreasuryAccount getSystemFxAccount(String currency) {
    String curr = currency != null ? currency.toUpperCase().trim() : "USD";
    String accountNumber = "AC-SYS-FX-" + curr;
    Optional<TreasuryAccount> opt = treasuryAccountRepository.findByAccountNumber(accountNumber);
    if (opt.isPresent()) {
      return opt.get();
    }

    // Auto-create system liquidity account if not present
    log.info("Provisioning system FX liquidity account {}", accountNumber);
    TreasuryAccount acc = new TreasuryAccount();
    acc.setAccountNumber(accountNumber);
    acc.setCurrency(curr);
    acc.setStatus("ACTIVE");
    acc.setPostedBalance(new BigDecimal("10000000.0000"));
    acc.setAvailableBalance(new BigDecimal("10000000.0000"));
    acc.setHeldBalance(BigDecimal.ZERO);
    return treasuryAccountRepository.save(acc);
  }

  @Transactional
  public TreasuryAccount getSystemFeeAccount(String currency) {
    String curr = currency != null ? currency.toUpperCase().trim() : "USD";
    String accountNumber = "AC-SYS-FEE-" + curr;
    Optional<TreasuryAccount> opt = treasuryAccountRepository.findByAccountNumber(accountNumber);
    if (opt.isPresent()) {
      return opt.get();
    }

    // Check default USD fee account
    Optional<TreasuryAccount> usdFee =
        treasuryAccountRepository.findByAccountNumber("AC-SYS-FEE-USD");
    if (usdFee.isPresent()) {
      return usdFee.get();
    }

    // Auto-create system fee account if not present
    log.info("Provisioning system fee revenue account AC-SYS-FEE-USD");
    TreasuryAccount acc = new TreasuryAccount();
    acc.setAccountNumber("AC-SYS-FEE-USD");
    acc.setCurrency("USD");
    acc.setStatus("ACTIVE");
    acc.setPostedBalance(new BigDecimal("10000000.0000"));
    acc.setAvailableBalance(new BigDecimal("10000000.0000"));
    acc.setHeldBalance(BigDecimal.ZERO);
    return treasuryAccountRepository.save(acc);
  }
}
