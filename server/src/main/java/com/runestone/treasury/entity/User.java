package com.runestone.treasury.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_name", nullable = false, unique = true, length = 100)
  private String userName;

  @Column(name = "password", nullable = false)
  private String password;

  @Column(name = "email", length = 150)
  private String email;

  @Column(name = "aml_monitoring_enabled", nullable = false)
  private boolean amlMonitoringEnabled = true;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
  @Column(name = "role")
  private List<String> roles = new ArrayList<>();

  @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private List<TreasuryAccount> treasuryAccounts = new ArrayList<>();

  @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private List<JournalEntry> journalEntries = new ArrayList<>();

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public User() {}

  public User(
      Long id,
      String userName,
      String password,
      String email,
      boolean amlMonitoringEnabled,
      List<String> roles,
      List<TreasuryAccount> treasuryAccounts,
      List<JournalEntry> journalEntries,
      LocalDateTime createdAt) {
    this.id = id;
    this.userName = userName;
    this.password = password;
    this.email = email;
    this.amlMonitoringEnabled = amlMonitoringEnabled;
    this.roles = roles != null ? roles : new ArrayList<>();
    this.treasuryAccounts = treasuryAccounts != null ? treasuryAccounts : new ArrayList<>();
    this.journalEntries = journalEntries != null ? journalEntries : new ArrayList<>();
    this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getUserName() {
    return userName;
  }

  public void setUserName(String userName) {
    this.userName = userName;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public boolean isAmlMonitoringEnabled() {
    return amlMonitoringEnabled;
  }

  public void setAmlMonitoringEnabled(boolean amlMonitoringEnabled) {
    this.amlMonitoringEnabled = amlMonitoringEnabled;
  }

  public List<String> getRoles() {
    if (roles == null) {
      roles = new ArrayList<>();
    }
    return roles;
  }

  public void setRoles(List<String> roles) {
    this.roles = roles;
  }

  public List<TreasuryAccount> getTreasuryAccounts() {
    if (treasuryAccounts == null) {
      treasuryAccounts = new ArrayList<>();
    }
    return treasuryAccounts;
  }

  public void setTreasuryAccounts(List<TreasuryAccount> treasuryAccounts) {
    this.treasuryAccounts = treasuryAccounts;
  }

  public List<JournalEntry> getJournalEntries() {
    if (journalEntries == null) {
      journalEntries = new ArrayList<>();
    }
    return journalEntries;
  }

  public void setJournalEntries(List<JournalEntry> journalEntries) {
    this.journalEntries = journalEntries;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
