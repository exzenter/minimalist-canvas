import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save({ attributes }) {
    const { bgColor, aspectRatio } = attributes;

    const blockProps = useBlockProps.save({
        className: 'wp-block-minimalist-canvas',
        style: {
            backgroundColor: bgColor,
            aspectRatio: aspectRatio || undefined
        },
        'data-config': JSON.stringify(attributes)
    });

    return (
        <div {...blockProps}>
            <canvas
                className="minimalist-canvas-element"
                style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    zIndex: 0, pointerEvents: 'none',
                    mixBlendMode: attributes.enableMixBlend ? attributes.mixBlendMode : 'normal'
                }}
            ></canvas>
            <div className="minimalist-canvas-content" style={{ position: 'relative', zIndex: 2 }}>
                <InnerBlocks.Content />
            </div>
        </div>
    );
}
