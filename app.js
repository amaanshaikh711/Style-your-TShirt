
// Configuration
const CONFIG = {
    canvasWidth: 500,
    canvasHeight: 500,
    printArea: {
        x: 150,
        y: 120,
        width: 200,
        height: 280
    },
    tshirts: {
        front: {
            white: 'assets/tshirt-white-real.png',
            black: 'assets/tshirt-black-real.png'
        },
        back: {
            white: 'assets/tshirt-white-back.png',
            black: 'assets/tshirt-black-back.png'
        }
    }
};

// Initialize Canvas with optimized mobile settings
const canvas = new fabric.Canvas('tshirt-canvas', {
    width: CONFIG.canvasWidth,
    height: CONFIG.canvasHeight,
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: '#f2f2f7',
    renderOnAddRemove: true,
    enableRetinaScaling: true,
    allowTouchScrolling: false // Critical for smooth mobile dragging
});

// Customize control appearance
fabric.Object.prototype.set({
    borderColor: '#6366f1',
    borderScaleFactor: 2.5,
    borderOpacityWhenMoving: 1, // Keep border visible for better feedback
    cornerColor: '#ffffff',
    cornerStrokeColor: '#6366f1',
    cornerSize: 24, // Larger for touch
    cornerStyle: 'circle',
    transparentCorners: false,
    padding: 12,
    centeredScaling: false,
    centeredRotation: true,
    touchCornerSize: 36 // Easier to grab on mobile
});

// State Management
let currentShirtColor = 'white';
let currentView = 'front';
let designs = {
    front: [],
    back: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupCanvas();
    setupEventListeners();
    handleResponsiveCanvas();
});

function setupCanvas() {
    loadShirt();
}

function loadShirt() {
    const url = CONFIG.tshirts[currentView][currentShirtColor];
    const isDark = currentShirtColor === 'black';

    fabric.Image.fromURL(url, function (img) {
        img.scaleToWidth(CONFIG.canvasWidth);
        const center = canvas.getCenter();

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            originX: 'center',
            originY: 'center',
            top: center.top,
            left: center.left
        });

        // Update background color based on shirt for consistency
        canvas.backgroundColor = isDark ? '#2a2a2a' : '#f2f2f7';
        updateDesignBlendModes(isDark);
    });
}

function saveCurrentDesigns() {
    designs[currentView] = canvas.getObjects().map(obj => obj.toJSON([
        'selectable',
        'hasControls',
        'hasBorders',
        'lockUniScaling',
        'centeredScaling'
    ]));
}

function loadDesignsForView() {
    const objects = canvas.getObjects();
    // Use loop to remove to allow animation if needed later
    for (let i = objects.length - 1; i >= 0; i--) {
        canvas.remove(objects[i]);
    }

    if (designs[currentView] && designs[currentView].length > 0) {
        designs[currentView].forEach(designData => {
            fabric.util.enlivenObjects([designData], function (objects) {
                objects.forEach(obj => {
                    obj.set({
                        selectable: true,
                        hasControls: true,
                        hasBorders: true,
                        lockUniScaling: false,
                        centeredScaling: false
                    });
                    canvas.add(obj);
                });
                canvas.renderAll();
                updateDesignBlendModes(currentShirtColor === 'black');
            });
        });
    }
}

function updateDesignBlendModes(isDarkShirt) {
    const objects = canvas.getObjects();
    objects.forEach(obj => {
        if (isDarkShirt) {
            obj.globalCompositeOperation = 'normal';
            obj.opacity = 0.95;
        } else {
            obj.globalCompositeOperation = 'multiply';
            obj.opacity = 0.92;
        }
    });
    canvas.requestRenderAll();
}

function addDesignToCanvas(url) {
    // Remove all existing designs for this simple editor (one design policy)
    const existingObjects = canvas.getObjects();
    existingObjects.forEach(obj => canvas.remove(obj));

    fabric.Image.fromURL(url, function (img) {
        // Validation for valid image
        if (!img) return;

        // Scale down if too big
        const maxWidth = CONFIG.printArea.width * 0.9;
        const maxHeight = CONFIG.printArea.height * 0.9;

        if (img.width > maxWidth || img.height > maxHeight) {
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
            img.scale(scale);
        } else {
            // Ensure meaningful initial size
            if (img.width < 100) img.scaleToWidth(150);
        }

        // Center on the printable area
        img.set({
            left: CONFIG.printArea.x + CONFIG.printArea.width / 2,
            top: CONFIG.printArea.y + CONFIG.printArea.height / 2,
            originX: 'center',
            originY: 'center',

            // Enable all controls with proper settings
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockUniScaling: false,
            centeredScaling: false,
            hasRotatingPoint: true
        });

        const isDark = currentShirtColor === 'black';
        if (!isDark) {
            img.globalCompositeOperation = 'multiply';
        }
        img.opacity = 0.92;

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();

        // Mobile UX: animate controls appearance or just ensure they are ready
        img.setCoords();
    }, null, { crossOrigin: 'anonymous' });
}

