package com.runestone.treasury.controller;

import com.runestone.treasury.entity.User;
import com.runestone.treasury.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
public class UserController {

  @Autowired private UserService userService;

  @PutMapping
  public ResponseEntity<?> updateUser(@RequestBody User user) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();
    User userInDb = userService.findByUserName(userName);
    if (userInDb != null) {
      if (user.getPassword() != null && !user.getPassword().isEmpty()) {
        userInDb.setPassword(user.getPassword());
      }
      if (user.getEmail() != null) {
        userInDb.setEmail(user.getEmail());
      }
      userService.saveNewUser(userInDb);
      return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
  }

  @DeleteMapping
  public ResponseEntity<?> deleteUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();
    userService.deleteByUserName(userName);
    return new ResponseEntity<>(HttpStatus.NO_CONTENT);
  }
}
