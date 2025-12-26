/**
 * ViewTouchpad - Single-finger touchpad for view rotation
 *
 * Provides a dedicated touch area where single-finger drags rotate the
 * camera view (same as two-finger drag on the cube). This makes it easy
 * to rotate the view on mobile without accidentally rotating cube faces.
 */

export class ViewTouchpad {
    constructor(element, orbitControls) {
        this.element = element;
        this.orbitControls = orbitControls;

        // State
        this.isDragging = false;
        this.lastPosition = { x: 0, y: 0 };

        // Settings
        this.sensitivity = 0.01;

        // Bind methods
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.init();
    }

    init() {
        if (!this.element) {
            console.error('ViewTouchpad: Element not found');
            return;
        }

        this.element.addEventListener('pointerdown', this.onPointerDown);
        this.element.addEventListener('pointermove', this.onPointerMove);
        this.element.addEventListener('pointerup', this.onPointerUp);
        this.element.addEventListener('pointerleave', this.onPointerUp);
        this.element.addEventListener('pointercancel', this.onPointerUp);
    }

    onPointerDown(event) {
        event.preventDefault();

        this.isDragging = true;
        this.lastPosition = { x: event.clientX, y: event.clientY };
        this.element.classList.add('active');

        // Capture pointer for reliable tracking
        this.element.setPointerCapture(event.pointerId);
    }

    onPointerMove(event) {
        if (!this.isDragging) return;

        event.preventDefault();

        const dx = event.clientX - this.lastPosition.x;
        const dy = event.clientY - this.lastPosition.y;

        this.lastPosition = { x: event.clientX, y: event.clientY };

        // Apply rotation
        this.rotateView(dx, dy);
    }

    onPointerUp(event) {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.element.classList.remove('active');

        // Release pointer capture
        if (event.pointerId !== undefined) {
            try {
                this.element.releasePointerCapture(event.pointerId);
            } catch (e) {
                // Ignore if already released
            }
        }
    }

    /**
     * Rotate the camera view based on drag delta
     * dx = horizontal drag -> rotate around Y axis (azimuth)
     * dy = vertical drag -> rotate around horizontal axis (polar)
     * Signs match OrbitControls two-finger behavior
     */
    rotateView(dx, dy) {
        if (!this.orbitControls) return;

        const target = this.orbitControls.target;
        const camera = this.orbitControls.object;
        const offset = camera.position.clone().sub(target);

        // Horizontal rotation (around Y axis)
        const azimuthDelta = dx * this.sensitivity;
        if (Math.abs(azimuthDelta) > 0.0001) {
            const cosA = Math.cos(azimuthDelta);
            const sinA = Math.sin(azimuthDelta);
            const newX = offset.x * cosA - offset.z * sinA;
            const newZ = offset.x * sinA + offset.z * cosA;
            offset.x = newX;
            offset.z = newZ;
        }

        // Vertical rotation
        const polarDelta = dy * this.sensitivity;
        if (Math.abs(polarDelta) > 0.0001) {
            // Get horizontal distance and current elevation
            const horizontalDist = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
            const currentAngle = Math.atan2(offset.y, horizontalDist);

            // Calculate new angle with limits (prevent flipping over)
            const maxAngle = Math.PI * 0.45;
            const minAngle = -Math.PI * 0.45;
            let newAngle = currentAngle + polarDelta;
            newAngle = Math.max(minAngle, Math.min(maxAngle, newAngle));

            // Apply new angle
            const radius = offset.length();
            const newHorizontalDist = radius * Math.cos(newAngle);
            const newY = radius * Math.sin(newAngle);

            // Scale horizontal components
            if (horizontalDist > 0.001) {
                const scale = newHorizontalDist / horizontalDist;
                offset.x *= scale;
                offset.z *= scale;
            }
            offset.y = newY;
        }

        camera.position.copy(target).add(offset);
        camera.lookAt(target);
        this.orbitControls.update();
    }

    setSensitivity(value) {
        this.sensitivity = Math.max(0.002, Math.min(0.05, value));
    }

    destroy() {
        if (this.element) {
            this.element.removeEventListener('pointerdown', this.onPointerDown);
            this.element.removeEventListener('pointermove', this.onPointerMove);
            this.element.removeEventListener('pointerup', this.onPointerUp);
            this.element.removeEventListener('pointerleave', this.onPointerUp);
            this.element.removeEventListener('pointercancel', this.onPointerUp);
        }
    }
}
