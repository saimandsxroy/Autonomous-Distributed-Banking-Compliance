package com.runestone.treasury;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.service.JwtTokenService;
import io.jsonwebtoken.Claims;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JwtTokenServiceTests {

  @Mock private AppCache appCache;

  @InjectMocks private JwtTokenService jwtTokenService;

  @Test
  void testGenerateAndValidateToken() {
    when(appCache.get("JWT_SECRET_KEY"))
        .thenReturn("runestone_treasury_jwt_hs256_secret_key_minimum_256_bits_2024");
    String token = jwtTokenService.generateToken("alice", List.of("ROLE_USER"), List.of(1L));
    assertNotNull(token);
    Claims claims = jwtTokenService.validateAndParseToken(token);
    assertEquals("alice", claims.getSubject());
  }

  @Test
  void testExtractUsername() {
    when(appCache.get("JWT_SECRET_KEY"))
        .thenReturn("runestone_treasury_jwt_hs256_secret_key_minimum_256_bits_2024");
    String token = jwtTokenService.generateToken("bob", List.of("ROLE_ADMIN"), List.of());
    assertEquals("bob", jwtTokenService.extractUsername(token));
  }

  @Test
  void testExtractRoles() {
    when(appCache.get("JWT_SECRET_KEY"))
        .thenReturn("runestone_treasury_jwt_hs256_secret_key_minimum_256_bits_2024");
    List<String> inputRoles = List.of("ROLE_USER", "ROLE_ADMIN");
    String token = jwtTokenService.generateToken("charlie", inputRoles, List.of(2L));
    Claims claims = jwtTokenService.validateAndParseToken(token);
    List<String> roles = jwtTokenService.extractRoles(claims);
    assertTrue(roles.containsAll(inputRoles));
  }

  @Test
  void testTamperedTokenRejected() {
    when(appCache.get("JWT_SECRET_KEY"))
        .thenReturn("runestone_treasury_jwt_hs256_secret_key_minimum_256_bits_2024");
    String token = jwtTokenService.generateToken("dave", List.of("ROLE_USER"), List.of());
    String tampered = token.substring(0, token.length() - 5) + "XXXXX";
    assertThrows(Exception.class, () -> jwtTokenService.validateAndParseToken(tampered));
  }

  @Test
  void testFallbackSecretUsedWhenCacheMissing() {
    when(appCache.get("JWT_SECRET_KEY")).thenReturn(null);
    String token = jwtTokenService.generateToken("eve", List.of("ROLE_USER"), List.of());
    assertNotNull(token);
    Claims claims = jwtTokenService.validateAndParseToken(token);
    assertEquals("eve", claims.getSubject());
  }
}
