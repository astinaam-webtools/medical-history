#!/usr/bin/env python3
"""
Icon Generator for MediHistory PWA
Generates professional medical-themed icons in all required sizes
"""

from PIL import Image, ImageDraw, ImageFont
import os
import math

# Icon sizes required for PWA
ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

# Output directory
OUTPUT_DIR = "frontend/public/icons"

# Colors - Medical theme with sky blue (matching theme_color #0ea5e9)
PRIMARY_COLOR = (14, 165, 233)  # Sky blue #0ea5e9
SECONDARY_COLOR = (255, 255, 255)  # White
ACCENT_COLOR = (239, 68, 68)  # Red for medical cross accent #ef4444
DARK_COLOR = (15, 23, 42)  # Slate 900


def create_medical_icon(size: int) -> Image.Image:
    """
    Create a medical history themed icon
    Design: A clipboard with a medical cross and heart rate line
    """
    # Create image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate proportions
    padding = size * 0.08  # Safe zone for maskable icons
    inner_size = size - (padding * 2)
    
    # Draw circular background with gradient effect
    center = size // 2
    radius = int(inner_size * 0.48)
    
    # Main circle background
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill=PRIMARY_COLOR
    )
    
    # Inner subtle ring for depth
    inner_radius = int(radius * 0.92)
    ring_color = (12, 148, 210)  # Slightly darker blue
    draw.ellipse(
        [center - inner_radius, center - inner_radius, 
         center + inner_radius, center + inner_radius],
        fill=ring_color
    )
    
    # Even more inner circle
    inner_radius2 = int(radius * 0.85)
    draw.ellipse(
        [center - inner_radius2, center - inner_radius2, 
         center + inner_radius2, center + inner_radius2],
        fill=PRIMARY_COLOR
    )
    
    # Draw clipboard shape
    clipboard_width = int(inner_size * 0.50)
    clipboard_height = int(inner_size * 0.62)
    clipboard_x = center - clipboard_width // 2
    clipboard_y = center - clipboard_height // 2 + int(size * 0.03)
    
    # Clipboard body (rounded rectangle)
    corner_radius = int(size * 0.04)
    draw_rounded_rectangle(
        draw,
        clipboard_x, clipboard_y,
        clipboard_x + clipboard_width, clipboard_y + clipboard_height,
        corner_radius,
        SECONDARY_COLOR
    )
    
    # Clipboard clip at top
    clip_width = int(clipboard_width * 0.45)
    clip_height = int(size * 0.08)
    clip_x = center - clip_width // 2
    clip_y = clipboard_y - int(clip_height * 0.4)
    
    # Clip holder
    draw_rounded_rectangle(
        draw,
        clip_x, clip_y,
        clip_x + clip_width, clip_y + clip_height,
        int(size * 0.02),
        SECONDARY_COLOR
    )
    
    # Inner clip part (darker)
    inner_clip_width = int(clip_width * 0.6)
    inner_clip_x = center - inner_clip_width // 2
    draw_rounded_rectangle(
        draw,
        inner_clip_x, clip_y + int(clip_height * 0.25),
        inner_clip_x + inner_clip_width, clip_y + int(clip_height * 0.75),
        int(size * 0.01),
        PRIMARY_COLOR
    )
    
    # Draw medical cross on clipboard
    cross_size = int(clipboard_width * 0.35)
    cross_thickness = int(cross_size * 0.35)
    cross_center_x = center
    cross_center_y = center - int(size * 0.02)
    
    # Vertical bar of cross
    draw.rectangle([
        cross_center_x - cross_thickness // 2,
        cross_center_y - cross_size // 2,
        cross_center_x + cross_thickness // 2,
        cross_center_y + cross_size // 2
    ], fill=ACCENT_COLOR)
    
    # Horizontal bar of cross
    draw.rectangle([
        cross_center_x - cross_size // 2,
        cross_center_y - cross_thickness // 2,
        cross_center_x + cross_size // 2,
        cross_center_y + cross_thickness // 2
    ], fill=ACCENT_COLOR)
    
    # Draw heartbeat/EKG line at bottom of clipboard
    ekg_y = clipboard_y + int(clipboard_height * 0.75)
    ekg_start_x = clipboard_x + int(clipboard_width * 0.15)
    ekg_end_x = clipboard_x + int(clipboard_width * 0.85)
    ekg_width = ekg_end_x - ekg_start_x
    
    # EKG line thickness based on icon size
    line_width = max(2, int(size * 0.015))
    
    # Draw EKG pattern
    points = []
    segments = 20
    for i in range(segments + 1):
        x = ekg_start_x + (ekg_width * i / segments)
        
        # Create heartbeat pattern
        progress = i / segments
        if 0.35 < progress < 0.4:
            y = ekg_y - int(size * 0.03)
        elif 0.4 <= progress < 0.45:
            y = ekg_y - int(size * 0.08)
        elif 0.45 <= progress < 0.5:
            y = ekg_y + int(size * 0.04)
        elif 0.5 <= progress < 0.55:
            y = ekg_y - int(size * 0.05)
        elif 0.55 <= progress < 0.6:
            y = ekg_y
        else:
            y = ekg_y
        
        points.append((x, y))
    
    # Draw the EKG line
    if len(points) >= 2:
        draw.line(points, fill=PRIMARY_COLOR, width=line_width)
    
    # Draw small document lines on clipboard (above cross)
    line_color = (200, 200, 200)
    line_y_start = clipboard_y + int(clipboard_height * 0.15)
    line_width_doc = int(clipboard_width * 0.5)
    line_x_start = center - line_width_doc // 2
    
    for i in range(2):
        y = line_y_start + i * int(size * 0.035)
        draw.line([
            (line_x_start, y),
            (line_x_start + line_width_doc - (i * int(size * 0.05)), y)
        ], fill=line_color, width=max(1, int(size * 0.008)))
    
    return img


