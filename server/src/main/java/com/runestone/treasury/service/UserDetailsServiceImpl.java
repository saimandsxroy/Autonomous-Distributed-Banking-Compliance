package com.runestone.treasury.service;

import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.UserRepository;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

  @Autowired private UserRepository userRepository;

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    Optional<User> userOpt = userRepository.findByUserName(username);
    if (userOpt.isPresent()) {
      User user = userOpt.get();
      return org.springframework.security.core.userdetails.User.builder()
          .username(user.getUserName())
          .password(user.getPassword())
          .roles(user.getRoles().toArray(new String[0]))
          .build();
    }
    throw new UsernameNotFoundException("User not found with username: " + username);
  }
}
