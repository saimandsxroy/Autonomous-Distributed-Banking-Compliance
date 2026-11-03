package com.runestone.treasury.util;

import com.runestone.treasury.service.JwtTokenService;
import io.jsonwebtoken.Claims;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {

  @Autowired private JwtTokenService jwtTokenService;

  public String generateToken(
      String username, String email, List<String> roles, List<Long> accountIds) {
    return jwtTokenService.generateToken(username, email, roles, accountIds);
  }

  public String generateToken(String username, List<String> roles, List<Long> accountIds) {
    return jwtTokenService.generateToken(username, roles, accountIds);
