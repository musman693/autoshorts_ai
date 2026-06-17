from pipeline.scorer import load_transcript, score_transcript

data = load_transcript("test.json")

result = score_transcript(data)

for r in result:
    print(r)