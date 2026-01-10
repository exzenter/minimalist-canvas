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
    TextControl,
    Button,
    Popover,
    Modal,
    ColorPicker,
} from '@wordpress/components';
import { useState, useEffect, useRef } from '@wordpress/element';

const SETTINGS_CONFIG = [
    {
        title: __('Wave Structure', 'minimalist'),
        settings: [
            { key: 'aspectRatio', label: __('Aspect Ratio', 'minimalist'), type: 'text', globalOnly: true, help: __('Set custom aspect ratio (e.g., "16:9", "4:3", "1:1"). Leave empty for default.', 'minimalist'), placeholder: __('e.g., 16:9', 'minimalist') },
            { key: 'snapToGrid', label: __('Snap Shapes to Grid', 'minimalist'), type: 'toggle', globalOnly: true, help: __('Ensures shapes align perfectly between different cells, especially when rotated.', 'minimalist') },
            {
                key: 'shapeMode', label: __('Shape Mode', 'minimalist'), type: 'select', options: [
                    { label: 'Bars', value: 'bars' },
                    { label: 'Balls (Circles)', value: 'balls' },
                    { label: 'Squares', value: 'squares' },
                    { label: 'X', value: 'x' },
                    { label: 'Plus (+)', value: 'plus' },
                    { label: 'Triangle Up', value: 'tri-up' },
                    { label: 'Triangle Down', value: 'tri-down' },
                    { label: 'Triangle Left', value: 'tri-left' },
                    { label: 'Triangle Right', value: 'tri-right' },
                    { label: 'Diamond', value: 'diamond' },
                    { label: 'Hexagon', value: 'hexagon' },
                    { label: 'Star', value: 'star' },
                    { label: 'Pill', value: 'pill' },
                    { label: 'Chevron Up', value: 'chevron-up' },
                    { label: 'Chevron Down', value: 'chevron-down' },
                    { label: 'Chevron Left', value: 'chevron-left' },
                    { label: 'Chevron Right', value: 'chevron-right' },
                    { label: 'Octagon', value: 'octagon' },
                ]
            },
            { key: 'strokeOnly', label: __('Stroke Only', 'minimalist'), type: 'toggle' },
            { key: 'strokeWidth', label: __('Base Stroke Width', 'minimalist'), type: 'range', min: 0.1, max: 20, step: 0.1, condition: (attr) => attr.strokeOnly },
            { key: 'waveRows', label: __('Wave Rows', 'minimalist'), type: 'range', min: 1, max: 100 },
            { key: 'barsPerRow', label: __('Bars per Row', 'minimalist'), type: 'range', min: 10, max: 100 },
            { key: 'minBarWidth', label: __('Min Bar Width', 'minimalist'), type: 'range', min: 0.1, max: 50, step: 0.1 },
            { key: 'maxBarWidth', label: __('Max Bar Width', 'minimalist'), type: 'range', min: 0.1, max: 50, step: 0.1 },
            { key: 'barCoverage', label: __('Bar Coverage', 'minimalist'), type: 'range', min: 0, max: 100 },
            { key: 'logScale', label: __('Logarithmic Scale', 'minimalist'), type: 'toggle', help: __('Use logarithmic interpolation between min and max bar width.', 'minimalist') },
            { key: 'logStrength', label: __('Log Strength', 'minimalist'), type: 'range', min: 1, max: 10, step: 0.1, condition: (attr) => attr.logScale },
            { key: 'logReverse', label: __('Reverse Log', 'minimalist'), type: 'toggle', condition: (attr) => attr.logScale },
        ]
    },
    {
        title: __('Colors', 'minimalist'),
        settings: [
            { key: 'bgColor', label: __('Background Color', 'minimalist'), type: 'color', globalOnly: true },
            { key: 'barColor', label: __('Bar Color', 'minimalist'), type: 'color' },
        ]
    },
    {
        title: __('Animation', 'minimalist'),
        settings: [
            { key: 'animateThickness', label: __('Animate Bar Thickness', 'minimalist'), type: 'toggle' },
            {
                key: 'animationMode', label: __('Animation Mode', 'minimalist'), type: 'select', condition: (attr) => attr.animateThickness, options: [
                    { label: 'Loop', value: 'loop' },
                    { label: 'Ping-Pong', value: 'pingpong' },
                    { label: 'Reset', value: 'reset' },
                ]
            },
            { key: 'thicknessSpeed', label: __('Speed', 'minimalist'), type: 'range', condition: (attr) => attr.animateThickness, min: 0.01, max: 8, step: 0.01 },
            { key: 'thicknessOffset', label: __('Offset', 'minimalist'), type: 'range', condition: (attr) => attr.animateThickness, min: 0, max: 6.28, step: 0.01 },
            { key: 'animationDirection', label: __('Animation Direction', 'minimalist'), type: 'range', condition: (attr) => attr.animateThickness && attr.shapeMode !== 'bars', min: 0, max: 360 },
            { key: 'waveLength', label: __('Wave Length', 'minimalist'), type: 'range', condition: (attr) => attr.animateThickness, min: 0.01, max: 20, step: 0.01 },
            { key: 'thicknessCutoff', label: __('Cutoff', 'minimalist'), type: 'range', condition: (attr) => attr.animateThickness, min: 0, max: 100 },
            { key: 'trailCutoff', label: __('Trail Cutoff', 'minimalist'), type: 'range', condition: (attr) => attr.animateThickness, min: -100, max: 100 },
            { key: 'trailCutoffStart', label: __('Trail Start', 'minimalist'), type: 'range', condition: (attr) => attr.animateThickness, min: 0, max: 100 },
            { key: 'rowPeakOffset', label: __('Row Peak Offset', 'minimalist'), type: 'range', condition: (attr) => attr.animateThickness, min: 0, max: 6.28, step: 0.01 },
            { key: 'alternateDirection', label: __('Alternate Row Direction', 'minimalist'), type: 'toggle', condition: (attr) => attr.animateThickness },
            { key: 'combineOffsets', label: __('Combine Offsets (auto cascade)', 'minimalist'), type: 'toggle', condition: (attr) => attr.animateThickness },
        ]
    },
    {
        title: __('Mouse Interaction', 'minimalist'),
        settings: [
            { key: 'mouseAmplitude', label: __('Mouse Changes Amplitude', 'minimalist'), type: 'toggle' },
            { key: 'amplitudeStrength', label: __('Effect Strength', 'minimalist'), type: 'range', condition: (attr) => attr.mouseAmplitude, min: 0.01, max: 8, step: 0.01 },
        ]
    },
    {
        title: __('Advanced Effects', 'minimalist'),
        settings: [
            { key: 'enableMixBlend', label: __('Enable Mix Blend Mode', 'minimalist'), type: 'toggle' },
            {
                key: 'mixBlendMode', label: __('Blend Mode', 'minimalist'), type: 'select', condition: (attr) => attr.enableMixBlend, options: [
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
                ]
            },
        ]
    }
];

