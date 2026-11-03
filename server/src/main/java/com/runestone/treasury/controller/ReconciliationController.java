package com.runestone.treasury.controller;

import com.runestone.treasury.dto.request.EodStatementLineDto;
import com.runestone.treasury.entity.ReconciliationDiscrepancy;
import com.runestone.treasury.entity.ReconciliationRun;
import com.runestone.treasury.service.EodReconciliationService;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reconciliation")
public class ReconciliationController {

  private static final Logger log = LoggerFactory.getLogger(ReconciliationController.class);

  @Autowired private EodReconciliationService eodReconciliationService;

  @PostMapping("/run-statement")
  public ResponseEntity<?> runStatement(
      @RequestParam(value = "simulateAnomalies", defaultValue = "false") boolean simulateAnomalies,
      @RequestBody(required = false) List<EodStatementLineDto> externalLines) {
    try {
      Authentication auth = SecurityContextHolder.getContext().getAuthentication();
      String executedBy =
          (auth != null && auth.getName() != null) ? auth.getName() : "sarah_compliance";

      ReconciliationRun run;
      if (simulateAnomalies || externalLines == null || externalLines.isEmpty()) {
        run = eodReconciliationService.simulateAnomalies(executedBy);
      } else {
        run = eodReconciliationService.runStatement(externalLines, executedBy);
      }
      return new ResponseEntity<>(run, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed executing reconciliation statement run: {}", e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of("error", e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @GetMapping("/runs")
  public ResponseEntity<?> getRuns() {
    try {
      List<ReconciliationRun> runs = eodReconciliationService.getRuns();
      return new ResponseEntity<>(runs, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed fetching reconciliation runs: {}", e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of("error", e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @GetMapping("/runs/{runId}/discrepancies")
  public ResponseEntity<?> getDiscrepancies(@PathVariable Long runId) {
    try {
      List<ReconciliationDiscrepancy> discrepancies =
          eodReconciliationService.getDiscrepanciesForRun(runId);
      return new ResponseEntity<>(discrepancies, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed fetching discrepancies for run #{}: {}", runId, e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of("error", e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @PostMapping("/discrepancies/id/{discrepancyId}/resolve")
  public ResponseEntity<?> resolveDiscrepancy(
      @PathVariable Long discrepancyId, @RequestBody(required = false) Map<String, String> body) {
    try {
      Authentication auth = SecurityContextHolder.getContext().getAuthentication();
      String resolvedBy =
          (auth != null && auth.getName() != null) ? auth.getName() : "sarah_compliance";

      String notes = body != null ? body.get("notes") : null;
      ReconciliationDiscrepancy resolved =
          eodReconciliationService.resolveDiscrepancy(discrepancyId, resolvedBy, notes);
      return new ResponseEntity<>(resolved, HttpStatus.OK);
    } catch (IllegalStateException e) {
      log.warn("Discrepancy state conflict for #{}: {}", discrepancyId, e.getMessage());
      return new ResponseEntity<>(Map.of("error", e.getMessage()), HttpStatus.CONFLICT);
    } catch (IllegalArgumentException e) {
      log.warn("Discrepancy not found #{}: {}", discrepancyId, e.getMessage());
      return new ResponseEntity<>(Map.of("error", e.getMessage()), HttpStatus.NOT_FOUND);
    } catch (Exception e) {
      log.error("Failed resolving discrepancy #{}: {}", discrepancyId, e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of("error", e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
