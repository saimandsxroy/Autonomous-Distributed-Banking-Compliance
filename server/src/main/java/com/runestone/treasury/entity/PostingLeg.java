package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "posting_legs")
public class PostingLeg {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "journal_entry_id", nullable = false)
  private Long journalEntryId;

  @Column(name = "account_id", nullable = false)
  private Long accountId;

  @Column(name = "counterparty_account_id", nullable = false)
  private Long counterpartyAccountId;

  @Column(name = "leg_type", nullable = false, length = 10)
  private String legType;

  @Column(name = "balance_bucket", nullable = false, length = 16)
  private String balanceBucket = "AVAILABLE";

  @Column(name = "currency", nullable = false, length = 3)
  private String currency = "USD";

  @Column(name = "amount", nullable = false, precision = 19, scale = 4)
  private BigDecimal amount;

  @Column(name = "signed_amount", nullable = false, precision = 19, scale = 4)
  private BigDecimal signedAmount;

  @Column(name = "running_posted_balance", nullable = false, precision = 19, scale = 4)
  private BigDecimal runningPostedBalance;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public PostingLeg() {}

  public PostingLeg(
      Long journalEntryId,
      Long accountId,
      Long counterpartyAccountId,
      String legType,
      BigDecimal amount,
      BigDecimal signedAmount,
      BigDecimal runningPostedBalance) {
    this.journalEntryId = journalEntryId;
    this.accountId = accountId;
    this.counterpartyAccountId = counterpartyAccountId;
    this.legType = legType;
    this.currency = "USD";
    this.balanceBucket = "AVAILABLE";
    this.amount = amount;
    this.signedAmount = signedAmount;
    this.runningPostedBalance = runningPostedBalance;
    this.createdAt = LocalDateTime.now();
  }

  public PostingLeg(
      Long journalEntryId,
      Long accountId,
      Long counterpartyAccountId,
      String legType,
      String currency,
      BigDecimal amount,
      BigDecimal signedAmount,
      BigDecimal runningPostedBalance) {
    this.journalEntryId = journalEntryId;
    this.accountId = accountId;
    this.counterpartyAccountId = counterpartyAccountId;
    this.legType = legType;
    this.currency = currency != null ? currency : "USD";
    this.balanceBucket = "AVAILABLE";
    this.amount = amount;
    this.signedAmount = signedAmount;
    this.runningPostedBalance = runningPostedBalance;
    this.createdAt = LocalDateTime.now();
  }

  public PostingLeg(
      Long id,
      Long journalEntryId,
      Long accountId,
      Long counterpartyAccountId,
      String legType,
      String balanceBucket,
      BigDecimal amount,
      BigDecimal signedAmount,
      BigDecimal runningPostedBalance,
      LocalDateTime createdAt) {
    this.id = id;
    this.journalEntryId = journalEntryId;
    this.accountId = accountId;
    this.counterpartyAccountId = counterpartyAccountId;
    this.legType = legType;
    this.balanceBucket = balanceBucket != null ? balanceBucket : "AVAILABLE";
    this.amount = amount;
    this.signedAmount = signedAmount;
    this.runningPostedBalance = runningPostedBalance;
    this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getJournalEntryId() {
    return journalEntryId;
  }

  public void setJournalEntryId(Long journalEntryId) {
    this.journalEntryId = journalEntryId;
  }

  public Long getAccountId() {
    return accountId;
  }

  public void setAccountId(Long accountId) {
    this.accountId = accountId;
  }

  public Long getCounterpartyAccountId() {
    return counterpartyAccountId;
  }

  public void setCounterpartyAccountId(Long counterpartyAccountId) {
    this.counterpartyAccountId = counterpartyAccountId;
  }

  public String getLegType() {
    return legType;
  }

  public void setLegType(String legType) {
    this.legType = legType;
  }

  public String getBalanceBucket() {
    return balanceBucket;
  }

  public void setBalanceBucket(String balanceBucket) {
    this.balanceBucket = balanceBucket;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public void setAmount(BigDecimal amount) {
    this.amount = amount;
  }

  public BigDecimal getSignedAmount() {
    return signedAmount;
  }

  public void setSignedAmount(BigDecimal signedAmount) {
    this.signedAmount = signedAmount;
  }

  public BigDecimal getRunningPostedBalance() {
    return runningPostedBalance;
  }

  public void setRunningPostedBalance(BigDecimal runningPostedBalance) {
    this.runningPostedBalance = runningPostedBalance;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
