# ADR-012: Mechanical Sound Synthesis and Web Audio API Audio Graph Architecture

## Context
Audio assets loaded via MP3/WAV files incur network latency and require external asset hosting.

## Decision
Procedural sound engine synthesizes crisp mechanical keystroke click, clack, thud, and tactile button feedback entirely in-browser using Web Audio API oscillators and gain nodes.

## Status
Accepted and Implemented.
