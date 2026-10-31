package com.runestone.treasury.controller;

import com.runestone.treasury.entity.FxRate;
import com.runestone.treasury.service.FxTreasuryService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/fx")
public class FxController {

  private static final Logger log = LoggerFactory.getLogger(FxController.class);

  @Autowired private FxTreasuryService fxTreasuryService;

  /** GET /fx/rates Returns list of all live supported foreign exchange rates and spreads. */
  @GetMapping("/rates")
  public ResponseEntity<?> getAllRates() {
    try {
      List<FxRate> rates = fxTreasuryService.getAllRates();
      return new ResponseEntity<>(rates, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to fetch FX rates: {}", e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /fx/quote?from=USD&to=INR&amount=1000 Calculates a live conversion quote including platform
   * wire spread/fee and net converted payout.
   */
  @GetMapping("/quote")
  public ResponseEntity<?> getQuote(
      @RequestParam("from") String from,
      @RequestParam("to") String to,
      @RequestParam("amount") BigDecimal amount) {
    try {
      Map<String, Object> quote = fxTreasuryService.calculateQuote(from, to, amount);
      return new ResponseEntity<>(quote, HttpStatus.OK);
    } catch (IllegalArgumentException e) {
      return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
    } catch (IllegalStateException e) {
      return new ResponseEntity<>(e.getMessage(), HttpStatus.UNPROCESSABLE_ENTITY);
    } catch (Exception e) {
      log.error(
          "Failed to generate FX quote for {}/{} amount {}: {}", from, to, amount, e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
