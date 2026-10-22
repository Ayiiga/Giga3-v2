#!/usr/bin/env python3
"""Rebuild five Teacher Promotion rank banks + honest practice PDFs.

Honesty rules:
- Do not pad to 550 with exact/near duplicates.
- Publish actual unique counts; label shortfall vs 550 target.
- All newly imported items stay pending_review / awaiting_verification.
- Preserve existing questionIds when stems already exist in a bank.
"""
from __future__ import annotations

import json
import re
import zipfile
from collections import Counter
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path("/workspace")
BANKS = ROOT / "web/lib/gigalearn/examPractice/banks"
UPLOADS = Path("/home/ubuntu/.cursor/projects/workspace/uploads")
PROMO_TXT = Path("/tmp/promo-pdfs")
ARTIFACT = Path("/opt/cursor/artifacts/promotion-550-rebuild")
PDF_OUT = ARTIFACT / "pdfs"
AUDIT = ARTIFACT / "audit"
PARSED_550 = Path("/opt/cursor/artifacts/promotion-550-audit")

RANKS = [
    {
        "id": "ad-ii",
        "short": "AD II",
        "label": "Assistant Director II",
        "courseSlug": "exam-ad-ii",
        "bankFile": "ad-ii.json",
        "promotionRank": "assistant-director-ii",
        "source500": "assistant_director_ii_500_promotion_questions_answers_24c1.txt",
        "source500Pdf": "assistant_director_ii_500_promotion_questions_answers_24c1.pdf",
        "parsed550": "parsed-ad-ii.json",
        "focus": "Classroom practice, assessment, curriculum, professional ethics, teaching and learning.",
    },
    {
        "id": "ad-i",
        "short": "AD I",
        "label": "Assistant Director I",
        "courseSlug": "exam-ad-i",
        "bankFile": "ad-i.json",
        "promotionRank": "assistant-director-i",
        "source500": "assistant_director_i_500_promotion_questions_answers_84eb.txt",
        "source500Pdf": "assistant_director_i_500_promotion_questions_answers_84eb.pdf",
        "parsed550": "parsed-ad-i.json",
        "focus": "Instructional supervision, staff development, school improvement, operational leadership.",
    },
    {
        "id": "deputy-director",
        "short": "DD",
        "label": "Deputy Director",
        "courseSlug": "exam-deputy-director",
        "bankFile": "deputy-director.json",
        "promotionRank": "deputy-director",
        "source500": "deputy_director_500_promotion_questions_answers_0e4e.txt",
        "source500Pdf": "deputy_director_500_promotion_questions_answers_0e4e.pdf",
        "parsed550": "parsed-deputy-director.json",
        "focus": "Institutional and district management, monitoring and evaluation, resource accountability.",
    },
    {
        "id": "director-ii",
        "short": "D II",
        "label": "Director II",
        "courseSlug": "exam-director-ii",
        "bankFile": "director-ii.json",
        "promotionRank": "director-ii",
        "source500": "director_ii_500_promotion_questions_answers_4de0.txt",
        "source500Pdf": "director_ii_500_promotion_questions_answers_4de0.pdf",
        "parsed550": "parsed-director-ii.json",
        "focus": "Strategic planning, governance, policy implementation, institutional performance.",
    },
    {
        "id": "director-i",
        "short": "D I",
        "label": "Director I",
        "courseSlug": "exam-director-i",
        "bankFile": "director-i.json",
        "promotionRank": "director-i",
        "source500": "director_i_500_promotion_questions_answers_81aa.txt",
        "source500Pdf": "director_i_500_promotion_questions_answers_81aa.pdf",
        "parsed550": "parsed-director-i.json",
        "focus": "Advanced strategic leadership, organisational governance, public-sector accountability.",
    },
]

GENERIC = {
    "all of the above",
    "none of the above",
    "both a and b",
    "a and b only",
    "a and c only",
    "b and c only",
}


def normalize(s: str) -> str:
    s = re.sub(r"\s+", " ", (s or "")).strip().lower()
    s = re.sub(r"^\[[^\]]+\]\s*", "", s)
    s = re.sub(r"[^a-z0-9 ?']", "", s)
    return s


