package com.runestone.treasury.controller;

import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.service.BalanceHoldService;
import com.runestone.treasury.service.UserService;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/hold")
public class BalanceHoldController {

  @Autowired private BalanceHoldService balanceHoldService;

  @Autowired private UserService userService;

  @GetMapping
  public ResponseEntity<?> getAllHoldsOfUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();
    User user = userService.findByUserName(userName);
    if (user != null) {
      Set<Long> userAccountIds =
          user.getTreasuryAccounts().stream()
              .map(TreasuryAccount::getId)
              .collect(Collectors.toSet());
      List<BalanceHold> userHolds =
          balanceHoldService.getAll().stream()
              .filter(
                  h ->
                      userAccountIds.contains(h.getSourceAccountId())
                          || userAccountIds.contains(h.getDestinationAccountId()))
              .collect(Collectors.toList());
      if (!userHolds.isEmpty()) {
        return new ResponseEntity<>(userHolds, HttpStatus.OK);
      }
    }
    return new ResponseEntity<>(HttpStatus.NOT_FOUND);
  }

  @GetMapping("/id/{myId}")
  public ResponseEntity<?> getHoldById(@PathVariable Long myId) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();
    User user = userService.findByUserName(userName);
    if (user != null) {
      Optional<BalanceHold> holdOpt = balanceHoldService.findById(myId);
      if (holdOpt.isPresent()) {
        BalanceHold hold = holdOpt.get();
        Set<Long> userAccountIds =
            user.getTreasuryAccounts().stream()
                .map(TreasuryAccount::getId)
                .collect(Collectors.toSet());
        if (userAccountIds.contains(hold.getSourceAccountId())
            || userAccountIds.contains(hold.getDestinationAccountId())) {
          return new ResponseEntity<>(hold, HttpStatus.OK);
        }
      }
    }
    return new ResponseEntity<>(HttpStatus.NOT_FOUND);
  }
}
