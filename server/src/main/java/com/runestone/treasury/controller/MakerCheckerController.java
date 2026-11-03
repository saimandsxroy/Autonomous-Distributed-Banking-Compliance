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
