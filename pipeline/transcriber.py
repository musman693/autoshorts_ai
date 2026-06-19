import json
import re


VIRAL_KEYWORDS = {
    "insane": 2, "crazy": 2, "shocking": 2,
    "unbelievable": 2, "secret": 2, "wait": 1.5,
    "watch": 1.5, "exposed": 2,
    "you won't believe": 3, "mind blown": 3, "breaking": 2.5
}

WEIGHTS = {
    "keyword": 1.2,
    "energy": 0.8,
    "pause": 0.7
}

WINDOW_SIZE = 3
TOP_K = 5
MERGE_GAP = 0.3


def load_transcript(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_windows(words):
    if len(words) < WINDOW_SIZE:
        return []

    windows = []
    for i in range(len(words) - WINDOW_SIZE + 1):
        chunk = words[i:i + WINDOW_SIZE]

        text = " ".join(w["word"] for w in chunk)
        start = chunk[0]["start"]
        end = chunk[-1]["end"]

        windows.append({
            "text": text,
            "start": start,
            "end": end
        })

    return windows


def keyword_score(text):
    text_lower = text.lower()
    score = 0

    for word, weight in VIRAL_KEYWORDS.items():
        if re.search(rf"\b{re.escape(word)}\b", text_lower):
            score += weight

    return score


def energy_score(text):
    score = 0

    if text.isupper() and len(text) > 3:
        score += 2

    score += text.count("!") * 1.2
    score += text.count("?") * 1.0

    return score


def pause_score(prev_end, start):
    if prev_end is None:
        return 0

    gap = start - prev_end

    if gap > 2.0:
        return 2
    elif gap > 1.2:
        return 1

    return 0


def compute_score(text, prev_end, start):
    score = 0
    score += keyword_score(text) * WEIGHTS["keyword"]
    score += energy_score(text) * WEIGHTS["energy"]
    score += pause_score(prev_end, start) * WEIGHTS["pause"]
    return round(score, 3)


def normalize(results):
    if not results:
        return results

    max_score = max(r["score"] for r in results)
    if max_score == 0:
        return results

    for r in results:
        r["score_normalized"] = round(r["score"] / max_score, 3)

    return results


def merge_clips(clips):
    if not clips:
        return clips

    clips = sorted(clips, key=lambda x: x["start"])
    merged = [clips[0]]

    for c in clips[1:]:
        last = merged[-1]

        if c["start"] <= last["end"] + MERGE_GAP:
            last["end"] = max(last["end"], c["end"])
            last["score"] = max(last["score"], c["score"])
            last["text"] = last["text"] + " " + c["text"]
        else:
            merged.append(c)

    return merged


def score_transcript(transcript_path):
    transcript = load_transcript(transcript_path)
    words = transcript["words"]

    windows = build_windows(words)

    results = []
    prev_end = None

    for w in windows:
        score = compute_score(w["text"], prev_end, w["start"])

        results.append({
            "text": w["text"],
            "start": w["start"],
            "end": w["end"],
            "score": score
        })

        prev_end = w["end"]

    results = sorted(results, key=lambda x: x["score"], reverse=True)
    top = results[:TOP_K]

    merged = merge_clips(top)
    return normalize(merged)


if __name__ == "__main__":
    results = score_transcript("transcript.json")
    print(results)