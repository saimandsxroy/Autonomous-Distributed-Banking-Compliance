package com.runestone.treasury.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class LoginRequestDto {
  private String username;
  private String usernameOrEmail;
  private String password;

  public LoginRequestDto() {}

  public LoginRequestDto(String username, String password) {
    this.username = username;
    this.password = password;
  }

  public String getUsername() {
    if (username != null && !username.isBlank()) {
      return username;
    }
    return usernameOrEmail;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getUsernameOrEmail() {
    if (usernameOrEmail != null && !usernameOrEmail.isBlank()) {
      return usernameOrEmail;
    }
    return username;
  }

  public void setUsernameOrEmail(String usernameOrEmail) {
    this.usernameOrEmail = usernameOrEmail;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }
}
