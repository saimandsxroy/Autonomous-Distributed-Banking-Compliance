package com.runestone.treasury.controller;

import com.runestone.treasury.entity.User;
import com.runestone.treasury.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public")
public class PublicController {

  @Autowired private UserService userService;

  @GetMapping("/health-check")
  public String healthCheck() {
    return "Ok";
  }

  @PostMapping("/create-user")
  public ResponseEntity<?> createUser(@RequestBody User user) {
    if (user.getUserName() == null
        || user.getUserName().trim().isEmpty()
        || user.getPassword() == null
        || user.getPassword().trim().isEmpty()) {
      return new ResponseEntity<>("UserName and password are required", HttpStatus.BAD_REQUEST);
    }
    boolean created = userService.saveNewUser(user);
    if (created) {
      return new ResponseEntity<>(user, HttpStatus.CREATED);
    }
    return new ResponseEntity<>("User already exists or invalid data", HttpStatus.BAD_REQUEST);
  }
}
