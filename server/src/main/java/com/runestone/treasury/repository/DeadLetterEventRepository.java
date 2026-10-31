package com.runestone.treasury.repository;

import com.runestone.treasury.entity.DeadLetterEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeadLetterEventRepository extends JpaRepository<DeadLetterEvent, Long> {
  List<DeadLetterEvent> findByReplayed(boolean replayed);
}
