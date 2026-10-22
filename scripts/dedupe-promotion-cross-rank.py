#!/usr/bin/env python3
"""Remove exact cross-rank duplicate stems from Teacher Promotion banks.

Policy:
- Keep the first occurrence in rank order AD II → AD I → DD → D II → D I.
- Re-tier free access after dedupe (≤50 free MCQs; preserve AD2 Feb 2023 TF free).
- Refresh meta.json + import-report.json honest counts.
- Regenerate practice PDFs + ZIP with honest filenames as primary.
"""
from __future__ import annotations

import json
import re
import zipfile
from collections import Counter
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
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
PDF_OUT = ROOT / "web/public/downloads/gigalearn/promotion-guides"
ARTIFACT = Path("/opt/cursor/artifacts/promotion-cross-rank-dedupe")

RANKS = [
    {
        "id": "ad-ii",
        "short": "AD_II",
        "label": "Assistant Director II",
        "abbr": "AD II",
        "courseSlug": "exam-ad-ii",
        "bankFile": "ad-ii.json",
        "promotionRank": "assistant-director-ii",
        "source500Pdf": "assistant_director_ii_500_promotion_questions_answers_24c1.pdf",
        "focus": "Classroom practice, assessment, curriculum, professional ethics, teaching and learning.",
    },
    {
        "id": "ad-i",
        "short": "AD_I",
        "label": "Assistant Director I",
        "abbr": "AD I",
        "courseSlug": "exam-ad-i",
        "bankFile": "ad-i.json",
        "promotionRank": "assistant-director-i",
        "source500Pdf": "assistant_director_i_500_promotion_questions_answers_84eb.pdf",
        "focus": "Instructional supervision, staff development, school improvement, operational leadership.",
    },
    {
        "id": "deputy-director",
        "short": "DD",
        "label": "Deputy Director",
        "abbr": "DD",
        "courseSlug": "exam-deputy-director",
        "bankFile": "deputy-director.json",
        "promotionRank": "deputy-director",
        "source500Pdf": "deputy_director_500_promotion_questions_answers_0e4e.pdf",
        "focus": "Institutional and district management, monitoring and evaluation, resource accountability.",
    },
    {
        "id": "director-ii",
        "short": "D_II",
        "label": "Director II",
        "abbr": "D II",
        "courseSlug": "exam-director-ii",
        "bankFile": "director-ii.json",
        "promotionRank": "director-ii",
        "source500Pdf": "director_ii_500_promotion_questions_answers_4de0.pdf",
        "focus": "Strategic planning, governance, policy implementation, institutional performance.",
    },
    {
        "id": "director-i",
        "short": "D_I",
        "label": "Director I",
        "abbr": "D I",
        "courseSlug": "exam-director-i",
        "bankFile": "director-i.json",
        "promotionRank": "director-i",
        "source500Pdf": "director_i_500_promotion_questions_answers_81aa.pdf",
        "focus": "Advanced strategic leadership, organisational governance, public-sector accountability.",
    },
]


def normalize(text: str) -> str:
    s = (text or "").lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def retier(questions: list[dict]) -> None:
    free_mcq = 0
    for q in questions:
        is_tf = q.get("questionType") == "true_false"
        src = q.get("sourceDocument") or ""
        if is_tf and "AD2_28TH_FEB_2023" in src:
            q["accessTier"] = ["free"]
        elif not is_tf and free_mcq < 50:
            q["accessTier"] = ["free"]
            free_mcq += 1
        else:
            q["accessTier"] = ["premium"]


