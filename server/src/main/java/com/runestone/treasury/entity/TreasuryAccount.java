package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "treasury_accounts")
public class TreasuryAccount {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id")
  private Long userId;

  @Column(name = "account_number", nullable = false, unique = true, length = 34)
  private String accountNumber;

  @Column(name = "currency", nullable = false, length = 3)
  private String currency = "USD";

  @Column(name = "status", nullable = false, length = 24)
  private String status = "ACTIVE";

  @Column(name = "posted_balance", nullable = false, precision = 19, scale = 4)
  private BigDecimal postedBalance = BigDecimal.ZERO;

  @Column(name = "available_balance", nullable = false, precision = 19, scale = 4)
  private BigDecimal availableBalance = BigDecimal.ZERO;

  @Column(name = "held_balance", nullable = false, precision = 19, scale = 4)
  private BigDecimal heldBalance = BigDecimal.ZERO;

  @Version
  @Column(name = "version", nullable = false)
  private Long version = 0L;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();

  public TreasuryAccount() {}

  public TreasuryAccount(
      Long id,
      Long userId,
      String accountNumber,
      String currency,
      String status,
      BigDecimal postedBalance,
      BigDecimal availableBalance,
      BigDecimal heldBalance,
      Long version,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
    this.id = id;
    this.userId = userId;
    this.accountNumber = accountNumber;
    this.currency = currency != null ? currency : "USD";
    this.status = status != null ? status : "ACTIVE";
    this.postedBalance = postedBalance != null ? postedBalance : BigDecimal.ZERO;
    this.availableBalance = availableBalance != null ? availableBalance : BigDecimal.ZERO;
    this.heldBalance = heldBalance != null ? heldBalance : BigDecimal.ZERO;
    this.version = version != null ? version : 0L;
    this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    this.updatedAt = updatedAt != null ? updatedAt : LocalDateTime.now();
  }

  @PrePersist
  public void onPrePersist() {
    if (this.createdAt == null) {
      this.createdAt = LocalDateTime.now();
    }
    if (this.updatedAt == null) {
      this.updatedAt = LocalDateTime.now();
    }
    if (this.postedBalance == null) {
      this.postedBalance = BigDecimal.ZERO;
    }
    if (this.availableBalance == null) {
      this.availableBalance = BigDecimal.ZERO;
    }
    if (this.heldBalance == null) {
      this.heldBalance = BigDecimal.ZERO;
    }
    if (this.currency == null) {
      this.currency = "USD";
    }
    if (this.status == null) {
      this.status = "ACTIVE";
    }
  }

  @PreUpdate
  public void onPreUpdate() {
    this.updatedAt = LocalDateTime.now();
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  public String getAccountNumber() {
    return accountNumber;
  }

  public void setAccountNumber(String accountNumber) {
    this.accountNumber = accountNumber;
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

  public BigDecimal getPostedBalance() {
    return postedBalance;
  }

  public void setPostedBalance(BigDecimal postedBalance) {
    this.postedBalance = postedBalance;
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

  public Long getVersion() {
    return version;
  }

  public void setVersion(Long version) {
    this.version = version;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
