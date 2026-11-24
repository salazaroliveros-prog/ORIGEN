// scripts/optimize-images.sh
// Convierte PNG/JPG a WebP/AVIF

#!/bin/bash

# Directories
PUBLIC_DIR="public"
OUTPUT_DIR="public/images-optimized"

mkdir -p $OUTPUT_DIR

echo "🖼️  Starting image optimization..."
echo "Target formats: WebP (40% reduction), AVIF (50% reduction)"

# Apple touch icon
echo "Converting apple-touch-icon.png..."
cwebp -q 85 $PUBLIC_DIR/apple-touch-icon.png -o $OUTPUT_DIR/apple-touch-icon.webp
cavif -q 65 $PUBLIC_DIR/apple-touch-icon.png -o $OUTPUT_DIR/apple-touch-icon.avif

# PWA icon 512x512
echo "Converting favicon-512x512.png..."
cwebp -q 85 $PUBLIC_DIR/favicon-512x512.png -o $OUTPUT_DIR/favicon-512x512.webp
cavif -q 65 $PUBLIC_DIR/favicon-512x512.png -o $OUTPUT_DIR/favicon-512x512.avif

# PWA icon 192x192
echo "Converting favicon-192x192.png..."
cwebp -q 85 $PUBLIC_DIR/favicon-192x192.png -o $OUTPUT_DIR/favicon-192x192.webp
cavif -q 65 $PUBLIC_DIR/favicon-192x192.png -o $OUTPUT_DIR/favicon-192x192.avif

echo "✅ Image optimization complete!"
echo ""
echo "📊 Size comparison:"
ls -lh $PUBLIC_DIR/*.png | awk '{print "PNG:", $9, $5}'
ls -lh $OUTPUT_DIR/*.webp | awk '{print "WebP:", $9, $5}'
ls -lh $OUTPUT_DIR/*.avif | awk '{print "AVIF:", $9, $5}'
