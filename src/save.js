import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save({ attributes }) {
    const { bgColor } = attributes;

    const blockProps = useBlockProps.save({
        className: 'wp-block-minimalist-canvas',
        style: { backgroundColor: bgColor },
        'data-config': JSON.stringify(attributes)
    });

    return (
        <div {...blockProps}>
            <canvas className="minimalist-canvas-element"></canvas>
            <div className="minimalist-canvas-content">
                <InnerBlocks.Content />
            </div>
        </div>
    );
}
