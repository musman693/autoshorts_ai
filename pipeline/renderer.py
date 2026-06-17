# BE-3: moviepy + ffmpeg render
import json
import os
import shutil
import subprocess
import imageio_ffmpeg
import os
import subprocess

def get_ffmpeg_executable():
ffmpeg_path = os.getenv("FFMPEG_PATH")
if ffmpeg_path:
if os.path.isfile(ffmpeg_path):
return ffmpeg_path
else:
raise RuntimeError(f"FFMPEG_PATH is set but the file does not exist: {ffmpeg_path}")

system_ffmpeg = shutil.which("ffmpeg")
if system_ffmpeg:
return system_ffmpeg

try:
return imageio_ffmpeg.get_ffmpeg_exe()
except Exception as exc:
raise RuntimeError(
"ffmpeg not found. Install ffmpeg and add it to PATH, or set FFMPEG_PATH to the ffmpeg executable."
) from exc

def get_autoshorts_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def render_clips(video_path: str, clips: list, job_id: str = "default_job") -> list:
    """
    Render short vertical clips from a source video.

    Args:
        video_path (str): Path to source video.
        clips (list): List of clip dictionaries containing:
                      {
                          "clip_id": int,
                          "start": float,
                          "end": float
                      }
        job_id (str): Prefix for output clip files.

    Returns:
        list[dict]:
        [
            {
                "clip_id": 1,
                "path": "shorts_output/default_job_clip_1.mp4"
            }
        ]
    """

    base_dir = get_autoshorts_root()

    output_dir = os.path.join(base_dir, "shorts_output")
    os.makedirs(output_dir, exist_ok=True)

    rendered_clips = []

    for clip in clips:

        clip_id = clip["clip_id"]
        start_time = clip["start"]
        end_time = clip["end"]

        duration = end_time - start_time

        if duration <= 0:
            raise ValueError(
                f"Invalid clip duration for clip_id={clip_id}"
            )

        output_path = os.path.join(
            output_dir,
            f"{job_id}_clip_{clip_id}.mp4"
        )

        ffmpeg_exe = get_ffmpeg_executable()
        command = [
            ffmpeg_exe,
            "-y",
            "-ss",
            str(start_time),
            "-i",
            video_path,
            "-t",
            str(duration),

            # Convert to vertical Shorts format (9:16)
            "-vf",
            "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",

            "-c:v",
            "libx264",

            "-c:a",
            "aac",

            output_path,
        ]

        print(
            f"Rendering clip {clip_id} "
            f"({start_time}s -> {end_time}s)"
        )

        try:
            subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True,
            )

        except subprocess.CalledProcessError as exc:
            raise RuntimeError(
                f"Failed to render clip {clip_id}\n{exc.stderr}"
            ) from exc

        rendered_clips.append(
            {
                "clip_id": clip_id,
                "path": output_path,
                "start_time": start_time,
            }
        )

    print("All clips rendered successfully.")

    return rendered_clips

if __name__ == "__main__":

    test_video = "test_clip.mp4"   # change to your file name

    sample_clips = [
        {
            "clip_id": 1,
            "start": 5,
            "end": 10,
        },
        {
            "clip_id": 2,
            "start": 15,
            "end": 22,
        },
    ]

    if not os.path.exists(test_video):
        print(f"Video not found: {test_video}")

    else:
        result = render_clips(
            test_video,
            sample_clips
        )

        print("\nOutput:")
        print(result)