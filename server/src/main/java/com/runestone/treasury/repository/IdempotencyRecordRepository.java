package com.runestone.treasury.repository;

import com.runestone.treasury.entity.IdempotencyRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, Long> {
  Optional<IdempotencyRecord> findByUserNameAndIdempotencyKey(
      String userName, String idempotencyKey);
}