def near_key(stem: str) -> str:
    words = normalize(stem).split()
    return " ".join(words[:12])


def slugify_topic(topic: str) -> str:
    t = re.sub(r"[^a-z0-9]+", "-", (topic or "general").lower()).strip("-")
    return t or "general"


def topic_label(topic: str) -> str:
    t = (topic or "Professional practice").strip()
    return t[:1].upper() + t[1:] if t else "Professional practice"


def letter_to_index(letter: str) -> int:
    return "ABCD".index(letter.upper())


def make_mcq(
    *,
    question_id: str,
    course_slug: str,
    stem: str,
    options: list[str],
    correct_index: int,
    explanation: str,
    topic: str,
    source_document: str,
    source_number: int,
    promotion_rank: str,
    access_tier: list[str],
    tags: list[str],
) -> dict:
    option_ids = [f"{question_id}-opt-{L}" for L in "ABCD"]
    return {
        "questionId": question_id,
        "courseSlug": course_slug,
        "topicId": slugify_topic(topic),
        "topicLabel": topic_label(topic),
        "questionText": stem.strip(),
        "options": options,
        "optionIds": option_ids,
        "correctIndex": correct_index,
        "correctOptionId": option_ids[correct_index],
        "explanation": explanation.strip()
        or "Practice key pending authoritative review.",
        "difficulty": "intermediate",
        "questionType": "mcq",
        "sourceDocument": source_document,
        "sourceQuestionNumber": source_number,
        "reviewStatus": "pending_review",
        "tags": tags,
        "sourceType": "original_practice",
        "verificationStatus": "awaiting_verification",
        "verificationNotes": "SOURCE ANSWER — REVIEW REQUIRED. Practice item; not an official GES paper.",
        "publicationStatus": "published_practice",
        "accessTier": access_tier,
        "promotionRank": promotion_rank,
    }


def make_tf(
    *,
    question_id: str,
    course_slug: str,
    statement: str,
    correct: str,
    explanation: str,
    source_document: str,
    source_number: int,
    promotion_rank: str,
    access_tier: list[str],
) -> dict:
    correct_index = 0 if correct == "True" else 1
    option_ids = [f"{question_id}-opt-true", f"{question_id}-opt-false"]
    return {
        "questionId": question_id,
        "courseSlug": course_slug,
        "topicId": "true-false-promotion",
        "topicLabel": "True / False — Promotion Aptitude",
        "questionText": statement.strip(),
        "options": ["True", "False"],
        "optionIds": option_ids,
        "correctIndex": correct_index,
        "correctOptionId": option_ids[correct_index],
        "explanation": explanation.strip()
        or "Source-supplied or practice key. Treat as provisional pending authoritative review.",
        "difficulty": "intermediate",
        "questionType": "true_false",
        "sourceDocument": source_document,
        "sourceQuestionNumber": source_number,
        "reviewStatus": "pending_review",
        "tags": ["true_false", "source_answer_review_required"],
        "sourceType": "awaiting_verification",
        "verificationStatus": "awaiting_verification",
        "verificationNotes": "SOURCE ANSWER — REVIEW REQUIRED. Not auto-approved as fact.",
        "publicationStatus": "published_practice",
        "accessTier": access_tier,
        "promotionRank": promotion_rank,
    }


