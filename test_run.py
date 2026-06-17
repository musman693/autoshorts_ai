from pipeline.scorer import load_transcript, score_transcript
from pipeline.selector import select_best_clips

print("--- 1. Loading Transcript ---")
data = load_transcript("test.json")
print(f"Loaded {len(data)} segments from test.json.\n")

print("--- 2. Scoring Transcript (Member 2) ---")
scored_result = score_transcript(data)
for r in scored_result:
    print(r)
print("\n")

print("--- 3. Selecting Best Clips (Member 3) ---")
clips = select_best_clips(scored_result, min_duration=1, max_duration=30, max_clips=2) 
# Note: min_duration is 1 for testing since test.json might be very short.

if not clips:
    print("No valid clips could be generated (test.json might be too short).")
else:
    for c in clips:
        print(f"Clip selected from {c['start']}s to {c['end']}s with score: {c['score']}")