package com.runestone.treasury.controller;

import com.runestone.treasury.dto.request.LoginRequestDto;
import com.runestone.treasury.dto.response.LoginResponseDto;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import com.runestone.treasury.repository.UserRepository;
import com.runestone.treasury.service.JwtTokenService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
  private static final Logger log = LoggerFactory.getLogger(AuthController.class);

  @Autowired private UserRepository userRepository;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private JwtTokenService jwtTokenService;

  @Autowired private PasswordEncoder passwordEncoder;

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequestDto request) {
    try {
      String identifier = request.getUsernameOrEmail();
      if (identifier == null || identifier.isBlank() || request.getPassword() == null) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(
                Map.of(
                    "errorCode", "INVALID_INPUT", "message", "Username and password are required"));
      }

      Optional<User> userOpt = userRepository.findByUserName(identifier);
      if (userOpt.isEmpty()) {
        userOpt = userRepository.findByEmail(identifier);
      }

      if (userOpt.isEmpty()
