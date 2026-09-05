#!/usr/bin/env python3
"""Generate the project + blog SVG artwork.

Everything is drawn with theme tokens (var(--syn-*)) so a single file works in
all six themes. No rasters, no external assets.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ = os.path.join(ROOT, "assets", "img", "projects")
BLOG = os.path.join(ROOT, "assets", "img", "blog")

W, H = 640, 200
FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"


def head(w=W, h=H):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'role="img" preserveAspectRatio="xMidYMid meet">'
        f'<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" '
        f'markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0 0 10 5 0 10z" fill="var(--fg-subtle)"/></marker></defs>'
    )


def title(t):
    return f"<title>{t}</title>"


def box(x, y, w, h, label, color="var(--syn-key)", sub=None, dashed=False):
    d = ' stroke-dasharray="4 3"' if dashed else ""
    s = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="var(--bg-app)" '
         f'stroke="{color}" stroke-width="1.4"{d} opacity="0.98"/>')
    ty = y + h / 2 + (0 if sub is None else -4)
    s += (f'<text x="{x + w / 2}" y="{ty}" fill="{color}" font-family="{FONT}" '
          f'font-size="11" text-anchor="middle" dominant-baseline="middle">{label}</text>')
    if sub:
        s += (f'<text x="{x + w / 2}" y="{y + h / 2 + 10}" fill="var(--fg-subtle)" '
              f'font-family="{FONT}" font-size="8.5" text-anchor="middle" '
              f'dominant-baseline="middle">{sub}</text>')
    return s


def arrow(x1, y1, x2, y2, label=None, color="var(--fg-subtle)"):
    s = (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
         f'stroke-width="1.2" marker-end="url(#a)"/>')
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2 - 6
        s += (f'<text x="{mx}" y="{my}" fill="var(--fg-subtle)" font-family="{FONT}" '
              f'font-size="8.5" text-anchor="middle">{label}</text>')
    return s


def path(d, color="var(--fg-subtle)", arrowed=True, dashed=False):
    m = ' marker-end="url(#a)"' if arrowed else ""
    da = ' stroke-dasharray="4 3"' if dashed else ""
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.2"{m}{da}/>'


def label(x, y, text, color="var(--fg-subtle)", size=9, anchor="start", weight=None):
    w = f' font-weight="{weight}"' if weight else ""
    return (f'<text x="{x}" y="{y}" fill="{color}" font-family="{FONT}" font-size="{size}" '
            f'text-anchor="{anchor}"{w}>{text}</text>')


def caption(text):
    return label(16, H - 12, text, "var(--syn-com)", 9)


K, S, T, N, F = ("var(--syn-key)", "var(--syn-str)", "var(--syn-type)",
                 "var(--syn-num)", "var(--syn-fn)")

# ---------------------------------------------------------------- projects
P = {}

AGENTS = ["invoice", "interview", "cv-fraud", "marketing",
          "shift", "work-permit", "secure-email", "analytics"]

P["mona-ai-agents"] = (
    title("MONA AI: one FastAPI router fanning out to eight task-specific agents")
    + box(14, 96, 84, 38, "HTTP", K, "FastAPI")
    + box(120, 96, 88, 38, "Router", F, "dispatch")
    + arrow(100, 115, 118, 115)
    # distribution bus
    + arrow(210, 115, 226, 115)
    + path("M226 22 L 226 208", "var(--border-strong)", arrowed=False)
    + "".join(
        box(244, 14 + i * 24, 146, 18, name, T)
        + arrow(226, 23 + i * 24, 242, 23 + i * 24)
        for i, name in enumerate(AGENTS)
    )
    # collector bus into the gold layer
    + path("M408 22 L 408 208", "var(--border-strong)", arrowed=False)
    + "".join(path(f"M392 {23 + i * 24} L 406 {23 + i * 24}", dashed=True)
              for i in range(len(AGENTS)))
    + arrow(408, 115, 428, 115)
    + box(430, 90, 100, 50, "Postgres", N, "gold layer")
    + label(480, 166, "every agent → Gemini", F, 9, "middle")
    + label(480, 180, "structured JSON, cached", "var(--fg-subtle)", 8.5, "middle")
    + label(16, 228, "8 agents · 1 shared base class · results persisted for reuse",
            "var(--syn-com)", 9)
)

P["ncbi-gene-mcp"] = (
    title("MCP client: JSON-RPC between an LLM and the NCBI Entrez API")
    + box(8, 66, 100, 52, "LLM client", K, "MCP host")
    + box(178, 66, 116, 52, "MCP server", F, "JSON-RPC")
    + box(330, 34, 110, 40, "REST API", T, "FastAPI")
    + box(330, 108, 110, 40, "CLI", T, "argparse")
    + box(492, 66, 116, 52, "NCBI Entrez", N, "gene · protein")
    + arrow(112, 92, 176, 92)
    + label(144, 80, "tools/call", "var(--fg-subtle)", 8.5, "middle")
    + path("M296 84 C 314 84, 314 54, 328 54")
    + path("M296 100 C 314 100, 314 128, 328 128")
    + path("M442 54 C 466 54, 466 86, 490 86")
    + path("M442 128 C 466 128, 466 100, 490 100")
    + label(549, 138, "3 req/s rate limit", "var(--git-mod)", 8.5, "middle")
    + caption("deployed on vercel · dual interface · automated tests")
)

P["unichatbot"] = (
    title("RAG pipeline: embed, retrieve from ChromaDB, rerank, generate")
    + box(14, 78, 86, 40, "question", K)
    + box(126, 78, 92, 40, "embed", T, "HF model")
    + box(244, 78, 96, 40, "ChromaDB", N, "top-k = 5")
    + box(366, 78, 92, 40, "rerank", F, "context")
    + box(484, 78, 96, 40, "answer", S, "+35% rel.")
    + arrow(102, 98, 124, 98) + arrow(220, 98, 242, 98)
    + arrow(342, 98, 364, 98) + arrow(460, 98, 482, 98)
    + box(244, 20, 96, 30, "AMU corpus", "var(--fg-subtle)", dashed=True)
    + path("M292 52 L 292 76", dashed=True)
    + label(292, 148, "LangChain orchestration", F, 9, "middle")
    + path("M126 132 L 580 132", "var(--border-strong)", arrowed=False, dashed=True)
    + caption("chunk → embed → retrieve → generate · local inference, docker")
)

P["skill-lyft"] = (
    title("Skill Lyft: React frontend, Flask backend, Hugging Face teaching agent")
    + box(18, 30, 130, 62, "React + TS", K, "Tailwind")
    + box(18, 112, 130, 46, "active recall", T, "checkpoints")
    + box(206, 62, 122, 62, "Flask API", F, "python")
    + box(386, 30, 118, 52, "Hugging Face", N, "transformers")
    + box(386, 100, 118, 52, "PyTorch", N, "inference")
    + arrow(150, 62, 204, 82) + arrow(150, 132, 204, 108)
    + path("M330 82 C 356 82, 356 56, 384 56")
    + path("M330 102 C 356 102, 356 126, 384 126")
    + box(540, 62, 84, 62, "Vercel", S, "CI/CD")
    + path("M506 92 L 538 92")
    + caption("4-person agile team · chunking, scaffolding, multimodal pedagogy")
)

P["smart-studydesk"] = (
    title("Smart StudyDesk: research loop from interviews to refined interface")
    + box(20, 74, 104, 46, "lecture notes", K)
    + box(158, 74, 100, 46, "summarise", T, "LLM")
    + box(292, 74, 100, 46, "weak-area", F, "quizzes")
    + box(426, 74, 104, 46, "progress", N, "metrics")
    + arrow(126, 97, 156, 97) + arrow(260, 97, 290, 97) + arrow(394, 97, 424, 97)
    + path("M478 72 C 478 30, 72 30, 72 70", dashed=True)
    + label(275, 26, "iterate on NASA-TLX + interview findings", "var(--fg-subtle)", 8.5, "middle")
    + box(552, 74, 72, 46, "+30%", S, "nav. eff.")
    + path("M532 97 L 550 97")
    + caption("semi-structured interviews · NASA-TLX workload · folder categorisation")
)

P["clip-medical"] = (
    title("CLIP zero-shot classification benchmarked against ViT and ResNet50")
    + box(16, 74, 92, 46, "OCT scan", K, "OCT2017")
    + box(150, 26, 116, 38, "CLIP", F, "zero-shot")
    + box(150, 82, 116, 38, "ViT", T, "supervised")
    + box(150, 136, 116, 38, "ResNet50", T, "supervised")
    + path("M110 90 C 130 90, 130 45, 148 45")
    + arrow(110, 97, 148, 101)
    + path("M110 104 C 130 104, 130 155, 148 155")
    + box(316, 26, 106, 38, "text prompts", S, dashed=True)
    + path("M316 45 L 268 45", arrowed=True)
    + box(452, 60, 168, 74, "P · R · F1", N, "ROC-AUC · κ · MCC")
    + path("M268 100 C 400 100, 400 96, 450 96")
    + caption("OCT2017 + RFMiD · where zero-shot transfer holds, and where it breaks")
)

P["concrete-cracks"] = (
    title("Knowledge distillation: large teachers compressed into a deployable student")
    + box(24, 26, 128, 44, "ResNet-50", T, "teacher")
    + box(24, 84, 128, 44, "VGG-19", T, "teacher")
    + box(230, 54, 116, 48, "distillation", F, "soft targets")
    + box(420, 54, 110, 48, "student", S, "lightweight")
    + path("M154 48 C 190 48, 190 68, 228 68")
    + path("M154 106 C 190 106, 190 88, 228 88")
    + arrow(348, 78, 418, 78)
    + box(24, 142, 128, 36, "SDNET2018", K, "56,000+ imgs")
    + path("M152 160 C 300 160, 300 106, 418 100", dashed=True)
    + box(556, 54, 68, 48, "MCC", N, "+20%")
    + path("M532 78 L 554 78")
    + label(474, 128, "Grad-CAM verified", "var(--syn-com)", 8.5, "middle")
    + caption("9 architectures benchmarked · 96% test accuracy")
)

P["healthsense-ai"] = (
    title("HealthSenseAI: MERN request flow with a Hugging Face inference step")
    + box(20, 72, 96, 48, "React", K, "client")
    + box(148, 72, 96, 48, "Express", F, "node")
    + box(276, 72, 96, 48, "MongoDB", N, "profiles")
    + box(404, 30, 108, 44, "HF model", T, "inference")
    + box(404, 116, 108, 44, "Gradio", S, "prototype")
    + arrow(118, 96, 146, 96) + arrow(246, 96, 274, 96)
    + path("M374 88 C 392 88, 392 52, 402 52")
    + path("M374 104 C 392 104, 392 138, 402 138")
    + box(546, 72, 78, 48, "insights", "var(--fg-subtle)")
    + path("M514 52 C 534 52, 534 88, 544 88")
    + caption("end-to-end pipeline · gradio cut prototyping cycles ~40%")
)

P["attendance-system"] = (
    title("Face recognition attendance: camera to marked register")
    + box(16, 74, 88, 46, "camera", K, "live feed")
    + box(130, 74, 100, 46, "Haar", F, "detect")
    + box(256, 74, 104, 46, "recognise", T, "OpenCV")
    + box(386, 74, 96, 46, "Flask", S, "web app")
    + box(508, 74, 116, 46, "register", N, "200+ / session")
    + arrow(106, 97, 128, 97) + arrow(232, 97, 254, 97)
    + arrow(362, 97, 384, 97) + arrow(484, 97, 506, 97)
    + label(320, 148, "−80% processing time vs manual roll-call", "var(--syn-com)", 9, "middle")
    + caption("real-time · remote review · single camera")
)

P["climate-forecast"] = (
    title("SARIMAX forecast decomposing Delhi temperature into trend and season")
    + label(16, 24, "Berkeley Earth · 1.6B records → Delhi subset", "var(--fg-subtle)", 9)
    + '<g transform="translate(16,40)">'
    + f'<path d="M0 96 L 600 96" stroke="var(--border-strong)" stroke-width="1"/>'
    + f'<path d="M0 0 L 0 96" stroke="var(--border-strong)" stroke-width="1"/>'
    + '<path d="M4 74 Q 34 44 64 72 Q 94 100 124 68 Q 154 36 184 66 Q 214 96 244 62 '
      'Q 274 30 304 60 Q 334 90 364 56" fill="none" stroke="var(--syn-type)" stroke-width="1.5"/>'
    + '<path d="M364 56 Q 394 26 424 54 Q 454 84 484 50 Q 514 18 544 46 Q 574 74 596 44" '
      'fill="none" stroke="var(--syn-fn)" stroke-width="1.5" stroke-dasharray="4 3"/>'
    + '<path d="M4 80 L 596 40" fill="none" stroke="var(--git-del)" stroke-width="1" '
      'stroke-dasharray="2 3" opacity="0.85"/>'
    + f'<line x1="364" y1="0" x2="364" y2="96" stroke="var(--fg-subtle)" stroke-width="1" stroke-dasharray="3 3"/>'
    + label(370, 12, "forecast →", F, 8.5)
    + label(300, 12, "← observed", T, 8.5, "end")
    + "</g>"
    + label(430, 176, "warming trend", "var(--git-del)", 8.5)
    + caption("SARIMAX · seasonality + trend · 20+ years")
)

P["ambient-light"] = (
    title("Ambient light: sample screen edge pixels, drive a WS2812b strip")
    + f'<rect x="150" y="34" width="230" height="126" rx="4" fill="var(--bg-app)" '
      f'stroke="var(--syn-key)" stroke-width="1.4"/>'
    + label(265, 100, "monitor", K, 11, "middle")
    + "".join(
        f'<rect x="{142 + (238 if i > 5 else 0)}" y="{40 + (i % 6) * 20}" width="6" height="14" '
        f'rx="2" fill="var(--syn-{"str" if i % 3 == 0 else ("type" if i % 3 == 1 else "num")})" '
        f'opacity="0.85"/>' for i in range(12)
    )
    + box(20, 74, 92, 46, "capture", F, "edge px")
    + arrow(112, 84, 140, 70)
    + box(418, 74, 96, 46, "Arduino", T, "Nano")
    + box(544, 74, 84, 46, "WS2812b", N, "FastLED")
    + arrow(388, 97, 416, 97) + arrow(516, 97, 542, 97)
    + label(265, 178, "serial · C++ · reduced eye strain", "var(--syn-com)", 9, "middle")
)

# ---------------------------------------------------------------- blog art
BH = 120
B = {}


def bl(x, y, t, c=K, s=10, a="start"):
    return label(x, y, t, c, s, a)


B["protocol"] = (title("Protocol") + box(30, 40, 110, 40, "client", K)
                 + box(265, 40, 110, 40, "server", F) + box(500, 40, 110, 40, "API", T)
                 + arrow(142, 54, 263, 54, "request") + arrow(263, 70, 142, 70, "result")
                 + arrow(377, 60, 498, 60, "JSON-RPC"))
B["pipeline"] = (title("Pipeline")
                 + "".join(box(24 + i * 128, 44, 104, 34, n, [K, T, F, N, S][i])
                           for i, n in enumerate(["ingest", "clean", "transform", "index", "serve"]))
                 + "".join(arrow(128 + i * 128, 61, 148 + i * 128, 61) for i in range(4)))
B["retrieval"] = (title("Retrieval")
                  + box(24, 44, 96, 34, "query", K) + box(160, 20, 96, 30, "vector", T)
                  + box(160, 70, 96, 30, "BM25", T) + box(300, 44, 96, 34, "fuse", F, "RRF")
                  + box(440, 44, 96, 34, "answer", S)
                  + path("M122 56 C 142 56, 142 35, 158 35") + path("M122 66 C 142 66, 142 85, 158 85")
                  + path("M258 35 C 278 35, 278 56, 298 56") + path("M258 85 C 278 85, 278 66, 298 66")
                  + arrow(398, 61, 438, 61))
B["transformer"] = (title("Transformer")
                    + "".join(f'<rect x="{40 + i * 26}" y="{34 + (i % 3) * 6}" width="18" height="{52 - (i % 3) * 12}" '
                              f'rx="2" fill="var(--syn-key)" opacity="{0.3 + (i % 4) * 0.18}"/>' for i in range(9))
                    + box(300, 42, 108, 38, "attention", F)
                    + box(452, 42, 108, 38, "tokens", T)
                    + arrow(282, 61, 298, 61) + arrow(410, 61, 450, 61))
B["vision"] = (title("Computer vision")
               + f'<rect x="30" y="30" width="86" height="62" rx="4" fill="none" stroke="var(--syn-key)" stroke-width="1.4"/>'
               + "".join(f'<circle cx="{46 + (i % 3) * 26}" cy="{46 + (i // 3) * 22}" r="3.4" '
                         f'fill="var(--syn-fn)" opacity="0.9"/>' for i in range(6))
               + box(158, 44, 100, 34, "conv", T) + box(298, 44, 100, 34, "pool", T)
               + box(438, 44, 116, 34, "class", S)
               + arrow(120, 61, 156, 61) + arrow(260, 61, 296, 61) + arrow(400, 61, 436, 61))
B["analysis"] = (title("Analysis")
                 + '<g transform="translate(24,26)">'
                 + '<path d="M0 70 L 560 70" stroke="var(--border-strong)"/>'
                 + "".join(f'<rect x="{14 + i * 46}" y="{70 - h}" width="24" height="{h}" rx="2" '
                           f'fill="var(--syn-type)" opacity="0.75"/>'
                           for i, h in enumerate([22, 38, 30, 52, 44, 60, 48, 66, 58, 70, 62, 56]))
                 + '<path d="M26 48 Q 140 26 254 22 Q 368 16 540 6" fill="none" '
                   'stroke="var(--syn-fn)" stroke-width="1.6"/>' + "</g>")
B["academia"] = (title("Academia")
                 + f'<rect x="36" y="26" width="72" height="68" rx="3" fill="var(--bg-app)" stroke="var(--syn-key)" stroke-width="1.4"/>'
                 + "".join(f'<line x1="48" y1="{40 + i * 11}" x2="{96 - (i % 2) * 16}" y2="{40 + i * 11}" '
                           f'stroke="var(--fg-subtle)" stroke-width="1.6"/>' for i in range(5))
                 + box(160, 44, 112, 34, "structure", T) + box(312, 44, 112, 34, "cite", F)
                 + box(464, 44, 112, 34, "publish", S)
                 + arrow(112, 61, 158, 61) + arrow(274, 61, 310, 61) + arrow(426, 61, 462, 61))
B["interaction"] = (title("Interaction")
                    + f'<rect x="40" y="22" width="60" height="80" rx="8" fill="var(--bg-app)" stroke="var(--syn-key)" stroke-width="1.4"/>'
                    + f'<circle cx="70" cy="92" r="4" fill="var(--syn-fn)"/>'
                    + "".join(f'<rect x="{48 + (i % 3) * 16}" y="{34 + (i // 3) * 14}" width="12" height="9" rx="2" '
                              f'fill="var(--syn-type)" opacity="0.6"/>' for i in range(6))
                    + box(150, 44, 108, 34, "observe", T) + box(298, 44, 108, 34, "measure", F)
                    + box(446, 44, 118, 34, "redesign", S)
                    + arrow(112, 61, 148, 61) + arrow(260, 61, 296, 61) + arrow(408, 61, 444, 61)
                    + path("M505 80 C 505 106, 205 106, 205 80", dashed=True))


def main():
    os.makedirs(PROJ, exist_ok=True)
    os.makedirs(BLOG, exist_ok=True)
    for name, body in P.items():
        h = 240 if name == "mona-ai-agents" else H
        open(os.path.join(PROJ, name + ".svg"), "w").write(head(W, h) + body + "</svg>")
    for name, body in B.items():
        open(os.path.join(BLOG, name + ".svg"), "w").write(head(640, BH) + body + "</svg>")
    print(f"wrote {len(P)} project SVGs -> assets/img/projects/")
    print(f"wrote {len(B)} blog SVGs    -> assets/img/blog/")


if __name__ == "__main__":
    main()
