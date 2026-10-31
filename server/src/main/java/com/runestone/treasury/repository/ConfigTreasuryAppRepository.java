package com.runestone.treasury.repository;

import com.runestone.treasury.entity.ConfigTreasuryAppEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfigTreasuryAppRepository extends JpaRepository<ConfigTreasuryAppEntity, Long> {
  Optional<ConfigTreasuryAppEntity> findByConfigKey(String configKey);
}