def parse_source500(path: Path) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text(errors="ignore")
    out = []
    parts = re.split(r"(?m)(?=^\s*\d{1,3}\.\s)", text)
    for part in parts:
        m = re.match(
            r"\s*(\d{1,3})\.\s*(?:\[([^\]]+)\])?\s*(.*?)\n\s*Answer:\s*([A-D])\.\s*(.+)",
            part,
            re.S,
        )
        if not m:
            continue
        topic = m.group(2) or "Professional practice"
        stem_block = m.group(3)
        stem = re.split(r"\n\s*A\.\s", stem_block, maxsplit=1)[0].strip()
        stem = re.sub(r"\s+", " ", stem)
        if len(normalize(stem)) < 30:
            continue
        opts = []
        for L in "ABCD":
            om = re.search(
                rf"\n\s*{L}\.\s*(.+?)(?=\n\s*[A-D]\.\s|\n\s*Answer:|\Z)", part, re.S
            )
            opts.append(re.sub(r"\s+", " ", (om.group(1) if om else "").strip()))
        if any(not o or normalize(o) in GENERIC for o in opts):
            continue
        if len(set(normalize(o) for o in opts)) < 4:
            continue
        ans = m.group(4).upper()
        expl_m = re.search(
            r"Explanation:\s*(.+?)(?=\n\s*\d{1,3}\.\s|\Z)", part, re.S
        )
        expl = re.sub(r"\s+", " ", (expl_m.group(1) if expl_m else "").strip())[:600]
        out.append(
            {
                "n": int(m.group(1)),
                "topic": topic,
                "stem": stem,
                "options": opts,
                "ans": ans,
                "explanation": expl,
                "type": "mcq",
            }
        )
    return out


def load_parsed550(path: Path) -> list[dict]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text())
    # Deduplicate exact stems keeping first occurrence
    seen: set[str] = set()
    out = []
    for q in raw:
        key = q["stem"]
        if key in seen:
            continue
        seen.add(key)
        if q["type"] == "mcq":
            opts = [re.sub(r"\s+", " ", o).strip() for o in q["options"]]
            if len(opts) != 4 or any(not o or normalize(o) in GENERIC for o in opts):
                continue
            if len(set(normalize(o) for o in opts)) < 4:
                continue
            out.append(
                {
                    "n": q["n"],
                    "topic": "Professional practice",
                    "stem": q["stem_raw"],
                    "options": opts,
                    "ans": q["ans"],
                    "explanation": q.get("explanation") or "",
                    "type": "mcq",
                }
            )
        else:
            out.append(
                {
                    "n": q["n"],
                    "topic": "True / False",
                    "stem": q["stem_raw"],
                    "options": ["True", "False"],
                    "ans": q["ans"],
                    "explanation": q.get("explanation") or "",
                    "type": "true_false",
                }
            )
    return out


