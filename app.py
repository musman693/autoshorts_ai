import os
import json
import uuid
import sys
import threading
import traceback
import yt_dlp
import time
from datetime import datetime

from flask import Flask, request, render_template, jsonify, send_from_directory

# Bug 3 Fix: Import 'effects' module (plural), not 'effect' (singular)
# Bug 8 Fix: Import 'renderer' module (not 'render') - the file is named renderer.py
from pipeline import scorer, selector, renderer, effects, transcriber

# Bug 4 Fix: Verify that required functions exist to catch issues early
try:
    if not hasattr(effects, 'apply_effects'):
        raise AttributeError("effects module missing 'apply_effects' function")
except AttributeError as e:
    raise RuntimeError(f"Critical: effects module validation failed - {e}. Check that effects.py contains apply_effects() function.")

#relative paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "shorts_output")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024  # 1 GB

JOBS = {}
TRANSCRIPT_CACHE = {}  # Cache for transcripts to avoid re-processing


def log(job_id, message):
    JOBS[job_id]["log"].append(message)
    print(f"[{job_id}] {message}")


# Performance timing helper
def time_stage(stage_name):
    """Simple timing context for tracking pipeline performance"""
    class TimingContext:
        def __init__(self, name):
            self.name = name
            self.start = None
        
        def __enter__(self):
            self.start = time.time()
            return self
        
        def __exit__(self, *args):
            elapsed = time.time() - self.start
            return f"{self.name} took {elapsed:.1f}s"
    
    return TimingContext(stage_name)


#transcription from the uploaded video using Whisper
# Falls back to sample transcript if Whisper not installed
TRANSCRIPT_PATH = os.path.join(BASE_DIR, "pipeline", "transcript.json")


def get_video_duration(video_path):
    """
    Get video duration in seconds.
    """
    try:
        import subprocess
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", 
             "-of", "default=noprint_wrappers=1:nokey=1:noprint_wrappers=1", video_path],
            capture_output=True, text=True, timeout=10
        )
        if result.stdout:
            return float(result.stdout.strip())
    except Exception as e:
        print(f"Could not get video duration: {e}", file=sys.stderr)
    
    return None


def get_transcript_path(video_path, job_id, num_clips=3, min_dur=15, max_dur=60, whisper_model="base"):
    """
    Transcribe uploaded video or generate synthetic transcript.
    
    Args:
        video_path: Path to video file
        job_id: Job ID for logging
        num_clips: Number of clips requested (for sizing synthetic transcript)
        min_dur: Minimum clip duration
        max_dur: Maximum clip duration
        whisper_model: Whisper model size (tiny, base, small, medium, large)
    """
    try:
        # Try to use Whisper to transcribe the actual video
        log(job_id, f"Using Whisper (model: {whisper_model}) to transcribe video audio...")
        transcript = transcriber.transcribe_video(video_path, model_size=whisper_model)
        
        if not transcript.get("words"):
            log(job_id, "WARNING: Whisper transcription failed or returned no words")
            log(job_id, "Generating synthetic transcript based on requirements...")
            
            # Calculate required duration and generate synthetic transcript
            required_duration = num_clips * max_dur + 20
            transcript = transcriber.generate_synthetic_transcript(
                duration_seconds=required_duration,
                num_clips=num_clips,
                clip_duration=max_dur
            )
            
            # Save synthetic transcript
            transcript_path = os.path.join(BASE_DIR, "transcripts", f"{job_id}_transcript.json")
            transcriber.save_transcript(transcript, transcript_path)
            log(job_id, f"Generated synthetic transcript: {len(transcript['words'])} words, "
                f"~{transcript['words'][-1]['end']:.1f}s duration")
            
            return transcript_path
        
        # Save real transcribed data to temp file
        transcript_path = os.path.join(BASE_DIR, "transcripts", f"{job_id}_transcript.json")
        transcriber.save_transcript(transcript, transcript_path)
        log(job_id, f"Successfully transcribed: {len(transcript['words'])} words, "
            f"~{transcript['words'][-1]['end']:.1f}s duration")
        
        return transcript_path
        
    except Exception as e:
        log(job_id, f"WARNING: Transcription attempt failed ({e})")
        log(job_id, "Generating synthetic transcript based on requirements...")
        
        try:
            # Calculate required duration based on user requirements
            required_duration = num_clips * max_dur + 20
            transcript = transcriber.generate_synthetic_transcript(
                duration_seconds=required_duration,
                num_clips=num_clips,
                clip_duration=max_dur
            )
            
            # Save synthetic transcript
            transcript_path = os.path.join(BASE_DIR, "transcripts", f"{job_id}_transcript.json")
            transcriber.save_transcript(transcript, transcript_path)
            log(job_id, f"Generated synthetic transcript: {len(transcript['words'])} words, "
                f"~{transcript['words'][-1]['end']:.1f}s duration")
            log(job_id, "NOTE: For real transcription, install: pip install openai-whisper")
            
            return transcript_path
        except Exception as gen_error:
            log(job_id, f"ERROR: Failed to generate transcript ({gen_error})")
            raise RuntimeError(f"Could not generate transcript: {gen_error}")


