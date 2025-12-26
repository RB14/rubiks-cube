/**
 * FaceControls - Handles face rotation via drag gestures
 *
 * Detects when user clicks/drags on the cube and determines which face
 * to rotate based on the drag direction. Provides real-time visual feedback
 * and snap behavior on release.
 *
 * Uses camera-aware drag detection: converts screen-space drag to world-space
 * to determine rotation, so controls feel natural regardless of camera angle.
 */

import * as THREE from 'three';

// Face normals in world space
const FACE_NORMALS = {
    'R': new THREE.Vector3(1, 0, 0),
    'L': new THREE.Vector3(-1, 0, 0),
    'U': new THREE.Vector3(0, 1, 0),
    'D': new THREE.Vector3(0, -1, 0),
    'F': new THREE.Vector3(0, 0, 1),
    'B': new THREE.Vector3(0, 0, -1),
};

// Rotation axis for each layer
const LAYER_AXES = {
    'R': 'x', 'L': 'x', 'M': 'x',
    'U': 'y', 'D': 'y', 'E': 'y',
    'F': 'z', 'B': 'z', 'S': 'z'
};

export class FaceControls {
    constructor(renderer, orbitControls) {
        this.renderer = renderer;
        this.orbitControls = orbitControls;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Drag state
        this.isDragging = false;
        this.dragStart = null;
        this.dragFace = null;
        this.dragAxis = null;
        this.dragCubie = null;
        this.clickedFace = null;
        this.currentAngle = 0;
        this.screenRotationDir = null;  // Screen-space direction for positive rotation

        // Thresholds
        this.DRAG_THRESHOLD = 10; // pixels to start drag
        this.SENSITIVITY = 0.01;  // rotation per pixel

        this.enabled = true;
        this.onMoveComplete = null;

        this.init();
    }

