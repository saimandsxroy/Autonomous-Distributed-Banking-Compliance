package com.runestone.treasury.controller;

import com.runestone.treasury.dto.request.MakerCheckerWireRequestDto;
import com.runestone.treasury.entity.MakerCheckerWire;
import com.runestone.treasury.exception.SeparationOfDutiesViolationException;
import com.runestone.treasury.service.MakerCheckerWireService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/corporate-wires")
public class MakerCheckerController {

  private static final Logger log = LoggerFactory.getLogger(MakerCheckerController.class);

  @Autowired private MakerCheckerWireService makerCheckerWireService;

  @PostMapping
  public ResponseEntity<?> submitWire(@Valid @RequestBody MakerCheckerWireRequestDto dto) {
    try {
      Authentication auth = SecurityContextHolder.getContext().getAuthentication();
      String makerUserName = (auth != null && auth.getName() != null) ? auth.getName() : "alice";

      MakerCheckerWire wire = makerCheckerWireService.submitWire(dto, makerUserName);
      return new ResponseEntity<>(wire, HttpStatus.CREATED);
    } catch (IllegalArgumentException e) {
      log.warn("Invalid corporate wire request: {}", e.getMessage());
      return new ResponseEntity<>(Map.of("error", e.getMessage()), HttpStatus.BAD_REQUEST);
    } catch (Exception e) {
      log.error("Failed submitting corporate wire: {}", e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of("error", e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @PostMapping("/id/{wireId}/approve")
  public ResponseEntity<?> approveWire(
      @PathVariable Long wireId, @RequestBody(required = false) Map<String, String> body) {
    try {
      Authentication auth = SecurityContextHolder.getContext().getAuthentication();
      String checkerUserName =
          (auth != null && auth.getName() != null) ? auth.getName() : "sarah_compliance";

      String notes = body != null ? body.get("notes") : null;
      MakerCheckerWire approved =
          makerCheckerWireService.approveWire(wireId, checkerUserName, notes);
      return new ResponseEntity<>(approved, HttpStatus.OK);
    } catch (SeparationOfDutiesViolationException e) {
      log.warn("Separation of duties violation approving wire #{}: {}", wireId, e.getMessage());
      return new ResponseEntity<>(
          Map.of("errorCode", "SEPARATION_OF_DUTIES_VIOLATION", "message", e.getMessage()),
          HttpStatus.FORBIDDEN);
    } catch (IllegalStateException e) {
      log.warn("Corporate wire state conflict for #{}: {}", wireId, e.getMessage());
      return new ResponseEntity<>(Map.of("error", e.getMessage()), HttpStatus.CONFLICT);
    } catch (IllegalArgumentException e) {
      log.warn("Corporate wire not found #{}: {}", wireId, e.getMessage());
      return new ResponseEntity<>(Map.of("error", e.getMessage()), HttpStatus.NOT_FOUND);
    } catch (Exception e) {
      log.error("Failed approving corporate wire #{}: {}", wireId, e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of("error", e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @GetMapping
  public ResponseEntity<?> getWires() {
    try {
      List<MakerCheckerWire> wires = makerCheckerWireService.getWires();
      return new ResponseEntity<>(wires, HttpStatus.OK);
    } catch (Exception e) {
