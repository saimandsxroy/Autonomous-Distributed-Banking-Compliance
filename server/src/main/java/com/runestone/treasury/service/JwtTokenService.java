package com.runestone.treasury.service;

import com.runestone.treasury.cache.AppCache;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {
  private static final Logger log = LoggerFactory.getLogger(JwtTokenService.class);
  private static final long EXPIRY_SECONDS = 86400L;
  private static final String DEFAULT_SECRET =
      "runestone_treasury_jwt_hs256_secret_key_minimum_256_bits_2024";

  @Autowired private AppCache appCache;

  private Key getSigningKey() {
    String secret = appCache != null ? appCache.get("JWT_SECRET_KEY") : null;
    if (secret == null || secret.length() < 32) {
      secret = DEFAULT_SECRET;
    }
    return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  public String generateToken(
      String username, String email, List<String> roles, List<Long> accountIds) {
    Date now = new Date();
    Date expiry = new Date(now.getTime() + EXPIRY_SECONDS * 1000);

    List<String> normalizedRoles =
        roles == null
            ? List.of()
            : roles.stream()
                .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                .collect(Collectors.toList());

    var builder =
        Jwts.builder()
            .setSubject(username)
            .claim("roles", normalizedRoles)