    init() {
        const canvas = this.renderer.getDomElement();

        canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
        canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
        canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
        canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));
    }

    onPointerDown(event) {
        if (!this.enabled) return;
        if (event.button === 2) return; // Right click is for orbit

        const canvas = this.renderer.getDomElement();
        const rect = canvas.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast to find clicked cubie
        this.raycaster.setFromCamera(this.mouse, this.renderer.getCamera());
        const intersects = this.raycaster.intersectObjects(
            this.renderer.getScene().children,
            true
        );

        if (intersects.length > 0) {
            // Find the cubie group
            let target = intersects[0].object;
            while (target && !target.userData.cubie) {
                target = target.parent;
            }

            if (target && target.userData.cubie) {
                // Store initial state
                this.dragStart = { x: event.clientX, y: event.clientY };
                this.dragCubie = target.userData.cubie;
                this.clickedFace = this.getClickedFace(intersects[0]);

                // Disable orbit while we might be dragging
                if (this.orbitControls) {
                    this.orbitControls.enabled = false;
                }
            }
        }
    }

    onPointerMove(event) {
        if (!this.dragStart) return;

        const dx = event.clientX - this.dragStart.x;
        const dy = event.clientY - this.dragStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (!this.isDragging) {
            // Check if we've moved enough to start dragging
            if (distance < this.DRAG_THRESHOLD) return;

            // Determine which layer to rotate based on world-space drag direction
            const layerInfo = this.determineDragLayer(dx, dy);
            if (!layerInfo || !layerInfo.face) {
                this.resetDrag();
                return;
            }

            this.isDragging = true;
            this.dragFace = layerInfo.face;
            this.dragAxis = layerInfo.axis;

            // Compute the screen-space direction that corresponds to positive rotation
            this.screenRotationDir = this.computeScreenRotationDirection(layerInfo.face);
        }

        if (this.isDragging && this.screenRotationDir) {
            // Project screen drag onto the rotation direction
            // This makes the rotation follow the mouse regardless of camera angle
            const screenDrag = new THREE.Vector2(dx, dy);
            const projectedDistance = screenDrag.dot(this.screenRotationDir);
            this.currentAngle = projectedDistance * this.SENSITIVITY;

            // Clamp to 90 degrees
            this.currentAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.currentAngle));

            // Update visual
            this.renderer.setFaceRotation(this.dragFace, this.currentAngle);
        }
    }

    onPointerUp(event) {
        if (this.isDragging) {
            // Snap to complete or revert
            this.renderer.snapFaceRotation(this.dragFace, this.currentAngle)
                .then((completed) => {
                    if (completed && this.onMoveComplete) {
                        this.onMoveComplete();
                    }
                });
        }

        this.resetDrag();
    }

    resetDrag() {
        this.isDragging = false;
        this.dragStart = null;
        this.dragFace = null;
        this.dragAxis = null;
        this.dragCubie = null;
        this.clickedFace = null;
        this.currentAngle = 0;
        this.screenRotationDir = null;

        // Re-enable orbit
        if (this.orbitControls) {
            this.orbitControls.enabled = true;
        }
    }

    /**
     * Determine which face the user clicked on
     */
    getClickedFace(intersection) {
        const normal = intersection.face.normal.clone();
        const object = intersection.object;

        // Transform normal to world space
        normal.transformDirection(object.matrixWorld);

        // Determine which face based on normal
        const threshold = 0.9;

        if (normal.x > threshold) return 'R';
        if (normal.x < -threshold) return 'L';
        if (normal.y > threshold) return 'U';
        if (normal.y < -threshold) return 'D';
        if (normal.z > threshold) return 'F';
        if (normal.z < -threshold) return 'B';

        return null;
    }

    /**
     * Get the layer to rotate based on cubie position and axis
     * Returns the face name including middle layers (M, E, S)
     */
    getLayerForAxis(cubie, axis) {
        switch (axis) {
            case 'x':
                if (cubie.x === 1) return 'R';
                if (cubie.x === -1) return 'L';
                return 'M';  // Middle layer
            case 'y':
                if (cubie.y === 1) return 'U';
                if (cubie.y === -1) return 'D';
                return 'E';  // Equatorial layer
            case 'z':
                if (cubie.z === 1) return 'F';
                if (cubie.z === -1) return 'B';
                return 'S';  // Standing layer
            default:
                return null;
        }
    }

    /**
     * Determine which layer to rotate based on world-space drag direction.
     * This is camera-aware: converts screen drag to world space to determine
     * the rotation axis, regardless of how the cube is oriented on screen.
     *
     * @param {number} screenDx - Screen-space horizontal drag distance
     * @param {number} screenDy - Screen-space vertical drag distance
     * @returns {{ face: string, axis: string } | null}
     */
    determineDragLayer(screenDx, screenDy) {
        if (!this.dragCubie || !this.clickedFace) return null;

        const camera = this.renderer.getCamera();
        const cubie = this.dragCubie;

        // Get the normal of the clicked face
        const faceNormal = FACE_NORMALS[this.clickedFace].clone();

        // Get camera basis vectors (right and up in world space)
        const cameraRight = new THREE.Vector3();
        const cameraUp = new THREE.Vector3();
        const cameraForward = new THREE.Vector3();
        camera.matrixWorld.extractBasis(cameraRight, cameraUp, cameraForward);

        // Convert screen drag to world-space direction
        // Note: screen Y is inverted (positive Y is down on screen, up in world)
        const worldDrag = new THREE.Vector3()
            .addScaledVector(cameraRight, screenDx)
            .addScaledVector(cameraUp, -screenDy);

        // Project onto the clicked face plane (remove component along face normal)
        worldDrag.addScaledVector(faceNormal, -worldDrag.dot(faceNormal));

        if (worldDrag.length() < 0.001) return null;
        worldDrag.normalize();

        // The rotation axis is perpendicular to both face normal and drag direction
        // This is the axis around which the face would rotate if we "push" in the drag direction
        const rotationAxis = new THREE.Vector3().crossVectors(faceNormal, worldDrag);

        // Find which primary axis (x, y, z) this rotation axis is closest to
        const absX = Math.abs(rotationAxis.x);
        const absY = Math.abs(rotationAxis.y);
        const absZ = Math.abs(rotationAxis.z);

        let primaryAxis, face;
        if (absX >= absY && absX >= absZ) {
            primaryAxis = 'x';
            face = this.getLayerForAxis(cubie, 'x');
        } else if (absY >= absX && absY >= absZ) {
            primaryAxis = 'y';
            face = this.getLayerForAxis(cubie, 'y');
        } else {
            primaryAxis = 'z';
            face = this.getLayerForAxis(cubie, 'z');
        }

        return { face, axis: primaryAxis };
    }

    /**
     * Compute the screen-space direction that corresponds to positive rotation
     * for a given layer. This allows drag to follow the visual rotation direction
     * regardless of camera angle.
     *
     * @param {string} face - The layer to rotate (R, L, U, D, F, B, M, E, S)
     * @returns {THREE.Vector2} - Normalized screen-space direction for positive rotation
     */
    computeScreenRotationDirection(face) {
        const camera = this.renderer.getCamera();
        const canvas = this.renderer.getDomElement();
        const cubie = this.dragCubie;

        // Get the rotation axis for this layer
        const axisName = LAYER_AXES[face];
        const rotationAxis = new THREE.Vector3(
            axisName === 'x' ? 1 : 0,
            axisName === 'y' ? 1 : 0,
            axisName === 'z' ? 1 : 0
        );

        // Use the cubie's position as a sample point
        const samplePoint = new THREE.Vector3(cubie.x, cubie.y, cubie.z);

        // For layers on the negative side of the axis, positive rotation appears reversed
        // M follows L (negative X), E follows D (negative Y), S follows F (positive Z)
        const axisDirection = ['R', 'U', 'F', 'S'].includes(face) ? 1 : -1;

        // Rotate the sample point a small amount in the "positive" direction
        const smallAngle = 0.1 * axisDirection;
        const rotatedPoint = samplePoint.clone().applyAxisAngle(rotationAxis, smallAngle);

        // Project both points to screen space
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        const screenBefore = samplePoint.clone().project(camera);
        const screenAfter = rotatedPoint.clone().project(camera);

        // Convert from NDC (-1 to 1) to pixel coordinates
        // Note: NDC Y is inverted relative to screen Y
        const pixelBefore = new THREE.Vector2(
            (screenBefore.x + 1) / 2 * width,
            (1 - screenBefore.y) / 2 * height
        );
        const pixelAfter = new THREE.Vector2(
            (screenAfter.x + 1) / 2 * width,
            (1 - screenAfter.y) / 2 * height
        );

        // The direction for positive rotation
        const dir = new THREE.Vector2().subVectors(pixelAfter, pixelBefore);

        if (dir.length() < 0.001) {
            // Fallback if points project to same location (edge case)
            return new THREE.Vector2(1, 0);
        }

        return dir.normalize();
    }

    /**
     * Set callback for when a move completes
     */
    setOnMoveComplete(callback) {
        this.onMoveComplete = callback;
    }

    /**
     * Enable/disable controls
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