def run_pipeline(job_id, video_path, num_clips, min_dur, max_dur, whisper_model="base", optimize_speed=True):
    try:
        pipeline_start = time.time()
        quality_mode = "Speed Optimized" if optimize_speed else "Quality Mode"
        log(job_id, f"🚀 Pipeline started with: {num_clips} clips, {min_dur}-{max_dur}s duration, {whisper_model} model, {quality_mode}")
        
        #transcribe
        JOBS[job_id]["stage"] = "transcribing"
        log(job_id, "🗣️ Transcribing audio...")
        transcribe_start = time.time()
        
        # Use job_id as transcript cache key to ensure each job has its own transcript
        # This prevents transcript from previous jobs being reused for current job
        if job_id in TRANSCRIPT_CACHE:
            log(job_id, "📦 Using cached transcript from previous run...")
            transcript_path = TRANSCRIPT_CACHE[job_id]
            transcribe_time = time.time() - transcribe_start
            log(job_id, f"✅ Transcription complete from cache ({transcribe_time:.1f}s)")
        else:
            log(job_id, f"🎤 Generating new transcript for this job (Whisper model: {whisper_model})...")
            transcript_path = get_transcript_path(video_path, job_id, num_clips, min_dur, max_dur, whisper_model)
            TRANSCRIPT_CACHE[job_id] = transcript_path
            transcribe_time = time.time() - transcribe_start
            log(job_id, f"✅ Transcription complete ({transcribe_time:.1f}s)")

        with open(transcript_path, "r", encoding="utf-8") as f:
            transcript = json.load(f)
        
        # Store transcript in JOBS for frontend display
        JOBS[job_id]["transcript"] = transcript
        
        all_words = transcript.get("words", [])

        #scoring
        JOBS[job_id]["stage"] = "scoring"
        log(job_id, "⭐ Scoring transcript segments...")
        scoring_start = time.time()
        scored_data = scorer.score_transcript(transcript_path)
        scoring_time = time.time() - scoring_start
        log(job_id, f"✅ Scored {len(scored_data)} segments ({scoring_time:.1f}s)")

        #selecting
        JOBS[job_id]["stage"] = "selecting"
        log(job_id, "✂️ Selecting best clips...")
        selecting_start = time.time()
        log(job_id, f"   Constraints: {min_dur}s - {max_dur}s per clip, max {num_clips} clips")
        best_clips = selector.select_best_clips(
            scored_data, min_duration=min_dur, max_duration=max_dur, max_clips=num_clips
        )
        selecting_time = time.time() - selecting_start
        
        if not best_clips:
            log(job_id, "❌ ERROR: No clips found matching duration constraints!")
            required_total = num_clips * min_dur
            log(job_id, f"   Need at least {required_total}s for {num_clips} × {min_dur}s clips")
            log(job_id, f"   Current video is only ~{all_words[-1]['end']:.1f}s")
            log(job_id, "   💡 Try: fewer clips, shorter duration, or longer video")
            JOBS[job_id]["status"] = "failed"
            return
        
        clips_for_render = [
            {"clip_id": i + 1, "start": c["start"], "end": c["end"]}
            for i, c in enumerate(best_clips)
        ]
        log(job_id, f"✅ Selected {len(clips_for_render)} clips ({selecting_time:.1f}s)")

        #render
        JOBS[job_id]["stage"] = "rendering"
        log(job_id, "🎬 Rendering clips (optimized parallel mode)...") 
        render_start = time.time()
        # Use 720p rendering for speed optimization, 1080p for quality
        target_res = 720 if optimize_speed else 1080
        rendered = renderer.render_clips(video_path, clips_for_render, job_id=job_id, target_width=target_res)
        render_time = time.time() - render_start
        # rendered: [{"clip_id","path","start_time"}, ...]
        log(job_id, f"✅ Rendered {len(rendered)} clips ({render_time:.1f}s)")

        #effects - parallel processing
        JOBS[job_id]["stage"] = "effects"
        log(job_id, "✨ Applying effects (parallel processing)...")
        effects_start = time.time()
        results = []
        
        # Process clips in parallel threads for faster effects application
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def process_clip_effects(r, all_words, clips_for_render, OUTPUT_DIR, job_id):
            """Process individual clip effects"""
            try:
                clip_id = r["clip_id"]
                raw_path = r["path"]
                clip_start = r["start_time"]
                clip_meta = next(c for c in clips_for_render if c["clip_id"] == clip_id)
                clip_end = clip_meta["end"]

                # cuts the clip so it starts at t=0 in the new file
                clip_words = [
                    {
                        "word": w["word"],
                        "start": w["start"] - clip_start,
                        "end": w["end"] - clip_start,
                    }
                    for w in all_words
                    if w["start"] >= clip_start and w["end"] <= clip_end
                ]

                final_name = f"{job_id}_clip_{clip_id}_final.mp4"
                final_path = os.path.join(OUTPUT_DIR, final_name)
                
                try:
                    effects.apply_effects(raw_path, final_path, clip_words)
                    log(job_id, f"   ✅ Clip {clip_id} complete")
                except Exception as e:
                    log(job_id, f"   ⚠️  Effects failed for clip {clip_id}, copying raw...")
                    try:
                        import shutil as sh
                        sh.copy(raw_path, final_path)
                        log(job_id, f"   ✅ Clip {clip_id} saved without effects")
                    except Exception as copy_error:
                        log(job_id, f"   ❌ Failed to save clip {clip_id}: {copy_error}")
                        return None

                return {
                    "clip_id": clip_id,
                    "filename": final_name,
                    "start": clip_start,
                    "end": clip_end,
                    "duration": round(clip_end - clip_start, 1),
                }
            except Exception as e:
                log(job_id, f"❌ Error processing clip: {e}")
                return None
        
        # Use up to 4 parallel threads for effects processing
        with ThreadPoolExecutor(max_workers=min(4, len(rendered))) as executor:
            futures = [executor.submit(process_clip_effects, r, all_words, clips_for_render, OUTPUT_DIR, job_id) for r in rendered]
            for future in as_completed(futures):
                result = future.result()
                if result:
                    results.append(result)

        effects_time = time.time() - effects_start
        log(job_id, f"✅ Effects complete ({effects_time:.1f}s)")

        JOBS[job_id]["stage"] = "done"
        JOBS[job_id]["results"] = results
        
        total_time = time.time() - pipeline_start
        
        # Format total time for display
        minutes = int(total_time // 60)
        seconds = int(total_time % 60)
        duration_str = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"
        JOBS[job_id]["pipeline_duration"] = duration_str
        
        log(job_id, f"🎉 Pipeline complete!")
        log(job_id, f"⏱️  Total time: {duration_str} ({total_time:.1f}s)")
        log(job_id, f"   Breakdown:")
        log(job_id, f"   - Transcription: {transcribe_time:.1f}s ({transcribe_time/total_time*100:.0f}%)")
        log(job_id, f"   - Scoring: {scoring_time:.1f}s ({scoring_time/total_time*100:.0f}%)")
        log(job_id, f"   - Selection: {selecting_time:.1f}s ({selecting_time/total_time*100:.0f}%)")
        log(job_id, f"   - Rendering: {render_time:.1f}s ({render_time/total_time*100:.0f}%)")
        log(job_id, f"   - Effects: {effects_time:.1f}s ({effects_time/total_time*100:.0f}%)")

    except Exception as e:
        JOBS[job_id]["stage"] = "error"
        JOBS[job_id]["error"] = str(e)
        log(job_id, f"❌ ERROR: {e}")
        traceback.print_exc()


#routes
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    """
    multipart/form-data:
      Either:
        video: file (local file upload)
      Or:
        youtube_url: str (YouTube URL)
      Plus:
        num_clips: int (default 3)
        min_dur: int seconds (default 15)
        max_dur: int seconds (default 60)
        whisper_model: str (default "base") - tiny, base, small, medium, large
    Returns: {"job_id": "<id>"}
    """
    job_id = uuid.uuid4().hex[:12]
    num_clips = int(request.form.get("num_clips", 2))
    min_dur = int(request.form.get("min_dur", 15))
    max_dur = int(request.form.get("max_dur", 45))
    whisper_model = request.form.get("whisper_model", "tiny")  # Default to tiny for speed
    optimize_speed = request.form.get("optimize_speed", "on") == "on"
    
    # Initialize job
    JOBS[job_id] = {
        "stage": "queued",
        "log": [],
        "results": [],
        "error": None,
        "video_name": None,
        "transcript": None,
        "pipeline_duration": None,
    }
    
    # Handle YouTube URL or file upload
    youtube_url = request.form.get("youtube_url", "").strip()
    
    if youtube_url:
        # YouTube URL mode
        try:
            print(f"[DEBUG] YouTube mode: URL={youtube_url}")
            JOBS[job_id]["log"].append(f"📥 Downloading from YouTube: {youtube_url}")
            
            # Configure yt-dlp
            ydl_opts = {
                'format': 'best[ext=mp4]/best',
                'quiet': False,  # Show more output for debugging
                'no_warnings': False,
                'outtmpl': os.path.join(UPLOAD_DIR, f"{job_id}_%(title)s.%(ext)s"),
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                print(f"[DEBUG] Extracting video info from: {youtube_url}")
                info = ydl.extract_info(youtube_url, download=True)
                video_filename = ydl.prepare_filename(info)
                video_path = video_filename
                print(f"[DEBUG] Downloaded to: {video_path}")
                
            JOBS[job_id]["video_name"] = info.get('title', 'YouTube Video')
            JOBS[job_id]["log"].append(f"✅ Downloaded: {JOBS[job_id]['video_name']}")
            print(f"[DEBUG] Video name: {JOBS[job_id]['video_name']}")
            
        except Exception as e:
            error_msg = f"YouTube download failed: {str(e)}"
            print(f"[DEBUG] YouTube error: {error_msg}")
            JOBS[job_id]["error"] = error_msg
            JOBS[job_id]["log"].append(f"❌ Error: {error_msg}")
            return jsonify({"error": JOBS[job_id]["error"]}), 400
    
    elif "video" in request.files:
        # File upload mode
        file = request.files["video"]
        if file.filename == "":
            return jsonify({"error": "Empty filename"}), 400

        safe_name = file.filename.replace(" ", "_")
        video_path = os.path.join(UPLOAD_DIR, f"{job_id}_{safe_name}")
        file.save(video_path)
        JOBS[job_id]["video_name"] = file.filename
        print(f"[DEBUG] File mode: Saved to {video_path}")
        
    else:
        error_msg = "No video file or YouTube URL provided"
        print(f"[DEBUG] Error: {error_msg}")
        print(f"[DEBUG] Form data: youtube_url='{youtube_url}', has_video={'video' in request.files}")
        return jsonify({"error": error_msg}), 400

    # Start pipeline thread
    thread = threading.Thread(
        target=run_pipeline,
        args=(job_id, video_path, num_clips, min_dur, max_dur, whisper_model, optimize_speed),
        daemon=True,
    )
    thread.start()

    return jsonify({"job_id": job_id})


@app.route("/status/<job_id>")
def status(job_id):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)


@app.route("/download/<filename>")
def download(filename):
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=True)


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)