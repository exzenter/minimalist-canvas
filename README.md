# Minimalist Canvas

A WordPress Gutenberg block featuring an animated wave canvas background with highly customizable parameters.

## Features

- **Animated Wave Background:** High-performance HTML5 Canvas animations.
- **Customizable Shapes:** Choose between Bars, Balls (Circles), and Squares.
- **Dynamic Thickness:** Animate stroke/fill thickness with loop, ping-pong, or reset modes.
- **Duplicate Mode:** 
  - Create complex tiled patterns with up to a 6x6 grid.
  - Interactive visual editor for cell activation, merging, and rotation.
  - Global mouse interaction transformed for rotated instances.
- **Mouse Interaction:** Waves respond to mouse movement with adjustable amplitude.
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