def dedupe_banks() -> list[dict]:
    seen: set[str] = set()
    summaries: list[dict] = []
    for rank in RANKS:
        path = BANKS / rank["bankFile"]
        data = json.loads(path.read_text())
        before = list(data["questions"])
        kept = []
        dropped = 0
        for q in before:
            key = normalize(q.get("questionText") or "")
            if not key or key in seen:
                dropped += 1
                continue
            seen.add(key)
            q["promotionRank"] = rank["promotionRank"]
            q["courseSlug"] = rank["courseSlug"]
            q["publicationStatus"] = "published_practice"
            kept.append(q)
        retier(kept)
        data["questions"] = kept
        data["title"] = f"GES {rank['label']} Promotion Practice"
        data["sourceDocument"] = rank["source500Pdf"]
        data["provenanceNote"] = (
            "Cross-rank exact duplicate stems removed (kept first in AD II→D I order). "
            "All items remain pending_review / awaiting_verification. Not official GES papers."
        )
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        mcq = sum(1 for q in kept if (q.get("questionType") or "mcq") == "mcq")
        tf = sum(1 for q in kept if q.get("questionType") == "true_false")
        summaries.append(
            {
                "rank": rank,
                "before": len(before),
                "after": len(kept),
                "dropped": dropped,
                "mcq": mcq,
                "tf": tf,
                "free": sum(1 for q in kept if "free" in (q.get("accessTier") or [])),
                "questions": kept,
            }
        )
        print(
            f"{rank['id']}: {len(before)} → {len(kept)} "
            f"(dropped {dropped}; mcq={mcq} tf={tf} free={summaries[-1]['free']})"
        )
    return summaries


def refresh_meta(summaries: list[dict]) -> None:
    meta_path = BANKS / "meta.json"
    meta = json.loads(meta_path.read_text())
    by_slug = {b["courseSlug"]: b for b in meta.get("banks", [])}
    for summary in summaries:
        rank = summary["rank"]
        qs = summary["questions"]
        pool = [q for q in qs if q.get("reviewStatus") in ("approved", "pending_review")]
        c = Counter(q.get("topicId") or "professional-practice" for q in pool)
        labels = {
            q.get("topicId") or "professional-practice": q.get("topicLabel")
            or "Professional practice"
            for q in pool
        }
        entry = {
            "bankId": rank["id"],
            "courseSlug": rank["courseSlug"],
            "title": f"GES {rank['label']} Promotion Practice",
            "sourceDocument": rank["source500Pdf"],
            "approvedQuestionCount": sum(1 for q in pool if q.get("reviewStatus") == "approved"),
            "pendingQuestionCount": sum(
                1 for q in pool if q.get("reviewStatus") == "pending_review"
            ),
            "mcqCount": sum(1 for q in pool if (q.get("questionType") or "mcq") == "mcq"),
            "trueFalseCount": sum(1 for q in pool if q.get("questionType") == "true_false"),
            "topics": [
                {"id": tid, "label": labels[tid], "questionCount": c[tid]}
                for tid in sorted(c.keys(), key=lambda t: (-c[t], t))
            ],
        }
        by_slug[rank["courseSlug"]] = entry
    # preserve non-rank banks order
    out = []
    seen = set()
    for b in meta.get("banks", []):
        slug = b.get("courseSlug")
        if slug in by_slug:
            out.append(by_slug[slug])
            seen.add(slug)
        else:
            out.append(b)
    for slug, entry in by_slug.items():
        if slug not in seen:
            out.append(entry)
    meta["banks"] = out
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")


