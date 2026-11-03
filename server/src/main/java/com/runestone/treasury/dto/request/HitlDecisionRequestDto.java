package com.runestone.treasury.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public class HitlDecisionRequestDto {
  @NotBlank(message = "decision is required (APPROVE or REJECT)")
  private String decision;

  @Size(max = 1024, message = "reviewerNotes must be at most 1024 characters")
  private String reviewerNotes;

  public String getDecision() {
    return decision;
  }

  public void setDecision(String decision) {
    this.decision = decision;
  }

  public String getReviewerNotes() {
    return reviewerNotes;
  }

  public void setReviewerNotes(String reviewerNotes) {
    this.reviewerNotes = reviewerNotes;
  }
}
