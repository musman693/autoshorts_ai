try:
    from pipeline.scorer import VIRAL_KEYWORDS
except ImportError:
    VIRAL_KEYWORDS = {
        "insane": 2, "crazy": 2, "shocking": 2,
        "unbelievable": 2, "secret": 2, "wait": 1.5,
        "watch": 1.5, "exposed": 2,
        "you won't believe": 3, "mind blown": 3, "breaking": 2.5
    }

def extract_keywords(text):
    text = text.lower()
    found = set()
    for kw in VIRAL_KEYWORDS:
        if kw in text:
            found.add(kw)
    return found

def generate_candidates(scored_data, min_duration=15, max_duration=60):
    candidates = []
    
    # Sort chronologically to build contiguous windows
    chrono_data = sorted(scored_data, key=lambda x: x["start"])
    n = len(chrono_data)
    
    for i in range(n):
        clip_start = chrono_data[i]["start"]
        clip_end_initial = chrono_data[i]["end"]
        
        # Use 'score_normalized' if available, else 'score'
        score_key = "score_normalized" if "score_normalized" in chrono_data[i] else "score"
        total_score = chrono_data[i].get(score_key, 0)
        clip_text = chrono_data[i].get("text", "")
        
        # Check if the single segment alone satisfies the duration requirements
        initial_duration = clip_end_initial - clip_start
        if min_duration <= initial_duration <= max_duration:
            candidates.append({
                "start": clip_start,
                "end": clip_end_initial,
                "score": round(total_score, 3),
                "keywords": extract_keywords(clip_text)
            })
        
        # Expand window
        for j in range(i + 1, n):
            clip_end = chrono_data[j]["end"]
            current_duration = clip_end - clip_start
            
            if current_duration > max_duration:
                break
                
            total_score += chrono_data[j].get(score_key, 0)
            clip_text += " " + chrono_data[j].get("text", "")
            
            if current_duration >= min_duration:
                candidates.append({
                    "start": clip_start,
                    "end": clip_end,
                    "score": round(total_score, 3),
                    "keywords": extract_keywords(clip_text)
                })
                
    return candidates

def is_overlapping(clip, selected_clips):
    for sc in selected_clips:
        # Overlap condition: start1 < end2 and start2 < end1
        if clip["start"] < sc["end"] and sc["start"] < clip["end"]:
            return True
    return False

def apply_repetition_penalty(candidates, used_keywords, penalty_factor=0.5):
    """
    Penalize candidates that contain keywords already used in previously selected clips.
    """
    for cand in candidates:
        overlap = cand["keywords"].intersection(used_keywords)
        if overlap:
            # Apply a penalty multiplier for each repeated keyword
            cand["penalized_score"] = cand["score"] * (penalty_factor ** len(overlap))
        else:
            cand["penalized_score"] = cand["score"]

def select_best_clips(scored_data, min_duration=15, max_duration=60, max_clips=3):
    """
    Select best clips from scored data.
    - Picks highest scoring segments (windows).
    - Avoids overlapping clips.
    - Controls duration (15-60 seconds).
    - Penalizes repeated keywords across clips.
    """
    if not scored_data:
        return []
        
    candidates = generate_candidates(scored_data, min_duration, max_duration)
    
    # If no candidates meet min_duration, log warning but don't force short clips
    if not candidates:
        import sys
        chrono_data = sorted(scored_data, key=lambda x: x["start"])
        total_dur = chrono_data[-1]["end"] - chrono_data[0]["start"]
        print(f"WARNING: No clips found meeting duration constraints (min={min_duration}s, max={max_duration}s)", file=sys.stderr)
        print(f"         Total video duration: {total_dur:.1f}s", file=sys.stderr)
        print(f"         Consider: uploading a longer video or adjusting duration constraints", file=sys.stderr)
        return []

    selected_clips = []
    used_keywords = set()
    
    while len(selected_clips) < max_clips and candidates:
        apply_repetition_penalty(candidates, used_keywords)
        
        # Sort candidates by penalized_score descending
        candidates.sort(key=lambda x: x["penalized_score"], reverse=True)
        
        best_cand = None
        for cand in candidates:
            if not is_overlapping(cand, selected_clips):
                best_cand = cand
                break
                
        if not best_cand:
            break
            
        selected_clips.append(best_cand)
        used_keywords.update(best_cand["keywords"])
        
        # Remove candidates that overlap with the newly selected clip
        candidates = [c for c in candidates if not is_overlapping(c, selected_clips)]
        
    # Clean up internal tracking keys
    for sc in selected_clips:
        if "penalized_score" in sc:
            del sc["penalized_score"]
        if "keywords" in sc:
            del sc["keywords"]
            
    # Return selected clips sorted chronologically
    selected_clips.sort(key=lambda x: x["start"])
    return selected_clips


