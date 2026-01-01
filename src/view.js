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

        function getBarThickness(x, rowIndex, currentTime, localWidth, localMouseX, localMouseInCanvas) {
            const rowMinWidth = config.minBarWidth;
            const rowMaxWidth = config.maxBarWidth;
            const rowSpeed = config.thicknessSpeed;
            const rowOffset = config.thicknessOffset;
            const rowAlternate = config.alternateDirection;

            const baseThickness = (rowMinWidth + rowMaxWidth) / 2;
            const thicknessRange = (rowMaxWidth - rowMinWidth) / 2;

            if (!config.animateThickness) return baseThickness;

            const normalizedX = x / localWidth;
            const direction = rowAlternate && (rowIndex % 2 !== 0) ? -1 : 1;

            let rowSpecificOffset = rowOffset;
            if (config.combineOffsets && rowIndex > 0) {
                rowSpecificOffset += (rowIndex * Math.PI) / config.waveRows;
            } else {
                rowSpecificOffset += rowIndex * config.rowPeakOffset;
            }

            const phase = normalizedX * Math.PI * config.waveLength + currentTime * rowSpeed * direction + rowSpecificOffset;

            let waveValue;
            switch (config.animationMode) {
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

            if (config.thicknessCutoff > 0) {
                const cyclePhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
                if (cyclePhase > (1 - config.thicknessCutoff / 100)) return rowMinWidth;
            }

            if (config.trailCutoff !== 0) {
                const cyclePhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
                const startPoint = config.trailCutoffStart / 100;
                const trailAmount = Math.abs(config.trailCutoff) / 100 * 0.5;
                if (config.trailCutoff > 0) {
                    if (cyclePhase > startPoint && cyclePhase < startPoint + trailAmount) return rowMinWidth;
                } else {
                    const leadStart = startPoint - trailAmount;
                    if (cyclePhase > leadStart && cyclePhase < startPoint) return rowMinWidth;
                }
            }

            let thickness = baseThickness + waveValue * thicknessRange;

            if (config.mouseAmplitude && localMouseInCanvas) {
                const dx = x - localMouseX;
                const dist = Math.abs(dx);
                const maxDist = localWidth * 0.3;
                const influence = Math.max(0, 1 - dist / maxDist);
                thickness += influence * thicknessRange * (config.amplitudeStrength - 1);
            }

            return Math.max(rowMinWidth, Math.min(rowMaxWidth, thickness));
        }

        function drawWaveInstance(localWidth, localHeight, rotation, localMouseX, localMouseY, localMouseInCanvas) {
            ctx.save();

            // Density calibration based on reference size
            const referenceSize = 800;
            const barsPerPixel = config.barsPerRow / referenceSize;
            const rowsPerPixel = config.waveRows / referenceSize;

            const effectiveBarsPerRow = Math.round(localWidth * barsPerPixel);
            const effectiveWaveRows = Math.round(localHeight * rowsPerPixel);

            const effectiveRowHeight = localHeight / effectiveWaveRows;
            const barSpacing = localWidth / effectiveBarsPerRow;

            ctx.fillStyle = config.barColor;
            ctx.strokeStyle = config.barColor;

            for (let row = 0; row < effectiveWaveRows; row++) {
                const rowCenterY = effectiveRowHeight * (row + 0.5);
                const configRowIndex = Math.floor(row * config.waveRows / effectiveWaveRows);

                for (let bar = 0; bar < effectiveBarsPerRow; bar++) {
                    const x = barSpacing * (bar + 0.5);
                    const barWidth = getBarThickness(x, configRowIndex, time, localWidth, localMouseX, localMouseInCanvas);

                    if (config.shapeMode === 'balls') {
                        ctx.beginPath();
                        ctx.arc(x, rowCenterY, barWidth / 2, 0, Math.PI * 2);
                        if (config.strokeOnly) {
                            ctx.lineWidth = (barWidth / config.maxBarWidth) * config.strokeWidth;
                            ctx.stroke();
                        } else {
                            ctx.fill();
                        }
                    } else if (config.shapeMode === 'squares') {
                        if (config.strokeOnly) {
                            ctx.lineWidth = (barWidth / config.maxBarWidth) * config.strokeWidth;
                            ctx.strokeRect(x - barWidth / 2, rowCenterY - barWidth / 2, barWidth, barWidth);
                        } else {
                            ctx.fillRect(x - barWidth / 2, rowCenterY - barWidth / 2, barWidth, barWidth);
                        }
                    } else {
                        const topStart = Math.round(row * effectiveRowHeight);
                        const bottomEnd = Math.round((row + 1) * effectiveRowHeight);
                        ctx.fillRect(x - barWidth / 2, topStart, barWidth, bottomEnd - topStart);
                    }
                }
            }
            ctx.restore();
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!config.duplicateModeActive) {
                drawWaveInstance(canvas.width, canvas.height, 0, mouseX, mouseY, mouseInCanvas);
                return;
            }

            const unitW = canvas.width / config.gridCols;
            const unitH = canvas.height / config.gridRows;

            config.gridConfig.forEach(item => {
                if (!item.isActive) return;

                const cellX = item.c * unitW;
                const cellY = item.r * unitH;
                const cellW = item.cs * unitW;
                const cellH = item.rs * unitH;

                ctx.save();
                ctx.translate(cellX + cellW / 2, cellY + cellH / 2);
                ctx.rotate(item.rotation * Math.PI / 180);
                ctx.translate(-cellW / 2, -cellH / 2);

                // For global mouse interaction, we need the mouse position relative to this instance's coordinates
                // Since we translated and rotated the context, we need to transform the mouse point inversely
                const angle = -item.rotation * Math.PI / 180;
                const cx = cellX + cellW / 2;
                const cy = cellY + cellH / 2;

                // Relative to center
                const rx = mouseX - cx;
                const ry = mouseY - cy;

                // Rotated
                const localX = rx * Math.cos(angle) - ry * Math.sin(angle) + cellW / 2;
                const localY = rx * Math.sin(angle) + ry * Math.cos(angle) + cellH / 2;

                const localMouseInCanvas = mouseInCanvas &&
                    localX >= 0 && localX <= cellW &&
                    localY >= 0 && localY <= cellH;

                // Clip to cell
                ctx.beginPath();
                ctx.rect(0, 0, cellW, cellH);
                ctx.clip();

                drawWaveInstance(cellW, cellH, item.rotation, localX, localY, localMouseInCanvas);
                ctx.restore();
            });
        }

        function animate() {
            time += 0.016;
            draw();
            requestAnimationFrame(animate);
        }

        animate();
    });
});
