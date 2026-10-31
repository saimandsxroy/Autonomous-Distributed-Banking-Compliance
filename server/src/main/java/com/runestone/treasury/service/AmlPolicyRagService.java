package com.runestone.treasury.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.AmlPolicyChunk;
import com.runestone.treasury.repository.AmlPolicyChunkRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AmlPolicyRagService {

  private static final Logger log = LoggerFactory.getLogger(AmlPolicyRagService.class);

  // 16-dimension keyword mapping for deterministic local scoring
  // Dimensions: [circular, layering, round-trip, structuring, smurfing, velocity, burst,
  //              high-value, mule, fan-out, fan-in, shell, counterparty, hold, escalation,
  // reporting]
  private static final String[] KEYWORD_DIMENSIONS = {
    "circular",
    "layering",
    "round-trip",
    "structuring",
    "smurfing",
    "velocity",
    "burst",
    "high-value",
    "mule",
    "fan-out",
    "fan-in",
    "shell",
    "counterparty",
    "hold",
    "escalation",
    "reporting"
  };

  @Autowired private AmlPolicyChunkRepository amlPolicyChunkRepository;

  @Autowired private AppCache appCache;

  @Autowired private RestTemplate restTemplate;

  @Autowired private ObjectMapper objectMapper;

  /**
   * Retrieves the top-K AML policy chunks most relevant to the given risk context query. Uses
   * deterministic cosine similarity scoring over pre-computed embedding vectors combined with
   * domain keyword matching. Works fully offline without Gemini API.
   */
  public List<AmlPolicyChunk> retrieveTopPolicies(String riskContextQuery, int topK) {
    List<AmlPolicyChunk> all = amlPolicyChunkRepository.findAll();
    if (all.isEmpty()) {
      return new ArrayList<>();
    }

    double[] queryVector = queryToVector(riskContextQuery);

    Map<AmlPolicyChunk, Double> scores = new HashMap<>();
    for (AmlPolicyChunk chunk : all) {
      double score = scoreChunk(chunk, queryVector, riskContextQuery);
      scores.put(chunk, score);
    }

    List<AmlPolicyChunk> sorted = new ArrayList<>(all);
    sorted.sort(
        Comparator.comparingDouble((AmlPolicyChunk c) -> scores.getOrDefault(c, 0.0)).reversed());

    int limit = Math.min(topK, sorted.size());
    List<AmlPolicyChunk> result = sorted.subList(0, limit);
    log.info("RAG retrieved {} policies for query: '{}'", result.size(), riskContextQuery);
    return result;
  }

  private double scoreChunk(AmlPolicyChunk chunk, double[] queryVector, String query) {
    double cosineScore = 0.0;
    // Parse stored embedding vector if available
    if (chunk.getEmbeddingJson() != null && !chunk.getEmbeddingJson().isBlank()) {
      double[] chunkVector = parseEmbedding(chunk.getEmbeddingJson());
      if (chunkVector.length == queryVector.length) {
        cosineScore = cosineSimilarity(queryVector, chunkVector);
      }
    }

    // Domain keyword bonus: check if query terms appear in content or title
    double keywordBonus = computeKeywordBonus(chunk, query);

    // Combined score: 70% cosine + 30% keyword match
    return (0.7 * cosineScore) + (0.3 * keywordBonus);
  }

  private double computeKeywordBonus(AmlPolicyChunk chunk, String query) {
    if (query == null || query.isBlank()) return 0.0;
    String lowerQuery = query.toLowerCase();
    String lowerContent = (chunk.getContent() != null ? chunk.getContent() : "").toLowerCase();
    String lowerTitle = (chunk.getTitle() != null ? chunk.getTitle() : "").toLowerCase();
    String lowerCategory = (chunk.getCategory() != null ? chunk.getCategory() : "").toLowerCase();

    int matches = 0;
    int total = 0;
    String[] queryTerms = lowerQuery.split("\\s+");
    for (String term : queryTerms) {
      if (term.length() < 3) continue;
      total++;
      if (lowerContent.contains(term)
          || lowerTitle.contains(term)
          || lowerCategory.contains(term)) {
        matches++;
      }
    }
    return total > 0 ? (double) matches / total : 0.0;
  }

  /**
   * Converts a free-text AML risk query into a 16-dimensional keyword-presence vector. Each
   * dimension corresponds to a known AML domain keyword. The vector is normalized to unit length
   * for cosine similarity computation.
   */
  double[] queryToVector(String query) {
    if (query == null || query.isBlank()) {
      return new double[KEYWORD_DIMENSIONS.length];
    }
    String lower = query.toLowerCase();
    double[] vector = new double[KEYWORD_DIMENSIONS.length];
    for (int i = 0; i < KEYWORD_DIMENSIONS.length; i++) {
      // Count occurrences for weighted presence
      String kw = KEYWORD_DIMENSIONS[i];
      int count = 0;
      int idx = 0;
      while ((idx = lower.indexOf(kw, idx)) != -1) {
        count++;
        idx += kw.length();
      }
      vector[i] = count > 0 ? Math.min(1.0, 0.5 + (count * 0.5)) : 0.0;
    }
    return normalize(vector);
  }

  double[] parseEmbedding(String embeddingJson) {
    try {
      List<?> list = objectMapper.readValue(embeddingJson, List.class);
      double[] vector = new double[list.size()];
      for (int i = 0; i < list.size(); i++) {
        Object val = list.get(i);
        if (val instanceof Number) {
          vector[i] = ((Number) val).doubleValue();
        }
      }
      return vector;
    } catch (Exception e) {
      log.warn("Failed to parse embedding JSON: {}", e.getMessage());
      return new double[KEYWORD_DIMENSIONS.length];
    }
  }

  double cosineSimilarity(double[] a, double[] b) {
    if (a.length != b.length) return 0.0;
    double dot = 0.0;
    double normA = 0.0;
    double normB = 0.0;
    for (int i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA == 0.0 || normB == 0.0) return 0.0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private double[] normalize(double[] vector) {
    double norm = 0.0;
    for (double v : vector) norm += v * v;
    if (norm == 0.0) return vector;
    norm = Math.sqrt(norm);
    double[] normalized = new double[vector.length];
    for (int i = 0; i < vector.length; i++) {
      normalized[i] = vector[i] / norm;
    }
    return normalized;
  }
}
