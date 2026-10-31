package com.runestone.treasury.repository;

import com.runestone.treasury.entity.McpToolInvocation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface McpToolInvocationRepository extends JpaRepository<McpToolInvocation, Long> {

  List<McpToolInvocation> findByInvestigationIdOrderByIdAsc(Long investigationId);
}
