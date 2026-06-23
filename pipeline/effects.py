# BE-3: zoom, captions, overlays

import os
import sys
import numpy as np

# Bug 5 Fix: Safe import with fallback for moviepy version compatibility
moviepy_available = True
moviepy_error = None

try:
    from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
except ImportError as e:
    moviepy_available = False
    moviepy_error = e
    print("WARNING: moviepy not properly installed. Video effects may not work.", file=sys.stderr)
    print("Please run: pip install moviepy==1.0.3", file=sys.stderr)
    # Create placeholder classes to allow import
    class VideoFileClip: pass
    class TextClip: pass
    class CompositeVideoClip: pass

def add_zoom_effect(clip, zoom_ratio=0.1):
    """
    Applies a slow zoom-in effect to the video clip.
    """
    def effect(get_frame, t):
        frame = get_frame(t)
        h, w, _ = frame.shape
        # Zoom factor goes from 1.0 to 1.0 + zoom_ratio over the clip duration
        factor = 1.0 + zoom_ratio * (t / max(clip.duration, 0.1))
        
        new_w, new_h = int(w / factor), int(h / factor)
        x1, y1 = (w - new_w) // 2, (h - new_h) // 2
        
        cropped = frame[y1:y1+new_h, x1:x1+new_w]
        
        from PIL import Image
        # Handle different versions of Pillow for Resampling enum
        try:
            resample_filter = Image.Resampling.LANCZOS
        except AttributeError:
            resample_filter = Image.LANCZOS
            
        img = Image.fromarray(cropped)
        img = img.resize((w, h), resample_filter)
        return np.array(img)

    return clip.fl(effect)

def create_caption_image(word, width=1080, height=1920):
    """
    Create a caption image using PIL instead of TextClip (more reliable on Windows).
    Returns numpy array of the image with transparent background.
    """
    from PIL import Image, ImageDraw, ImageFont
    
    try:
        # Create transparent image (RGBA)
        img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Try to use Arial font, fallback to default
        try:
            font = ImageFont.truetype("arial.ttf", 90)
        except:
            try:
                font = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", 90)
            except:
                font = ImageFont.load_default()
        
        # Calculate text position (centered at bottom)
        bbox = draw.textbbox((0, 0), word, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (width - text_width) // 2
        y = height - text_height - 100  # Bottom with margin
        
        # Draw text with outline effect
        outline_width = 3
        # Draw black outline
        for adj_x in range(-outline_width, outline_width + 1):
            for adj_y in range(-outline_width, outline_width + 1):
                if adj_x != 0 or adj_y != 0:
                    draw.text((x + adj_x, y + adj_y), word, font=font, fill=(0, 0, 0, 255))
        # Draw yellow text on top
        draw.text((x, y), word, font=font, fill=(255, 255, 0, 255))
        
        return np.array(img)
    except Exception as e:
        print(f"WARNING: Failed to create caption image: {e}", file=sys.stderr)
        return None


def add_captions_with_highlighting(clip, words_data):
    """
    Overlays captions on the video with word-level timing using PIL-based images.
    More reliable than TextClip which requires ImageMagick.
    words_data is expected to be a list of dicts: 
    [{"word": "Hello", "start": 0.0, "end": 0.5}, ...]
    """
    from moviepy.video.VideoClip import ImageClip
    
    clips_to_composite = [clip]
    text_clips_created = 0
    
    for word_info in words_data:
        word = word_info.get("word", "").strip()
        start = word_info.get("start", 0.0)
        end = word_info.get("end", 0.0)
        duration = end - start
        
        if duration <= 0 or not word:
            continue
        
        try:
            # Create caption image using PIL
            caption_img = create_caption_image(word, width=int(clip.w), height=int(clip.h))
            
            if caption_img is not None:
                # Convert PIL image to ImageClip
                txt_clip = ImageClip(caption_img)
                txt_clip = txt_clip.set_duration(duration).set_start(start)
                clips_to_composite.append(txt_clip)
                text_clips_created += 1
            else:
                continue
                
        except Exception as e:
            print(f"WARNING: Failed to add caption for word '{word}': {e}", file=sys.stderr)
            continue
    
    if text_clips_created == 0:
        print("NOTE: No text captions were created (check PIL/Pillow installation).", file=sys.stderr)

    return CompositeVideoClip(clips_to_composite)

def apply_effects(video_path, output_path, transcript_words):
    """
    Main function to apply zoom and captions with word highlighting.
    If effects fail, outputs the raw clip or zoom-only version.
    """
    # Check if moviepy is available when function is called
    if not moviepy_available:
        raise RuntimeError("MoviePy is not installed. Install with: pip install moviepy==1.0.3") from moviepy_error
    
    try:
        clip = VideoFileClip(video_path)
        
        # 1. Apply Zoom-in
        clip_zoomed = add_zoom_effect(clip, zoom_ratio=0.1)
        
        # 2. Add Captions with Word Highlighting (gracefully skips if ImageMagick unavailable)
        try:
            final_clip = add_captions_with_highlighting(clip_zoomed, transcript_words)
        except Exception as e:
            print("WARNING: Caption effects failed, using zoom only: {}".format(e), file=sys.stderr)
            final_clip = clip_zoomed
        
        # 3. Write final output
        fps_to_use = clip.fps if clip.fps and clip.fps > 0 else 24
        try:
            final_clip.write_videofile(
                output_path, 
                codec="libx264", 
                audio_codec="aac",
                fps=fps_to_use,
                threads=4,
                verbose=False,
                logger=None
            )
        except Exception as e:
            print("ERROR: Failed to write video file: {}".format(e), file=sys.stderr)
            raise
        
        # Close clips safely
        try:
            clip.close()
        except:
            pass
        try:
            final_clip.close()
        except:
            pass
            
    except Exception as e:
        print("ERROR: apply_effects failed: {}".format(e), file=sys.stderr)
        raise
    
    return output_path

if __name__ == "__main__":
    pass
