package com.runestone.treasury.controller;

import com.runestone.treasury.entity.SettlementBatch;
import com.runestone.treasury.service.SettlementBatchService;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/batch")
public class SettlementBatchController {

  private static final Logger log = LoggerFactory.getLogger(SettlementBatchController.class);

  @Autowired private SettlementBatchService settlementBatchService;

  /** GET /batch Returns list of all historical settlement batches. */
  @GetMapping
  public ResponseEntity<?> getAllBatches() {
    try {
      List<SettlementBatch> batches = settlementBatchService.getAllBatches();
      return new ResponseEntity<>(batches, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to fetch settlement batches: {}", e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** GET /batch/id/{batchId} Returns batch metadata and row-by-row reconciliation items. */
  @GetMapping("/id/{batchId}")
  public ResponseEntity<?> getBatchById(@PathVariable Long batchId) {
    try {
      Map<String, Object> details = settlementBatchService.getBatchDetails(batchId);
      if (details == null) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
      }
      return new ResponseEntity<>(details, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to fetch batch {}: {}", batchId, e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /batch/upload Ingests a bulk payout CSV (either multipart/form-data or JSON with
   * csvContent/items), evaluates the SHA-256 checksum to reject duplicates (409 Conflict), and
   * processes rows.
   */
  /** POST /batch/upload Ingests a bulk payout CSV via multipart/form-data. */
  @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<?> uploadBatchMultipart(
      @RequestParam(value = "file", required = false) MultipartFile file,
      @RequestParam(value = "sourceAccountId", required = false) Long paramSourceAccountId) {
    return processBatchUpload(file, paramSourceAccountId, null);
  }

  /** POST /batch/upload Ingests a bulk payout CSV via application/json. */
  @PostMapping(value = "/upload", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<?> uploadBatchJson(@RequestBody Map<String, Object> jsonPayload) {
    return processBatchUpload(null, null, jsonPayload);
  }

  private ResponseEntity<?> processBatchUpload(
      MultipartFile file, Long paramSourceAccountId, Map<String, Object> jsonPayload) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();

    try {
      String fileName = "bulk_payout.csv";
      Long sourceAccountId = paramSourceAccountId;
      byte[] fileBytes;
      List<Map<String, Object>> rows = new ArrayList<>();

      if (file != null && !file.isEmpty()) {
        fileName = file.getOriginalFilename();
        fileBytes = file.getBytes();
        String csvContent = new String(fileBytes, StandardCharsets.UTF_8);
        rows = settlementBatchService.parseCsv(csvContent);
      } else if (jsonPayload != null) {
        if (jsonPayload.get("fileName") != null) {
          fileName = (String) jsonPayload.get("fileName");
        }
        if (sourceAccountId == null && jsonPayload.get("sourceAccountId") != null) {
          Object sa = jsonPayload.get("sourceAccountId");
          sourceAccountId = ((Number) sa).longValue();
        }

        if (jsonPayload.get("csvContent") != null) {
          String csvContent = (String) jsonPayload.get("csvContent");
          fileBytes = csvContent.getBytes(StandardCharsets.UTF_8);
          rows = settlementBatchService.parseCsv(csvContent);
        } else if (jsonPayload.get("items") instanceof List) {
          @SuppressWarnings("unchecked")
          List<Map<String, Object>> itemsList =
              (List<Map<String, Object>>) jsonPayload.get("items");
          rows = itemsList;
          // Generate deterministic payload bytes for SHA-256
          fileBytes = rows.toString().getBytes(StandardCharsets.UTF_8);
        } else {
          return new ResponseEntity<>(
              "Either 'csvContent' or 'items' list must be provided in JSON payload",
              HttpStatus.BAD_REQUEST);
        }
      } else {
        return new ResponseEntity<>(
            "Multipart 'file' or JSON payload required", HttpStatus.BAD_REQUEST);
      }

      if (sourceAccountId == null) {
        return new ResponseEntity<>("Missing required 'sourceAccountId'", HttpStatus.BAD_REQUEST);
      }
      if (rows.isEmpty()) {
        return new ResponseEntity<>(
            "Batch payload contains no valid payout rows", HttpStatus.BAD_REQUEST);
      }

      Map<String, Object> result =
          settlementBatchService.processBatchUpload(
              fileName, sourceAccountId, fileBytes, rows, userName);

      return new ResponseEntity<>(result, HttpStatus.CREATED);

    } catch (IllegalStateException e) {
      if (e.getMessage() != null && e.getMessage().contains("DUPLICATE_BATCH_DETECTED")) {
        return new ResponseEntity<>(e.getMessage(), HttpStatus.CONFLICT);
      }
      return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
    } catch (IllegalArgumentException e) {
      return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
    } catch (Exception e) {
      log.error("Batch upload failed for user {}: {}", userName, e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /batch/demo/generate-sample-batch One-click action generating and executing the realistic
   * 15-row corporate payroll batch.
   */
  @PostMapping({"/demo/generate-sample-batch", "/sample"})
  public ResponseEntity<?> generateSampleBatch() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();

    try {
      Map<String, Object> result = settlementBatchService.generateSampleBatch(userName);
      return new ResponseEntity<>(result, HttpStatus.CREATED);
    } catch (Exception e) {
      log.error("Failed to generate sample batch for user {}: {}", userName, e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
