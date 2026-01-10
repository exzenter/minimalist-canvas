/**
 * Frontend logic for Minimalist Wave Canvas block.
 */

document.addEventListener('DOMContentLoaded', () => {
    const blocks = document.querySelectorAll('.wp-block-minimalist-canvas');

    blocks.forEach(block => {
        const canvas = block.querySelector('.minimalist-canvas-element');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const config = JSON.parse(block.dataset.config);

        let time = 0;
        let mouseX = 0;
        let mouseY = 0;
        let mouseInCanvas = false;
        let isVisible = true;
        let animationFrame = null;

        // === OPTIMIZATION 4: Pre-calculate and cache trigonometric values ===
        const cachedTrig = {
            animationDirection: {
                angleRad: 0,
                dirX: 1,
                dirY: 0
            },
            rotations: {} // Cache per rotation angle
        };

        function updateTrigCache() {
            // Cache animation direction trig values
            const angleRad = (config.animationDirection || 0) * Math.PI / 180;
            cachedTrig.animationDirection.angleRad = angleRad;
            cachedTrig.animationDirection.dirX = Math.cos(angleRad);
            cachedTrig.animationDirection.dirY = Math.sin(angleRad);

            // Cache rotation values for each grid cell
            if (config.duplicateModeActive && config.gridConfig) {
                config.gridConfig.forEach(item => {
                    const rotation = item.rotation || 0;
                    if (!cachedTrig.rotations[rotation]) {
                        const rad = rotation * Math.PI / 180;
                        const negRad = -rad;
                        cachedTrig.rotations[rotation] = {
                            rad: rad,
                            cos: Math.cos(negRad),
                            sin: Math.sin(negRad)
                        };
                    }
                });
            }
        }

        // Initialize trig cache
        updateTrigCache();

        function initCanvas() {
            const rect = block.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        window.addEventListener('resize', initCanvas);
        initCanvas();

        block.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
            mouseInCanvas = true;
        });

        block.addEventListener('mouseleave', () => {
            mouseInCanvas = false;
        });

        function getBarThickness(x, y, rowIndex, currentTime, localWidth, localHeight, localMouseX, localMouseInCanvas, conf) {
            const rowMinWidth = conf.minBarWidth;
            const rowMaxWidth = conf.maxBarWidth;
            const rowSpeed = conf.thicknessSpeed;
            const rowOffset = conf.thicknessOffset;
            const rowAlternate = conf.alternateDirection;

            const baseThickness = (rowMinWidth + rowMaxWidth) / 2;
            const thicknessRange = (rowMaxWidth - rowMinWidth) / 2;

            if (!conf.animateThickness) return baseThickness;

            let projectedPos;
            if (conf.shapeMode === 'bars') {
                projectedPos = x / localWidth;
            } else {
                // === OPTIMIZATION 4: Use cached trig values ===
                const dirX = cachedTrig.animationDirection.dirX;
                const dirY = cachedTrig.animationDirection.dirY;

                // Normalized projection
                projectedPos = (x * dirX + y * dirY) / (localWidth * Math.abs(dirX) + localHeight * Math.abs(dirY) || 1);
            }

            const direction = rowAlternate && (rowIndex % 2 !== 0) ? -1 : 1;

            let rowSpecificOffset = rowOffset;
            if (conf.combineOffsets && rowIndex > 0) {
                rowSpecificOffset += (rowIndex * Math.PI) / conf.waveRows;
            } else {
                rowSpecificOffset += rowIndex * conf.rowPeakOffset;
            }

            const phase = projectedPos * Math.PI * conf.waveLength + currentTime * rowSpeed * direction + rowSpecificOffset;

            let waveValue;
            switch (conf.animationMode) {
                case 'pingpong':
                    waveValue = Math.abs(Math.sin(phase)) * 2 - 1;
                    break;
                case 'reset':
                    const sawPhase = (phase % (Math.PI * 2)) / (Math.PI * 2);
                    waveValue = Math.sin(sawPhase * Math.PI * 2);
                    break;
                default:
                    waveValue = Math.sin(phase);
            }

            if (conf.thicknessCutoff > 0) {
                const cyclePhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
                if (cyclePhase > (1 - conf.thicknessCutoff / 100)) return rowMinWidth;
            }

            if (conf.trailCutoff !== 0) {
                const cyclePhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
                const startPoint = conf.trailCutoffStart / 100;
                const trailAmount = Math.abs(conf.trailCutoff) / 100 * 0.5;
                if (conf.trailCutoff > 0) {
                    if (cyclePhase > startPoint && cyclePhase < startPoint + trailAmount) return rowMinWidth;
                } else {
                    const leadStart = startPoint - trailAmount;
                    if (cyclePhase > leadStart && cyclePhase < startPoint) return rowMinWidth;
                }
            }

            // Convert waveValue from [-1, 1] to [0, 1] for scaling
            let normalizedWave = (waveValue + 1) / 2;

            // Apply logarithmic scaling if enabled
            if (conf.logScale) {
                const strength = conf.logStrength || 2;
                if (conf.logReverse) {
                    // Reverse: start slow, accelerate at end
                    normalizedWave = Math.pow(normalizedWave, strength);
                } else {
                    // Normal: start fast, slow down at end
                    normalizedWave = 1 - Math.pow(1 - normalizedWave, strength);
                }
            }

            // Map back to thickness range
            let thickness = rowMinWidth + normalizedWave * (rowMaxWidth - rowMinWidth);

            if (conf.mouseAmplitude && localMouseInCanvas) {
                const dx = x - localMouseX;
                const dist = Math.abs(dx);
                const maxDist = localWidth * 0.3;
                const influence = Math.max(0, 1 - dist / maxDist);
                thickness += influence * thicknessRange * (conf.amplitudeStrength - 1);
            }

            return Math.max(rowMinWidth, Math.min(rowMaxWidth, thickness));
        }

        function drawWaveInstance(localWidth, localHeight, rotation, localMouseX, localMouseY, localMouseInCanvas, effectiveBars, effectiveRows, conf) {
            ctx.save();

            const roundedBars = Math.max(1, Math.round(effectiveBars));
            const roundedRows = Math.max(1, Math.round(effectiveRows));

            const effectiveRowHeight = localHeight / roundedRows;
            const barSpacing = localWidth / roundedBars;

            ctx.fillStyle = conf.barColor;
            ctx.strokeStyle = conf.barColor;

            for (let row = 0; row < roundedRows; row++) {
                const rowCenterY = effectiveRowHeight * (row + 0.5);
                const configRowIndex = Math.floor(row * conf.waveRows / (effectiveRows || 1) * (localHeight / (localHeight || 1)));

                for (let bar = 0; bar < roundedBars; bar++) {
                    const x = barSpacing * (bar + 0.5);
                    const barWidth = getBarThickness(x, rowCenterY, configRowIndex, time, localWidth, localHeight, localMouseX, localMouseInCanvas, conf);

                    if (conf.shapeMode === 'balls') {
                        ctx.beginPath();
                        ctx.arc(x, rowCenterY, barWidth / 2, 0, Math.PI * 2);
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                            ctx.stroke();
                        } else {
                            ctx.fill();
                        }
                    } else if (conf.shapeMode === 'squares') {
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                            ctx.strokeRect(x - barWidth / 2, rowCenterY - barWidth / 2, barWidth, barWidth);
                        } else {
                            ctx.fillRect(x - barWidth / 2, rowCenterY - barWidth / 2, barWidth, barWidth);
                        }
                    } else if (conf.shapeMode === 'x') {
                        const half = barWidth / 2;
                        ctx.beginPath();
                        ctx.moveTo(x - half, rowCenterY - half);
                        ctx.lineTo(x + half, rowCenterY + half);
                        ctx.moveTo(x + half, rowCenterY - half);
                        ctx.lineTo(x - half, rowCenterY + half);
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                        } else {
                            ctx.lineWidth = barWidth * 0.2;
                        }
                        ctx.stroke();
                    } else if (conf.shapeMode === 'plus') {
                        const half = barWidth / 2;
                        ctx.beginPath();
                        ctx.moveTo(x, rowCenterY - half);
                        ctx.lineTo(x, rowCenterY + half);
                        ctx.moveTo(x - half, rowCenterY);
                        ctx.lineTo(x + half, rowCenterY);
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                        } else {
                            ctx.lineWidth = barWidth * 0.2;
                        }
                        ctx.stroke();
                    } else if (conf.shapeMode.startsWith('tri-')) {
                        const half = barWidth / 2;
                        ctx.beginPath();
                        if (conf.shapeMode === 'tri-up') {
                            ctx.moveTo(x, rowCenterY - half);
                            ctx.lineTo(x + half, rowCenterY + half);
                            ctx.lineTo(x - half, rowCenterY + half);
                        } else if (conf.shapeMode === 'tri-down') {
                            ctx.moveTo(x, rowCenterY + half);
                            ctx.lineTo(x + half, rowCenterY - half);
                            ctx.lineTo(x - half, rowCenterY - half);
                        } else if (conf.shapeMode === 'tri-left') {
                            ctx.moveTo(x - half, rowCenterY);
                            ctx.lineTo(x + half, rowCenterY - half);
                            ctx.lineTo(x + half, rowCenterY + half);
                        } else if (conf.shapeMode === 'tri-right') {
                            ctx.moveTo(x + half, rowCenterY);
                            ctx.lineTo(x - half, rowCenterY - half);
                            ctx.lineTo(x - half, rowCenterY + half);
                        }
                        ctx.closePath();
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                            ctx.stroke();
                        } else {
                            ctx.fill();
                        }
                    } else if (conf.shapeMode === 'diamond') {
                        const half = barWidth / 2;
                        ctx.beginPath();
                        ctx.moveTo(x, rowCenterY - half);
                        ctx.lineTo(x + half, rowCenterY);
                        ctx.lineTo(x, rowCenterY + half);
                        ctx.lineTo(x - half, rowCenterY);
                        ctx.closePath();
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                            ctx.stroke();
                        } else {
                            ctx.fill();
                        }
                    } else if (conf.shapeMode === 'hexagon') {
                        const r = barWidth / 2;
                        ctx.beginPath();
                        for (let i = 0; i < 6; i++) {
                            const angle = (i * Math.PI) / 3;
                            ctx.lineTo(x + r * Math.cos(angle), rowCenterY + r * Math.sin(angle));
                        }
                        ctx.closePath();
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                            ctx.stroke();
                        } else {
                            ctx.fill();
                        }
                    } else if (conf.shapeMode === 'star') {
                        const outerR = barWidth / 2;
                        const innerR = outerR * 0.4;
                        ctx.beginPath();
                        for (let i = 0; i < 10; i++) {
                            const angle = (i * Math.PI) / 5 - Math.PI / 2;
                            const r = i % 2 === 0 ? outerR : innerR;
                            ctx.lineTo(x + r * Math.cos(angle), rowCenterY + r * Math.sin(angle));
                        }
                        ctx.closePath();
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                            ctx.stroke();
                        } else {
                            ctx.fill();
                        }
                    } else if (conf.shapeMode === 'pill') {
                        const w = barWidth * 0.6;
                        const h = barWidth;
                        const r = w / 2;
                        ctx.beginPath();
                        if (ctx.roundRect) {
                            ctx.roundRect(x - w / 2, rowCenterY - h / 2, w, h, r);
                        } else {
                            ctx.rect(x - w / 2, rowCenterY - h / 2, w, h);
                        }
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                            ctx.stroke();
                        } else {
                            ctx.fill();
                        }
                    } else if (conf.shapeMode.startsWith('chevron-')) {
                        const half = barWidth / 2;
                        ctx.beginPath();
                        if (conf.shapeMode === 'chevron-up') {
                            ctx.moveTo(x - half, rowCenterY + half);
                            ctx.lineTo(x, rowCenterY);
                            ctx.lineTo(x + half, rowCenterY + half);
                        } else if (conf.shapeMode === 'chevron-down') {
                            ctx.moveTo(x - half, rowCenterY - half);
                            ctx.lineTo(x, rowCenterY);
                            ctx.lineTo(x + half, rowCenterY - half);
                        } else if (conf.shapeMode === 'chevron-left') {
                            ctx.moveTo(x + half, rowCenterY - half);
                            ctx.lineTo(x, rowCenterY);
                            ctx.lineTo(x + half, rowCenterY + half);
                        } else if (conf.shapeMode === 'chevron-right') {
                            ctx.moveTo(x - half, rowCenterY - half);
                            ctx.lineTo(x, rowCenterY);
                            ctx.lineTo(x - half, rowCenterY + half);
                        }
                        ctx.lineWidth = conf.strokeOnly ? (barWidth / conf.maxBarWidth) * conf.strokeWidth : barWidth * 0.25;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.stroke();
                    } else if (conf.shapeMode === 'octagon') {
                        const r = barWidth / 2;
                        ctx.beginPath();
                        for (let i = 0; i < 8; i++) {
                            const angle = (i * Math.PI) / 4 + Math.PI / 8;
                            ctx.lineTo(x + r * Math.cos(angle), rowCenterY + r * Math.sin(angle));
                        }
                        ctx.closePath();
                        if (conf.strokeOnly) {
                            ctx.lineWidth = (barWidth / conf.maxBarWidth) * conf.strokeWidth;
                            ctx.stroke();
                        } else {
                            ctx.fill();
                        }
                    } else if (conf.shapeMode === 'bars') {
                        const coverageValue = (conf.barCoverage / 100);
                        const topStart = row * effectiveRowHeight + (effectiveRowHeight * (1 - coverageValue) / 2);
                        const bottomEnd = topStart + (effectiveRowHeight * coverageValue);
                        ctx.fillRect(x - barWidth / 2, topStart, barWidth + 1, bottomEnd - topStart);
                    }
                }
            }
            ctx.restore();
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const unitW = config.duplicateModeActive ? canvas.width / config.gridCols : canvas.width;
            const unitH = config.duplicateModeActive ? canvas.height / config.gridRows : canvas.height;

            const referenceSize = 800;
            let barsPerUnit = (config.barsPerRow / referenceSize) * unitW;
            let rowsPerUnit = (config.waveRows / referenceSize) * unitH;

            if (config.snapToGrid) {
                const globalUnit = referenceSize / config.barsPerRow;
                barsPerUnit = unitW / globalUnit;
                rowsPerUnit = unitH / globalUnit;
            }

            if (!config.duplicateModeActive) {
                drawWaveInstance(canvas.width, canvas.height, 0, mouseX, mouseY, mouseInCanvas, barsPerUnit, rowsPerUnit, config);
                return;
            }

            config.gridConfig.forEach(item => {
                if (!item.isActive) return;

                const cellX = Math.round(item.c * unitW);
                const cellY = Math.round(item.r * unitH);
                const cellW = Math.round((item.c + item.cs) * unitW) - cellX;
                const cellH = Math.round((item.r + item.rs) * unitH) - cellY;

                ctx.save();
                ctx.translate(cellX + cellW / 2, cellY + cellH / 2);
                ctx.rotate(item.rotation * Math.PI / 180);
                ctx.translate(-cellW / 2, -cellH / 2);

                // === OPTIMIZATION 4: Use cached rotation trig values ===
                const rotation = item.rotation || 0;
                const rotCache = cachedTrig.rotations[rotation] || { cos: 1, sin: 0 };
                const cx = cellX + cellW / 2;
                const cy = cellY + cellH / 2;
                const rx = mouseX - cx;
                const ry = mouseY - cy;
                const localX = rx * rotCache.cos - ry * rotCache.sin + cellW / 2;
                const localY = rx * rotCache.sin + ry * rotCache.cos + cellH / 2;

                const localMouseInCanvas = mouseInCanvas &&
                    localX >= 0 && localX <= cellW &&
                    localY >= 0 && localY <= cellH;

                // Resolve instance configuration by merging global attributes with local overrides
                // NOTE: If adding/removing global settings in future, ensure these instance overrides are updated to match
                const instanceConfig = { ...config, ...item };

                ctx.beginPath();
                ctx.rect(0, 0, cellW + 1, cellH + 1);
                ctx.clip();

                drawWaveInstance(cellW + 1, cellH + 1, item.rotation, localX, localY, localMouseInCanvas, (instanceConfig.barsPerRow / referenceSize) * unitW * item.cs, (instanceConfig.waveRows / referenceSize) * unitH * item.rs, instanceConfig);
                ctx.restore();
            });
        }

        function animate() {
            // === OPTIMIZATION 1: Only animate if visible ===
            if (!isVisible) {
                animationFrame = null;
                return;
            }

            time += 0.016;
            draw();
            animationFrame = requestAnimationFrame(animate);
        }

        function startAnimation() {
            if (animationFrame === null) {
                animate();
            }
        }

        function stopAnimation() {
            if (animationFrame !== null) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
        }

        // === OPTIMIZATION 1: IntersectionObserver to pause when off-screen ===
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible) {
                    // Resume animation when visible
                    if (config.animateThickness) {
                        startAnimation();
                    }
                } else {
                    // Pause animation when not visible
                    stopAnimation();
                }
            });
        }, {
            threshold: 0,
            rootMargin: '50px' // Start slightly before visible
        });

        observer.observe(block);

        // === OPTIMIZATION 1: If no animation, draw once and stop ===
        if (config.animateThickness) {
            animate();
        } else {
            // Static mode - just draw once
            draw();
        }
    });
});

