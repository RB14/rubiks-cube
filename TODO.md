# Rubik's Cube 3D

A fully interactive 3D Rubik's Cube built with Three.js.

## Architecture

Clean separation between logic and rendering:

```
js/
├── core/
│   └── RubiksCube.js     # Pure state & logic (no dependencies)
├── renderer/
│   └── CubeRenderer.js   # Three.js 3D visualization
├── controls/
│   └── FaceControls.js   # Face rotation via drag
└── main.js               # Entry point, wires everything
```

## Features

- [x] **3D Visualization** - Full 3D cube with proper lighting and materials
- [x] **Orbit Camera** - Right-drag or two-finger to rotate view
- [x] **Face Rotation** - Left-drag on faces to rotate layers
- [x] **Real-time Animation** - Face follows your drag in real-time
- [x] **Snap Behavior** - >50% completes rotation, <50% reverts
- [x] **Shuffle** - Randomize the cube
- [x] **Reset** - Return to solved state
- [x] **Win Detection** - Celebration when solved

## How to Run

```bash
npx serve .
```

Then open http://localhost:3000

## Controls

| Action | Mouse | Touch |
|--------|-------|-------|
| Rotate Face | Left-drag on face | One-finger drag |
| Orbit Camera | Right-drag | Two-finger drag |
| Zoom | Scroll wheel | Pinch |

## Core Classes

### RubiksCube (core/RubiksCube.js)
Pure logic, no rendering. Manages 26 cubies with their positions and colors.
- `rotateFace(face, clockwise)` - Rotate a face
- `isSolved()` - Check if cube is solved
- `shuffle(moves)` - Randomize
- `reset()` - Return to solved state

### CubeRenderer (renderer/CubeRenderer.js)
Three.js visualization synchronized with cube state.
- Creates 3D meshes for each cubie
- Handles rotation animations
- `setFaceRotation(face, angle)` - Real-time rotation during drag
- `snapFaceRotation(face, angle)` - Animate to complete/revert

### FaceControls (controls/FaceControls.js)
Handles user interaction for face rotation.
- Raycasting to detect clicked face
- Drag direction determines rotation axis
- Communicates with renderer for visual feedback
