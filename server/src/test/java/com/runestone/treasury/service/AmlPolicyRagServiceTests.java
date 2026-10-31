package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.AmlPolicyChunk;
import com.runestone.treasury.repository.AmlPolicyChunkRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class AmlPolicyRagServiceTests {

  @Mock private AmlPolicyChunkRepository amlPolicyChunkRepository;

  @Mock private AppCache appCache;

  @Mock private RestTemplate restTemplate;

  @Spy private ObjectMapper objectMapper;

  @InjectMocks private AmlPolicyRagService amlPolicyRagService;

  private AmlPolicyChunk circularChunk;
  private AmlPolicyChunk structuringChunk;
  private AmlPolicyChunk muleChunk;

  @BeforeEach
  void setup() {
    circularChunk = new AmlPolicyChunk();
    circularChunk.setId(1L);
    circularChunk.setPolicyCode("FATF-REC-16-LAYERING");
    circularChunk.setJurisdiction("FATF");
    circularChunk.setTitle("Circular Round-Tripping and Multi-Hop Layering Detection");
    circularChunk.setCategory("CIRCULAR_LAYERING");
    circularChunk.setContent(
        "FATF Recommendation 16 addresses wire transfer layering and circular round-tripping.");
    circularChunk.setEmbeddingJson(
        "[0.95, 0.95, 0.90, 0.10, 0.10, 0.15, 0.10, 0.05, 0.10, 0.20, 0.20, 0.60, 0.70, 0.50,"
            + " 0.30, 0.80]");
    circularChunk.setCreatedAt(LocalDateTime.now());

    structuringChunk = new AmlPolicyChunk();
    structuringChunk.setId(2L);
    structuringChunk.setPolicyCode("FINCEN-31-CFR-1010.314");
    structuringChunk.setJurisdiction("FINCEN");
    structuringChunk.setTitle("Structuring and Smurfing — Anti-Structuring Regulations");
    structuringChunk.setCategory("STRUCTURING_SMURFING");
    structuringChunk.setContent(
        "FinCEN 31 CFR 1010.314 prohibits the structuring of transactions.");
    structuringChunk.setEmbeddingJson(
        "[0.05, 0.05, 0.05, 0.92, 0.90, 0.30, 0.25, 0.10, 0.25, 0.88, 0.85, 0.05, 0.40, 0.20,"
            + " 0.10, 0.95]");
    structuringChunk.setCreatedAt(LocalDateTime.now());

    muleChunk = new AmlPolicyChunk();
    muleChunk.setId(3L);
    muleChunk.setPolicyCode("RBI-AML-MULE-04");
    muleChunk.setJurisdiction("RBI");
    muleChunk.setTitle("Rapid Fan-Out and Fan-In Mule Account Detection");
    muleChunk.setCategory("MULE_AGGREGATION");
    muleChunk.setContent("RBI AML Circular 04 mandates detection of mule account patterns.");
    muleChunk.setEmbeddingJson(
        "[0.10, 0.20, 0.10, 0.50, 0.55, 0.20, 0.20, 0.05, 0.95, 0.90, 0.92, 0.10, 0.40, 0.30,"
            + " 0.20, 0.75]");
    muleChunk.setCreatedAt(LocalDateTime.now());
  }

  @Test
  void testRetrieveTopPoliciesReturnsRankedResults() {
    when(amlPolicyChunkRepository.findAll())
        .thenReturn(List.of(circularChunk, structuringChunk, muleChunk));

    List<AmlPolicyChunk> results =
        amlPolicyRagService.retrieveTopPolicies("circular layering round-trip", 2);

    assertNotNull(results);
    assertEquals(2, results.size());
    // Circular chunk should rank first for a circular/layering query
    assertEquals("FATF-REC-16-LAYERING", results.get(0).getPolicyCode());
  }

  @Test
  void testRetrieveTopPoliciesEmptyRepositoryReturnsEmpty() {
    when(amlPolicyChunkRepository.findAll()).thenReturn(List.of());

    List<AmlPolicyChunk> results =
        amlPolicyRagService.retrieveTopPolicies("circular ring detection", 3);

    assertNotNull(results);
    assertTrue(results.isEmpty());
  }

  @Test
  void testRetrieveTopPoliciesStructuringQueryRanksCorrectly() {
    when(amlPolicyChunkRepository.findAll())
        .thenReturn(List.of(circularChunk, structuringChunk, muleChunk));

    List<AmlPolicyChunk> results =
        amlPolicyRagService.retrieveTopPolicies("structuring smurfing fan-out reporting", 1);

    assertNotNull(results);
    assertEquals(1, results.size());
    // Structuring chunk should rank first for structuring/smurfing query
    assertEquals("FINCEN-31-CFR-1010.314", results.get(0).getPolicyCode());
  }

  @Test
  void testQueryToVectorNullReturnsZeroVector() {
    double[] vector = amlPolicyRagService.queryToVector(null);

    assertNotNull(vector);
    assertEquals(16, vector.length);
    for (double v : vector) {
      assertEquals(0.0, v, 0.0001);
    }
  }

  @Test
  void testQueryToVectorBlankReturnsZeroVector() {
    double[] vector = amlPolicyRagService.queryToVector("   ");

    assertNotNull(vector);
    assertEquals(16, vector.length);
    for (double v : vector) {
      assertEquals(0.0, v, 0.0001);
    }
  }

  @Test
  void testQueryToVectorCircularKeywordActivatesDimension() {
    double[] vector = amlPolicyRagService.queryToVector("circular ring detection");

    assertNotNull(vector);
    assertEquals(16, vector.length);
    // The vector should be non-zero (circular keyword at index 0 activated)
    boolean hasNonZero = false;
    for (double v : vector) {
      if (v > 0.0) {
        hasNonZero = true;
        break;
      }
    }
    assertTrue(hasNonZero);
  }

  @Test
  void testParseEmbeddingValidJson() {
    String json =
        "[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]";

    double[] vector = amlPolicyRagService.parseEmbedding(json);

    assertNotNull(vector);
    assertEquals(16, vector.length);
    assertEquals(0.1, vector[0], 0.0001);
    assertEquals(0.6, vector[15], 0.0001);
  }

  @Test
  void testParseEmbeddingInvalidJsonReturnsDefault() {
    String json = "not-valid-json";

    double[] vector = amlPolicyRagService.parseEmbedding(json);

    assertNotNull(vector);
    assertEquals(16, vector.length);
  }

  @Test
  void testCosineSimilarityIdenticalVectors() {
    double[] a = {1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
    double[] b = {1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};

    double similarity = amlPolicyRagService.cosineSimilarity(a, b);

    assertEquals(1.0, similarity, 0.0001);
  }

  @Test
  void testCosineSimilarityOrthogonalVectors() {
    double[] a = {1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
    double[] b = {0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};

    double similarity = amlPolicyRagService.cosineSimilarity(a, b);

    assertEquals(0.0, similarity, 0.0001);
  }

  @Test
  void testCosineSimilarityZeroVectorReturnsZero() {
    double[] a = {0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
    double[] b = {1.0, 0.5, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};

    double similarity = amlPolicyRagService.cosineSimilarity(a, b);

    assertEquals(0.0, similarity, 0.0001);
  }

  @Test
  void testCosineSimilarityDifferentLengthReturnsZero() {
    double[] a = {1.0, 0.5};
    double[] b = {1.0, 0.5, 0.3};

    double similarity = amlPolicyRagService.cosineSimilarity(a, b);

    assertEquals(0.0, similarity, 0.0001);
  }

  @Test
  void testRetrieveTopPoliciesTopKLimitRespected() {
    when(amlPolicyChunkRepository.findAll())
        .thenReturn(List.of(circularChunk, structuringChunk, muleChunk));

    List<AmlPolicyChunk> results =
        amlPolicyRagService.retrieveTopPolicies("circular structuring mule fan-out fan-in", 2);

    assertNotNull(results);
    assertEquals(2, results.size());
  }

  @Test
  void testRetrieveTopPoliciesChunkWithNoEmbeddingStillScored() {
    AmlPolicyChunk noEmbedChunk = new AmlPolicyChunk();
    noEmbedChunk.setId(4L);
    noEmbedChunk.setPolicyCode("TEST-NO-EMBED");
    noEmbedChunk.setJurisdiction("TEST");
    noEmbedChunk.setTitle("Test Policy No Embedding");
    noEmbedChunk.setCategory("STRUCTURING_SMURFING");
    noEmbedChunk.setContent("Structuring smurfing test policy with no embedding vector.");
    noEmbedChunk.setEmbeddingJson(null);
    noEmbedChunk.setCreatedAt(LocalDateTime.now());

    when(amlPolicyChunkRepository.findAll()).thenReturn(List.of(noEmbedChunk));

    List<AmlPolicyChunk> results =
        amlPolicyRagService.retrieveTopPolicies("structuring smurfing", 1);

    assertNotNull(results);
    assertFalse(results.isEmpty());
    assertEquals("TEST-NO-EMBED", results.get(0).getPolicyCode());
  }
}
