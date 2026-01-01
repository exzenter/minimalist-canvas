import { __ } from '@wordpress/i18n';
import {
    useBlockProps,
    InspectorControls,
    InnerBlocks,
    PanelColorSettings
} from '@wordpress/block-editor';
import {
    PanelBody,
    RangeControl,
    ToggleControl,
    SelectControl,
    Button,
    Popover,
} from '@wordpress/components';
import { useState, useEffect, useRef } from '@wordpress/element';

export default function Edit({ attributes, setAttributes }) {
    const {
        shapeMode, strokeOnly, strokeWidth, waveRows, barsPerRow,
        minBarWidth, maxBarWidth, barCoverage, bgColor, barColor,
        animateThickness, animationMode, thicknessSpeed, thicknessOffset,
        waveLength, thicknessCutoff, trailCutoff, trailCutoffStart,
        rowPeakOffset, alternateDirection, combineOffsets,
        mouseAmplitude, amplitudeStrength,
        duplicateModeActive, gridRows, gridCols, gridConfig,
        enableMixBlend, mixBlendMode
    } = attributes;

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);

    useEffect(() => {
        // Filter out unreachable cells when grid size changes
        const filtered = gridConfig.filter(i => i.r < gridRows && i.c < gridCols);
        if (filtered.length !== gridConfig.length) {
            setAttributes({ gridConfig: [...filtered] });
        }
    }, [gridRows, gridCols]);

    const updateGridConfig = (newConfig) => {
        setAttributes({ gridConfig: [...newConfig] });
    };

    const toggleCell = (r, c) => {
        const index = gridConfig.findIndex(i => i.r === r && i.c === c);
        let newConfig = [...gridConfig];
        if (index > -1) {
            newConfig[index] = { ...newConfig[index], isActive: !newConfig[index].isActive, rs: 1, cs: 1 };
        } else {
            newConfig.push({ r, c, rs: 1, cs: 1, rotation: 0, isActive: true });
        }
        updateGridConfig(newConfig);
    };

    const rotateCell = (r, c) => {
        const index = gridConfig.findIndex(i => i.r === r && i.c === c);
        if (index === -1) return;
        let newConfig = [...gridConfig];
        newConfig[index] = { ...newConfig[index], rotation: (newConfig[index].rotation + 90) % 360 };
        updateGridConfig(newConfig);
    };

    const mergeCell = (r, c, direction) => {
        const index = gridConfig.findIndex(i => i.r === r && i.c === c);
        if (index === -1) return;
        let newConfig = [...gridConfig];
        const item = { ...newConfig[index] };
        if (direction === 'right') {
            item.cs += 1;
        } else {
            item.rs += 1;
        }
        newConfig[index] = item;
        // Remove any other cells that are now covered
        newConfig = newConfig.filter(i => {
            if (i.r === r && i.c === c) return true;
            const inR = i.r >= item.r && i.r < item.r + item.rs;
            const inC = i.c >= item.c && i.c < item.c + item.cs;
            return !(inR && inC);
        });
        updateGridConfig(newConfig);
    };

    const renderGridEditor = () => {
        const cells = [];
        const occupied = new Set();

        gridConfig.forEach((item) => {
            if (!item.isActive) return;
            for (let r = item.r; r < item.r + item.rs; r++) {
                for (let c = item.c; c < item.c + item.cs; c++) {
                    if (r === item.r && c === item.c) continue;
                    occupied.add(`${r}-${c}`);
                }
            }
        });

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                if (occupied.has(`${r}-${c}`)) continue;

                const item = gridConfig.find(i => i.r === r && i.c === c);
                const isActive = item?.isActive;
                const rotation = item?.rotation || 0;
                const rs = item?.rs || 1;
                const cs = item?.cs || 1;

                cells.push(
                    <div
                        key={`${r}-${c}`}
                        style={{
                            gridRow: `span ${rs}`,
                            gridColumn: `span ${cs}`,
                            background: isActive ? '#007cba' : '#fff',
                            border: '1px solid #ccc',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            minHeight: '60px',
                            color: isActive ? '#fff' : '#000',
                            position: 'relative'
                        }}
                        onClick={() => toggleCell(r, c)}
                    >
                        {isActive ? (
                            <div style={{ padding: '2px', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', marginBottom: '4px' }}>{rotation}°</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                                    <Button
                                        isSmall
                                        icon="redo"
                                        onClick={(e) => { e.stopPropagation(); rotateCell(r, c); }}
                                        label={__('Rotate', 'minimalist')}
                                    />
                                    <Button
                                        isSmall
                                        icon="remove"
                                        onClick={(e) => { e.stopPropagation(); toggleCell(r, c); }}
                                        label={__('Remove', 'minimalist')}
                                    />
                                    <Button
                                        isSmall
                                        icon="arrow-right-alt"
                                        onClick={(e) => { e.stopPropagation(); mergeCell(r, c, 'right'); }}
                                        disabled={c + cs >= gridCols}
                                        label={__('Merge Right', 'minimalist')}
                                    />
                                    <Button
                                        isSmall
                                        icon="arrow-down-alt"
                                        onClick={(e) => { e.stopPropagation(); mergeCell(r, c, 'down'); }}
                                        disabled={r + rs >= gridRows}
                                        label={__('Merge Down', 'minimalist')}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={{ fontSize: '18px', opacity: 0.3 }}>+</div>
                        )}
                    </div>
                );
            }
        }
        return cells;
    };

    const canvasRef = useRef(null);
    const attrRef = useRef(attributes);
    const mouseRef = useRef({ x: 0, y: 0, active: false });

    useEffect(() => {
        attrRef.current = attributes;
    }, [attributes]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let time = 0;
        let animationFrame;

        function initCanvas() {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        const resizeObserver = new ResizeObserver(initCanvas);
        resizeObserver.observe(canvas.parentElement);
        initCanvas();

        function getBarThickness(x, rowIndex, currentTime, localWidth, localMouseX, localMouseInCanvas, conf) {
            const rowMinWidth = conf.minBarWidth;
            const rowMaxWidth = conf.maxBarWidth;
            const rowSpeed = conf.thicknessSpeed;
            const rowOffset = conf.thicknessOffset;
            const rowAlternate = conf.alternateDirection;

            const baseThickness = (rowMinWidth + rowMaxWidth) / 2;
            const thicknessRange = (rowMaxWidth - rowMinWidth) / 2;

            if (!conf.animateThickness) return baseThickness;

            const normalizedX = x / localWidth;
            const direction = rowAlternate && (rowIndex % 2 !== 0) ? -1 : 1;

            let rowSpecificOffset = rowOffset;
            if (conf.combineOffsets && rowIndex > 0) {
                rowSpecificOffset += (rowIndex * Math.PI) / conf.waveRows;
            } else {
                rowSpecificOffset += rowIndex * conf.rowPeakOffset;
            }

            const phase = normalizedX * Math.PI * conf.waveLength + currentTime * rowSpeed * direction + rowSpecificOffset;

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

            let thickness = baseThickness + waveValue * thicknessRange;

            if (conf.mouseAmplitude && localMouseInCanvas) {
                const dx = x - localMouseX;
                const dist = Math.abs(dx);
                const maxDist = localWidth * 0.3;
                const influence = Math.max(0, 1 - dist / maxDist);
                thickness += influence * thicknessRange * (conf.amplitudeStrength - 1);
            }

            return Math.max(rowMinWidth, Math.min(rowMaxWidth, thickness));
        }

        function drawWaveInstance(localWidth, localHeight, localMouseX, localMouseY, localMouseInCanvas, conf, effectiveBars, effectiveRows) {
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
                    const barWidth = getBarThickness(x, configRowIndex, time, localWidth, localMouseX, localMouseInCanvas, conf);

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
                    } else {
                        const topStart = row * effectiveRowHeight;
                        const bottomEnd = (row + 1) * effectiveRowHeight;
                        ctx.fillRect(x - barWidth / 2, topStart, barWidth, bottomEnd - topStart);
                    }
                }
            }
            ctx.restore();
        }

        function draw() {
            const conf = attrRef.current;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const { x: mX, y: mY, active: mActive } = mouseRef.current;

            const unitW = conf.duplicateModeActive ? canvas.width / conf.gridCols : canvas.width;
            const unitH = conf.duplicateModeActive ? canvas.height / conf.gridRows : canvas.height;

            const referenceSize = 800;
            const barsPerUnit = (conf.barsPerRow / referenceSize) * unitW;
            const rowsPerUnit = (conf.waveRows / referenceSize) * unitH;

            if (!conf.duplicateModeActive) {
                drawWaveInstance(canvas.width, canvas.height, mX, mY, mActive, conf, barsPerUnit, rowsPerUnit);
            } else {
                conf.gridConfig.forEach(item => {
                    if (!item.isActive) return;

                    const cellX = item.c * unitW;
                    const cellY = item.r * unitH;
                    const cellW = item.cs * unitW;
                    const cellH = item.rs * unitH;

                    ctx.save();
                    ctx.translate(cellX + cellW / 2, cellY + cellH / 2);
                    ctx.rotate(item.rotation * Math.PI / 180);
                    ctx.translate(-cellW / 2, -cellH / 2);

                    const angle = -item.rotation * Math.PI / 180;
                    const cx = cellX + cellW / 2;
                    const cy = cellY + cellH / 2;
                    const rx = mX - cx;
                    const ry = mY - cy;
                    const localX = rx * Math.cos(angle) - ry * Math.sin(angle) + cellW / 2;
                    const localY = rx * Math.sin(angle) + ry * Math.cos(angle) + cellH / 2;

                    const localMouseInCanvas = mActive &&
                        localX >= 0 && localX <= cellW &&
                        localY >= 0 && localY <= cellH;

                    ctx.beginPath();
                    ctx.rect(0, 0, cellW, cellH);
                    ctx.clip();

                    drawWaveInstance(cellW, cellH, localX, localY, localMouseInCanvas, conf, barsPerUnit * item.cs, rowsPerUnit * item.rs);
                    ctx.restore();
                });
            }
        }

        function animate() {
            time += 0.016;
            draw();
            animationFrame = requestAnimationFrame(animate);
        }

        animate();

        return () => {
            cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
        };
    }, []);

    const blockProps = useBlockProps({
        style: { backgroundColor: bgColor, position: 'relative', overflow: 'hidden' },
        onMouseMove: (e) => {
            const rect = canvasRef.current.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                active: true
            };
        },
        onMouseLeave: () => {
            mouseRef.current.active = false;
        }
    });

    return (
        <>
            <InspectorControls>
                <PanelBody title={__('Wave Structure', 'minimalist')}>
                    <SelectControl
                        label={__('Shape Mode', 'minimalist')}
                        value={shapeMode}
                        options={[
                            { label: 'Bars', value: 'bars' },
                            { label: 'Balls (Circles)', value: 'balls' },
                            { label: 'Squares', value: 'squares' },
                        ]}
                        onChange={(val) => setAttributes({ shapeMode: val })}
                    />
                    <ToggleControl
                        label={__('Stroke Only', 'minimalist')}
                        checked={strokeOnly}
                        onChange={(val) => setAttributes({ strokeOnly: val })}
                    />
                    {strokeOnly && (
                        <RangeControl
                            label={__('Base Stroke Width', 'minimalist')}
                            value={strokeWidth}
                            onChange={(val) => setAttributes({ strokeWidth: val })}
                            min={0.1}
                            max={20}
                            step={0.1}
                        />
                    )}
                    <RangeControl
                        label={__('Wave Rows', 'minimalist')}
                        value={waveRows}
                        onChange={(val) => setAttributes({ waveRows: val })}
                        min={1}
                        max={100}
                    />
                    <RangeControl
                        label={__('Bars per Row', 'minimalist')}
                        value={barsPerRow}
                        onChange={(val) => setAttributes({ barsPerRow: val })}
                        min={10}
                        max={100}
                    />
                    <RangeControl
                        label={__('Min Bar Width', 'minimalist')}
                        value={minBarWidth}
                        onChange={(val) => setAttributes({ minBarWidth: val })}
                        min={0.1}
                        max={50}
                        step={0.1}
                    />
                    <RangeControl
                        label={__('Max Bar Width', 'minimalist')}
                        value={maxBarWidth}
                        onChange={(val) => setAttributes({ maxBarWidth: val })}
                        min={0.1}
                        max={50}
                        step={0.1}
                    />
                    <RangeControl
                        label={__('Bar Coverage', 'minimalist')}
                        value={barCoverage}
                        onChange={(val) => setAttributes({ barCoverage: val })}
                        min={0}
                        max={100}
                    />
                </PanelBody>

                <PanelColorSettings
                    title={__('Colors', 'minimalist')}
                    colorSettings={[
                        {
                            value: bgColor,
                            onChange: (val) => setAttributes({ bgColor: val }),
                            label: __('Background Color', 'minimalist'),
                            // Background usually doesn't need alpha for the block itself, but can be enabled
                        },
                        {
                            value: barColor,
                            onChange: (val) => setAttributes({ barColor: val }),
                            label: __('Bar Color', 'minimalist'),
                            __experimentalHasAlphaSupport: true,
                        },
                    ]}
                />

                <PanelBody title={__('Advanced Effects', 'minimalist')} initialOpen={false}>
                    <ToggleControl
                        label={__('Enable Mix Blend Mode', 'minimalist')}
                        checked={enableMixBlend}
                        onChange={(val) => setAttributes({ enableMixBlend: val })}
                    />
                    {enableMixBlend && (
                        <SelectControl
                            label={__('Blend Mode', 'minimalist')}
                            value={mixBlendMode}
                            options={[
                                { label: 'Normal', value: 'normal' },
                                { label: 'Multiply', value: 'multiply' },
                                { label: 'Screen', value: 'screen' },
                                { label: 'Overlay', value: 'overlay' },
                                { label: 'Darken', value: 'darken' },
                                { label: 'Lighten', value: 'lighten' },
                                { label: 'Color Dodge', value: 'color-dodge' },
                                { label: 'Color Burn', value: 'color-burn' },
                                { label: 'Hard Light', value: 'hard-light' },
                                { label: 'Soft Light', value: 'soft-light' },
                                { label: 'Difference', value: 'difference' },
                                { label: 'Exclusion', value: 'exclusion' },
                                { label: 'Hue', value: 'hue' },
                                { label: 'Saturation', value: 'saturation' },
                                { label: 'Color', value: 'color' },
                                { label: 'Luminosity', value: 'luminosity' },
                            ]}
                            onChange={(val) => setAttributes({ mixBlendMode: val })}
                        />
                    )}
                </PanelBody>

                <PanelBody title={__('Animation', 'minimalist')}>
                    <ToggleControl
                        label={__('Animate Bar Thickness', 'minimalist')}
                        checked={animateThickness}
                        onChange={(val) => setAttributes({ animateThickness: val })}
                    />
                    {animateThickness && (
                        <>
                            <SelectControl
                                label={__('Animation Mode', 'minimalist')}
                                value={animationMode}
                                options={[
                                    { label: 'Loop', value: 'loop' },
                                    { label: 'Ping-Pong', value: 'pingpong' },
                                    { label: 'Reset', value: 'reset' },
                                ]}
                                onChange={(val) => setAttributes({ animationMode: val })}
                            />
                            <RangeControl
                                label={__('Speed', 'minimalist')}
                                value={thicknessSpeed}
                                onChange={(val) => setAttributes({ thicknessSpeed: val })}
                                min={0.01}
                                max={8}
                                step={0.01}
                            />
                            <RangeControl
                                label={__('Offset', 'minimalist')}
                                value={thicknessOffset}
                                onChange={(val) => setAttributes({ thicknessOffset: val })}
                                min={0}
                                max={6.28}
                                step={0.01}
                            />
                            <RangeControl
                                label={__('Wave Length', 'minimalist')}
                                value={waveLength}
                                onChange={(val) => setAttributes({ waveLength: val })}
                                min={0.01}
                                max={20}
                                step={0.01}
                            />
                            <RangeControl
                                label={__('Cutoff', 'minimalist')}
                                value={thicknessCutoff}
                                onChange={(val) => setAttributes({ thicknessCutoff: val })}
                                min={0}
                                max={100}
                            />
                            <RangeControl
                                label={__('Trail Cutoff', 'minimalist')}
                                value={trailCutoff}
                                onChange={(val) => setAttributes({ trailCutoff: val })}
                                min={-100}
                                max={100}
                            />
                            <RangeControl
                                label={__('Trail Start', 'minimalist')}
                                value={trailCutoffStart}
                                onChange={(val) => setAttributes({ trailCutoffStart: val })}
                                min={0}
                                max={100}
                            />
                            <RangeControl
                                label={__('Row Peak Offset', 'minimalist')}
                                value={rowPeakOffset}
                                onChange={(val) => setAttributes({ rowPeakOffset: val })}
                                min={0}
                                max={6.28}
                                step={0.01}
                            />
                            <ToggleControl
                                label={__('Alternate Row Direction', 'minimalist')}
                                checked={alternateDirection}
                                onChange={(val) => setAttributes({ alternateDirection: val })}
                            />
                            <ToggleControl
                                label={__('Combine Offsets (auto cascade)', 'minimalist')}
                                checked={combineOffsets}
                                onChange={(val) => setAttributes({ combineOffsets: val })}
                            />
                        </>
                    )}
                </PanelBody>

                <PanelBody title={__('Mouse Interaction', 'minimalist')}>
                    <ToggleControl
                        label={__('Mouse Changes Amplitude', 'minimalist')}
                        checked={mouseAmplitude}
                        onChange={(val) => setAttributes({ mouseAmplitude: val })}
                    />
                    {mouseAmplitude && (
                        <RangeControl
                            label={__('Effect Strength', 'minimalist')}
                            value={amplitudeStrength}
                            onChange={(val) => setAttributes({ amplitudeStrength: val })}
                            min={0.01}
                            max={8}
                            step={0.01}
                        />
                    )}
                </PanelBody>

                <PanelBody title={__('Duplicate Mode', 'minimalist')} initialOpen={false}>
                    <ToggleControl
                        label={__('Enable Duplicate Mode', 'minimalist')}
                        checked={duplicateModeActive}
                        onChange={(val) => setAttributes({ duplicateModeActive: val })}
                    />
                    {duplicateModeActive && (
                        <>
                            <RangeControl
                                label={__('Grid Rows', 'minimalist')}
                                value={gridRows}
                                onChange={(val) => setAttributes({ gridRows: val })}
                                min={1}
                                max={6}
                            />
                            <RangeControl
                                label={__('Grid Columns', 'minimalist')}
                                value={gridCols}
                                onChange={(val) => setAttributes({ gridCols: val })}
                                min={1}
                                max={6}
                            />
                            <Button
                                isPrimary
                                onClick={togglePopover}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                {__('Edit Layout', 'minimalist')}
                            </Button>
                            {isPopoverOpen && (
                                <Popover
                                    onClose={togglePopover}
                                    position="bottom center"
                                    className="minimalist-layout-popover"
                                >
                                    <div style={{ padding: '20px', minWidth: '300px' }}>
                                        <h3>{__('Visual Layout Editor', 'minimalist')}</h3>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                                            gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                                            gap: '5px',
                                            aspectRatio: `${gridCols}/${gridRows}`,
                                            background: '#f0f0f0',
                                            padding: '5px',
                                            borderRadius: '4px'
                                        }}>
                                            {renderGridEditor()}
                                        </div>
                                        <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
                                            {__('Click cells to toggle. Use controls in cell to rotate or merge.', 'minimalist')}
                                        </div>
                                    </div>
                                </Popover>
                            )}
                        </>
                    )}
                </PanelBody>
            </InspectorControls>

            <div {...blockProps}>
                <canvas
                    ref={canvasRef}
                    className="minimalist-canvas-element"
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        zIndex: 0, pointerEvents: 'none',
                        mixBlendMode: enableMixBlend ? mixBlendMode : 'normal'
                    }}
                />
                {/* Visual grid guide in editor if duplicate mode is active */}
                {duplicateModeActive && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        zIndex: 1, pointerEvents: 'none',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                        opacity: 0.1
                    }}>
                        {Array.from({ length: gridRows * gridCols }).map((_, i) => (
                            <div key={i} style={{ border: '1px dashed rgba(0,0,0,0.5)' }} />
                        ))}
                    </div>
                )}
                <div className="minimalist-canvas-content" style={{ position: 'relative', zIndex: 2 }}>
                    <InnerBlocks />
                </div>
            </div>
        </>
    );
}