// Constraints - keep design within printable area
canvas.on('object:moving', function (e) {
    const obj = e.target;
    // Debounce checks for performance if needed, but for single object direct manip is better
    const objBounds = obj.getBoundingRect(true); // true = absolute coordinates

    const bounds = {
        top: CONFIG.printArea.y,
        bottom: CONFIG.printArea.y + CONFIG.printArea.height,
        left: CONFIG.printArea.x,
        right: CONFIG.printArea.x + CONFIG.printArea.width
    };

    // Constrain movement logic
    if (obj.height > bounds.bottom - bounds.top || obj.width > bounds.right - bounds.left) {
        // If object is bigger than bounds, just let it be (or handle differently)
        return;
    }

    if (objBounds.top < bounds.top) {
        obj.top = Math.max(obj.top, bounds.top + obj.getScaledHeight() / 2); // Approximation for origin center
    }
    if (objBounds.top + objBounds.height > bounds.bottom) {
        obj.top = Math.min(obj.top, bounds.bottom - obj.getScaledHeight() / 2);
    }
    if (objBounds.left < bounds.left) {
        obj.left = Math.max(obj.left, bounds.left + obj.getScaledWidth() / 2);
    }
    if (objBounds.left + objBounds.width > bounds.right) {
        obj.left = Math.min(obj.left, bounds.right - obj.getScaledWidth() / 2);
    }
});

// Responsive canvas handling with Debounce
function handleResponsiveCanvas() {
    let timeout;

    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        const canvasEl = canvas.getElement();
        if (!container || !canvasEl) return;

        const containerWidth = container.offsetWidth;
        const isMobile = window.innerWidth <= 768;

        let scale;
        if (isMobile) {
            // On mobile, scale based on viewport width with padding
            const maxWidth = Math.min(
                window.innerWidth * 0.9,
                containerWidth * 0.95
            );
            scale = Math.min(maxWidth / CONFIG.canvasWidth, 1);
        } else {
            // On desktop, don't scale up
            scale = Math.min(containerWidth / CONFIG.canvasWidth, 1);
        }

        // Apply zoom and sizing
        canvas.setZoom(scale);
        canvas.setWidth(CONFIG.canvasWidth * scale);
        canvas.setHeight(CONFIG.canvasHeight * scale);

        // Center the canvas
        canvasEl.style.display = 'block';
        canvasEl.style.margin = '0 auto';
        canvasEl.style.maxWidth = '100%';
        canvasEl.style.height = 'auto';
        
        // Ensure proper touch handling on mobile
        if (isMobile) {
            canvasEl.style.touchAction = 'manipulation';
        }

        canvas.renderAll();
    }

    // Debounced resize listener
    window.addEventListener('resize', () => {
        clearTimeout(timeout);
        timeout = setTimeout(resizeCanvas, 100);
    });

    // Listen for orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(resizeCanvas, 300);
    });

    // Initial Call
    resizeCanvas();
}


