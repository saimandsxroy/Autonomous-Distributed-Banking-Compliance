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
          || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "INVALID_CREDENTIALS");
        error.put("message", "Invalid username or password");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
      }

      User user = userOpt.get();
      List<String> roles =
          user.getRoles().stream()
              .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
              .collect(Collectors.toList());

      List<TreasuryAccount> accounts = treasuryAccountRepository.findByUserId(user.getId());
      List<Long> accountIds =
          accounts.stream().map(TreasuryAccount::getId).collect(Collectors.toList());

      boolean isOfficer =
          roles.stream().anyMatch(r -> r.contains("COMPLIANCE") || r.contains("ADMIN"));
      String portalTarget = isOfficer ? "/compliance" : "/dashboard";

      String token =
          jwtTokenService.generateToken(user.getUserName(), user.getEmail(), roles, accountIds);

      LoginResponseDto response =
          new LoginResponseDto(
              token,
              user.getUserName(),
              user.getEmail(),
              roles,
              portalTarget,
              accounts,
              accountIds,
              jwtTokenService.getExpirySeconds());

      log.info(
          "JWT issued for authenticated user: {} (portalTarget={})",
          user.getUserName(),
          portalTarget);
      return ResponseEntity.ok(response);
    } catch (Exception e) {
      log.warn("Login failed for identifier {}: {}", request.getUsernameOrEmail(), e.getMessage());
      Map<String, Object> error = new HashMap<>();
      error.put("errorCode", "INVALID_CREDENTIALS");
      error.put("message", "Invalid username or password");
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }
  }

  @GetMapping("/me")
  public ResponseEntity<?> me() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
          .body(Map.of("message", "Not authenticated"));
    }

    String username = auth.getName();
    User user = userRepository.findByUserName(username).orElse(null);

    List<String> roles =
        auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());

    List<TreasuryAccount> accounts =
        user != null ? treasuryAccountRepository.findByUserId(user.getId()) : List.of();

    boolean isOfficer =
        roles.stream().anyMatch(r -> r.contains("COMPLIANCE") || r.contains("ADMIN"));
    String portalTarget = isOfficer ? "/compliance" : "/dashboard";

    Map<String, Object> info = new HashMap<>();
    info.put("username", username);
    info.put(
        "email",
        user != null && user.getEmail() != null ? user.getEmail() : username + "@runestone.com");
    info.put("roles", roles);
    info.put("portalTarget", portalTarget);
    info.put("accounts", accounts);

    return ResponseEntity.ok(info);
  }

  @PostMapping("/demo-switch/{personaUsername}")
  public ResponseEntity<?> demoSwitch(@PathVariable String personaUsername) {
    try {
      Optional<User> userOpt = userRepository.findByUserName(personaUsername);
      if (userOpt.isEmpty()) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(
                Map.of(
                    "errorCode",
                    "USER_NOT_FOUND",
                    "message",
                    "Demo persona not found: " + personaUsername));
      }

      User user = userOpt.get();
      List<String> roles =
          user.getRoles().stream()
              .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
              .collect(Collectors.toList());

      List<TreasuryAccount> accounts = treasuryAccountRepository.findByUserId(user.getId());
      List<Long> accountIds =
          accounts.stream().map(TreasuryAccount::getId).collect(Collectors.toList());

      boolean isOfficer =
          roles.stream().anyMatch(r -> r.contains("COMPLIANCE") || r.contains("ADMIN"));
      String portalTarget = isOfficer ? "/compliance" : "/dashboard";

      String token =
          jwtTokenService.generateToken(user.getUserName(), user.getEmail(), roles, accountIds);

      LoginResponseDto response =
          new LoginResponseDto(
              token,
              user.getUserName(),
              user.getEmail(),
              roles,
              portalTarget,
              accounts,
              accountIds,
              jwtTokenService.getExpirySeconds());

      log.info(
          "Demo session switched to persona: {} (roles={}, portalTarget={})",
          personaUsername,
          roles,
          portalTarget);
      return ResponseEntity.ok(response);
    } catch (Exception e) {
      log.error("Failed demo switch to persona {}: {}", personaUsername, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(Map.of("error", e.getMessage()));
    }
  }
}
