#!/usr/bin/env python3
"""Extract tech + exam MCQ banks from uploaded PDFs (line-based, no catastrophic regex)."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from pypdf import PdfReader

UPLOADS = Path("/home/ubuntu/.cursor/projects/workspace/uploads")
TECH_OUT = Path("/workspace/web/lib/gigalearn/academy/techBanks")
EXAM_OUT = Path("/workspace/web/lib/gigalearn/examPractice/banks")
EXAM_OUT.mkdir(parents=True, exist_ok=True)
REPORT = Path("/opt/cursor/artifacts")
REPORT.mkdir(parents=True, exist_ok=True)

PREFIXES = [
    "While testing a prototype, ",
    "Case study: ",
    "Suppose you are responsible for the system. ",
    "Applied problem-solving: ",
    "During a quality check, ",
    "In a practical exercise, ",
    "When reviewing the work, ",
    "As a technician, ",
    "During deployment, ",
    "When reviewing reliability, ",
    "During a review, ",
    "In practice, ",
]


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def stem_core(stem: str) -> str:
    s = normalize(stem)
    changed = True
    while changed:
        changed = False
        for prefix in PREFIXES:
            if s.lower().startswith(prefix.lower()):
                s = s[len(prefix) :].lstrip()
                changed = True
    s = re.sub(
        r"\s*(What is the best next step\?|Which response is most appropriate\?|"
        r"Which action should be prioritised\?|Which solution best addresses the issue\?|"
        r"Choose the best response\.?|Which action is most likely to help\?)\s*$",
        "",
        s,
        flags=re.I,
    )
    return normalize(s).lower()


def pdf_text(path: Path) -> tuple[str, int]:
    reader = PdfReader(str(path))
    return "\n".join((p.extract_text() or "") for p in reader.pages), len(reader.pages)


def extract_tech_qn(path: Path):
    full, pages = pdf_text(path)
    topic = "General"
    questions = []
    blocks = re.split(r"(?=Q\d+\.\s)", full)
    for block in blocks:
        m = re.match(r"Q(\d+)\.\s*(.*)", block, re.S)
        if not m:
            for line in block.splitlines():
                t = line.strip()
                if (
                    t
                    and not t.startswith("Page ")
                    and len(t) < 48
                    and re.match(r"^[A-Z][A-Za-z0-9 &/\-]{2,47}$", t)
                    and "PRACTICE" not in t
                ):
                    topic = t
            continue
        num = int(m.group(1))
        body = m.group(2)
        lines = [ln.rstrip() for ln in body.splitlines()]
        # Find A./B./C./D. and Correct/Explanation markers
        a_i = b_i = c_i = d_i = corr_i = exp_i = -1
        for i, ln in enumerate(lines):
            s = ln.strip()
            if s.startswith("A.") and a_i < 0:
                a_i = i
            elif s.startswith("B.") and a_i >= 0 and b_i < 0:
                b_i = i
            elif s.startswith("C.") and b_i >= 0 and c_i < 0:
                c_i = i
            elif s.startswith("D.") and c_i >= 0 and d_i < 0:
                d_i = i
            elif s.startswith("Correct answer:") and d_i >= 0 and corr_i < 0:
                corr_i = i
            elif s.startswith("Explanation:") and corr_i >= 0 and exp_i < 0:
                exp_i = i
        if min(a_i, b_i, c_i, d_i, corr_i, exp_i) < 0:
            questions.append(
                {
                    "sourceQuestionNumber": num,
                    "topic": topic,
                    "reviewStatus": "needs_correction",
                    "flags": ["parse_failed"],
                }
            )
            continue
        stem_lines = [ln.strip() for ln in lines[:a_i] if ln.strip()]
        if stem_lines and re.match(r"^[A-Z][A-Za-z0-9 &/\-]{2,47}$", stem_lines[0]) and len(stem_lines[0]) < 48:
            topic = stem_lines[0]
            stem_lines = stem_lines[1:]
        stem = normalize(" ".join(stem_lines))
        options = [
            normalize(lines[a_i].strip()[2:]),
            normalize(lines[b_i].strip()[2:]),
            normalize(lines[c_i].strip()[2:]),
            normalize(lines[d_i].strip()[2:]),
        ]
        corr = lines[corr_i].strip()
        cm = re.match(r"Correct answer:\s*([A-D])\.\s*(.*)$", corr)
        if not cm:
            questions.append(
                {
                    "sourceQuestionNumber": num,
                    "topic": topic,
                    "reviewStatus": "needs_correction",
                    "flags": ["parse_failed"],
                }
            )
            continue
        letter = cm.group(1)
        explanation = normalize(" ".join(ln.strip() for ln in lines[exp_i:] if ln.strip()).replace("Explanation:", "", 1))
        flags = []
        review = "approved"
        if len(stem) < 12:
            flags.append("weak_stem")
            review = "needs_correction"
        if any(len(o) < 2 for o in options):
            flags.append("missing_option")
            review = "needs_correction"
        if len({o.lower() for o in options}) < 4:
            flags.append("duplicate_options")
            review = "needs_correction"
        if len(explanation) < 8:
            flags.append("weak_explanation")
            review = "pending_review"
        questions.append(
            {
                "sourceQuestionNumber": num,
                "topic": topic,
                "questionText": stem,
                "options": options,
                "correctIndex": "ABCD".index(letter),
                "explanation": explanation,
                "reviewStatus": review,
                "flags": flags,
                "stemCore": stem_core(stem),
            }
        )
    return questions, pages


SUBJECT_HEADERS = [
    "ENGLISH",
    "MATHEMATICS",
    "SCIENCE",
    "SOCIAL STUDIES",
    "RME",
    "COMPUTING",
    "CAREER TECHNOLOGY",
    "CREATIVE ARTS",
    "FRENCH",
    "GHANAIAN LANGUAGE / CULTURE",
    "GHANAIAN LANGUAGE",
    "GES HISTORY & LEGISLATION",
    "GES HISTORY",
    "ADMINISTRATION",
    "PROFESSIONAL ETHICS",
    "CURRICULUM & ASSESSMENT",
    "CURRICULUM",
    "SCHOOL LEADERSHIP",
    "STAFF MANAGEMENT",
    "FINANCE",
    "SAFEGUARDING",
    "REASONING",
    "EDUCATION LAW",
]


def extract_inline_numbered(path: Path):
    full, pages = pdf_text(path)
    topic = "General"
    questions = []
    # Pre-find subject header positions
    header_spans: list[tuple[int, str]] = []
    for h in SUBJECT_HEADERS:
        for m in re.finditer(rf"(?mi)^{re.escape(h)}\s*$", full):
            header_spans.append((m.start(), h.title()))
    header_spans.sort()

    # Split by numbered questions
    for m in re.finditer(r"(?m)^(\d+)\.\s+", full):
        num = int(m.group(1))
        if num < 1 or num > 500:
            continue
        start = m.end()
        next_m = re.search(r"(?m)^\d+\.\s+", full[start:])
        block = full[start : start + next_m.start()] if next_m else full[start:]
        # Topic from nearest header
        qtopic = topic
        for pos, t in header_spans:
            if pos <= m.start():
                qtopic = t
            else:
                break
        # Flatten options: find Correct answer line
        corr_m = re.search(r"Correct answer:\s*([A-D])\.\s*(.*)", block)
        exp_m = re.search(r"Explanation:\s*(.*)", block, re.S)
        a_m = re.search(r"\n\s*A\.\s*", block)
        if not corr_m or not a_m:
            questions.append(
                {
                    "sourceQuestionNumber": num,
                    "topic": qtopic,
                    "reviewStatus": "needs_correction",
                    "flags": ["parse_failed"],
                }
            )
            continue
        stem = normalize(block[: a_m.start()])
        opt_region = block[a_m.start() : corr_m.start()]
        # Split options on " A. " / " B. " etc — first is A.
        opt_region_n = normalize(opt_region)
        parts = re.split(r"\s+([A-D])\.\s+", opt_region_n)
        # parts like ['', 'A', 'text', 'B', 'text', ...]
        options_map: dict[str, str] = {}
        if parts and parts[0] == "":
            parts = parts[1:]
        elif parts:
            # leading may be "A. text"
            if parts[0].startswith("A."):
                options_map["A"] = normalize(parts[0][2:])
                parts = parts[1:]
        i = 0
        while i + 1 < len(parts):
            letter, text = parts[i], parts[i + 1]
            if letter in "ABCD":
                options_map[letter] = normalize(text)
            i += 2
        if len(options_map) != 4:
            # fallback split
            am = re.findall(r"([A-D])\.\s*(.*?)(?=\s+[A-D]\.\s+|$)", opt_region_n)
            options_map = {k: normalize(v) for k, v in am}
        if len(options_map) != 4:
            questions.append(
                {
                    "sourceQuestionNumber": num,
                    "topic": qtopic,
                    "reviewStatus": "needs_correction",
                    "flags": ["parse_failed"],
                }
            )
            continue
        options = [options_map["A"], options_map["B"], options_map["C"], options_map["D"]]
        letter = corr_m.group(1)
        explanation = normalize(exp_m.group(1) if exp_m else "")
        # trim explanation at next subject header residue
        explanation = re.split(r"\bPAGE\s+\d+\b", explanation)[0].strip()
        flags = []
        review = "approved"
        if len(stem) < 8:
            flags.append("weak_stem")
            review = "needs_correction"
        weak = sum(
            1
            for o in options
            if re.search(
                r"personal preference|unrelated to the question|ignores professional|without following|without evidence",
                o,
                re.I,
            )
        )
        if weak >= 2:
            flags.append("weak_distractors")
            review = "pending_review"
        if len(explanation) < 5:
            flags.append("weak_explanation")
            review = "pending_review"
        if len({o.lower() for o in options}) < 4:
            flags.append("duplicate_options")
            review = "needs_correction"
        questions.append(
            {
                "sourceQuestionNumber": num,
                "topic": qtopic,
                "questionText": stem,
                "options": options,
                "correctIndex": "ABCD".index(letter),
                "explanation": explanation,
                "reviewStatus": review,
                "flags": flags,
                "stemCore": stem_core(stem),
            }
        )
    return questions, pages


def dedupe_export(questions, course_slug: str, filename: str):
    by_core: dict[str, list[int]] = defaultdict(list)
    for i, q in enumerate(questions):
        if q.get("stemCore"):
            by_core[q["stemCore"]].append(i)
    near = 0
    for idxs in by_core.values():
        if len(idxs) > 1:
            near += len(idxs) - 1
            for i in idxs[1:]:
                questions[i].setdefault("flags", []).append("near_duplicate")
                if questions[i].get("reviewStatus") == "approved":
                    questions[i]["reviewStatus"] = "pending_review"
    seen: set[str] = set()
    export = []
    for q in questions:
        if "parse_failed" in q.get("flags", []):
            continue
        if q.get("reviewStatus") == "needs_correction":
            continue
        core = q.get("stemCore")
        if not core or core in seen:
            continue
        seen.add(core)
        n = q["sourceQuestionNumber"]
        topic_id = re.sub(r"[^a-z0-9]+", "-", q["topic"].lower()).strip("-") or "general"
        export.append(
            {
                "questionId": f"{course_slug}-q{n:03d}",
                "courseSlug": course_slug,
                "topicId": topic_id,
                "topicLabel": q["topic"],
                "questionText": q["questionText"],
                "options": q["options"],
                "correctIndex": q["correctIndex"],
                "explanation": q["explanation"],
                "difficulty": "beginner" if n <= 150 else ("intermediate" if n <= 350 else "advanced"),
                "questionType": "mcq",
                "sourceDocument": filename,
                "sourceQuestionNumber": n,
                "reviewStatus": q["reviewStatus"],
                "tags": q.get("flags", []),
            }
        )
    return export, near


def write_bank(path: Path, payload: dict):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def main():
    reports = []

    # AI (tech format)
    ai_file = "AI_500_Practical_Objective_Questions_ad8b.pdf"
    ai_qs, ai_pages = extract_tech_qn(UPLOADS / ai_file)
    ai_export, ai_near = dedupe_export(ai_qs, "ai-machine-learning", ai_file)
    write_bank(
        TECH_OUT / "ai-ml.json",
        {
            "bankId": "ai-ml",
            "courseSlug": "ai-machine-learning",
            "title": "Artificial Intelligence and Machine Learning",
            "sourceDocument": ai_file,
            "questions": ai_export,
        },
    )
    reports.append(
        {
            "sourceFile": ai_file,
            "kind": "tech",
            "extracted": len(ai_qs),
            "pages": ai_pages,
            "nearDuplicates": ai_near,
            "uniqueImportable": len(ai_export),
            "approvedImported": sum(1 for q in ai_export if q["reviewStatus"] == "approved"),
            "pendingImported": sum(1 for q in ai_export if q["reviewStatus"] == "pending_review"),
            "parseFailed": sum(1 for q in ai_qs if "parse_failed" in q.get("flags", [])),
            "topics": sorted({q["topicLabel"] for q in ai_export}),
        }
    )
    print("AI", {k: reports[-1][k] for k in reports[-1] if k != "topics"}, "topics", len(reports[-1]["topics"]))

    # BECE
    bece_file = "Ghana_BECE_Preparation_500_Objective_Questions_Explained_c887.pdf"
    bece_qs, bece_pages = extract_inline_numbered(UPLOADS / bece_file)
    bece_export, bece_near = dedupe_export(bece_qs, "exam-bece-prep", bece_file)
    write_bank(
        EXAM_OUT / "bece-prep.json",
        {
            "bankId": "bece-prep",
            "courseSlug": "exam-bece-prep",
            "title": "Ghana BECE Preparation",
            "sourceDocument": bece_file,
            "questions": bece_export,
        },
    )
    reports.append(
        {
            "sourceFile": bece_file,
            "kind": "exam",
            "extracted": len(bece_qs),
            "pages": bece_pages,
            "nearDuplicates": bece_near,
            "uniqueImportable": len(bece_export),
            "approvedImported": sum(1 for q in bece_export if q["reviewStatus"] == "approved"),
            "pendingImported": sum(1 for q in bece_export if q["reviewStatus"] == "pending_review"),
            "parseFailed": sum(1 for q in bece_qs if "parse_failed" in q.get("flags", [])),
            "topics": sorted({q["topicLabel"] for q in bece_export}),
        }
    )
    print("BECE", {k: reports[-1][k] for k in reports[-1] if k != "topics"}, "topics", reports[-1]["topics"][:10])

    # Teacher promotion
    tp_file = "GES_Teachers_Promotion_500_Objective_Questions_Explained_fb4d.pdf"
    tp_qs, tp_pages = extract_inline_numbered(UPLOADS / tp_file)
    tp_export, tp_near = dedupe_export(tp_qs, "exam-teacher-promotion", tp_file)
    write_bank(
        EXAM_OUT / "teacher-promotion.json",
        {
            "bankId": "teacher-promotion",
            "courseSlug": "exam-teacher-promotion",
            "title": "GES Teachers Promotion Aptitude",
            "sourceDocument": tp_file,
            "questions": tp_export,
        },
    )
    reports.append(
        {
            "sourceFile": tp_file,
            "kind": "exam",
            "extracted": len(tp_qs),
            "pages": tp_pages,
            "nearDuplicates": tp_near,
            "uniqueImportable": len(tp_export),
            "approvedImported": sum(1 for q in tp_export if q["reviewStatus"] == "approved"),
            "pendingImported": sum(1 for q in tp_export if q["reviewStatus"] == "pending_review"),
            "parseFailed": sum(1 for q in tp_qs if "parse_failed" in q.get("flags", [])),
            "topics": sorted({q["topicLabel"] for q in tp_export}),
        }
    )
    print("PROMOTION", {k: reports[-1][k] for k in reports[-1] if k != "topics"}, "topics", reports[-1]["topics"][:10])

    # AD II study guide — practice only, pending_review
    ad_file = "Attractive_GES_Assistant_Director_II_Study_Guide_2026_d118.pdf"
    ad_full, ad_pages = pdf_text(UPLOADS / ad_file)
    m = re.search(r"(?i)practice questions with answers", ad_full)
    chunk = ad_full[m.start() :] if m else ""
    ad_questions = []
    for hm in re.finditer(
        r"(?m)^(\d+)\.\s+(.+?)\n\s*A\.\s+(.+?)\s+B\.\s+(.+?)\s+C\.\s+(.+?)\s+D\.\s+(.+?)\n\s*Correct answer:\s*([A-D])\.\s*(.+?)\n\s*Explanation:\s*(.+?)(?=\n\d+\.\s|\Z)",
        chunk,
        re.S,
    ):
        num = int(hm.group(1))
        if num > 40:
            continue
        options = [normalize(hm.group(i)) for i in range(3, 7)]
        ad_questions.append(
            {
                "questionId": f"exam-ad2-study-guide-q{num:03d}",
                "courseSlug": "exam-ad2-study-guide",
                "topicId": "ad2-practice",
                "topicLabel": "AD II practice",
                "questionText": normalize(hm.group(2)),
                "options": options,
                "correctIndex": "ABCD".index(hm.group(7)),
                "explanation": normalize(hm.group(9)),
                "difficulty": "intermediate",
                "questionType": "mcq",
                "sourceDocument": ad_file,
                "sourceQuestionNumber": num,
                "reviewStatus": "pending_review",
                "tags": ["study_guide"],
            }
        )
    write_bank(
        EXAM_OUT / "ad2-study-guide.json",
        {
            "bankId": "ad2-study-guide",
            "courseSlug": "exam-ad2-study-guide",
            "title": "GES Assistant Director II Study Guide 2026 (practice set)",
            "sourceDocument": ad_file,
            "kind": "study_guide",
            "notes": "Only the embedded practice set is imported; chapters are not converted to invented MCQs.",
            "questions": ad_questions,
        },
    )
    reports.append(
        {
            "sourceFile": ad_file,
            "kind": "study_guide",
            "extracted": len(ad_questions),
            "pages": ad_pages,
            "nearDuplicates": 0,
            "uniqueImportable": len(ad_questions),
            "approvedImported": 0,
            "pendingImported": len(ad_questions),
            "parseFailed": 0,
            "topics": ["AD II practice"],
        }
    )
    print("AD2", reports[-1])

    # Tech meta refresh
    meta_courses = []
    for bank_id, slug, title, difficulty, awaiting_default in [
        ("website-pwa", "website-pwa-development", "Website Development and Progressive Web Apps", "intermediate", False),
        ("robotics", "robotics-intelligent-systems", "Robotics and Intelligent Systems", "intermediate", False),
        ("other-digital", "other-digital-technologies", "Other Digital Technologies", "beginner", False),
        ("ai-ml", "ai-machine-learning", "Artificial Intelligence and Machine Learning", "beginner", False),
        ("mobile-app", "mobile-app-development", "Mobile App Development", "intermediate", True),
    ]:
        path = TECH_OUT / f"{bank_id}.json"
        topics = []
        approved = 0
        extracted = 0
        source = None
        awaiting = awaiting_default
        if path.exists():
            data = json.loads(path.read_text())
            source = data.get("sourceDocument")
            qs = [q for q in data["questions"] if q["reviewStatus"] == "approved"]
            approved = len(qs)
            extracted = 500
            awaiting = False
            c = Counter(q["topicId"] for q in qs)
            labels = {q["topicId"]: q["topicLabel"] for q in qs}
            topics = [
                {"id": tid, "label": labels[tid], "questionCount": c[tid]}
                for tid in sorted(c, key=lambda x: -c[x])
            ]
        meta_courses.append(
            {
                "bankId": bank_id,
                "courseSlug": slug,
                "title": title,
                "difficulty": difficulty,
                "awaitingMaterials": awaiting,
                "sourceDocument": source,
                "extractedFromSource": extracted,
                "approvedQuestionCount": approved,
                "topics": topics,
            }
        )
    write_bank(TECH_OUT / "meta.json", {"courses": meta_courses})

    exam_meta = []
    for bank_id, slug in [
        ("bece-prep", "exam-bece-prep"),
        ("teacher-promotion", "exam-teacher-promotion"),
        ("ad2-study-guide", "exam-ad2-study-guide"),
    ]:
        data = json.loads((EXAM_OUT / f"{bank_id}.json").read_text())
        qs = data["questions"]
        c = Counter(q["topicId"] for q in qs)
        labels = {q["topicId"]: q["topicLabel"] for q in qs}
        exam_meta.append(
            {
                "bankId": bank_id,
                "courseSlug": slug,
                "title": data["title"],
                "sourceDocument": data["sourceDocument"],
                "approvedQuestionCount": sum(1 for q in qs if q["reviewStatus"] == "approved"),
                "pendingQuestionCount": sum(1 for q in qs if q["reviewStatus"] != "approved"),
                "topics": [
                    {"id": tid, "label": labels[tid], "questionCount": c[tid]}
                    for tid in sorted(c, key=lambda x: -c[x])
                ],
            }
        )
    write_bank(EXAM_OUT / "meta.json", {"banks": exam_meta})

    tech_reports = []
    for bank_id, slug in [
        ("website-pwa", "website-pwa-development"),
        ("robotics", "robotics-intelligent-systems"),
        ("other-digital", "other-digital-technologies"),
        ("ai-ml", "ai-machine-learning"),
    ]:
        data = json.loads((TECH_OUT / f"{bank_id}.json").read_text())
        qs = data["questions"]
        tech_reports.append(
            {
                "sourceFile": data["sourceDocument"],
                "bankId": bank_id,
                "courseSlug": slug,
                "extracted": 500,
                "uniqueImportable": len(qs),
                "approvedImported": sum(1 for q in qs if q["reviewStatus"] == "approved"),
                "pendingImported": sum(1 for q in qs if q["reviewStatus"] != "approved"),
                "topicCount": len({q["topicId"] for q in qs}),
            }
        )

    summary = {
        "techBanks": tech_reports,
        "examBanks": [r for r in reports if r["kind"] != "tech"],
        "missingSources": [
            {
                "file": "Mobile_App_500_Practical_Objective_Questions.pdf",
                "courseSlug": "mobile-app-development",
            }
        ],
        "totals": {
            "techUniqueApproved": sum(r["approvedImported"] for r in tech_reports),
            "examExtracted": sum(r["extracted"] for r in reports if r["kind"] != "tech"),
            "examUniqueImportable": sum(r["uniqueImportable"] for r in reports if r["kind"] != "tech"),
            "examApproved": sum(r["approvedImported"] for r in reports if r["kind"] != "tech"),
            "examPendingReview": sum(r["pendingImported"] for r in reports if r["kind"] != "tech"),
            "claimedAs2500Tech": False,
        },
        "notes": [
            "AI bank added to Technology Hub.",
            "BECE and Teacher Promotion banks imported for Exam Practice.",
            "AD II file is a study guide — practice items pending_review only.",
            "Mobile App PDF still not uploaded.",
        ],
    }
    write_bank(TECH_OUT / "import-report.json", summary)
    write_bank(EXAM_OUT / "import-report.json", summary)
    write_bank(REPORT / "tech-exam-banks-import-report.json", summary)
    print(json.dumps(summary["totals"], indent=2))
    if bece_export:
        print("BECE sample:", bece_export[0]["topicLabel"], bece_export[0]["questionText"][:70])
    if tp_export:
        print("TP sample:", tp_export[0]["topicLabel"], tp_export[0]["questionText"][:70])


if __name__ == "__main__":
    main()
