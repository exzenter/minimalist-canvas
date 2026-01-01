<?php
/**
 * Plugin Name: Minimalist Wave Canvas
 * Description: A Gutenberg block with an animated wave canvas background.
 * Version: 1.0.0
 * Author: Antigravity
 */

function minimalist_wave_canvas_block_init() {
    register_block_type( __DIR__ . '/build' );
}
add_action( 'init', 'minimalist_wave_canvas_block_init' );
