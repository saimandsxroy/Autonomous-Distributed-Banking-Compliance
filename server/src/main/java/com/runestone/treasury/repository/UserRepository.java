package com.runestone.treasury.repository;

import com.runestone.treasury.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, UserRepositoryCustom {
  Optional<User> findByUserName(String userName);

  Optional<User> findByEmail(String email);

  void deleteByUserName(String userName);
}
