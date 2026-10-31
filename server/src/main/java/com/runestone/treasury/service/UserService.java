package com.runestone.treasury.service;

import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.UserRepository;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

  private static final Logger log = LoggerFactory.getLogger(UserService.class);

  @Autowired private UserRepository userRepository;

  @Autowired private PasswordEncoder passwordEncoder;

  public void saveUser(User user) {
    userRepository.save(user);
  }

  public boolean saveNewUser(User user) {
    try {
      user.setPassword(passwordEncoder.encode(user.getPassword()));
      if (user.getRoles() == null || user.getRoles().isEmpty()) {
        user.setRoles(Arrays.asList("USER"));
      }
      userRepository.save(user);
      return true;
    } catch (Exception e) {
      log.error("Error creating new user {}: {}", user.getUserName(), e.getMessage());
      return false;
    }
  }

  public void saveAdmin(User user) {
    user.setPassword(passwordEncoder.encode(user.getPassword()));
    user.setRoles(Arrays.asList("USER", "ADMIN"));
    userRepository.save(user);
  }

  public List<User> getAll() {
    return userRepository.findAll();
  }

  public Optional<User> findById(Long id) {
    return userRepository.findById(id);
  }

  public User findByUserName(String userName) {
    return userRepository.findByUserName(userName).orElse(null);
  }

  public void deleteById(Long id) {
    userRepository.deleteById(id);
  }

  public void deleteByUserName(String userName) {
    userRepository.deleteByUserName(userName);
  }
}
