package com.runestone.treasury.repository;

import java.util.List;

public interface PostingLegRepositoryCustom {
  List<Object[]> findCircularTransferRingsMySql(Long suspectAccountId, int maxHopDepth);

  boolean detectsCircularRingPreTransfer(
      Long sourceAccountId, Long destinationAccountId, int maxHopDepth);

  long countDistinctOutboundCounterparties24h(Long accountId);

  long countDistinctInboundCounterparties24h(Long accountId);

  List<Object[]> getThreeHopSubgraph(Long accountId);
}
