package com.runestone.treasury.repository;

import com.runestone.treasury.entity.MakerCheckerWire;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MakerCheckerWireRepository extends JpaRepository<MakerCheckerWire, Long> {

  Optional<MakerCheckerWire> findByIdempotencyKey(String idempotencyKey);

  List<MakerCheckerWire> findAllByOrderByCreatedAtDesc();

  long countByStatus(String status);
}