def refresh_import_reports(summaries: list[dict]) -> None:
    total = sum(s["after"] for s in summaries)
    for report_path in [
        BANKS / "import-report.json",
        ROOT / "web/lib/gigalearn/academy/techBanks/import-report.json",
    ]:
        if not report_path.exists():
            continue
        rep = json.loads(report_path.read_text())
        by_slug = {b.get("courseSlug"): b for b in rep.get("examBanks", [])}
        for s in summaries:
            rank = s["rank"]
            slug = rank["courseSlug"]
            row = by_slug.get(slug) or {
                "sourceFile": rank["source500Pdf"],
                "kind": "exam",
                "bankId": rank["id"],
                "courseSlug": slug,
            }
            row.update(
                {
                    "extracted": s["before"],
                    "uniqueImportable": s["after"],
                    "approvedImported": 0,
                    "pendingImported": s["after"],
                    "freeImported": s["free"],
                    "premiumImported": max(0, s["after"] - s["free"]),
                    "mcqImported": s["mcq"],
                    "trueFalseImported": s["tf"],
                    "crossRankExactDropped": s["dropped"],
                    "gapToTarget550": max(0, 550 - s["after"]),
                    "claimedAs500Unique": False,
                    "claimedAs550Unique": False,
                    "claimedAsOfficialGes": False,
                    "sourceKind": "original_practice",
                    "verificationStatus": "awaiting_verification",
                }
            )
            by_slug[slug] = row
        rank_slugs = {s["rank"]["courseSlug"] for s in summaries}
        new_exam = []
        seen: set[str] = set()
        for b in rep.get("examBanks", []):
            slug = b.get("courseSlug")
            if slug in rank_slugs:
                new_exam.append(by_slug[slug])
                seen.add(slug)
            else:
                new_exam.append(b)
        for slug in rank_slugs:
            if slug not in seen:
                new_exam.append(by_slug[slug])
        rep["examBanks"] = new_exam
        totals = rep.setdefault("totals", {})
        pending_non_rank = sum(
            int(b.get("pendingImported") or 0)
            for b in new_exam
            if b.get("courseSlug")
            not in {r["rank"]["courseSlug"] for r in summaries}
        )
        totals["promotionRankUniquePublished"] = total
        totals["promotionRankGapTo2750"] = max(0, 2750 - total)
        totals["claimedAs2750PromotionVerified"] = False
        totals["claimedAs2500PromotionVerified"] = False
        totals["promotionRankGapTo2500"] = max(0, 2500 - total)
        # pending = teacher pending + rank pending (approx)
        teacher = next(
            (b for b in new_exam if b.get("courseSlug") == "exam-teacher-promotion"),
            None,
        )
        teacher_pending = int((teacher or {}).get("pendingImported") or 0)
        totals["examPendingReview"] = teacher_pending + total
        notes = [
            n
            for n in rep.get("notes", [])
            if not n.startswith("AD II rank bank:")
            and "Promotion ranks rebuilt" not in n
            and "Cross-rank" not in n
        ]
        notes.append(
            f"Cross-rank exact-stem dedupe: five-rank total {total} distinct "
            f"(gap to 2750: {2750 - total}). Not claimed as 550 unique per rank."
        )
        rep["notes"] = notes
        report_path.write_text(json.dumps(rep, indent=2, ensure_ascii=False) + "\n")


