import os
from PIL import Image

# Configuration
DEST_DIR = r"m:\AnimOrg\assets\avatars"
os.makedirs(DEST_DIR, exist_ok=True)

GRIDS = [
    r"C:\Users\iammo\.gemini\antigravity\brain\09b61b95-f009-40c5-8f6b-8b25bbf70324\avatar_grid_female_1783714718456.png",
    r"C:\Users\iammo\.gemini\antigravity\brain\09b61b95-f009-40c5-8f6b-8b25bbf70324\avatar_grid_male_1783714732538.png",
    r"C:\Users\iammo\.gemini\antigravity\brain\09b61b95-f009-40c5-8f6b-8b25bbf70324\avatar_grid_neutral_1783714746532.png"
]

preset_idx = 1

for grid_path in GRIDS:
    if not os.path.exists(grid_path):
        print(f"Error: Grid path not found: {grid_path}")
        continue
    
    print(f"Slicing grid: {grid_path}")
    img = Image.open(grid_path)
    grid_w, grid_h = img.size
    
    cell_w = grid_w // 4
    cell_h = grid_h // 4
    
    # Crop slightly smaller than cell to avoid grid borders
    crop_w = int(cell_w * 0.76)
    crop_h = int(cell_h * 0.76)
    
    for row in range(4):
        for col in range(4):
            # Find center of current cell
            center_x = col * cell_w + cell_w // 2
            center_y = row * cell_h + cell_h // 2
            
            # Define bounding box
            left = center_x - crop_w // 2
            top = center_y - crop_h // 2
            right = center_x + crop_w // 2
            bottom = center_y + crop_h // 2
            
            # Crop
            cropped = img.crop((left, top, right, bottom))
            
            # Resize to standard 200x200 for clean mobile display with minimal weight
            resample_filter = Image.Resampling.LANCZOS if hasattr(Image, 'Resampling') else Image.ANTIALIAS
            resized = cropped.resize((200, 200), resample=resample_filter)
            
            # Save as WebP
            dest_filename = f"preset_{preset_idx}.webp"
            dest_filepath = os.path.join(DEST_DIR, dest_filename)
            
            resized.save(dest_filepath, "WEBP", quality=85)
            print(f"Saved: {dest_filename}")
            
            preset_idx += 1

print("Slicing complete!")
