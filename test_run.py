from pipeline.scorer import load_transcript, score_transcript
from pipeline.selector import select_best_clips

print("--- 1. Loading Transcript ---")
# Bug Fix: Use correct transcript path (pipeline/transcript.json instead of test.json)
transcript_path = "pipeline/transcript.json"
data = load_transcript(transcript_path)
print(f"Loaded {len(data['words'])} words from {transcript_path}.\n")

print("--- 2. Scoring Transcript (Member 2) ---")
# Bug Fix: score_transcript expects a file path, not the loaded data
scored_result = score_transcript(transcript_path)
for r in scored_result:
    print(r)
print("\n")

print("--- 3. Selecting Best Clips (Member 3) ---")
clips = select_best_clips(scored_result, min_duration=1, max_duration=30, max_clips=2) 
# Note: min_duration is 1 for testing since transcript might be very short.

if not clips:
    print("No valid clips could be generated (transcript might be too short).")
else:
    for c in clips:
        print(f"Clip selected from {c['start']}s to {c['end']}s with score: {c['score']}")