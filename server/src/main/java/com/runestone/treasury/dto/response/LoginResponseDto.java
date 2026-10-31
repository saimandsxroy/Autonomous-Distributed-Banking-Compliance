package com.runestone.treasury.dto.response;

import java.util.List;

public class LoginResponseDto {
  private String token;
  private String username;
  private List<String> roles;
  private List<Long> accountIds;
  private long expiresInSeconds;

  public LoginResponseDto() {}

  public LoginResponseDto(
      String token,
      String username,
      List<String> roles,
      List<Long> accountIds,
      long expiresInSeconds) {
    this.token = token;
    this.username = username;
    this.roles = roles;
    this.accountIds = accountIds;
    this.expiresInSeconds = expiresInSeconds;
  }

  public String getToken() {
    return token;
  }

  public void setToken(String token) {
    this.token = token;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public List<String> getRoles() {
    return roles;
  }

  public void setRoles(List<String> roles) {
    this.roles = roles;
  }

  public List<Long> getAccountIds() {
    return accountIds;
  }

  public void setAccountIds(List<Long> accountIds) {
    this.accountIds = accountIds;
  }

  public long getExpiresInSeconds() {
    return expiresInSeconds;
  }

  public void setExpiresInSeconds(long expiresInSeconds) {
    this.expiresInSeconds = expiresInSeconds;
  }
}
