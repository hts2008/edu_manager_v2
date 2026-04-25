---
name: Game Development
description: Game logic: state machines, physics, rendering loop, input handling
---

# Game Development

## Game Loop
- Fixed timestep for physics (deterministic)
- Variable timestep for rendering (smooth)
- Separate update and render phases

## State Machine
- Define states: menu, playing, paused, game-over
- Transitions with guards: canStart, canPause
- Each state handles its own input and rendering

## Entity Component System
- Entity: unique ID only
- Component: data only (Position, Velocity, Sprite)
- System: logic that operates on components (MovementSystem, RenderSystem)

## Physics Basics
- Collision detection: AABB for simple, SAT for complex
- Rigid body: mass, velocity, forces
- Gravity: apply each frame, terminal velocity cap

## Input Handling
- Abstract input: map keys/buttons to actions
- Input buffer: store recent inputs for combos
- Platform-agnostic: keyboard, gamepad, touch

## Performance
- Object pooling: reuse bullets, particles
- Spatial partitioning: quadtree for collision
- Sprite batching: minimize draw calls
