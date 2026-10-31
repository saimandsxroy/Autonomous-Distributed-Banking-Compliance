package com.runestone.treasury.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class SseTelemetryService {

  private static final Logger log = LoggerFactory.getLogger(SseTelemetryService.class);
  private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

  public SseEmitter subscribe() {
    SseEmitter emitter = new SseEmitter(0L);
    emitters.add(emitter);
    emitter.onCompletion(() -> emitters.remove(emitter));
    emitter.onTimeout(() -> emitters.remove(emitter));
    emitter.onError(e -> emitters.remove(emitter));
    log.info("New SSE subscriber connected. Total subscribers: {}", emitters.size());
    return emitter;
  }

  public void broadcast(String eventType, Object data) {
    List<SseEmitter> deadEmitters = new ArrayList<>();
    for (SseEmitter emitter : emitters) {
      try {
        emitter.send(SseEmitter.event().name(eventType).data(data));
      } catch (Exception e) {
        deadEmitters.add(emitter);
      }
    }
    emitters.removeAll(deadEmitters);
  }
}
