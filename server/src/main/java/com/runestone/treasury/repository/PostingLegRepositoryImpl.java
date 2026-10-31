package com.runestone.treasury.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.math.BigInteger;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class PostingLegRepositoryImpl implements PostingLegRepositoryCustom {

  @PersistenceContext private EntityManager entityManager;

  @Override
  @SuppressWarnings("unchecked")
  public List<Object[]> findCircularTransferRingsMySql(Long suspectAccountId, int maxHopDepth) {
    String sql =
        """
        WITH RECURSIVE transfer_ring AS (
            SELECT
                pl.account_id AS origin_account_id,
                pl.account_id AS from_account_id,
                pl.counterparty_account_id AS to_account_id,
                pl.amount AS initial_amount,
                pl.amount AS hop_amount,
                1 AS hop_depth,
                CAST(CONCAT(',', pl.account_id, ',', pl.counterparty_account_id, ',') AS CHAR(1000)) AS account_path,
                pl.created_at AS hop_timestamp,
                0 AS is_cycle
            FROM posting_legs pl
            WHERE pl.account_id = :suspectAccountId
              AND pl.leg_type = 'DEBIT'
              AND pl.created_at >= NOW(6) - INTERVAL 24 HOUR

            UNION ALL

            SELECT
                tr.origin_account_id,
                next_leg.account_id AS from_account_id,
                next_leg.counterparty_account_id AS to_account_id,
                tr.initial_amount,
                next_leg.amount AS hop_amount,
                tr.hop_depth + 1 AS hop_depth,
                CAST(CONCAT(tr.account_path, next_leg.counterparty_account_id, ',') AS CHAR(1000)) AS account_path,
                next_leg.created_at AS hop_timestamp,
                CASE WHEN next_leg.counterparty_account_id = tr.origin_account_id THEN 1 ELSE 0 END AS is_cycle
            FROM transfer_ring tr
            INNER JOIN posting_legs next_leg
                ON next_leg.account_id = tr.to_account_id
               AND next_leg.leg_type = 'DEBIT'
               AND next_leg.created_at >= tr.hop_timestamp
            WHERE tr.hop_depth < :maxHopDepth
              AND tr.is_cycle = 0
              AND (
                  next_leg.counterparty_account_id = tr.origin_account_id
                  OR LOCATE(CONCAT(',', next_leg.counterparty_account_id, ','), tr.account_path) = 0
              )
        )
        SELECT origin_account_id, hop_depth, initial_amount, hop_amount, account_path, is_cycle
        FROM transfer_ring
        WHERE is_cycle = 1 OR hop_depth >= 3
        ORDER BY is_cycle DESC, hop_depth DESC
        """;

    Query query = entityManager.createNativeQuery(sql);
    query.setParameter("suspectAccountId", suspectAccountId);
    query.setParameter("maxHopDepth", maxHopDepth);
    return query.getResultList();
  }

  @Override
  public boolean detectsCircularRingPreTransfer(
      Long sourceAccountId, Long destinationAccountId, int maxHopDepth) {
    // Check if there already exists a path from destinationAccountId back to sourceAccountId
    // in the last 24 hours within maxHopDepth hops.
    // If yes, adding sourceAccountId -> destinationAccountId would create a circular ring.
    String sql =
        """
        WITH RECURSIVE ring_check AS (
            SELECT
                pl.account_id AS from_id,
                pl.counterparty_account_id AS to_id,
                1 AS depth,
                CAST(CONCAT(',', pl.account_id, ',', pl.counterparty_account_id, ',') AS CHAR(2000)) AS visited
            FROM posting_legs pl
            WHERE pl.account_id = :destinationAccountId
              AND pl.leg_type = 'DEBIT'
              AND pl.created_at >= NOW(6) - INTERVAL 24 HOUR

            UNION ALL

            SELECT
                rc.from_id,
                next_leg.counterparty_account_id AS to_id,
                rc.depth + 1 AS depth,
                CAST(CONCAT(rc.visited, next_leg.counterparty_account_id, ',') AS CHAR(2000)) AS visited
            FROM ring_check rc
            INNER JOIN posting_legs next_leg
                ON next_leg.account_id = rc.to_id
               AND next_leg.leg_type = 'DEBIT'
               AND next_leg.created_at >= NOW(6) - INTERVAL 24 HOUR
            WHERE rc.depth < :maxHopDepth
              AND rc.to_id != :sourceAccountId
              AND LOCATE(CONCAT(',', next_leg.counterparty_account_id, ','), rc.visited) = 0
        )
        SELECT COUNT(*) FROM ring_check WHERE to_id = :sourceAccountId
        """;

    Query query = entityManager.createNativeQuery(sql);
    query.setParameter("destinationAccountId", destinationAccountId);
    query.setParameter("sourceAccountId", sourceAccountId);
    query.setParameter("maxHopDepth", maxHopDepth);
    Object result = query.getSingleResult();
    if (result instanceof BigInteger) {
      return ((BigInteger) result).longValue() > 0;
    }
    if (result instanceof Number) {
      return ((Number) result).longValue() > 0;
    }
    return false;
  }

  @Override
  public long countDistinctOutboundCounterparties24h(Long accountId) {
    String sql =
        """
        SELECT COUNT(DISTINCT counterparty_account_id)
        FROM posting_legs
        WHERE account_id = :accountId
          AND leg_type = 'DEBIT'
          AND created_at >= NOW(6) - INTERVAL 24 HOUR
        """;
    Query query = entityManager.createNativeQuery(sql);
    query.setParameter("accountId", accountId);
    Object result = query.getSingleResult();
    if (result instanceof BigInteger) {
      return ((BigInteger) result).longValue();
    }
    if (result instanceof Number) {
      return ((Number) result).longValue();
    }
    return 0L;
  }

  @Override
  public long countDistinctInboundCounterparties24h(Long accountId) {
    String sql =
        """
        SELECT COUNT(DISTINCT counterparty_account_id)
        FROM posting_legs
        WHERE account_id = :accountId
          AND leg_type = 'CREDIT'
          AND created_at >= NOW(6) - INTERVAL 24 HOUR
        """;
    Query query = entityManager.createNativeQuery(sql);
    query.setParameter("accountId", accountId);
    Object result = query.getSingleResult();
    if (result instanceof BigInteger) {
      return ((BigInteger) result).longValue();
    }
    if (result instanceof Number) {
      return ((Number) result).longValue();
    }
    return 0L;
  }

  @Override
  @SuppressWarnings("unchecked")
  public List<Object[]> getThreeHopSubgraph(Long accountId) {
    String sql =
        """
        WITH RECURSIVE subgraph AS (
            SELECT
                pl.account_id AS from_account,
                pl.counterparty_account_id AS to_account,
                pl.amount,
                pl.created_at AS edge_timestamp,
                1 AS hop_depth
            FROM posting_legs pl
            WHERE pl.account_id = :accountId
              AND pl.leg_type = 'DEBIT'
              AND pl.created_at >= NOW(6) - INTERVAL 24 HOUR

            UNION ALL

            SELECT
                next_leg.account_id AS from_account,
                next_leg.counterparty_account_id AS to_account,
                next_leg.amount,
                next_leg.created_at AS edge_timestamp,
                sg.hop_depth + 1 AS hop_depth
            FROM subgraph sg
            INNER JOIN posting_legs next_leg
                ON next_leg.account_id = sg.to_account
               AND next_leg.leg_type = 'DEBIT'
               AND next_leg.created_at >= NOW(6) - INTERVAL 24 HOUR
            WHERE sg.hop_depth < 3
        )
        SELECT DISTINCT from_account, to_account, amount, edge_timestamp, hop_depth
        FROM subgraph
        ORDER BY hop_depth, edge_timestamp
        """;

    Query query = entityManager.createNativeQuery(sql);
    query.setParameter("accountId", accountId);
    return query.getResultList();
  }
}
