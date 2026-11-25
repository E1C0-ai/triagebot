"""Assemble TriageBot demo video: real screenshots + TTS narration + subtitles.

The Rovo segment uses a transcript slide (verbatim live Rovo answers from the
2026-11-26 Jira demo test), because the Mac was locked when the video was cut
and no pixel screenshot could be captured. The slide says so in its footer.
Swap it for a real Rovo screenshot after eico unlocks the Mac.
"""
import subprocess, sys
from pathlib import Path

H = Path("/home/hatch/workspace/competitions/codegeist-2026/triage-agent")
V = H / "video"
NAR = V / "narration"
SHOT = V / "screenshots"
OUT = V / "triagebot-demo.mp4"

def run(cmd, **kw):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print("FAILED:", cmd[:200]); print(r.stdout[-2000:]); print(r.stderr[-2000:])
        sys.exit(1)
    return r

def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return float(r.stdout.strip())

segs = ["seg0-intro", "seg1-what", "seg2-sample", "seg3-stress", "seg4-rovo", "seg5-close"]
for s in segs:
    run(f"ffmpeg -y -v error -i {NAR}/{s}.mp3 -ar 44100 -ac 2 {NAR}/{s}.wav")
d = {s: dur(NAR / f"{s}.wav") for s in segs}
print("narration:", {k: round(v, 2) for k, v in d.items()})

SIL = 0.8
plan = []
for s in segs:
    plan.append((f"{NAR}/{s}.wav", d[s]))
    plan.append(("SIL", SIL))
plan.append(("SIL", 1.2))  # tail
total = sum(x[1] for x in plan)
print("audio total:", round(total, 2))
assert total < 300, "video must stay under 5 minutes"

concat = []
for i, (p, ln) in enumerate(plan):
    if p == "SIL":
        wav = V / f"sil-{i}.wav"
        run(f"ffmpeg -y -v error -f lavfi -i anullsrc=r=44100:cl=stereo -t {ln} -ar 44100 -ac 2 {wav}")
        concat.append(f"file '{wav}'")
    else:
        concat.append(f"file '{p}'")
(V / "audio-list.txt").write_text("\n".join(concat))
run(f"ffmpeg -y -v error -f concat -safe 0 -i {V}/audio-list.txt -c copy {V}/audio-full.wav")

# subtitles: (segment, [lines])
SUBS = [
    ("seg0-intro", ["Every software team has the same Monday problem.",
                    "A Jira backlog full of duplicates, stale requests,",
                    "and one outage buried under cosmetic tickets.",
                    "Meet TriageBot."]),
    ("seg1-what", ["TriageBot is a Forge and Rovo agent for Jira.",
                   "Give it a messy backlog, and in seconds it ranks every issue,",
                   "finds the duplicates, and drafts a first reply.",
                   "No configuration, no API key."]),
    ("seg2-sample", ["Six issues go in. The checkout outage comes out P0, score 71.",
                     "The leaked auth token routes to security, not backend.",
                     "The two checkout reports are one duplicate, similarity 0.86.",
                     "The misaligned button stays P3. Every score shows its reasons."]),
    ("seg3-stress", ["It scales. 24 issues in 20 milliseconds.",
                     "Three duplicate groups, two P0s.",
                     "A 60-day-old feature request stays P3 —",
                     "age is a tiebreaker, never the reason."]),
    ("seg4-rovo", ["In Jira, you just talk to it.",
                   "Triage this week's backlog. Find the duplicates.",
                   "Draft replies for the top five.",
                   "Live Rovo chat, in Jira, on the demo site."]),
    ("seg5-close", ["It never acts on its own. It proposes, a human approves.",
                    "It never closes an issue, reassigns anyone, or posts a comment.",
                    "TriageBot. Codegeist 2026.",
                    "A ranked, deduped plan, with a reason for every line."]),
]
starts, t = {}, 0.0
for p, ln in plan:
    starts.setdefault(p, t)
    t += ln
def fmt(s):
    ms = int(round(s * 1000))
    return f"{ms//3600000:02d}:{(ms//60000)%60:02d}:{(ms//1000)%60:02d},{ms%1000:03d}"
srt, idx = [], 1
for key, lines in SUBS:
    st = starts[f"{NAR}/{key}.wav"]
    per = d[key] / len(lines)
    for j, line in enumerate(lines):
        srt.append(f"{idx}\n{fmt(st + j*per)} --> {fmt(st + (j+1)*per)}\n{line}\n")
        idx += 1
(V / "subs.srt").write_text("\n".join(srt), encoding="utf-8")
print("srt entries:", idx - 1)

# clips: (image, duration) must sum to audio total
d2a, d2b = d["seg2-sample"] * 0.6, d["seg2-sample"] * 0.4 + SIL
clips = [
    (SHOT / "00-cover.png", d["seg0-intro"] + SIL),
    (SHOT / "01-home.png", d["seg1-what"] + SIL),
    (SHOT / "02-ranked.png", d2a),
    (SHOT / "04-duplicates.png", d2b),
    (SHOT / "05-stress.png", d["seg3-stress"] + SIL),
    (SHOT / "06-rovo-live.png", d["seg4-rovo"] + SIL),
    (SHOT / "00-cover.png", d["seg5-close"] + SIL + 1.2),
]
assert abs(sum(c[1] for c in clips) - total) < 0.01, (sum(c[1] for c in clips), total)
intended = list(clips)
clips = [(img, ln + 0.4) for img, ln in clips]  # xfade eats 0.4s per input

in_args, filt = [], []
for i, (img, ln) in enumerate(clips):
    in_args.append(f"-framerate 25 -loop 1 -t {ln:.3f} -i \"{img}\"")
    filt.append(f"[{i}]scale=1280:720:force_original_aspect_ratio=decrease,"
                f"pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v{i}]")
prev = "v0"
bounds, acc = [], 0.0
for img, ln in intended:
    acc += ln
    bounds.append(acc)
for i in range(1, len(clips)):
    off = bounds[i - 1] - 0.4
    filt.append(f"[{prev}][v{i}]xfade=transition=fade:duration=0.4:offset={off:.3f}[x{i}]")
    prev = f"x{i}"
filt.append(f"[{prev}]fade=t=in:st=0:d=0.5,fade=t=out:st={total-0.5:.3f}:d=0.5,"
            f"subtitles='{V}/subs.srt':force_style='FontName=DejaVu Sans,FontSize=20,"
            f"PrimaryColour=&HFFFFFF,OutlineColour=&H80000000,BorderStyle=1,Outline=2,"
            f"Alignment=2,MarginV=30'[vout]")
fc = ";".join(filt)
run(f"ffmpeg -y {' '.join(in_args)} -i {V}/audio-full.wav "
    f"-filter_complex \"{fc}\" -map \"[vout]\" -map {len(clips)}:a "
    f"-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 25 "
    f"-c:a aac -b:a 128k -movflags +faststart -shortest {OUT}")
print("VIDEO:", dur(OUT), "seconds")