export default function Edit({ attributes, setAttributes }) {
    const {
        shapeMode, strokeOnly, strokeWidth, waveRows, barsPerRow,
        minBarWidth, maxBarWidth, barCoverage, bgColor, barColor,
        animateThickness, animationMode, thicknessSpeed, thicknessOffset,
        waveLength, thicknessCutoff, trailCutoff, trailCutoffStart,
        rowPeakOffset, alternateDirection, combineOffsets,
        mouseAmplitude, amplitudeStrength,
        duplicateModeActive, gridRows, gridCols, gridConfig,
        enableMixBlend, mixBlendMode, animationDirection,
        snapToGrid, aspectRatio
    } = attributes;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeCellIndex, setActiveCellIndex] = useState(null); // Index in gridConfig or -1

    const toggleModal = () => setIsModalOpen(!isModalOpen);

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

    const mergeCell = (index, direction) => {
        if (index === -1) return;
        let newConfig = [...gridConfig];
        const item = { ...newConfig[index] };

        if (direction === 'right') item.cs += 1;
        else if (direction === 'down') item.rs += 1;
        else if (direction === 'left') { item.c -= 1; item.cs += 1; }
        else if (direction === 'up') { item.r -= 1; item.rs += 1; }

        newConfig[index] = item;
        // Remove any other cells that are now covered
        newConfig = newConfig.filter((i, idx) => {
            if (idx === index) return true;
            const inR = i.r >= item.r && i.r < item.r + item.rs;
            const inC = i.c >= item.c && i.c < item.c + item.cs;
            return !(inR && inC);
        });
        updateGridConfig(newConfig);
    };

    const moveCell = (index, dr, dc) => {
        if (index === -1) return;
        let newConfig = [...gridConfig];
        const item = { ...newConfig[index] };

        const newR = item.r + dr;
        const newC = item.c + dc;

        if (newR < 0 || newR + item.rs > gridRows || newC < 0 || newC + item.cs > gridCols) return;

        // Check if destination is blocked by another active cell
        const blocked = newConfig.some((i, idx) => {
            if (idx === index || !i.isActive) return false;
            const overlapR = Math.max(newR, i.r) < Math.min(newR + item.rs, i.r + i.rs);
            const overlapC = Math.max(newC, i.c) < Math.min(newC + item.cs, i.c + i.cs);
            return overlapR && overlapC;
        });

        if (blocked) return;

        item.r = newR;
        item.c = newC;
        newConfig[index] = item;
        updateGridConfig(newConfig);
    };

    const setInstanceOverride = (index, key, value) => {
        let newConfig = [...gridConfig];
        const item = { ...newConfig[index] };
        if (value === undefined || value === null) {
            delete item[key];
        } else {
            item[key] = value;
        }
        newConfig[index] = item;
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

                const cellIndex = gridConfig.findIndex(i => i.r === r && i.c === c);
                const item = cellIndex > -1 ? gridConfig[cellIndex] : null;
                const isActive = item?.isActive;
                const rotation = item?.rotation || 0;
                const rs = item?.rs || 1;
                const cs = item?.cs || 1;
                const isSelected = activeCellIndex === cellIndex && cellIndex !== -1;

                cells.push(
                    <div
                        key={`${r}-${c}`}
                        style={{
                            gridRow: `span ${rs}`,
                            gridColumn: `span ${cs}`,
                            background: isActive ? (isSelected ? '#005a87' : '#007cba') : '#fff',
                            border: isSelected ? '2px solid #ffad00' : '1px solid #ccc',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            minHeight: '80px',
                            color: isActive ? '#fff' : '#000',
                            position: 'relative',
                            boxShadow: isSelected ? '0 0 10px rgba(255,173,0,0.5)' : 'none',
                            zIndex: isSelected ? 10 : 1
                        }}
                        onClick={() => {
                            if (isActive) {
                                setActiveCellIndex(cellIndex);
                            } else {
                                toggleCell(r, c);
                                setActiveCellIndex(gridConfig.length); // Next available index
                            }
                        }}
                    >
                        {isActive ? (
                            <div style={{ padding: '4px', textAlign: 'center', width: '100%' }}>
                                <div style={{ fontSize: '10px', marginBottom: '4px', fontWeight: 'bold' }}>
                                    {rotation}° {isSelected ? `[${__('Selected', 'minimalist')}]` : ''}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px' }}>
                                    <Button isSmall icon="redo" onClick={(e) => { e.stopPropagation(); rotateCell(r, c); }} label={__('Rotate', 'minimalist')} />
                                    <Button isSmall icon="remove" onClick={(e) => { e.stopPropagation(); toggleCell(r, c); setActiveCellIndex(null); }} label={__('Remove', 'minimalist')} />
                                    <Button isSmall icon="move" onClick={(e) => { e.stopPropagation(); }} label={__('Move', 'minimalist')} />
                                    <div />

                                    <Button isSmall icon="arrow-left-alt" onClick={(e) => { e.stopPropagation(); mergeCell(cellIndex, 'left'); }} disabled={c === 0} label={__('Merge Left', 'minimalist')} />
                                    <Button isSmall icon="arrow-right-alt" onClick={(e) => { e.stopPropagation(); mergeCell(cellIndex, 'right'); }} disabled={c + cs >= gridCols} label={__('Merge Right', 'minimalist')} />
                                    <Button isSmall icon="arrow-up-alt" onClick={(e) => { e.stopPropagation(); mergeCell(cellIndex, 'up'); }} disabled={r === 0} label={__('Merge Up', 'minimalist')} />
                                    <Button isSmall icon="arrow-down-alt" onClick={(e) => { e.stopPropagation(); mergeCell(cellIndex, 'down'); }} disabled={r + rs >= gridRows} label={__('Merge Down', 'minimalist')} />

                                    <Button isSmall icon="arrow-left" onClick={(e) => { e.stopPropagation(); moveCell(cellIndex, 0, -1); }} disabled={c === 0} label={__('Move Left', 'minimalist')} />
                                    <Button isSmall icon="arrow-right" onClick={(e) => { e.stopPropagation(); moveCell(cellIndex, 0, 1); }} disabled={c + cs >= gridCols} label={__('Move Right', 'minimalist')} />
                                    <Button isSmall icon="arrow-up" onClick={(e) => { e.stopPropagation(); moveCell(cellIndex, -1, 0); }} disabled={r === 0} label={__('Move Up', 'minimalist')} />
                                    <Button isSmall icon="arrow-down" onClick={(e) => { e.stopPropagation(); moveCell(cellIndex, 1, 0); }} disabled={r + rs >= gridRows} label={__('Move Down', 'minimalist')} />
                                </div>
                            </div>
                        ) : (
                            <div style={{ fontSize: '24px', opacity: 0.3 }}>+</div>
                        )}
                    </div>
                );
            }
        }
        return cells;
    };

    const renderInstanceSettings = () => {
        const item = gridConfig[activeCellIndex];
        if (!item) return null;

        const renderGenericOverride = (setting) => {
            const { key, label, type, condition } = setting;

            // Check visibility condition if defined
            if (condition && !condition({ ...attributes, ...item })) {
                return null;
            }

            const isOverridden = item[key] !== undefined;
            const value = isOverridden ? item[key] : attributes[key];
            const onChange = (val) => setInstanceOverride(activeCellIndex, key, val);
            const onReset = () => setInstanceOverride(activeCellIndex, key, undefined);

            return (
                <div key={key} style={{
                    marginBottom: '15px',
                    border: isOverridden ? '1px solid #007cba' : '1px transparent',
                    padding: '8px',
                    borderRadius: '4px',
                    position: 'relative',
                    background: isOverridden ? 'rgba(0, 124, 186, 0.05)' : 'transparent'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            {type === 'toggle' && <ToggleControl label={label} checked={value} onChange={onChange} help={setting.help} />}
                            {type === 'range' && <RangeControl label={label} value={value} onChange={onChange} min={setting.min} max={setting.max} step={setting.step} />}
                            {type === 'select' && <SelectControl label={label} value={value} options={setting.options} onChange={onChange} />}
                            {type === 'text' && <TextControl label={label} value={value} onChange={onChange} help={setting.help} placeholder={setting.placeholder} />}
                            {type === 'color' && (
                                <div style={{ marginBottom: '5px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>{label}</span>
                                    <ColorPicker
                                        color={value}
                                        onChange={(newColor) => {
                                            if (!newColor) return;
                                            const colorString = typeof newColor === 'string'
                                                ? newColor
                                                : (newColor.rgb ? `rgba(${newColor.rgb.r}, ${newColor.rgb.g}, ${newColor.rgb.b}, ${newColor.rgb.a})` : newColor.hex);
                                            onChange(colorString);
                                        }}
                                        enableAlpha
                                        __experimentalHasAlphaSupport
                                    />
                                </div>
                            )}
                        </div>
                        {isOverridden && (
                            <Button
                                icon="undo"
                                isSmall
                                onClick={onReset}
                                label={__('Reset to Global', 'minimalist')}
                                style={{ marginLeft: '10px' }}
                            />
                        )}
                    </div>
                </div>
            );
        };

        return (
            <div>
                <h3>{__('Instance Overrides', 'minimalist')}</h3>
                <p style={{ fontSize: '11px', color: '#666', borderBottom: '1px solid #eee', pb: '10px' }}>
                    {__('Settings here apply ONLY to the selected instance. Blue borders indicate overrides.', 'minimalist')}
                </p>

                {SETTINGS_CONFIG.map((section, sIdx) => {
                    const overridableSettings = section.settings.filter(s => !s.globalOnly);
                    if (overridableSettings.length === 0) return null;

                    return (
                        <div key={sIdx} style={{ borderBottom: '1px solid #eee', mb: '15px', pt: '10px' }}>
                            <h4>{section.title}</h4>
                            {overridableSettings.map(setting => renderGenericOverride(setting))}
                        </div>
                    );
                })}
            </div>
        );
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
                // Project coordinates onto animation direction vector
                const angleRad = (conf.animationDirection || 0) * Math.PI / 180;
                const dirX = Math.cos(angleRad);
                const dirY = Math.sin(angleRad);

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
            const conf = attrRef.current;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const { x: mX, y: mY, active: mActive } = mouseRef.current;

            const unitW = conf.duplicateModeActive ? canvas.width / conf.gridCols : canvas.width;
            const unitH = conf.duplicateModeActive ? canvas.height / conf.gridRows : canvas.height;

            const referenceSize = 800;
            let barsPerUnit = (conf.barsPerRow / referenceSize) * unitW;
            let rowsPerUnit = (conf.waveRows / referenceSize) * unitH;

            if (conf.snapToGrid) {
                const globalUnit = referenceSize / conf.barsPerRow;
                barsPerUnit = unitW / globalUnit;
                rowsPerUnit = unitH / globalUnit;
            }

            if (!conf.duplicateModeActive) {
                drawWaveInstance(canvas.width, canvas.height, mX, mY, mActive, conf, barsPerUnit, rowsPerUnit);
            } else {
                conf.gridConfig.forEach(item => {
                    if (!item.isActive) return;

                    const cellX = Math.round(item.c * unitW);
                    const cellY = Math.round(item.r * unitH);
                    const cellW = Math.round((item.c + item.cs) * unitW) - cellX;
                    const cellH = Math.round((item.r + item.rs) * unitH) - cellY;

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
                    ctx.rect(0, 0, cellW + 1, cellH + 1);
                    ctx.clip();

                    const instanceConfig = { ...conf, ...item };
                    drawWaveInstance(
                        cellW + 1,
                        cellH + 1,
                        localX,
                        localY,
                        localMouseInCanvas,
                        instanceConfig,
                        (instanceConfig.barsPerRow / referenceSize) * unitW * item.cs,
                        (instanceConfig.waveRows / referenceSize) * unitH * item.rs
                    );
                    ctx.restore();
                });
            }
        }

        function animate() {
            if (attrRef.current.liveViewActive) {
                time += 0.016;
                draw();
            }
            animationFrame = requestAnimationFrame(animate);
        }

        animate();

        return () => {
            cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
        };
    }, []);

    const blockProps = useBlockProps({
        style: {
            backgroundColor: bgColor,
            position: 'relative',
            overflow: 'hidden',
            aspectRatio: aspectRatio || undefined
        },
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
                {SETTINGS_CONFIG.map((section, sIdx) => {
                    if (section.title === __('Colors', 'minimalist')) {
                        return (
                            <PanelBody key={sIdx} title={section.title} initialOpen={true}>
                                {section.settings.map(setting => (
                                    <div key={setting.key} style={{ marginBottom: '20px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                                            {setting.label}
                                        </span>
                                        <ColorPicker
                                            color={attributes[setting.key]}
                                            onChange={(newColor) => {
                                                if (!newColor) return;
                                                const colorString = typeof newColor === 'string'
                                                    ? newColor
                                                    : (newColor.rgb ? `rgba(${newColor.rgb.r}, ${newColor.rgb.g}, ${newColor.rgb.b}, ${newColor.rgb.a})` : newColor.hex);
                                                setAttributes({ [setting.key]: colorString });
                                            }}
                                            enableAlpha
                                        />
                                    </div>
                                ))}
                            </PanelBody>
                        );
                    }

                    return (
                        <PanelBody key={sIdx} title={section.title} initialOpen={sIdx === 0}>
                            {section.settings.map(setting => {
                                if (setting.condition && !setting.condition(attributes)) return null;

                                const { key, label, type, help, options, min, max, step } = setting;
                                const value = attributes[key];
                                const onChange = (val) => setAttributes({ [key]: val });

                                return (
                                    <div key={key}>
                                        {type === 'toggle' && <ToggleControl label={label} checked={value} onChange={onChange} help={help} />}
                                        {type === 'range' && <RangeControl label={label} value={value} onChange={onChange} min={min} max={max} step={step} />}
                                        {type === 'select' && <SelectControl label={label} value={value} options={options} onChange={onChange} />}
                                        {type === 'text' && <TextControl label={label} value={value} onChange={onChange} help={help} placeholder={setting.placeholder} />}
                                    </div>
                                );
                            })}
                        </PanelBody>
                    );
                })}

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
                                onClick={toggleModal}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                {__('Edit Layout & Instances', 'minimalist')}
                            </Button>
                            {isModalOpen && (
                                <Modal
                                    title={__('Duplicate Mode Editor', 'minimalist')}
                                    onRequestClose={toggleModal}
                                    style={{ width: '90vw', maxWidth: '1200px' }}
                                    className="minimalist-layout-modal"
                                >
                                    <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
                                        {/* Left Panel: Grid Layout */}
                                        <div style={{ flex: '1', minWidth: '300px' }}>
                                            <h3>{__('Visual Layout Editor', 'minimalist')}</h3>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                                                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                                                gap: '5px',
                                                aspectRatio: `${gridCols}/${gridRows}`,
                                                background: '#f0f0f0',
                                                padding: '5px',
                                                borderRadius: '4px',
                                                marginBottom: '15px'
                                            }}>
                                                {renderGridEditor()}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                {__('Click cells to select/activate. Use controls to rotate, merge, or move.', 'minimalist')}
                                            </div>
                                        </div>

                                        {/* Right Panel: Instance Overrides */}
                                        <div style={{ flex: '1', padding: '10px', borderLeft: '1px solid #ddd', overflowY: 'auto', maxHeight: '70vh' }}>
                                            {activeCellIndex !== null && activeCellIndex !== -1 ? (
                                                renderInstanceSettings()
                                            ) : (
                                                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                                                    {__('Select an active cell to edit its specific settings.', 'minimalist')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Modal>
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