def rebuild_rank(rank: dict) -> dict:
    bank_path = BANKS / rank["bankFile"]
    existing = json.loads(bank_path.read_text())
    kept = list(existing["questions"])
    existing_stems = {normalize(q["questionText"]) for q in kept}
    existing_near = {near_key(q["questionText"]) for q in kept}
    existing_ids = {q["questionId"] for q in kept}

    src500 = parse_source500(PROMO_TXT / rank["source500"])
    src550 = load_parsed550(PARSED_550 / rank["parsed550"])

    added = []
    skipped_dup = 0
    skipped_near = 0

    def try_add(item: dict, source_doc: str, id_prefix: str, tag: str):
        nonlocal skipped_dup, skipped_near
        stem_n = normalize(item["stem"])
        nkey = near_key(item["stem"])
        if stem_n in existing_stems:
            skipped_dup += 1
            return
        if nkey in existing_near:
            skipped_near += 1
            return
        # next id
        if item["type"] == "true_false":
            n = 1
            while f"{id_prefix}-tf-{n:03d}" in existing_ids:
                n += 1
            qid = f"{id_prefix}-tf-{n:03d}"
            q = make_tf(
                question_id=qid,
                course_slug=rank["courseSlug"],
                statement=item["stem"],
                correct=item["ans"] if item["ans"] in ("True", "False") else "True",
                explanation=item["explanation"],
                source_document=source_doc,
                source_number=item["n"],
                promotion_rank=rank["promotionRank"],
                access_tier=["premium"],  # re-tier later
            )
        else:
            n = 1
            while f"{id_prefix}-q{n:03d}" in existing_ids:
                n += 1
            qid = f"{id_prefix}-q{n:03d}"
            correct_index = letter_to_index(item["ans"])
            q = make_mcq(
                question_id=qid,
                course_slug=rank["courseSlug"],
                stem=item["stem"],
                options=item["options"],
                correct_index=correct_index,
                explanation=item["explanation"],
                topic=item["topic"],
                source_document=source_doc,
                source_number=item["n"],
                promotion_rank=rank["promotionRank"],
                access_tier=["premium"],
                tags=[tag, "awaiting_verification"],
            )
        kept.append(q)
        added.append(qid)
        existing_ids.add(qid)
        existing_stems.add(stem_n)
        existing_near.add(nkey)

    for item in src500:
        try_add(item, rank["source500Pdf"], rank["courseSlug"], "source_500_import")
    for item in src550:
        try_add(
            item,
            f"GigaLearn_{rank['short'].replace(' ', '_')}_550_guide_deduped.pdf",
            rank["courseSlug"],
            "guide_550_deduped",
        )

    # Re-tier: first 50 MCQs free; preserve free on original AD2 Feb 2023 TF; rest premium.
    free_mcq = 0
    for q in kept:
        is_tf = q.get("questionType") == "true_false"
        src = q.get("sourceDocument") or ""
        if is_tf and "AD2_28TH_FEB_2023" in src:
            q["accessTier"] = ["free"]
        elif not is_tf and free_mcq < 50:
            q["accessTier"] = ["free"]
            free_mcq += 1
        else:
            q["accessTier"] = ["premium"]

    # Cap publishable unique at 550 if somehow over (should not happen)
    if len(kept) > 550:
        kept = kept[:550]

    existing["questions"] = kept
    existing["title"] = f"GES {rank['label']} Promotion Practice"
    existing["sourceDocument"] = rank["source500Pdf"]
    bank_path.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n")

    mcq = sum(1 for q in kept if q.get("questionType", "mcq") == "mcq")
    tf = sum(1 for q in kept if q.get("questionType") == "true_false")
    return {
        "rank": rank["id"],
        "label": rank["label"],
        "total": len(kept),
        "mcq": mcq,
        "true_false": tf,
        "added": len(added),
        "skippedExact": skipped_dup,
        "skippedNear": skipped_near,
        "source500Parsed": len(src500),
        "source550Unique": len(src550),
        "gapTo550": max(0, 550 - len(kept)),
        "freeTier": sum(1 for q in kept if "free" in (q.get("accessTier") or [])),
        "questions": kept,
    }


def rebuild_meta(summaries: list[dict]) -> None:
    meta_path = BANKS / "meta.json"
    meta = json.loads(meta_path.read_text())
    by_slug = {b["courseSlug"]: b for b in meta.get("banks", [])}
    for rank, summary in zip(RANKS, summaries):
        qs = summary["questions"]
        pool = [q for q in qs if q.get("reviewStatus") in ("approved", "pending_review")]
        c = Counter(q["topicId"] for q in pool)
        labels = {q["topicId"]: q["topicLabel"] for q in pool}
        entry = {
            "bankId": rank["id"],
            "courseSlug": rank["courseSlug"],
            "title": f"GES {rank['label']} Promotion Practice",
            "sourceDocument": rank["source500Pdf"],
            "approvedQuestionCount": sum(
                1 for q in qs if q.get("reviewStatus") == "approved"
            ),
            "pendingQuestionCount": sum(
                1 for q in qs if q.get("reviewStatus") == "pending_review"
            ),
            "mcqCount": summary["mcq"],
            "trueFalseCount": summary["true_false"],
            "topics": [
                {"id": tid, "label": labels[tid], "questionCount": c[tid]}
                for tid in sorted(c, key=lambda x: -c[x])
            ],
        }
        by_slug[rank["courseSlug"]] = entry
    # preserve order: bece, teacher, ad2-study, then ranks
    order = [
        "exam-bece-prep",
        "exam-teacher-promotion",
        "exam-ad2-study-guide",
        "exam-ad-ii",
        "exam-ad-i",
        "exam-deputy-director",
        "exam-director-ii",
        "exam-director-i",
    ]
    banks = [by_slug[s] for s in order if s in by_slug]
    for slug, entry in by_slug.items():
        if slug not in order:
            banks.append(entry)
    meta_path.write_text(json.dumps({"banks": banks}, indent=2, ensure_ascii=False) + "\n")


