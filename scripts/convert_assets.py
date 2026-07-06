import os
from PIL import Image

def convert_to_png(file_path):
    print(f"Checking {file_path}...")
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    try:
        # Open the image using Pillow
        with Image.open(file_path) as img:
            # Check format
            orig_format = img.format
            print(f"Original format of {file_path} is {orig_format}")
            
            # Save it back as a true PNG image
            img.save(file_path, format="PNG")
            print(f"Successfully converted {file_path} to true PNG format.")
    except Exception as e:
        print(f"Failed to convert {file_path}: {e}")

if __name__ == "__main__":
    assets_dir = "./assets"
    convert_to_png(os.path.join(assets_dir, "icon.png"))
    convert_to_png(os.path.join(assets_dir, "adaptive-icon.png"))
