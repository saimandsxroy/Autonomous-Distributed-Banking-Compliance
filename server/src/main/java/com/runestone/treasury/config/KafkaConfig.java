package com.runestone.treasury.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

  public static final String TOPIC_TRANSACTIONS_SETTLED = "treasury.transfers.settled";
  public static final String TOPIC_AML_FLAGGED = "treasury.aml.flagged";

  /** Central relay topic consumed by TreasuryEventConsumerService. */
  public static final String TOPIC_TREASURY_EVENTS = "runestone.treasury.events";

  @Bean
  public NewTopic settledTopic() {
    return TopicBuilder.name(TOPIC_TRANSACTIONS_SETTLED).partitions(3).replicas(1).build();
  }

  @Bean
  public NewTopic flaggedTopic() {
    return TopicBuilder.name(TOPIC_AML_FLAGGED).partitions(3).replicas(1).build();
  }

  @Bean
  public NewTopic treasuryEventsTopic() {
    return TopicBuilder.name(TOPIC_TREASURY_EVENTS).partitions(3).replicas(1).build();
  }
}
