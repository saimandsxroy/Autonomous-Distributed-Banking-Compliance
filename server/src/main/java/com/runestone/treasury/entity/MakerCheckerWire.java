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
@Table(name = "maker_checker_wires")
public class MakerCheckerWire {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
  private String idempotencyKey;

  @Column(name = "source_account_id", nullable = false)
  private Long sourceAccountId;

  @Column(name = "destination_account_id", nullable = false)
  private Long destinationAccountId;

  @Column(name = "amount", nullable = false, precision = 19, scale = 4)
  private BigDecimal amount;

  @Column(name = "currency", nullable = false, length = 16)
  private String currency = "USD";

  @Column(name = "description", length = 255)
  private String description;

  @Column(name = "policy_tier", nullable = false, length = 32)
  private String policyTier;

  @Column(name = "required_approvals", nullable = false)
  private int requiredApprovals;

  @Column(name = "current_approvals", nullable = false)
  private int currentApprovals = 0;

  @Column(name = "maker_user_name", nullable = false, length = 100)
  private String makerUserName;

  @Column(name = "checker_one_user_name", length = 100)
  private String checkerOneUserName;

  @Column(name = "checker_two_user_name", length = 100)
  private String checkerTwoUserName;

  @Column(name = "status", nullable = false, length = 32)
  private String status;

  @Column(name = "settled_journal_entry_id")
  private Long settledJournalEntryId;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public MakerCheckerWire() {}

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public void setIdempotencyKey(String idempotencyKey) {
    this.idempotencyKey = idempotencyKey;
  }

  public Long getSourceAccountId() {
    return sourceAccountId;
  }

  public void setSourceAccountId(Long sourceAccountId) {
    this.sourceAccountId = sourceAccountId;
  }

  public Long getDestinationAccountId() {
    return destinationAccountId;
  }

  public void setDestinationAccountId(Long destinationAccountId) {
    this.destinationAccountId = destinationAccountId;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public void setAmount(BigDecimal amount) {
    this.amount = amount;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getPolicyTier() {
    return policyTier;
  }

  public void setPolicyTier(String policyTier) {
    this.policyTier = policyTier;
  }