def xml_escape(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_pdf(rank: dict, questions: list[dict], out_path: Path) -> None:
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "CoverTitle",
        parent=styles["Title"],
        fontSize=22,
        leading=26,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#14532D"),
        spaceAfter=8,
    )
    h1 = ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontSize=14,
        textColor=colors.HexColor("#14532D"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        alignment=TA_JUSTIFY,
        spaceAfter=4,
    )
    small = ParagraphStyle(
        "Small", parent=styles["Normal"], fontSize=9, leading=12, textColor=colors.HexColor("#334155")
    )
    qstyle = ParagraphStyle("Q", parent=styles["Normal"], fontSize=10, leading=13, spaceBefore=8)

    n = len(questions)
    mcq = sum(1 for q in questions if (q.get("questionType") or "mcq") == "mcq")
    tf = n - mcq
    gap = max(0, 550 - n)

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#475569"))
        canvas.drawString(
            18 * mm,
            10 * mm,
            f"GigaLearn · {rank['label']} ({rank['abbr']}) Practice · Not an official GES paper",
        )
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"GigaLearn {rank['abbr']} Practice Questions",
        author="GigaLearn",
    )
    story = []
    story.append(Paragraph("GIGALEARN · TEACHER PROMOTION PRACTICE", title))
    story.append(Paragraph(f"<b>{xml_escape(rank['label'])} ({xml_escape(rank['abbr'])})</b>", h1))
    story.append(
        Paragraph(
            f"<b>{n} distinct practice questions</b> with answers "
            f"(target 550 · gap {gap})<br/>MCQ: {mcq} · True/False: {tf} · "
            f"Verified: 0 · Review required: all published items",
            body,
        )
    )
    story.append(
        Paragraph(
            "This is an independent GigaLearn practice resource, not an official Ghana Education "
            "Service examination paper. Cross-rank duplicate stems were removed so the same "
            "question is not counted in multiple rank banks. Answer keys remain "
            "<b>SOURCE ANSWER — REVIEW REQUIRED</b>.",
            small,
        )
    )
    story.append(Paragraph(f"Rank focus: {xml_escape(rank['focus'])}", small))
    story.append(Spacer(1, 8))
    story.append(PageBreak())
    story.append(Paragraph("Contents &amp; inventory", h1))
    table = Table(
        [
            ["Metric", "Count"],
            ["Distinct publishable questions", str(n)],
            ["Multiple-choice (MCQ)", str(mcq)],
            ["True / False", str(tf)],
            ["Human-verified", "0"],
            ["Pending review / SOURCE ANSWER — REVIEW REQUIRED", str(n)],
            ["Target", "550"],
            ["Gap to target", str(gap)],
        ],
        colWidths=[120 * mm, 40 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#14532D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]
        )
    )
    story.append(table)
    story.append(PageBreak())
    story.append(Paragraph("Practice question bank", h1))

    for i, q in enumerate(questions, 1):
        qtype = q.get("questionType") or "mcq"
        label = "TRUE / FALSE" if qtype == "true_false" else "MULTIPLE CHOICE"
        story.append(
            Paragraph(f"<b>Question {i} · {label}</b><br/>{xml_escape(q.get('questionText') or '')}", qstyle)
        )
        opts = q.get("options") or []
        ci = int(q.get("correctIndex") or 0)
        if qtype == "true_false":
            story.append(Paragraph("A. True<br/>B. False", small))
            ans = "TRUE" if ci == 0 else "FALSE"
        else:
            letters = "ABCD"
            lines = "<br/>".join(
                f"{letters[j]}. {xml_escape(str(opts[j]))}" for j in range(min(4, len(opts)))
            )
            story.append(Paragraph(lines, small))
            ans = f"{letters[ci]}. {xml_escape(str(opts[ci]))}" if 0 <= ci < len(opts) else "?"
        story.append(Paragraph(f"<b>Answer:</b> {ans}", small))
        expl = q.get("explanation") or ""
        if expl:
            story.append(Paragraph(f"<b>Explanation:</b> {xml_escape(expl)}", small))
        story.append(Paragraph("Verification: SOURCE ANSWER — REVIEW REQUIRED", small))

    story.append(PageBreak())
    story.append(Paragraph("Source &amp; verification note", h1))
    story.append(
        Paragraph(
            "Practice resource only. Exact duplicate stems shared across ranks were removed "
            "in the {n}-item published set for this rank. No item in this guide is labelled "
            "human-verified. Do not cite these keys as official GES examination answers.".format(n=n),
            body,
        )
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def regenerate_pdfs(summaries: list[dict]) -> None:
    PDF_OUT.mkdir(parents=True, exist_ok=True)
    ARTIFACT.mkdir(parents=True, exist_ok=True)
    written = []
    for s in summaries:
        rank = s["rank"]
        n = s["after"]
        honest = PDF_OUT / f"GigaLearn_{rank['short']}_{n}_Practice_Questions_Answers.pdf"
        alias = PDF_OUT / f"GigaLearn_{rank['short']}_550_Questions_Answers.pdf"
        build_pdf(rank, s["questions"], honest)
        # Alias keeps old bookmarks working; bytes identical to honest-count file.
        alias.write_bytes(honest.read_bytes())
        written.append(honest.name)
        written.append(alias.name)
        print("PDF", honest.name, honest.stat().st_size)
    zip_path = PDF_OUT / "GigaLearn_Teacher_Promotion_Practice_Guides.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name in written:
            zf.write(PDF_OUT / name, arcname=name)
    print("ZIP", zip_path, zip_path.stat().st_size)
    # audit note
    audit = ARTIFACT / "cross-rank-dedupe-report.md"
    lines = [
        "# Cross-rank promotion bank dedupe",
        "",
        "| Rank | Before | After | Dropped | MCQ | TF |",
        "|------|-------:|------:|--------:|----:|---:|",
    ]
    for s in summaries:
        lines.append(
            f"| {s['rank']['abbr']} | {s['before']} | {s['after']} | {s['dropped']} | {s['mcq']} | {s['tf']} |"
        )
    lines += [
        "",
        f"**Five-rank total after dedupe:** {sum(s['after'] for s in summaries)} "
        f"(was {sum(s['before'] for s in summaries)}).",
        "",
        "Primary download filenames use actual counts (`*_N_Practice_Questions_Answers.pdf`). "
        "`*_550_Questions_Answers.pdf` aliases remain byte-identical for old links and are "
        "**not** a claim of 550 distinct questions.",
    ]
    audit.write_text("\n".join(lines) + "\n")


def main() -> None:
    summaries = dedupe_banks()
    refresh_meta(summaries)
    refresh_import_reports(summaries)
    regenerate_pdfs(summaries)
    print("TOTAL", sum(s["after"] for s in summaries))


if __name__ == "__main__":
    main()
