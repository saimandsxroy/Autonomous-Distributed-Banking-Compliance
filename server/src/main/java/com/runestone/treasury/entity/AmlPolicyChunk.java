package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "aml_policy_chunks")
public class AmlPolicyChunk {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "policy_code", nullable = false, unique = true, length = 64)
  private String policyCode;

  @Column(name = "jurisdiction", nullable = false, length = 32)
  private String jurisdiction;

  @Column(name = "title", nullable = false, length = 255)
  private String title;

  @Column(name = "category", nullable = false, length = 64)
  private String category;

  @Column(name = "content", nullable = false, columnDefinition = "TEXT")
  private String content;

  @Column(name = "embedding_json", columnDefinition = "JSON")
  private String embeddingJson;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public AmlPolicyChunk() {}

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getPolicyCode() {
    return policyCode;
  }

  public void setPolicyCode(String policyCode) {
    this.policyCode = policyCode;
  }

  public String getJurisdiction() {
    return jurisdiction;
  }

  public void setJurisdiction(String jurisdiction) {
    this.jurisdiction = jurisdiction;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public String getEmbeddingJson() {
    return embeddingJson;
  }

  public void setEmbeddingJson(String embeddingJson) {
    this.embeddingJson = embeddingJson;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