def update_import_reports(summaries: list[dict]) -> None:
    for path in [
        BANKS / "import-report.json",
        ROOT / "web/lib/gigalearn/academy/techBanks/import-report.json",
    ]:
        if not path.exists():
            continue
        data = json.loads(path.read_text())
        total_pub = sum(s["total"] for s in summaries)
        for s, rank in zip(summaries, RANKS):
            for b in data.get("examBanks", []):
                if b.get("courseSlug") == rank["courseSlug"] or b.get("bankId") == rank["id"]:
                    b["uniqueImportable"] = s["total"]
                    b["pendingImported"] = s["total"]
                    b["approvedImported"] = 0
                    b["freeImported"] = s["freeTier"]
                    b["premiumImported"] = max(0, s["total"] - s["freeTier"])
                    b["gapToTarget500"] = max(0, 500 - s["total"])
                    b["mcqImported"] = s["mcq"]
                    b["trueFalseImported"] = s["true_false"]
                    b["gapToTarget550"] = s["gapTo550"]
                    b["claimedAs550Unique"] = False
                    b["claimedAs500Unique"] = False
        t = data.setdefault("totals", {})
        t["promotionRankUniquePublished"] = total_pub
        t["promotionRankGapTo2500"] = max(0, 2500 - total_pub)
        t["promotionRankGapTo2750"] = max(0, 2750 - total_pub)
        t["claimedAs2500PromotionVerified"] = False
        t["claimedAs2750PromotionVerified"] = False
        # recompute exam pending roughly
        exam_pending = 0
        exam_unique = 0
        for b in data.get("examBanks", []):
            exam_pending += int(b.get("pendingImported") or 0)
            exam_unique += int(b.get("uniqueImportable") or 0)
        t["examPendingReview"] = exam_pending
        t["examUniqueImportable"] = exam_unique
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


class FooterCanvas:
    def __init__(self, short: str, label: str):
        self.short = short
        self.label = label

    def __call__(self, canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#334155"))
        canvas.drawString(
            18 * mm,
            12 * mm,
            f"GigaLearn · {self.label} ({self.short}) Practice · Not an official GES paper",
        )
        canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, f"Page {doc.page}")
        canvas.restoreState()


