# BE-3: zoom, captions, overlays

import os
import numpy as np
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip

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

def add_captions_with_highlighting(clip, words_data):
    """
    Overlays captions on the video with word highlighting.
    words_data is expected to be a list of dicts: 
    [{"word": "Hello", "start": 0.0, "end": 0.5}, ...]
    """
    clips_to_composite = [clip]

    for word_info in words_data:
        word = word_info.get("word", "").strip()
        start = word_info.get("start", 0.0)
        end = word_info.get("end", 0.0)
        duration = end - start
        
        if duration <= 0 or not word:
            continue

        try:
            txt_clip = TextClip(
                word, 
                fontsize=90, 
                color='yellow', 
                font='Arial-Bold', 
                stroke_color='black', 
                stroke_width=3
            )
        except Exception:
            txt_clip = TextClip(
                word, 
                fontsize=90, 
                color='yellow'
            )

        txt_clip = txt_clip.set_position(('center', 'center'))
        txt_clip = txt_clip.set_start(start).set_duration(duration)
        
        # Simple pop-in animation: scale up slightly
        txt_clip = txt_clip.resize(lambda t: min(1.2, 1.0 + 2.0 * t))

        clips_to_composite.append(txt_clip)

    return CompositeVideoClip(clips_to_composite)

def apply_effects(video_path, output_path, transcript_words):
    """
    Main function to apply zoom and captions with word highlighting.
    """
    clip = VideoFileClip(video_path)
    
    # 1. Apply Zoom-in
    clip_zoomed = add_zoom_effect(clip, zoom_ratio=0.1)
    
    # 2. Add Captions with Word Highlighting
    final_clip = add_captions_with_highlighting(clip_zoomed, transcript_words)
    
    # 3. Write final output
    fps_to_use = clip.fps if clip.fps and clip.fps > 0 else 24
    final_clip.write_videofile(
        output_path, 
        codec="libx264", 
        audio_codec="aac",
        fps=fps_to_use,
        threads=4
    )
    
    clip.close()
    final_clip.close()
    
    return output_path

if __name__ == "__main__":
    pass
