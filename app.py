import os
import json
import uuid
import threading
import traceback

from flask import Flask, request, render_template, jsonify, send_from_directory

from pipeline import scorer, selector, render as renderer, effect as effects

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


#hardcoded the transcription.json 
#opinion: update the transciber.py to produce real-time transcription.json file per upload
TRANSCRIPT_PATH = os.path.join(BASE_DIR, "pipeline", "transcript.json")


def get_transcript_path(video_path, job_id):
    if not os.path.exists(TRANSCRIPT_PATH):
        raise FileNotFoundError(f"transcript.json not found at {TRANSCRIPT_PATH}")
    return TRANSCRIPT_PATH


def run_pipeline(job_id, video_path, num_clips, min_dur, max_dur):
    try:
        #transcribe
        JOBS[job_id]["stage"] = "transcribing"
        log(job_id, "Loading transcript...")
        transcript_path = get_transcript_path(video_path, job_id)

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
        best_clips = selector.select_best_clips(
            scored_data, min_duration=min_dur, max_duration=max_dur, max_clips=num_clips
        )
        
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
            effects.apply_effects(raw_path, final_path, clip_words)

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