def build_pdf(rank: dict, summary: dict) -> Path:
    PDF_OUT.mkdir(parents=True, exist_ok=True)
    n = summary["total"]
    # Honest filename: requested 550 name only as alias note; primary uses actual count
    primary = PDF_OUT / f"GigaLearn_{rank['short'].replace(' ', '_')}_{n}_Practice_Questions_Answers.pdf"
    # Also write requested 550-named file that contains honest cover (content = actual N)
    requested = PDF_OUT / f"GigaLearn_{rank['short'].replace(' ', '_')}_550_Questions_Answers.pdf"

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0F766E"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverSub",
            fontName="Helvetica",
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyJust",
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="QStem",
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=14,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=8,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Opt",
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            leftIndent=10,
            textColor=colors.HexColor("#1E293B"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="Ans",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#14532D"),
            spaceBefore=3,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Expl",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H2",
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#115E59"),
            spaceBefore=10,
            spaceAfter=6,
        )
    )

    def story_for(path: Path):
        doc = SimpleDocTemplate(
            str(path),
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=16 * mm,
            bottomMargin=18 * mm,
            title=f"GigaLearn {rank['label']} Practice",
            author="GigaLearn / Giga3 AI",
        )
        story = []
        story.append(Spacer(1, 28 * mm))
        story.append(Paragraph("GIGALEARN · TEACHER PROMOTION PRACTICE", styles["CoverTitle"]))
        story.append(Paragraph(rank["label"], styles["CoverSub"]))
        story.append(Paragraph(f"({rank['short']})", styles["CoverSub"]))
        story.append(Spacer(1, 6 * mm))
        story.append(
            Paragraph(
                f"<b>{n} distinct practice questions</b> with answers "
                f"(target 550 · gap {summary['gapTo550']})",
                styles["CoverSub"],
            )
        )
        story.append(
            Paragraph(
                f"MCQ: {summary['mcq']} · True/False: {summary['true_false']} · "
                "Verified: 0 · Review required: all published items",
                styles["CoverSub"],
            )
        )
        story.append(Spacer(1, 8 * mm))
        story.append(
            Paragraph(
                "This is an independent GigaLearn practice resource, <b>not</b> an official "
                "Ghana Education Service examination paper, syllabus, or endorsement. "
                "Do not treat answer keys as verified legal or policy authority without "
                "checking current GES / Ministry of Education sources.",
                styles["BodyJust"],
            )
        )
        story.append(
            Paragraph(
                f"Rank focus: {rank['focus']}",
                styles["BodyJust"],
            )
        )
        story.append(
            Paragraph(
                "Honesty note: An earlier “550 questions” PDF set for this rank contained "
                "only about 84 unique stems with hundreds of exact repeats. This guide "
                "publishes <b>distinct</b> items only and reports the real shortfall to 550.",
                styles["BodyJust"],
            )
        )
        story.append(PageBreak())

        story.append(Paragraph("Contents & inventory", styles["H2"]))
        table = Table(
            [
                ["Metric", "Count"],
                ["Distinct publishable questions", str(n)],
                ["Multiple-choice (MCQ)", str(summary["mcq"])],
                ["True / False", str(summary["true_false"])],
                ["Human-verified", "0"],
                ["Pending review / SOURCE ANSWER — REVIEW REQUIRED", str(n)],
                ["Target", "550"],
                ["Gap to target", str(summary["gapTo550"])],
            ],
            colWidths=[120 * mm, 40 * mm],
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#CCFBF1")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#99F6E4")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 4 * mm))
        story.append(
            Paragraph(
                "Questions are organised in practice order. Answer keys and short explanations "
                "follow each item for study use.",
                styles["BodyJust"],
            )
        )
        story.append(PageBreak())

        story.append(Paragraph("Practice question bank", styles["H2"]))
        for i, q in enumerate(summary["questions"], start=1):
            qtype = "TRUE/FALSE" if q.get("questionType") == "true_false" else "MULTIPLE CHOICE"
            stem = (
                q["questionText"]
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )
            story.append(Paragraph(f"Question {i} · {qtype}", styles["QStem"]))
            story.append(Paragraph(stem, styles["BodyJust"]))
            letters = "ABCD"
            for idx, opt in enumerate(q["options"]):
                label = (
                    opt.upper()
                    if q.get("questionType") == "true_false"
                    else f"{letters[idx]}. {opt}"
                )
                label = (
                    label.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                )
                story.append(Paragraph(label, styles["Opt"]))
            ci = q["correctIndex"]
            if q.get("questionType") == "true_false":
                ans = q["options"][ci].upper()
            else:
                ans = f"{letters[ci]}. {q['options'][ci]}"
            ans = ans.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(f"Answer: {ans}", styles["Ans"]))
            expl = (
                (q.get("explanation") or "")
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )
            story.append(
                Paragraph(
                    f"Explanation: {expl}<br/>Verification: SOURCE ANSWER — REVIEW REQUIRED",
                    styles["Expl"],
                )
            )

        story.append(PageBreak())
        story.append(Paragraph("Source & verification note", styles["H2"]))
        story.append(
            Paragraph(
                "Items derive from GigaLearn practice banks and source study materials "
                f"(including {rank['source500Pdf']}) plus distinct stems recovered from a "
                "deduplicated GigaLearn guide draft. Keys are provisional. Ghana-specific "
                "legislation, GES functions, and promotion requirements must be confirmed "
                "against authoritative current sources before treating any item as verified fact.",
                styles["BodyJust"],
            )
        )
        footer = FooterCanvas(rank["short"], rank["label"])
        doc.build(story, onFirstPage=footer, onLaterPages=footer)

    story_for(primary)
    # Copy primary bytes to requested 550 filename (same honest content)
    requested.write_bytes(primary.read_bytes())
    return primary


