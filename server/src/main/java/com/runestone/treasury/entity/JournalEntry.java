package com.runestone.treasury.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "journal_entries")
public class JournalEntry {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id")
  private Long userId;

  @Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
  private String idempotencyKey;

  @Column(name = "source_account_id", nullable = false)
  private Long sourceAccountId;

  @Column(name = "destination_account_id", nullable = false)
  private Long destinationAccountId;

  @Column(name = "amount", nullable = false, precision = 19, scale = 4)
  private BigDecimal amount;

  @Column(name = "currency", nullable = false, length = 3)
  private String currency = "USD";

  @Column(name = "reference_type", nullable = false, length = 40)
  private String referenceType = "TRANSFER";

  @Column(name = "status", nullable = false, length = 24)
  private String status = "SETTLED";

  @Column(name = "title")
  private String title;

  @Column(name = "content", columnDefinition = "TEXT")
  private String content;

  @Column(name = "date", nullable = false)
  private LocalDateTime date = LocalDateTime.now();

  @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
  @JoinColumn(name = "journal_entry_id")
  private List<PostingLeg> postingLegs = new ArrayList<>();

  public JournalEntry() {}

  public JournalEntry(
      Long id,
      Long userId,
      String idempotencyKey,
      Long sourceAccountId,
      Long destinationAccountId,
      BigDecimal amount,
      String currency,
      String referenceType,
      String status,
      String title,
      String content,
      LocalDateTime date) {
    this.id = id;
    this.userId = userId;
    this.idempotencyKey = idempotencyKey;
    this.sourceAccountId = sourceAccountId;
    this.destinationAccountId = destinationAccountId;
    this.amount = amount;
    this.currency = currency != null ? currency : "USD";
    this.referenceType = referenceType != null ? referenceType : "TRANSFER";
    this.status = status != null ? status : "SETTLED";
    this.title = title;
    this.content = content;
    this.date = date != null ? date : LocalDateTime.now();
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

  public String getReferenceType() {
    return referenceType;
  }

  public void setReferenceType(String referenceType) {
    this.referenceType = referenceType;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public LocalDateTime getDate() {
    return date;
  }

  public void setDate(LocalDateTime date) {
    this.date = date;
  }

  public List<PostingLeg> getPostingLegs() {
    return postingLegs;
  }

  public void setPostingLegs(List<PostingLeg> postingLegs) {
    this.postingLegs = postingLegs;
  }
}
