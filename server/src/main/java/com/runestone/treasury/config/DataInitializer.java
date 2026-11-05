package com.runestone.treasury.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {
  private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

  @Override
  public void run(String... args) {
    log.info("Starting idempotent database bootstrap & demo data verification...");
  }
}
