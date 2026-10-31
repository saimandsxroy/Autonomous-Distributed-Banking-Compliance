package com.runestone.treasury.repository;

import com.runestone.treasury.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepositoryImpl implements UserRepositoryCustom {

  @PersistenceContext private EntityManager entityManager;

  @Override
  public List<User> getUserForSA() {
    CriteriaBuilder cb = entityManager.getCriteriaBuilder();
    CriteriaQuery<User> query = cb.createQuery(User.class);
    Root<User> root = query.from(User.class);

    List<Predicate> predicates = new ArrayList<>();
    predicates.add(cb.isNotNull(root.get("email")));
    predicates.add(cb.isTrue(root.get("amlMonitoringEnabled")));

    query.select(root).where(cb.and(predicates.toArray(new Predicate[0])));
    return entityManager.createQuery(query).getResultList();
  }
}