def draw_rounded_rectangle(draw, x1, y1, x2, y2, radius, fill):
    """Draw a rounded rectangle"""
    # Ensure radius isn't too large
    radius = min(radius, (x2 - x1) // 2, (y2 - y1) // 2)
    
    # Draw the main rectangles
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    
    # Draw the four corners
    draw.ellipse([x1, y1, x1 + 2*radius, y1 + 2*radius], fill=fill)
    draw.ellipse([x2 - 2*radius, y1, x2, y1 + 2*radius], fill=fill)
    draw.ellipse([x1, y2 - 2*radius, x1 + 2*radius, y2], fill=fill)
    draw.ellipse([x2 - 2*radius, y2 - 2*radius, x2, y2], fill=fill)


def create_favicon(size: int = 32) -> Image.Image:
    """Create a simplified favicon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Simple circle with medical cross
    padding = 2
    center = size // 2
    radius = center - padding
    
    # Background circle
    draw.ellipse([padding, padding, size - padding, size - padding], fill=PRIMARY_COLOR)
    
    # Medical cross
    cross_size = int(size * 0.5)
    cross_thickness = int(cross_size * 0.4)
    
    # Vertical bar
    draw.rectangle([
        center - cross_thickness // 2,
        center - cross_size // 2,
        center + cross_thickness // 2,
        center + cross_size // 2
    ], fill=SECONDARY_COLOR)
    
    # Horizontal bar
    draw.rectangle([
        center - cross_size // 2,
        center - cross_thickness // 2,
        center + cross_size // 2,
        center + cross_thickness // 2
    ], fill=SECONDARY_COLOR)
    
    return img


def create_apple_touch_icon() -> Image.Image:
    """Create Apple touch icon (180x180) with solid background"""
    size = 180
    img = Image.new('RGBA', (size, size), PRIMARY_COLOR)
    
    # Create the medical icon
    icon = create_medical_icon(size)
    
    # Composite over solid background
    background = Image.new('RGBA', (size, size), PRIMARY_COLOR)
    background.paste(icon, (0, 0), icon)
    
    return background


def main():
    """Generate all icons"""
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("🏥 Generating MediHistory PWA Icons...")
    print("-" * 40)
    
    # Generate PWA icons
    for size in ICON_SIZES:
        icon = create_medical_icon(size)
        filename = f"icon-{size}x{size}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        icon.save(filepath, 'PNG', optimize=True)
        print(f"✓ Generated {filename}")
    
    # Generate favicon
    favicon = create_favicon(32)
    favicon_path = os.path.join(OUTPUT_DIR, "favicon-32x32.png")
    favicon.save(favicon_path, 'PNG', optimize=True)
    print(f"✓ Generated favicon-32x32.png")
    
    # Generate favicon 16x16
    favicon_16 = create_favicon(16)
    favicon_16_path = os.path.join(OUTPUT_DIR, "favicon-16x16.png")
    favicon_16.save(favicon_16_path, 'PNG', optimize=True)
    print(f"✓ Generated favicon-16x16.png")
    
    # Generate Apple touch icon
    apple_icon = create_apple_touch_icon()
    apple_path = os.path.join(OUTPUT_DIR, "apple-touch-icon.png")
    apple_icon.save(apple_path, 'PNG', optimize=True)
    print(f"✓ Generated apple-touch-icon.png")
    
    # Generate ICO file (multi-resolution)
    favicon_ico = create_favicon(32)
    ico_path = "frontend/public/favicon.ico"
    # Save as ICO with multiple sizes
    favicon_16_ico = create_favicon(16)
    favicon_32_ico = create_favicon(32)
    favicon_48_ico = create_favicon(48)
    
    # Save ICO with multiple resolutions
    favicon_32_ico.save(
        ico_path, 
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[favicon_16_ico, favicon_48_ico]
    )
    print(f"✓ Generated favicon.ico")
    
    print("-" * 40)
    print("🎉 All icons generated successfully!")
    print(f"📁 Icons saved to: {OUTPUT_DIR}")
    
    # Copy apple touch icon to public root
    apple_icon_root = apple_icon.copy()
    apple_icon_root.save("frontend/public/apple-touch-icon.png", 'PNG', optimize=True)
    print(f"✓ Copied apple-touch-icon.png to public root")


if __name__ == "__main__":
    main()
