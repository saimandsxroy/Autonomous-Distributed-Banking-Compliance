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
    String secret = appCache.get("JWT_SECRET_KEY");
    if (secret == null || secret.length() < 32) {
      secret = DEFAULT_SECRET;
    }
    return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  public String generateToken(String username, List<String> roles, List<Long> accountIds) {
    Date now = new Date();
    Date expiry = new Date(now.getTime() + EXPIRY_SECONDS * 1000);
    return Jwts.builder()
        .setSubject(username)
        .claim("roles", roles)
        .claim("accountIds", accountIds)
        .setIssuedAt(now)
        .setExpiration(expiry)
        .signWith(getSigningKey(), SignatureAlgorithm.HS256)
        .compact();
  }

  public Claims validateAndParseToken(String token) {
    return Jwts.parserBuilder()
        .setSigningKey(getSigningKey())
        .build()
        .parseClaimsJws(token)
        .getBody();
  }

  public String extractUsername(String token) {
    return validateAndParseToken(token).getSubject();
  }

  @SuppressWarnings("unchecked")
  public List<String> extractRoles(Claims claims) {
    return (List<String>) claims.get("roles", List.class);
  }

  public long getExpirySeconds() {
    return EXPIRY_SECONDS;
  }
}
