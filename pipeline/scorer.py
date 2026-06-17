import json
import numpy as np
import librosa


VIRAL_KEYWORDS = {
    "insane": 2, "crazy": 2, "shocking": 2,
    "unbelievable": 2, "secret": 2, "wait": 1.5,
    "watch": 1.5, "exposed": 2,
    "you won't believe": 3, "mind blown": 3, "breaking": 2.5
}


WEIGHTS = {
    "keyword": 1.0,
    "energy": 0.8,
    "pause": 0.6,
    "audio": 1.2
}


def load_transcript(path):
    with open(path, "r") as f:
        return json.load(f)


def keyword_score(text):
    text = text.lower()
    score = 0

    for word, weight in VIRAL_KEYWORDS.items():
        if word in text:
            score += weight

    return score


def energy_score(text):
    score = 0

    if text.isupper() and len(text) > 3:
        score += 2

    score += text.count("!") * 1.2
    score += text.count("?") * 1.0

    return score


def pause_score(prev_end, current_start):
    if prev_end is None:
        return 0

    gap = current_start - prev_end

    if gap > 2.0:
        return 2
    elif gap > 1.5:
        return 1
    return 0


def load_audio(audio_path):
    y, sr = librosa.load(audio_path)
    return y, sr


def audio_energy(y, sr, start, end):
    start_sample = int(start * sr)
    end_sample = int(end * sr)

    segment = y[start_sample:end_sample]

    if len(segment) == 0:
        return 0

    return float(np.mean(librosa.feature.rms(y=segment)))


def compute_score(text, prev_end, start, audio_val):
    score = 0

    score += keyword_score(text) * WEIGHTS["keyword"]
    score += energy_score(text) * WEIGHTS["energy"]
    score += pause_score(prev_end, start) * WEIGHTS["pause"]
    score += audio_val * WEIGHTS["audio"]

    return round(score, 3)


def normalize_scores(results):
    if not results:
        return results

    max_score = max(r["score"] for r in results)
    if max_score == 0:
        return results

    for r in results:
        r["score_normalized"] = round(r["score"] / max_score, 3)

    return results


def score_transcript(transcript, audio_path=None):
    results = []
    prev_end = None

    y, sr = (None, None)

    if audio_path:
        y, sr = load_audio(audio_path)

    for item in transcript:
        text = item["text"]
        start = item["start"]
        end = item["end"]

        audio_val = 0
        if y is not None:
            audio_val = audio_energy(y, sr, start, end)

        score = compute_score(text, prev_end, start, audio_val)

        results.append({
            "text": text,
            "start": start,
            "end": end,
            "score": score
        })

        prev_end = end

    results.sort(key=lambda x: x["score"], reverse=True)

    return normalize_scores(results)