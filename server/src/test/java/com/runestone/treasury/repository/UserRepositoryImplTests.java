package com.runestone.treasury.repository;

import static org.junit.jupiter.api.Assertions.*;

import com.runestone.treasury.entity.User;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class UserRepositoryImplTests {

  @Autowired private UserRepository userRepository;

  @Test
  void testGetUserForSA() {
    User user = new User();
    user.setUserName("sa_user_" + System.currentTimeMillis());
    user.setPassword("password");
    user.setEmail("sa_user@test.com");
    user.setAmlMonitoringEnabled(true);
    userRepository.save(user);

    List<User> list = userRepository.getUserForSA();

    assertNotNull(list);
    assertTrue(list.stream().anyMatch(u -> u.getUserName().equals(user.getUserName())));
  }
}
