package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserServiceTests {

  @Mock private UserRepository userRepository;

  @Mock private PasswordEncoder passwordEncoder;

  @InjectMocks private UserService userService;

  @Test
  void testSaveNewUserSuccess() {
    User user = new User();
    user.setUserName("ram");
    user.setPassword("secret");

    when(passwordEncoder.encode("secret")).thenReturn("hashed_secret");
    when(userRepository.save(any(User.class))).thenReturn(user);

    boolean result = userService.saveNewUser(user);

    assertTrue(result);
    assertEquals("hashed_secret", user.getPassword());
    assertTrue(user.getRoles().contains("USER"));
    verify(userRepository, times(1)).save(user);
  }

  @Test
  void testFindByUserName() {
    User user = new User();
    user.setUserName("shyam");

    when(userRepository.findByUserName("shyam")).thenReturn(Optional.of(user));

    User found = userService.findByUserName("shyam");

    assertNotNull(found);
    assertEquals("shyam", found.getUserName());
  }
}
