package com.runestone.treasury.repository;

import com.runestone.treasury.entity.PostingLeg;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostingLegRepository
    extends JpaRepository<PostingLeg, Long>, PostingLegRepositoryCustom {
  List<PostingLeg> findByJournalEntryId(Long journalEntryId);

  List<PostingLeg> findByAccountId(Long accountId);
}
