package com.runestone.treasury.repository;

import com.runestone.treasury.entity.AmlPolicyChunk;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AmlPolicyChunkRepository extends JpaRepository<AmlPolicyChunk, Long> {

  List<AmlPolicyChunk> findByCategory(String category);

  List<AmlPolicyChunk> findByJurisdiction(String jurisdiction);
}
