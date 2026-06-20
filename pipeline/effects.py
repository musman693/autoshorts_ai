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

def add_captions_with_highlighting(clip, words_data):
    """
    Overlays captions on the video with word highlighting.
    words_data is expected to be a list of dicts: 
    [{"word": "Hello", "start": 0.0, "end": 0.5}, ...]
    
    If TextClip fails (e.g., ImageMagick missing), returns the clip with zoom only.
    """
    clips_to_composite = [clip]
    text_clips_created = 0
    skipped_clips = 0

    for word_info in words_data:
        word = word_info.get("word", "").strip()
        start = word_info.get("start", 0.0)
        end = word_info.get("end", 0.0)
        duration = end - start
        
        if duration <= 0 or not word:
            continue

        try:
            # Bug 6 Fix: Handle ImageMagick issues on Windows with better error handling
            txt_clip = TextClip(
                word, 
                fontsize=90, 
                color='yellow', 
                font='Arial-Bold', 
                stroke_color='black', 
                stroke_width=3
            )
            text_clips_created += 1
        except Exception as e:
            # Fallback 1: Try without advanced font options
            try:
                txt_clip = TextClip(
                    word, 
                    fontsize=90, 
                    color='yellow',
                    method='caption'
                )
                text_clips_created += 1
            except Exception as fallback_error:
                # Fallback 2: Try basic text clip
                try:
                    txt_clip = TextClip(
                        word, 
                        fontsize=90, 
                        color='yellow'
                    )
                    text_clips_created += 1
                except Exception as final_error:
                    # If all fallbacks fail, skip this text clip but continue processing
                    skipped_clips += 1
                    if skipped_clips == 1:
                        # Print warning only once
                        print("WARNING: TextClip creation failed (ImageMagick may not be installed).", file=sys.stderr)
                        print("         Continuing with video processing (captions will be skipped).", file=sys.stderr)
                    continue

        try:
            txt_clip = txt_clip.set_position(('center', 'center'))
            txt_clip = txt_clip.set_start(start).set_duration(duration)
            
            # Simple pop-in animation: scale up slightly
            txt_clip = txt_clip.resize(lambda t: min(1.2, 1.0 + 2.0 * t))

            clips_to_composite.append(txt_clip)
        except Exception as e:
            print("WARNING: Failed to position/animate text clip. Skipping.", file=sys.stderr)
            continue

    if text_clips_created == 0 and skipped_clips > 0:
        print("NOTE: No text captions were added to the video.", file=sys.stderr)

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
