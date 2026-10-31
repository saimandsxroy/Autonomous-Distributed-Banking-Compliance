package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.runestone.treasury.entity.FxRate;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.repository.FxRateRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FxTreasuryServiceTests {

  @Mock private FxRateRepository fxRateRepository;

  @Mock private TreasuryAccountRepository treasuryAccountRepository;

  @InjectMocks private FxTreasuryService fxTreasuryService;

  @Test
  void testGetAllRates() {
    FxRate rate1 = new FxRate("USD", "EUR", new BigDecimal("0.920000"), 50);
    FxRate rate2 = new FxRate("USD", "INR", new BigDecimal("83.500000"), 50);

    when(fxRateRepository.findAll()).thenReturn(List.of(rate1, rate2));

    List<FxRate> rates = fxTreasuryService.getAllRates();
    assertEquals(2, rates.size());
    assertEquals("USD", rates.get(0).getBaseCurrency());
    assertEquals("EUR", rates.get(0).getTargetCurrency());
  }

  @Test
  void testCalculateQuoteSameCurrencyHasZeroFee() {
    Map<String, Object> quote =
        fxTreasuryService.calculateQuote("USD", "USD", new BigDecimal("500.00"));

    assertEquals("USD", quote.get("fromCurrency"));
    assertEquals("USD", quote.get("toCurrency"));
    assertEquals(0, quote.get("spreadBps"));
    assertEquals(new BigDecimal("0.0000"), quote.get("feeAmount"));
    assertEquals(new BigDecimal("500.0000"), quote.get("netPrincipal"));
    assertEquals(new BigDecimal("500.0000"), quote.get("convertedTargetAmount"));
  }

  @Test
  void testCalculateQuoteUsdToInrWithSpread() {
    FxRate usdToInr = new FxRate("USD", "INR", new BigDecimal("83.500000"), 50);
    when(fxRateRepository.findByBaseCurrencyAndTargetCurrency("USD", "INR"))
        .thenReturn(Optional.of(usdToInr));

    Map<String, Object> quote =
        fxTreasuryService.calculateQuote("USD", "INR", new BigDecimal("1000.00"));

    assertEquals("USD", quote.get("fromCurrency"));
    assertEquals("INR", quote.get("toCurrency"));
    assertEquals(50, quote.get("spreadBps"));
    assertEquals("0.50%", quote.get("spreadFeePercent"));
    // 50 bps on $1000 = $5.00
    assertEquals(new BigDecimal("5.0000"), quote.get("feeAmount"));
    // Net principal = $995.00
    assertEquals(new BigDecimal("995.0000"), quote.get("netPrincipal"));
    // 995 * 83.500000 = 83,082.5000 INR
    assertEquals(new BigDecimal("83082.5000"), quote.get("convertedTargetAmount"));
  }

  @Test
  void testCalculateQuoteReciprocalRateFallback() {
    // When USD->EUR is queried but only EUR->USD is in repository
    FxRate eurToUsd = new FxRate("EUR", "USD", new BigDecimal("1.086957"), 50);
    when(fxRateRepository.findByBaseCurrencyAndTargetCurrency("USD", "EUR"))
        .thenReturn(Optional.empty());
    when(fxRateRepository.findByBaseCurrencyAndTargetCurrency("EUR", "USD"))
        .thenReturn(Optional.of(eurToUsd));

    Map<String, Object> quote =
        fxTreasuryService.calculateQuote("USD", "EUR", new BigDecimal("1000.00"));

    assertNotNull(quote);
    assertEquals("USD", quote.get("fromCurrency"));
    assertEquals("EUR", quote.get("toCurrency"));
    assertTrue(((BigDecimal) quote.get("convertedTargetAmount")).compareTo(BigDecimal.ZERO) > 0);
  }

  @Test
  void testCalculateQuoteInvalidAmountThrows() {
    assertThrows(
        IllegalArgumentException.class,
        () -> fxTreasuryService.calculateQuote("USD", "INR", BigDecimal.ZERO));
    assertThrows(
        IllegalArgumentException.class,
        () -> fxTreasuryService.calculateQuote("USD", "INR", new BigDecimal("-100")));
  }

  @Test
  void testSystemFxAccountAutoProvisioning() {
    when(treasuryAccountRepository.findByAccountNumber("AC-SYS-FX-USD"))
        .thenReturn(Optional.empty());
    when(treasuryAccountRepository.save(any(TreasuryAccount.class)))
        .thenAnswer(inv -> inv.getArgument(0));

    TreasuryAccount acc = fxTreasuryService.getSystemFxAccount("USD");
    assertNotNull(acc);
    assertEquals("AC-SYS-FX-USD", acc.getAccountNumber());
    assertEquals("USD", acc.getCurrency());
    assertEquals(0, new BigDecimal("10000000.0000").compareTo(acc.getAvailableBalance()));
  }
}
