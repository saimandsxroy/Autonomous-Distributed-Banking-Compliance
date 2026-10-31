package com.runestone.treasury.repository;

import com.runestone.treasury.entity.User;
import java.util.List;

public interface UserRepositoryCustom {
  List<User> getUserForSA();
}
