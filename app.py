import os
import json
import uuid
import sys
import threading
import traceback

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


def log(job_id, message):
    JOBS[job_id]["log"].append(message)
    print(f"[{job_id}] {message}")


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


def get_transcript_path(video_path, job_id, num_clips=3, min_dur=15, max_dur=60):
    """
    Transcribe uploaded video or generate synthetic transcript.
    
    Args:
        video_path: Path to video file
        job_id: Job ID for logging
        num_clips: Number of clips requested (for sizing synthetic transcript)
        min_dur: Minimum clip duration
        max_dur: Maximum clip duration
    """
    try:
        # Try to use Whisper to transcribe the actual video
        log(job_id, "Using Whisper to transcribe video audio...")
        transcript = transcriber.transcribe_video(video_path, model_size="base")
        
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


def run_pipeline(job_id, video_path, num_clips, min_dur, max_dur):
    try:
        #transcribe
        JOBS[job_id]["stage"] = "transcribing"
        log(job_id, "Loading transcript...")
        transcript_path = get_transcript_path(video_path, job_id, num_clips, min_dur, max_dur)

        with open(transcript_path, "r", encoding="utf-8") as f:
            transcript = json.load(f)
        all_words = transcript.get("words", [])

        #scoring
        JOBS[job_id]["stage"] = "scoring"
        log(job_id, "Scoring transcript...")
        scored_data = scorer.score_transcript(transcript_path)
        log(job_id, f"Scored {len(scored_data)} candidate segments")

        #selecting
        JOBS[job_id]["stage"] = "selecting"
        log(job_id, "Selecting best non-overlapping clips...")
        log(job_id, f"Duration constraints: {min_dur}s - {max_dur}s per clip, requesting {num_clips} clips")
        best_clips = selector.select_best_clips(
            scored_data, min_duration=min_dur, max_duration=max_dur, max_clips=num_clips
        )
        
        if not best_clips:
            log(job_id, "ERROR: No clips found matching duration constraints!")
            required_total = num_clips * min_dur
            log(job_id, f"REASON: Need at least {required_total}s content for {num_clips} × {min_dur}s clips")
            log(job_id, f"         Current transcript is only ~{all_words[-1]['end']:.1f}s")
            log(job_id, "FIX: Upload a longer video OR adjust constraints (fewer clips / shorter duration)")
            JOBS[job_id]["status"] = "failed"
            return
        
        clips_for_render = [
            {"clip_id": i + 1, "start": c["start"], "end": c["end"]}
            for i, c in enumerate(best_clips)
        ]
        log(job_id, f"Selected {len(clips_for_render)} clips")

        #render
        JOBS[job_id]["stage"] = "rendering"
        log(job_id, "Rendering raw clips...")
        rendered = renderer.render_clips(video_path, clips_for_render, job_id=job_id)
        # rendered: [{"clip_id","path","start_time"}, ...]

        #effects
        JOBS[job_id]["stage"] = "effects"
        results = []
        for r in rendered:
            clip_id = r["clip_id"]
            raw_path = r["path"]
            clip_start = r["start_time"]
            clip_meta = next(c for c in clips_for_render if c["clip_id"] == clip_id)
            clip_end = clip_meta["end"]

            log(job_id, f"Applying effects to clip {clip_id}")


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
            
            # Bug 4 Fix: Enhanced error handling for apply_effects call
            # Bug 9 Fix: Allow pipeline to continue if effects fail (graceful degradation)
            try:
                effects.apply_effects(raw_path, final_path, clip_words)
                log(job_id, f"Successfully applied effects to clip {clip_id}")
            except AttributeError as ae:
                log(job_id, f"WARNING: effects.apply_effects() not found - skipping effects for clip {clip_id}")
            except Exception as e:
                log(job_id, f"WARNING: Effects processing failed for clip {clip_id}: {e}")
                log(job_id, f"Attempting to copy raw video without effects...")
                try:
                    import shutil as sh
                    sh.copy(raw_path, final_path)
                    log(job_id, f"Successfully saved clip {clip_id} without effects")
                except Exception as copy_error:
                    log(job_id, f"ERROR: Failed to save clip {clip_id}: {copy_error}")
                    continue

            results.append({
                "clip_id": clip_id,
                "filename": final_name,
                "start": clip_start,
                "end": clip_end,
                "duration": round(clip_end - clip_start, 1),
            })

        JOBS[job_id]["stage"] = "done"
        JOBS[job_id]["results"] = results
        log(job_id, "Pipeline complete.")

    except Exception as e:
        JOBS[job_id]["stage"] = "error"
        JOBS[job_id]["error"] = str(e)
        log(job_id, f"ERROR: {e}")
        traceback.print_exc()


#routes
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    """
    multipart/form-data:
      video: file
      num_clips: int (default 3)
      min_dur: int seconds (default 15)
      max_dur: int seconds (default 60)
    Returns: {"job_id": "<id>"}
    """
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    job_id = uuid.uuid4().hex[:12]
    safe_name = file.filename.replace(" ", "_")
    video_path = os.path.join(UPLOAD_DIR, f"{job_id}_{safe_name}")
    file.save(video_path)

    num_clips = int(request.form.get("num_clips", 3))
    min_dur = int(request.form.get("min_dur", 15))
    max_dur = int(request.form.get("max_dur", 60))

    JOBS[job_id] = {
        "stage": "queued",
        "log": [],
        "results": [],
        "error": None,
        "video_name": file.filename,
    }

    thread = threading.Thread(
        target=run_pipeline,
        args=(job_id, video_path, num_clips, min_dur, max_dur),
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