package com.runestone.treasury;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.runestone.treasury.controller.AuthController;
import com.runestone.treasury.dto.request.LoginRequestDto;
import com.runestone.treasury.dto.response.LoginResponseDto;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import com.runestone.treasury.repository.UserRepository;
import com.runestone.treasury.service.JwtTokenService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthControllerAndJwtTests {

  @Mock private UserRepository userRepository;

  @Mock private TreasuryAccountRepository treasuryAccountRepository;

  @Mock private JwtTokenService jwtTokenService;

  @Mock private PasswordEncoder passwordEncoder;

  @InjectMocks private AuthController authController;

  private User aliceUser;
  private User sarahUser;
  private TreasuryAccount aliceAccount;

  @BeforeEach
  void setUp() {
    aliceUser = new User();
    aliceUser.setId(1L);
    aliceUser.setUserName("alice");
    aliceUser.setEmail("alice@runestone.com");
    aliceUser.setPassword("$2a$10$encodedPasswordAlice");
    aliceUser.setRoles(List.of("USER"));

    sarahUser = new User();
    sarahUser.setId(5L);
    sarahUser.setUserName("sarah_compliance");
    sarahUser.setEmail("sarah@runestone.com");
    sarahUser.setPassword("$2a$10$encodedPasswordSarah");
    sarahUser.setRoles(List.of("ADMIN", "COMPLIANCE_OFFICER"));

    aliceAccount = new TreasuryAccount();
    aliceAccount.setId(1L);
    aliceAccount.setAccountNumber("AC-4BE19A42A8DC");
    aliceAccount.setCurrency("USD");
    aliceAccount.setAvailableBalance(new BigDecimal("50000.00"));
    aliceAccount.setPostedBalance(new BigDecimal("50000.00"));

    when(jwtTokenService.generateToken(anyString(), any(), anyList(), anyList()))
        .thenReturn("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPayloadToken");
    when(jwtTokenService.getExpirySeconds()).thenReturn(86400L);
  }

  @Test
  void testLogin_ReturnsValidJwtAndRoles() {
    when(userRepository.findByUserName("alice")).thenReturn(Optional.of(aliceUser));
    when(passwordEncoder.matches("password123", "$2a$10$encodedPasswordAlice")).thenReturn(true);
    when(treasuryAccountRepository.findByUserId(1L)).thenReturn(List.of(aliceAccount));

    LoginRequestDto req = new LoginRequestDto("alice", "password123");
    ResponseEntity<?> res = authController.login(req);

    assertEquals(HttpStatus.OK, res.getStatusCode());
    assertTrue(res.getBody() instanceof LoginResponseDto);
    LoginResponseDto dto = (LoginResponseDto) res.getBody();

    assertNotNull(dto.getToken());
    assertEquals("alice", dto.getUsername());
    assertEquals("alice@runestone.com", dto.getEmail());
    assertTrue(dto.getRoles().contains("ROLE_USER"));
    assertEquals("/dashboard", dto.getPortalTarget());
    assertNotNull(dto.getAccounts());
    assertEquals(1, dto.getAccounts().size());
  }

  @Test
  void testLogin_InvalidCredentials() {
    when(userRepository.findByUserName("alice")).thenReturn(Optional.of(aliceUser));
    when(passwordEncoder.matches("wrongpass", "$2a$10$encodedPasswordAlice")).thenReturn(false);

    LoginRequestDto req = new LoginRequestDto("alice", "wrongpass");
    ResponseEntity<?> res = authController.login(req);

    assertEquals(HttpStatus.UNAUTHORIZED, res.getStatusCode());
  }

  @Test
  void testMe_AuthenticatesUserAndReturnsProfile() {
    Authentication auth = mock(Authentication.class);
    SecurityContext secCtx = mock(SecurityContext.class);

    when(auth.isAuthenticated()).thenReturn(true);
    when(auth.getName()).thenReturn("alice");
    when(auth.getPrincipal()).thenReturn("alice");
    doReturn(List.of(new SimpleGrantedAuthority("ROLE_USER"))).when(auth).getAuthorities();

    when(secCtx.getAuthentication()).thenReturn(auth);
    SecurityContextHolder.setContext(secCtx);

    when(userRepository.findByUserName("alice")).thenReturn(Optional.of(aliceUser));
    when(treasuryAccountRepository.findByUserId(1L)).thenReturn(List.of(aliceAccount));

    ResponseEntity<?> res = authController.me();
    assertEquals(HttpStatus.OK, res.getStatusCode());

    @SuppressWarnings("unchecked")
    Map<String, Object> body = (Map<String, Object>) res.getBody();
    assertNotNull(body);
    assertEquals("alice", body.get("username"));
    assertEquals("alice@runestone.com", body.get("email"));
    assertEquals("/dashboard", body.get("portalTarget"));
  }

  @Test
  void testDemoSwitch_SarahCompliance_IssuesOfficerJwt() {
    when(userRepository.findByUserName("sarah_compliance")).thenReturn(Optional.of(sarahUser));
    when(treasuryAccountRepository.findByUserId(5L)).thenReturn(List.of());

    ResponseEntity<?> res = authController.demoSwitch("sarah_compliance");
    assertEquals(HttpStatus.OK, res.getStatusCode());

    assertTrue(res.getBody() instanceof LoginResponseDto);
    LoginResponseDto dto = (LoginResponseDto) res.getBody();

    assertNotNull(dto.getToken());
    assertEquals("sarah_compliance", dto.getUsername());
    assertEquals("sarah@runestone.com", dto.getEmail());
    assertTrue(dto.getRoles().contains("ROLE_COMPLIANCE_OFFICER"));
    assertTrue(dto.getRoles().contains("ROLE_ADMIN"));
    assertEquals("/compliance", dto.getPortalTarget());
  }

  @Test
  void testDemoSwitch_NotFound() {
    when(userRepository.findByUserName("nonexistent")).thenReturn(Optional.empty());

    ResponseEntity<?> res = authController.demoSwitch("nonexistent");
    assertEquals(HttpStatus.NOT_FOUND, res.getStatusCode());
  }
}
