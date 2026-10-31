package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fx_rates")
public class FxRate {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "base_currency", nullable = false, length = 3)
  private String baseCurrency;

  @Column(name = "target_currency", nullable = false, length = 3)
  private String targetCurrency;

  @Column(name = "exchange_rate", nullable = false, precision = 19, scale = 6)
  private BigDecimal exchangeRate;

  @Column(name = "spread_bps", nullable = false)
  private Integer spreadBps = 50;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();

  public FxRate() {}

  public FxRate(
      String baseCurrency, String targetCurrency, BigDecimal exchangeRate, Integer spreadBps) {
    this.baseCurrency = baseCurrency;
    this.targetCurrency = targetCurrency;
    this.exchangeRate = exchangeRate;
    this.spreadBps = spreadBps != null ? spreadBps : 50;
    this.updatedAt = LocalDateTime.now();
  }

  public FxRate(
      Long id,
      String baseCurrency,
      String targetCurrency,
      BigDecimal exchangeRate,
      Integer spreadBps,
      LocalDateTime updatedAt) {
    this.id = id;
    this.baseCurrency = baseCurrency;
    this.targetCurrency = targetCurrency;
    this.exchangeRate = exchangeRate;
    this.spreadBps = spreadBps != null ? spreadBps : 50;
    this.updatedAt = updatedAt != null ? updatedAt : LocalDateTime.now();
  }

  @PrePersist
  public void onPrePersist() {
    if (this.updatedAt == null) {
      this.updatedAt = LocalDateTime.now();
    }
    if (this.spreadBps == null) {
      this.spreadBps = 50;
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

  public String getBaseCurrency() {
    return baseCurrency;
  }

  public void setBaseCurrency(String baseCurrency) {
    this.baseCurrency = baseCurrency;
  }

  public String getTargetCurrency() {
    return targetCurrency;
  }

  public void setTargetCurrency(String targetCurrency) {
    this.targetCurrency = targetCurrency;
  }

  public BigDecimal getExchangeRate() {
    return exchangeRate;
  }

  public void setExchangeRate(BigDecimal exchangeRate) {
    this.exchangeRate = exchangeRate;
  }

  public Integer getSpreadBps() {
    return spreadBps;
  }

  public void setSpreadBps(Integer spreadBps) {
    this.spreadBps = spreadBps;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
