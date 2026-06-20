"""
Transcriber module for AutoShorts AI
Converts video audio to text using OpenAI's Whisper
"""

import os
import json
import sys


def transcribe_video(video_path, model_size="base"):
    """
    Transcribe video audio using Whisper.
    
    Args:
        video_path: Path to video file
        model_size: "tiny", "small", "base", "medium", "large"
                   (larger = more accurate but slower)
    
    Returns:
        dict: {"words": [{"word": str, "start": float, "end": float}, ...]}
    """
    try:
        import whisper
    except ImportError:
        print("ERROR: whisper not installed", file=sys.stderr)
        print("Install with: pip install openai-whisper", file=sys.stderr)
        return {"words": []}
    
    try:
        print(f"Loading Whisper {model_size} model...", file=sys.stderr)
        model = whisper.load_model(model_size)
        
        print(f"Transcribing {video_path}...", file=sys.stderr)
        result = model.transcribe(video_path, language="en", verbose=False)
        
        # Convert Whisper output to transcript.json format
        transcript = {"words": []}
        
        for segment in result.get("segments", []):
            text = segment.get("text", "").strip()
            if not text:
                continue
            
            # Split by words and estimate timing
            words = text.split()
            segment_start = segment.get("start", 0)
            segment_end = segment.get("end", 0)
            segment_duration = segment_end - segment_start
            
            if segment_duration <= 0:
                segment_duration = len(words) * 0.3  # Fallback: ~300ms per word
            
            # Distribute segment time across words
            time_per_word = segment_duration / len(words) if words else 0
            
            for i, word in enumerate(words):
                word_start = segment_start + (i * time_per_word)
                word_end = word_start + time_per_word
                
                transcript["words"].append({
                    "word": word,
                    "start": round(word_start, 2),
                    "end": round(word_end, 2)
                })
        
        print(f"Transcription complete: {len(transcript['words'])} words", file=sys.stderr)
        return transcript
        
    except Exception as e:
        print(f"ERROR: Transcription failed - {e}", file=sys.stderr)
        return {"words": []}


def save_transcript(transcript, output_path):
    """Save transcript to JSON file"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(transcript, f, indent=2)
    print(f"Transcript saved to {output_path}", file=sys.stderr)


def load_transcript(path):
    """Load transcript from JSON file"""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_synthetic_transcript(duration_seconds=105, num_clips=3, clip_duration=15):
    """
    Generate a synthetic transcript for testing/fallback when Whisper unavailable.
    Automatically creates enough content for the requested clips.
    
    Args:
        duration_seconds: Total transcript duration (default 105s)
        num_clips: Number of clips requested (optional, for auto-sizing)
        clip_duration: Duration per clip in seconds (optional, for auto-sizing)
    
    Returns:
        dict: {"words": [{"word": str, "start": float, "end": float}, ...]}
    """
    # Auto-calculate duration if num_clips and clip_duration provided
    if num_clips and clip_duration:
        required_duration = num_clips * clip_duration + 10  # Add 10s buffer
        duration_seconds = max(duration_seconds, required_duration)
    
    # Viral hooks - strategically placed throughout
    hooks = [
        ("this is insane", 2.0),
        ("wait you won't believe", 2.5),
        ("shocking breakthrough", 2.0),
        ("absolutely unbelievable", 2.0),
        ("secret exposed", 1.8),
        ("mind blown right", 2.0),
        ("crazy transformation", 2.0),
        ("breaking news today", 2.0),
        ("incredible discovery", 2.0),
        ("game changing hack", 2.0),
    ]
    
    # Filler content - varies vocabulary
    filler_phrases = [
        "I discovered something amazing that changed everything",
        "The first step is automation can save you hours every single day",
        "I set up automated workflows and my productivity skyrocketed",
        "Machine learning models adapt and learn constantly",
        "Artificial intelligence can analyze massive data instantly",
        "Teams collaborating in real time across continents eliminated delays",
        "Data visualization patterns become obvious immediately",
        "Interactive dashboards helped my team spot trends",
        "Real time collaboration increased our efficiency significantly",
        "Security encryption protected all sensitive data",
        "These game changing innovations will transform your workflow",
        "Integration across platforms became seamless and efficient",
        "Advanced algorithms handle complex tasks automatically",
        "Predictive analytics increased our revenue substantially",
        "Customer behavior analysis improved our targeting accuracy",
        "Real time updates keep everyone synchronized perfectly",
        "System optimization reduced processing time dramatically",
        "Performance metrics showed consistent improvement daily",
        "Strategic implementation delivered measurable results",
        "Continuous learning improved outcomes exponentially",
    ]
    
    words = []
    current_time = 0.0
    hook_index = 0
    phrase_index = 0
    word_count = 0
    target_word_count = int(duration_seconds * 2.5)  # ~2.5 words per second
    
    while word_count < target_word_count and current_time < duration_seconds:
        # Add hook every 15-20 seconds
        if hook_index < len(hooks) and (len(words) == 0 or word_count % 40 < 5):
            hook_text, hook_duration = hooks[hook_index]
            hook_words = hook_text.split()
            time_per_word = hook_duration / len(hook_words)
            
            for w in hook_words:
                words.append({
                    "word": w,
                    "start": round(current_time, 2),
                    "end": round(current_time + time_per_word, 2)
                })
                current_time += time_per_word
                word_count += 1
            
            # Add pause after hook
            current_time += 0.3
            hook_index = (hook_index + 1) % len(hooks)
        else:
            # Add filler content
            phrase = filler_phrases[phrase_index % len(filler_phrases)]
            phrase_words = phrase.split()
            phrase_duration = 3.0 + (len(phrase_words) * 0.15)
            time_per_word = phrase_duration / len(phrase_words)
            
            for w in phrase_words:
                words.append({
                    "word": w,
                    "start": round(current_time, 2),
                    "end": round(current_time + time_per_word, 2)
                })
                current_time += time_per_word
                word_count += 1
            
            current_time += 0.2
            phrase_index += 1
    
    return {"words": words}


if __name__ == "__main__":
    # Test usage
    if len(sys.argv) > 1:
        video_file = sys.argv[1]
        model = sys.argv[2] if len(sys.argv) > 2 else "base"
        
        print(f"Transcribing: {video_file}")
        transcript = transcribe_video(video_file, model)
        
        # Save to transcript.json
        output_path = os.path.join(os.path.dirname(video_file), "transcript.json")
        save_transcript(transcript, output_path)
    else:
        print("Usage: python transcriber.py <video_file> [model_size]")
        print("Model sizes: tiny, small, base, medium, large")
