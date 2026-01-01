# Minimalist Canvas

A WordPress Gutenberg block featuring an animated wave canvas background with highly customizable parameters.

## Features

- **Animated Wave Background:** High-performance HTML5 Canvas animations with sub-pixel precision.
- **Customizable Shapes:** Choose between Bars, Balls (Circles), and Squares.
- **Dynamic Thickness:** Animate stroke/fill thickness with loop, ping-pong, or reset modes.
- **Duplicate Mode 2.0:** 
  - Create complex tiled patterns with up to a 6x6 grid.
  - **New Modal Editor**: Large, central UI for precise grid manipulation.
  - **Advanced Grid Controls**: 4-way merging, moving, and 90° rotation.
  - **Per-Instance Overrides**: Customize every parameter (color, speed, mode, etc.) for individual cells.
  - **Reset Logic**: Revert instance settings to block defaults with one click.
- **Color & Effects:**
  - **Alpha Opacity**: Full transparency support for all color pickers.
  - **Blend Modes**: Integrated CSS `mix-blend-mode` support (Multiply, Overlay, etc.) for artistic layering.
- **Advanced Animation:**
  - **Directional Waves**: Adjust the wave angle from 0-360° for squares and balls.
  - **Snap to Grid**: Force perfect alignment between tiled instances by locking to a global unit.
  - **Live View Toggle**: Pause/Resume the animation directly in the editor window.
- **Seamless Tiling**: Optimized "bleed" method to eliminate fine lines and sub-pixel gaps between grid cells.
- **Gutenberg Integration:** Fully integrated with WordPress block editor controls.

## Installation

1. Copy the `minimalist` directory to your WordPress plugins folder (`wp-content/plugins/`).
2. Activate the plugin through the WordPress admin dashboard.

## Development

To modify the block, you'll need Node.js and npm installed.

```bash
# Install dependencies
npm install

# Build the block
npm run build

# Start development mode (with hot-reloading)
npm start
```

## Credits

Designed and developed as part of a minimalist UI project.