function setupEventListeners() {
    // 1. View Switcher
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('.view-btn');
            if (!button) return;

            saveCurrentDesigns();

            viewBtns.forEach(b => b.classList.remove('active'));
            button.classList.add('active');

            currentView = button.dataset.view;

            loadShirt();
            loadDesignsForView();
        });
    });

    // 2. Color Switchers
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const target = e.target.closest('.color-option');
            if (!target) return;

            colorOptions.forEach(o => o.classList.remove('active'));
            target.classList.add('active');

            currentShirtColor = target.dataset.color;
            loadShirt();
        });
    });

    // 3. File Upload
    const fileInput = document.getElementById('file-upload');
    const dropZone = document.getElementById('drop-zone');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });
    }

    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click()); // Ensure click works on whole zone

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });
    }

    function handleFile(file) {
        if (!file.type.match('image.*')) {
            alert('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (f) => {
            addDesignToCanvas(f.target.result);
        };
        reader.readAsDataURL(file);
    }

    // 4. Presets
    document.querySelectorAll('.preset-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const preset = e.target.closest('.preset-item');
            if (preset) {
                document.querySelectorAll('.preset-item').forEach(p => p.classList.remove('selected'));
                preset.classList.add('selected');

                const src = preset.dataset.src;
                addDesignToCanvas(src);
            }
        });
    });

    // 5. Reset
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Clear the current design area?')) {
                designs[currentView] = [];
                canvas.clear();
                // Re-apply background
                loadShirt();
            }
        });
    }

    // 6. Download
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            // Prevent default if it's in a form (unlikely but safe)
            e.preventDefault();

            saveCurrentDesigns();
            canvas.discardActiveObject();
            canvas.requestRenderAll();

            setTimeout(() => {
                const dataURL = canvas.toDataURL({
                    format: 'png',
                    quality: 1,
                    multiplier: 3 // Higher resolution download
                });

                const link = document.createElement('a');
                link.download = `printsim-design-${currentView}-${Date.now()}.png`;
                link.href = dataURL;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 50);
        });
    }

    // 7. Zoom Controls
    document.getElementById('zoom-in')?.addEventListener('click', () => {
        const zoom = canvas.getZoom();
        canvas.setZoom(Math.min(zoom * 1.1, 3));
        canvas.renderAll();
    });

    document.getElementById('zoom-out')?.addEventListener('click', () => {
        const zoom = canvas.getZoom();
        canvas.setZoom(Math.max(zoom * 0.9, 0.5));
        canvas.renderAll();
    });

    document.getElementById('fit-screen')?.addEventListener('click', () => {
        handleResponsiveCanvas(); // Recalculate best fit
        canvas.viewportTransform = [1, 0, 0, 1, 0, 0]; // Reset pan
        // Re-apply correct zoom
        const container = document.querySelector('.canvas-container');
        if (container) {
            const scale = Math.min(container.offsetWidth / CONFIG.canvasWidth, 1);
            canvas.setZoom(scale);
        }
    });

    // 8. Tool Selection (Visual Only for now as Pan is valid but not fully implemented logic wise)
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Don't toggle download button
            if (btn.id === 'download-btn') return;

            const target = e.target.closest('.tool-btn');
            if (target) {
                toolBtns.forEach(t => t.classList.remove('active-tool'));
                target.classList.add('active-tool');

                // Simple logic: if 'Pan' tool (2nd one usually), disable object selection
                const title = target.getAttribute('title');
                if (title === 'Pan') {
                    canvas.selection = false;
                    canvas.forEachObject(o => o.selectable = false);
                    canvas.defaultCursor = 'grab';
                } else {
                    canvas.selection = true;
                    canvas.forEachObject(o => o.selectable = true);
                    canvas.defaultCursor = 'default';
                }
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            }
        });
    });

    // 9. Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const activeObject = canvas.getActiveObject();

        if (e.key === 'Delete' && activeObject) {
            canvas.remove(activeObject);
            canvas.renderAll();
        }
    });

    // 10. 3D Viewer Integration
    import('./tshirt3d.js').then(module => {
        module.init3DViewer();
        const view3DBtn = document.getElementById('view-3d-btn');
        if (view3DBtn) {
            view3DBtn.addEventListener('click', () => {
                // Prepare canvas for 3D export
                // 1. Deselect everything
                canvas.discardActiveObject();

                // 2. Hide Background Image (The 2D Tshirt Template)
                const originalBg = canvas.backgroundImage;
                const originalBgColor = canvas.backgroundColor;

                canvas.backgroundImage = null;
                canvas.backgroundColor = 'transparent'; // Ensure transparent PNG
                canvas.renderAll();

                // 3. Generate DataURL of ONLY the design
                const designURL = canvas.toDataURL({
                    format: 'png',
                    multiplier: 3 // High Quality
                });

                // 4. Send to 3D Viewer with Metadata
                module.open3DView(designURL, {
                    color: currentShirtColor,
                    view: currentView
                });

                // 5. Restore 2D View
                canvas.setBackgroundImage(originalBg, canvas.renderAll.bind(canvas));
                canvas.backgroundColor = originalBgColor;
                canvas.renderAll();
            });
        }
    }).catch(err => console.error("Failed to load 3D module", err));
}
