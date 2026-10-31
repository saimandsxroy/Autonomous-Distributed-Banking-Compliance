package com.runestone.treasury.repository;

import com.runestone.treasury.entity.JournalEntry;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {
  Optional<JournalEntry> findByIdempotencyKey(String idempotencyKey);
}
