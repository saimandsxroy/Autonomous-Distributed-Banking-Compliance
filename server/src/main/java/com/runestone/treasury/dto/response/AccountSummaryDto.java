package com.runestone.treasury.dto.response;

import java.math.BigDecimal;

public class AccountSummaryDto {
  private Long id;
  private String accountNumber;
  private BigDecimal availableBalance;
  private BigDecimal heldBalance;
  private BigDecimal postedBalance;
  private String currency;
  private String status;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getAccountNumber() {
    return accountNumber;
  }

  public void setAccountNumber(String accountNumber) {
    this.accountNumber = accountNumber;
  }

  public BigDecimal getAvailableBalance() {
    return availableBalance;
  }

  public void setAvailableBalance(BigDecimal availableBalance) {
    this.availableBalance = availableBalance;
  }

  public BigDecimal getHeldBalance() {
    return heldBalance;
  }

  public void setHeldBalance(BigDecimal heldBalance) {
    this.heldBalance = heldBalance;
  }

  public BigDecimal getPostedBalance() {
    return postedBalance;
  }

  public void setPostedBalance(BigDecimal postedBalance) {
    this.postedBalance = postedBalance;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
