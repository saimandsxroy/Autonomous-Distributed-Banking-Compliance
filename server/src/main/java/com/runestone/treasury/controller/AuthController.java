package com.runestone.treasury.controller;

import com.runestone.treasury.dto.request.LoginRequestDto;
import com.runestone.treasury.dto.response.LoginResponseDto;
import com.runestone.treasury.service.JwtTokenService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
  private static final Logger log = LoggerFactory.getLogger(AuthController.class);

  @Autowired private UserDetailsService userDetailsService;

  @Autowired private JwtTokenService jwtTokenService;

  @Autowired private PasswordEncoder passwordEncoder;

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequestDto request) {
    try {
      UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
      if (!passwordEncoder.matches(request.getPassword(), userDetails.getPassword())) {
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "INVALID_CREDENTIALS");
        error.put("message", "Invalid username or password");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
      }

      List<String> roles =
          userDetails.getAuthorities().stream()
              .map(GrantedAuthority::getAuthority)
              .collect(Collectors.toList());

      String token = jwtTokenService.generateToken(request.getUsername(), roles, List.of());

      LoginResponseDto response =
          new LoginResponseDto(
              token, request.getUsername(), roles, List.of(), jwtTokenService.getExpirySeconds());

      log.info("JWT issued for user: {}", request.getUsername());
      return ResponseEntity.ok(response);
    } catch (Exception e) {
      log.warn("Login failed for user {}: {}", request.getUsername(), e.getMessage());
      Map<String, Object> error = new HashMap<>();
      error.put("errorCode", "INVALID_CREDENTIALS");
      error.put("message", "Invalid username or password");
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }
  }

  @GetMapping("/me")
  public ResponseEntity<?> me() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
          .body(Map.of("message", "Not authenticated"));
    }
    Map<String, Object> info = new HashMap<>();
    info.put("username", auth.getName());
    info.put(
        "roles",
        auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));
    return ResponseEntity.ok(info);
  }
}
