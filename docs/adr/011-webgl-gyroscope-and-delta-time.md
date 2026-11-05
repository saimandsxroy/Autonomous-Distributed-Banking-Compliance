# ADR-011: Sub-Second Client 3D WebGL Gyroscope Performance and Delta-Time Smoothing

## Context
Complex 3D animations risk jank or high CPU usage if bound directly to React render cycles or variable monitor refresh rates.

## Decision
Three.js canvas utilizes delta-time exponential damping and passive scroll listeners to achieve smooth 60fps rendering with zero React re-renders.

## Status
Accepted and Implemented.
