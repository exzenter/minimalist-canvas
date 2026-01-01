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
        duplicateModeActive, gridRows, gridCols, gridConfig
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

    const blockProps = useBlockProps({
        style: { backgroundColor: bgColor, position: 'relative', overflow: 'hidden' }
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
                        },
                        {
                            value: barColor,
                            onChange: (val) => setAttributes({ barColor: val }),
                            label: __('Bar Color', 'minimalist'),
                        },
                    ]}
                />

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
                                        {/* Grid Editor Implementation will go here */}
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
                <div className="wp-block-minimalist-wave-canvas-background"
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        zIndex: 0, pointerEvents: 'none',
                        display: duplicateModeActive ? 'grid' : 'block',
                        gridTemplateColumns: duplicateModeActive ? `repeat(${gridCols}, 1fr)` : 'none',
                        gridTemplateRows: duplicateModeActive ? `repeat(${gridRows}, 1fr)` : 'none',
                        gap: duplicateModeActive ? '1px' : '0',
                        backgroundColor: bgColor
                    }}
                >
                    {duplicateModeActive ? (
                        gridConfig.filter(i => i.isActive).map((item, idx) => (
                            <div key={idx} style={{
                                gridRow: `${item.r + 1} / span ${item.rs}`,
                                gridColumn: `${item.c + 1} / span ${item.cs}`,
                                border: '1px dashed rgba(0,0,0,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: `rotate(${item.rotation}deg)`,
                                fontSize: '10px',
                                color: barColor,
                                opacity: 0.3
                            }}>
                                <span>{item.rotation}°</span>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '20px', color: barColor, opacity: 0.5 }}>
                            {__('Wave Canvas Background Active', 'minimalist')}
                        </div>
                    )}
                </div>
                <div className="wp-block-minimalist-wave-canvas-content" style={{ position: 'relative', zIndex: 1 }}>
                    <InnerBlocks />
                </div>
            </div>
        </>
    );
}
