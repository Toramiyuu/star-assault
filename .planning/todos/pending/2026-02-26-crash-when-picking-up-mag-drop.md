---
created: 2026-02-26T13:57:49.618Z
title: Fix crash when picking up MAG drop
area: gameplay
files:
  - src/systems/GroundDropManager.js
---

## Problem

Game crashes when the player moves over and collects the MAG (magnet) ground drop. Reported during Phase 1 human testing. The collect logic in GroundDropManager likely has a bug specific to the MAG drop type — possibly a missing/undefined reference when processing the collect effect (magnet attract logic, radius, or duration variable).

Crash does not affect other drop types observed during testing. Needs investigation before or alongside Phase 2 work (which touches drop icons and the drop system).

## Solution

Investigate GroundDropManager collect handler for MAG type. Look for undefined variable references, missing duration/radius constants, or broken magnet activation call when type === 'magnet'. Add error guard or fix the root cause.
