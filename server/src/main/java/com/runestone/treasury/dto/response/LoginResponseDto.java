package com.runestone.treasury.dto.response;

import com.runestone.treasury.entity.TreasuryAccount;
import java.util.List;

public class LoginResponseDto {
  private String token;
  private String username;
  private String email;
  private List<String> roles;
  private String portalTarget;
  private List<TreasuryAccount> accounts;
  private List<Long> accountIds;
  private long expiresInSeconds;

  public LoginResponseDto() {}

  public LoginResponseDto(
      String token,
      String username,
      List<String> roles,
      List<Long> accountIds,
      long expiresInSeconds) {
    this(token, username, null, roles, "/dashboard", null, accountIds, expiresInSeconds);
  }

  public LoginResponseDto(
      String token,
      String username,
      String email,
      List<String> roles,
      String portalTarget,
      List<TreasuryAccount> accounts,
      List<Long> accountIds,
      long expiresInSeconds) {
    this.token = token;
    this.username = username;
    this.email = email;
    this.roles = roles;
    this.portalTarget = portalTarget;
    this.accounts = accounts;
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

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public List<String> getRoles() {
    return roles;
  }

  public void setRoles(List<String> roles) {
    this.roles = roles;
  }

  public String getPortalTarget() {
    return portalTarget;
  }

  public void setPortalTarget(String portalTarget) {
    this.portalTarget = portalTarget;
  }

  public List<TreasuryAccount> getAccounts() {
    return accounts;
  }

  public void setAccounts(List<TreasuryAccount> accounts) {
    this.accounts = accounts;
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
