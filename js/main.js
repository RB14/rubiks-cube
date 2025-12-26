/**
 * Rubik's Cube 3D - Main Entry Point
 *
 * Wires together the core logic, renderer, and controls.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RubiksCube } from './core/RubiksCube.js';
import { CubeRenderer } from './renderer/CubeRenderer.js';
import { Cube2DRenderer } from './renderer/Cube2DRenderer.js';
import { FaceControls } from './controls/FaceControls.js';
import { ViewTouchpad } from './controls/ViewTouchpad.js';

class Game {
    constructor() {
        this.container = document.getElementById('canvas-container');

        // Core logic
        this.cube = new RubiksCube();

        // 3D Renderer
        this.renderer = new CubeRenderer(this.container, this.cube);

        // 2D Visualization (syncs with cube state)
        this.renderer2D = new Cube2DRenderer(
            document.getElementById('cube-2d'),
            this.cube
        );

        // Orbit controls for camera rotation
        this.orbitControls = new OrbitControls(
            this.renderer.getCamera(),
            this.renderer.getDomElement()
        );
        this.setupOrbitControls();

        // Face rotation controls
        this.faceControls = new FaceControls(this.renderer, this.orbitControls);
        this.faceControls.setOnMoveComplete(() => this.onMoveComplete());

        // View touchpad for mobile (single-finger view rotation)
        this.viewTouchpad = new ViewTouchpad(
            document.getElementById('view-touchpad'),
            this.orbitControls
        );

        // UI
        this.setupUI();

        console.log('🧊 Rubik\'s Cube 3D loaded!');
    }

    setupOrbitControls() {
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.1;
        this.orbitControls.enablePan = false;
        this.orbitControls.minDistance = 5;
        this.orbitControls.maxDistance = 15;

        // Only allow orbit with right mouse button or two-finger touch
        this.orbitControls.mouseButtons = {
            LEFT: null,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
        };

        // For touch: two-finger rotate only (no zoom)
        this.orbitControls.touches = {
            ONE: null,
            TWO: THREE.TOUCH.ROTATE,
        };
        this.orbitControls.enableZoom = false;

        // Update loop for damping
        const updateOrbit = () => {
            requestAnimationFrame(updateOrbit);
            this.orbitControls.update();
        };
        updateOrbit();
    }

    setupUI() {
        document.getElementById('shuffle-btn').addEventListener('click', () => {
            this.shuffle();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.reset();
        });
    }

    async shuffle() {
        // Disable controls during shuffle
        this.faceControls.setEnabled(false);

        const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
        const moves = 20;

        for (let i = 0; i < moves; i++) {
            const face = faces[Math.floor(Math.random() * faces.length)];
            const clockwise = Math.random() < 0.5;

            await this.renderer.animateRotation(face, clockwise, 100);
        }

        this.renderer2D.syncWithState();
        this.faceControls.setEnabled(true);
    }

    reset() {
        this.cube.reset();
        this.renderer.syncWithState();
        this.renderer2D.syncWithState();
        document.getElementById('win-message').classList.remove('show');
    }

    onMoveComplete() {
        // Sync 2D view
        this.renderer2D.syncWithState();

        // Check for win
        if (this.cube.isSolved()) {
            document.getElementById('win-message').classList.add('show');
            setTimeout(() => {
                document.getElementById('win-message').classList.remove('show');
            }, 3000);
        }
    }
}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