def write_audit(summaries: list[dict], padded_audit: dict) -> Path:
    AUDIT.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Teacher Promotion 550 guides — content audit & rebuild",
        "",
        "## Findings on uploaded “550” PDFs",
        "",
        "Each uploaded GigaLearn `*_550_Questions_Answers*.pdf` parses to **550 numbered items**, "
        "but only **~84 unique stems** per rank. Approximately **466 items per PDF are exact "
        "repeats** of earlier questions (same wording and answer). Cross-rank sharing is high "
        f"({padded_audit.get('cross_rank_shared_stems')} shared stems; "
        f"{padded_audit.get('stems_in_all_five')} appear in all five PDFs).",
        "",
        "MCQ letter distribution is perfectly balanced (110 A/B/C/D), consistent with "
        "synthetic padding rather than independent item writing.",
        "",
        "These PDFs must **not** be advertised as 550 distinct or verified questions.",
        "",
        "## Rebuild policy",
        "",
        "1. Preserve existing live bank items and IDs.",
        "2. Import additional **exact-unique / near-unique** stems from the original rank "
        "`500` source texts and from deduplicated 550-guide stems.",
        "3. Do not pad to 550 with repeats.",
        "4. All items remain `pending_review` / `awaiting_verification` "
        "(SOURCE ANSWER — REVIEW REQUIRED) unless already human-verified.",
        "5. Publish honest counts and the gap to the 550 target.",
        "",
        "## Per-rank results after rebuild",
        "",
        "| Rank | Distinct | MCQ | True/False | Added this run | Gap to 550 |",
        "|------|---------:|----:|-----------:|---------------:|-----------:|",
    ]
    for s in summaries:
        lines.append(
            f"| {s['label']} | {s['total']} | {s['mcq']} | {s['true_false']} | "
            f"{s['added']} | {s['gapTo550']} |"
        )
    total = sum(s["total"] for s in summaries)
    lines += [
        "",
        f"**Five-rank total:** {total} distinct publishable practice items "
        f"(target 2,750 · gap {max(0, 2750 - total)}).",
        "",
        "## Remaining limitations",
        "",
        "- No newly imported item is human-verified.",
        "- Original 500 source banks themselves contain formulaic stems/explanations; "
        "near-duplicate filtering removes many but quality still requires expert review.",
        "- Reaching a defensible 550 unique items per rank needs additional authoritative "
        "source materials and human item-writing / verification — not duplication.",
        "",
    ]
    path = AUDIT / "promotion-550-content-audit.md"
    path.write_text("\n".join(lines) + "\n")
    # also copy into docs
    docs = ROOT / "docs/gigalearn/promotion-550-content-audit.md"
    docs.write_text(path.read_text())
    return path


def main() -> None:
    ARTIFACT.mkdir(parents=True, exist_ok=True)
    PDF_OUT.mkdir(parents=True, exist_ok=True)
    AUDIT.mkdir(parents=True, exist_ok=True)

    padded = {}
    padded_path = PARSED_550 / "audit-summary.json"
    if padded_path.exists():
        padded = json.loads(padded_path.read_text())

    summaries = []
    for rank in RANKS:
        print("Rebuilding", rank["id"], "...")
        summaries.append(rebuild_rank(rank))

    rebuild_meta(summaries)
    update_import_reports(summaries)
    write_audit(summaries, padded)

    pdf_paths = []
    for rank, summary in zip(RANKS, summaries):
        # strip heavy questions list before PDF uses it — PDF needs questions
        print("PDF", rank["id"], summary["total"])
        pdf_paths.append(build_pdf(rank, summary))

    zip_path = ARTIFACT / "GigaLearn_Teacher_Promotion_Practice_Guides.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(PDF_OUT.glob("*.pdf")):
            zf.write(p, arcname=p.name)

    slim = []
    for s in summaries:
        slim.append({k: v for k, v in s.items() if k != "questions"})
    (ARTIFACT / "rebuild-summary.json").write_text(
        json.dumps(
            {
                "ranks": slim,
                "totalDistinct": sum(s["total"] for s in summaries),
                "targetPerRank": 550,
                "targetTotal": 2750,
                "zip": str(zip_path),
                "pdfDir": str(PDF_OUT),
            },
            indent=2,
        )
        + "\n"
    )
    print(json.dumps({"ranks": slim, "zip": str(zip_path)}, indent=2))


if __name__ == "__main__":
    main()
