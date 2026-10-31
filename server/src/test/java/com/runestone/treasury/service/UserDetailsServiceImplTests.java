package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.UserRepository;
import java.util.Arrays;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTests {

  @Mock private UserRepository userRepository;

  @InjectMocks private UserDetailsServiceImpl userDetailsService;

  @Test
  void testLoadUserByUsernameFound() {
    User user = new User();
    user.setUserName("ram");
    user.setPassword("secret");
    user.setRoles(Arrays.asList("USER", "ADMIN"));

    when(userRepository.findByUserName("ram")).thenReturn(Optional.of(user));

    UserDetails details = userDetailsService.loadUserByUsername("ram");

    assertNotNull(details);
    assertEquals("ram", details.getUsername());
    assertEquals("secret", details.getPassword());
    assertTrue(
        details.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
    assertTrue(
        details.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
  }

  @Test
  void testLoadUserByUsernameNotFound() {
    when(userRepository.findByUserName("unknown")).thenReturn(Optional.empty());

    assertThrows(
        UsernameNotFoundException.class, () -> userDetailsService.loadUserByUsername("unknown"));
  }
}
