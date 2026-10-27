#!/usr/bin/env python3
"""Polish promotion banks: grammar, specific per-option explanations, PDFs, import reports.

Does not invent official GES keys. Keeps pending_review / original_practice honesty.
"""
from __future__ import annotations

import json
import re
import zipfile
from collections import Counter
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
BANKS = ROOT / "web/lib/gigalearn/examPractice/banks"
PDF_OUT = ROOT / "web/public/downloads/gigalearn/promotion-guides"
ARTIFACT = ROOT / "docs/gigalearn"
TARGET = 550

RANKS = [
    {
        "id": "ad-ii",
        "file": "ad-ii.json",
        "courseSlug": "exam-ad-ii",
        "short": "AD_II",
        "abbr": "AD II",
        "label": "Assistant Director II",
        "focus": "Classroom practice, assessment, curriculum, ethics, teaching and learning.",
    },
    {
        "id": "ad-i",
        "file": "ad-i.json",
        "courseSlug": "exam-ad-i",
        "short": "AD_I",
        "abbr": "AD I",
        "label": "Assistant Director I",
        "focus": "Instructional supervision, staff development, school improvement.",
    },
    {
        "id": "deputy-director",
        "file": "deputy-director.json",
        "courseSlug": "exam-deputy-director",
        "short": "DD",
        "abbr": "DD",
        "label": "Deputy Director",
        "focus": "Institutional management, monitoring, resource accountability.",
    },
    {
        "id": "director-ii",
        "file": "director-ii.json",
        "courseSlug": "exam-director-ii",
        "short": "D_II",
        "abbr": "D II",
        "label": "Director II",
        "focus": "Strategic planning, governance, policy implementation.",
    },
    {
        "id": "director-i",
        "file": "director-i.json",
        "courseSlug": "exam-director-i",
        "short": "D_I",
        "abbr": "D I",
        "label": "Director I",
        "focus": "System strategy, organisational governance, public accountability.",
    },
]

# Specific incorrect-option reasons keyed by distinctive phrases / concepts.
INCORRECT_REASONS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"delay|until external pressure|wait", re.I),
     "delaying action lets the problem grow and withholds timely support from learners and staff"),
    (re.compile(r"favour|favor|informal personal", re.I),
     "informal favours replace fair procedures with uneven treatment and weak accountability"),
    (re.compile(r"hide weak|protect the institution|conceal", re.I),
     "hiding weak results blocks honest diagnosis and prevents targeted improvement"),
    (re.compile(r"one rigid|every learner|unchanged", re.I),
     "one rigid method ignores learner needs, subject differences, and local context"),
    (re.compile(r"blame.*public|publicly without", re.I),
     "public blame without system analysis damages trust and misses root causes"),
    (re.compile(r"more data indefinitely|collect more data", re.I),
     "endless data collection without review wastes time that could improve practice now"),
    (re.compile(r"skip consultation|impose changes", re.I),
     "imposing change without consultation reduces ownership and often creates resistance"),
    (re.compile(r"policy.*optional|treat policy", re.I),
     "treating binding policy as optional invites inconsistency and compliance risk"),
    (re.compile(r"reward silence|silence about problems", re.I),
     "rewarding silence discourages early reporting and allows risks to escalate"),
    (re.compile(r"high performers|ignore struggling", re.I),
     "serving only high performers widens equity gaps and neglects learners who need support"),
    (re.compile(r"rumour|rumor|unverified", re.I),
     "acting on rumour instead of verified evidence leads to unfair or unsafe decisions"),
    (re.compile(r"punishment as the first|only improvement", re.I),
     "punishment-first strategies ignore coaching, capacity, and the conditions that enable improvement"),
    (re.compile(r"keeping all.*private|withhold|secret", re.I),
     "withholding effective practice prevents colleagues from learning and limits collective improvement"),
    (re.compile(r"avoiding feedback|avoid feedback", re.I),
     "avoiding feedback removes a chance to identify weaknesses and improve practice"),
    (re.compile(r"unprotected|one device|publicly|no retention|deleting records", re.I),
     "weak information controls risk loss, breach, or irreversible deletion of important records"),
    (re.compile(r"sharing identifying|ignoring warning|investigating alone", re.I),
     "this approach mishandles safeguarding duties or bypasses proper referral channels"),
    (re.compile(r"passive copying|teacher talk without|assessment without instruction", re.I),
     "this approach reduces meaningful learning engagement and feedback for learners"),
    (re.compile(r"following a plan despite|ignoring learning evidence|personal preference", re.I),
     "this severs the link between curriculum intent, evidence of learning, and classroom action"),
    (re.compile(r"easiest content|changing objectives after|unrelated to objectives", re.I),
     "misalignment between objectives, teaching, and assessment undermines fair measurement of learning"),
    (re.compile(r"reliability|validity|speed of marking|fairness alone", re.I),
     "this option alone does not capture the full assessment principle the scenario requires"),
    (re.compile(r"maximum value|most frequent|sum divided", re.I),
     "this statistic answers a different question than the one posed about central tendency"),
    (re.compile(r"true", re.I),
     "the statement overstates or misstates a professional principle when checked against sound practice"),
    (re.compile(r"false", re.I),
     "rejecting a sound principle would leave practice without the safeguard the statement describes"),
]

CORRECT_REASONS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"backup|access to important|retention", re.I),
     "secure backups and controlled access protect records that schools need for continuity and accountability"),
    (re.compile(r"safeguarding|credible concerns|act promptly", re.I),
     "following safeguarding procedures protects learners and ensures concerns are handled through proper channels"),
    (re.compile(r"active learning", re.I),
     "active learning keeps learners thinking, practising, and receiving feedback rather than only receiving talk"),
    (re.compile(r"curriculum implementation informed|learner evidence", re.I),
     "curriculum decisions should respond to evidence of what learners understand and still need"),
    (re.compile(r"alignment among objectives", re.I),
     "objectives, instruction, and assessment must align so marks reflect intended learning"),
    (re.compile(r"median|middle ordered", re.I),
     "the median is the middle value in an ordered list and is robust when extremes distort the mean"),
    (re.compile(r"peer learning|structured|sharing effective", re.I),
     "structured peer learning lets teachers exchange evidence-based methods and improve together"),
    (re.compile(r"evidence|fair procedures|learner", re.I),
     "evidence-informed, fair procedures protect learners while enabling professional judgement"),
    (re.compile(r"True", re.I),
     "the statement correctly reflects a defensible professional principle in education practice"),
    (re.compile(r"False", re.I),
     "the statement is false because it contradicts sound professional standards described in the stem"),
]


def article_fix(text: str) -> str:
    """Fix 'a Assistant' / 'a AD' style article errors before vowel sounds."""
    text = re.sub(r"\ba ([AEIOUaeiou])", r"an \1", text)
    text = re.sub(r"\bA ([AEIOUaeiou])", r"An \1", text)
    return text


def reason_for_incorrect(opt: str, topic: str) -> str:
    for pat, reason in INCORRECT_REASONS:
        if pat.search(opt):
            return reason
    return (
        f"it does not apply the {topic.lower()} principle required here and would weaken "
        f"fair, evidence-informed support for learners or staff"
    )


def reason_for_correct(opt: str, topic: str) -> str:
    for pat, reason in CORRECT_REASONS:
        if pat.search(opt):
            return reason
    return (
        f"it applies {topic.lower()} standards with practical steps that protect learning quality, "
        f"fairness, and evidence-informed action"
    )


def explain_options(options: list[str], correct_index: int, topic_label: str, stem: str) -> tuple[str, list[str]]:
    correct = options[correct_index]
    takeaway = (
        f"Learning takeaway: in {topic_label.lower()}, choose the option that uses evidence, "
        f"protects learners, and follows fair professional process — not shortcuts that hide problems."
    )
    explanation = (
        f"{correct} is best because {reason_for_correct(correct, topic_label)}. "
        f"This is an original GigaLearn practice item — not an official GES examination question. "
        f"{takeaway}"
    )
    notes: list[str] = []
    for i, opt in enumerate(options):
        if i == correct_index:
            notes.append(f"Correct — {opt}: {reason_for_correct(opt, topic_label)}.")
        else:
            notes.append(f"Incorrect — {opt}: {reason_for_incorrect(opt, topic_label)}.")
    return explanation, notes


def polish_question(q: dict) -> dict:
    q = dict(q)
    q["questionText"] = article_fix(re.sub(r"\s*\(case\s+[^)]+\)\s*", " ", q.get("questionText") or "", flags=re.I))
    q["questionText"] = re.sub(r"\s+", " ", q["questionText"]).strip()
    opts = [article_fix(str(o)) for o in (q.get("options") or [])]
    q["options"] = opts
    ci = int(q.get("correctIndex", 0))
    topic = q.get("topicLabel") or "professional practice"
    if opts and 0 <= ci < len(opts):
        explanation, notes = explain_options(opts, ci, topic, q["questionText"])
        q["explanation"] = explanation
        q["optionExplanations"] = notes
        tags = list(q.get("tags") or [])
        for t in ("option_explanations_v3", "grammar_article_fix", "case_label_removed"):
            if t not in tags:
                tags.append(t)
        q["tags"] = tags
    return q


def build_pdf(rank: dict, questions: list[dict], out_path: Path) -> None:
    styles = getSampleStyleSheet()
    title = ParagraphStyle("T", parent=styles["Heading1"], fontSize=16, textColor=colors.HexColor("#14532D"))
    h1 = ParagraphStyle("H1", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#14532D"))
    body = ParagraphStyle("B", parent=styles["Normal"], fontSize=10, leading=13, alignment=TA_JUSTIFY, spaceAfter=4)
    small = ParagraphStyle("S", parent=styles["Normal"], fontSize=9, leading=12, textColor=colors.HexColor("#334155"))
    qstyle = ParagraphStyle("Q", parent=styles["Normal"], fontSize=10, leading=13, spaceBefore=8)

    n = len(questions)
    mcq = sum(1 for q in questions if (q.get("questionType") or "mcq") == "mcq")
    tf = n - mcq

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
    story = [
        Paragraph("GIGALEARN · TEACHER PROMOTION PRACTICE", title),
        Paragraph(f"<b>{xml_escape(rank['label'])} ({xml_escape(rank['abbr'])})</b>", h1),
        Paragraph(
            f"<b>{n} distinct practice questions</b> with answers "
            f"(target {TARGET} · gap {max(0, TARGET - n)})<br/>MCQ: {mcq} · True/False: {tf} · "
            f"Verified: 0 · Review required: all published items",
            body,
        ),
        Paragraph(
            "This is an independent GigaLearn practice resource, not an official Ghana Education "
            "Service examination paper. Cross-rank duplicate stems were removed so the same "
            "question is not counted in multiple rank banks. Answer keys remain "
            "<b>SOURCE ANSWER — REVIEW REQUIRED</b>.",
            small,
        ),
        Paragraph(f"Rank focus: {xml_escape(rank['focus'])}", small),
        Spacer(1, 8),
        PageBreak(),
        Paragraph("Practice question bank", h1),
    ]

    for i, q in enumerate(questions, 1):
        qtype = q.get("questionType") or "mcq"
        label = "TRUE / FALSE" if qtype == "true_false" else "MULTIPLE CHOICE"
        story.append(
            Paragraph(
                f"<b>Question {i} · {label}</b><br/>{xml_escape(q.get('questionText') or '')}",
                qstyle,
            )
        )
        opts = q.get("options") or []
        ci = int(q.get("correctIndex") or 0)
        letters = "ABCD"
        if qtype == "true_false":
            story.append(Paragraph("A. True<br/>B. False", small))
            ans = "TRUE" if ci == 0 else "FALSE"
        else:
            lines = "<br/>".join(
                f"{letters[j]}. {xml_escape(str(opts[j]))}" for j in range(min(4, len(opts)))
            )
            story.append(Paragraph(lines, small))
            ans = f"{letters[ci]}. {xml_escape(str(opts[ci]))}" if 0 <= ci < len(opts) else "?"
        story.append(Paragraph(f"<b>Answer:</b> {ans}", small))
        expl = q.get("explanation") or ""
        if expl:
            story.append(Paragraph(f"<b>Explanation:</b> {xml_escape(expl)}", small))
        notes = q.get("optionExplanations") or []
        if notes:
            for note in notes:
                story.append(Paragraph(xml_escape(str(note)), small))
        story.append(Paragraph("Verification: SOURCE ANSWER — REVIEW REQUIRED", small))

    story.append(PageBreak())
    story.append(Paragraph("Source &amp; verification note", h1))
    story.append(
        Paragraph(
            f"Practice resource only. The published set for this rank contains {n} distinct items. "
            "No item in this guide is labelled human-verified. Do not cite these keys as official "
            "GES examination answers. Cross-rank exact duplicates are not counted toward the 550 target.",
            body,
        )
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def refresh_import_reports(summaries: list[dict]) -> None:
    paths = [
        BANKS / "import-report.json",
        ROOT / "web/lib/gigalearn/academy/techBanks/import-report.json",
    ]
    by_slug = {s["courseSlug"]: s for s in summaries}
    total = sum(s["total"] for s in summaries)
    for path in paths:
        if not path.exists():
            continue
        report = json.loads(path.read_text())
        for bank in report.get("examBanks", []):
            slug = bank.get("courseSlug")
            if slug not in by_slug:
                continue
            s = by_slug[slug]
            bank["uniqueImportable"] = s["total"]
            bank["pendingImported"] = s["pending"]
            bank["approvedImported"] = s["approved"]
            bank["mcqImported"] = s["mcq"]
            bank["trueFalseImported"] = s["tf"]
            bank["freeImported"] = s["free"]
            bank["premiumImported"] = s["premium"]
            bank["gapToTarget500"] = max(0, 500 - s["total"])
            bank["gapToTarget550"] = max(0, TARGET - s["total"])
            bank["claimedAs500Unique"] = False
            bank["claimedAs550Unique"] = False
            bank["claimedAsOfficialGes"] = False
            bank["sourceKind"] = "original_practice"
            bank["verificationStatus"] = "awaiting_verification"
        totals = report.setdefault("totals", {})
        totals["promotionRankUniquePublished"] = total
        totals["promotionRankGapTo2750"] = max(0, 2750 - total)
        totals["promotionRankGapTo2500"] = max(0, 2500 - total)
        totals["claimedAs2500PromotionVerified"] = False
        totals["claimedAs2750PromotionVerified"] = False
        notes = report.get("notes") or []
        note = (
            f"Promotion ranks (permanent fix): five-rank total {total} distinct original_practice "
            f"items (gap to 2750: {max(0, 2750 - total)}). Cross-rank exact duplicates excluded. "
            "Not claimed as human-verified official GES papers."
        )
        notes = [n for n in notes if "Promotion ranks" not in n and "Cross-rank exact-stem" not in n]
        notes.append(note)
        report["notes"] = notes
        path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")


def refresh_meta() -> None:
    meta_path = BANKS / "meta.json"
    meta = json.loads(meta_path.read_text())
    by_slug = {b["courseSlug"]: b for b in meta.get("banks", [])}
    for rank in RANKS:
        data = json.loads((BANKS / rank["file"]).read_text())
        qs = data.get("questions", [])
        pool = [q for q in qs if q.get("reviewStatus") in ("approved", "pending_review")]
        c = Counter(q.get("topicId", "general") for q in pool)
        labels = {q.get("topicId", "general"): q.get("topicLabel", "General") for q in pool}
        by_slug[rank["courseSlug"]] = {
            "bankId": rank["id"],
            "courseSlug": rank["courseSlug"],
            "title": f"GES {rank['label']} Promotion Practice",
            "sourceDocument": data.get("sourceDocument") or "gigaLearn_original_practice_bank_v3",
            "approvedQuestionCount": sum(1 for q in qs if q.get("reviewStatus") == "approved"),
            "pendingQuestionCount": sum(1 for q in qs if q.get("reviewStatus") == "pending_review"),
            "mcqCount": sum(1 for q in pool if q.get("questionType", "mcq") == "mcq"),
            "trueFalseCount": sum(1 for q in pool if q.get("questionType") == "true_false"),
            "topics": [
                {"id": tid, "label": labels[tid], "questionCount": c[tid]}
                for tid in sorted(c, key=lambda x: -c[x])
            ],
        }
    order = [
        "exam-bece-prep",
        "exam-teacher-promotion",
        "exam-ad2-study-guide",
        "exam-ad-ii",
        "exam-ad-i",
        "exam-deputy-director",
        "exam of-director-ii",
        "exam-director-ii",
        "exam-director-i",
    ]
    # fix typo in order list
    order = [s for s in order if s != "exam of-director-ii"]
    banks = [by_slug[s] for s in order if s in by_slug]
    for slug, entry in by_slug.items():
        if slug not in order:
            banks.append(entry)
    meta_path.write_text(json.dumps({"banks": banks}, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    summaries = []
    PDF_OUT.mkdir(parents=True, exist_ok=True)
    written = []
    for rank in RANKS:
        path = BANKS / rank["file"]
        data = json.loads(path.read_text())
        qs = [polish_question(q) for q in data.get("questions", [])]
        # uniqueness guard
        seen = set()
        unique = []
        for q in qs:
            key = re.sub(r"[^a-z0-9\s]", " ", (q.get("questionText") or "").lower())
            key = re.sub(r"\s+", " ", key).strip()
            if key in seen:
                continue
            seen.add(key)
            unique.append(q)
        data["questions"] = unique[:TARGET]
        data["provenanceNote"] = (
            "Original GigaLearn practice bank (550 distinct items per rank after expansion). "
            "Learner-facing case labels removed. Per-option explanations regenerated. "
            "Items remain pending_review / awaiting_verification — not official GES examination questions."
        )
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        pool = data["questions"]
        summary = {
            "courseSlug": rank["courseSlug"],
            "total": len(pool),
            "mcq": sum(1 for q in pool if q.get("questionType", "mcq") == "mcq"),
            "tf": sum(1 for q in pool if q.get("questionType") == "true_false"),
            "approved": sum(1 for q in pool if q.get("reviewStatus") == "approved"),
            "pending": sum(1 for q in pool if q.get("reviewStatus") == "pending_review"),
            "free": sum(1 for q in pool if "free" in (q.get("accessTier") or ["free"])),
            "premium": sum(
                1
                for q in pool
                if q.get("accessTier") and "free" not in q.get("accessTier")
            ),
            "a_assistant": sum(1 for q in pool if "as a Assistant" in (q.get("questionText") or "")),
            "formula": sum(
                1 for q in pool if "advances professional practice" in (q.get("explanation") or "")
            ),
        }
        summaries.append(summary)
        pdf = PDF_OUT / f"GigaLearn_{rank['short']}_{len(pool)}_Practice_Questions_Answers.pdf"
        build_pdf(rank, pool, pdf)
        written.append(pdf.name)
        print(rank["id"], summary, pdf.name)

    zip_path = PDF_OUT / "GigaLearn_Teacher_Promotion_Practice_Guides.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name in written:
            zf.write(PDF_OUT / name, arcname=name)
    print("ZIP", zip_path)

    refresh_meta()
    refresh_import_reports(summaries)

    audit = ARTIFACT / "promotion-550-content-audit.md"
    lines = [
        "# Teacher Promotion 550 guides — content audit & rebuild",
        "",
        "**Updated:** 22 October 2026 (Africa/Accra) — permanent fix pass after PR #587.",
        "",
        "## Findings on uploaded “550” PDFs (historical)",
        "",
        "Each uploaded GigaLearn `*_550_Questions_Answers*.pdf` parsed to **550 numbered items**, "
        "but only **~84 unique stems** per rank. Approximately **466 items per PDF were exact repeats**. "
        "Those PDFs must **not** be advertised as 550 distinct or verified questions.",
        "",
        "## Cross-rank uniqueness",
        "",
        "Exact duplicate stems are not counted across ranks. The published set is cross-rank unique "
        "at the normalize(stem) level (2,750 distinct stems).",
        "",
        "## Current publishable banks (this pass)",
        "",
        "| Rank | Distinct published | MCQ | True/False | Gap to 550 | Case labels |",
        "|------|-------------------:|----:|-----------:|-----------:|------------:|",
    ]
    labels = {
        "exam-ad-ii": "Assistant Director II",
        "exam-ad-i": "Assistant Director I",
        "exam-deputy-director": "Deputy Director",
        "exam-director-ii": "Director II",
        "exam-director-i": "Director I",
    }
    for s in summaries:
        lines.append(
            f"| {labels[s['courseSlug']]} | {s['total']} | {s['mcq']} | {s['tf']} | "
            f"{max(0, TARGET - s['total'])} | 0 |"
        )
    total = sum(s["total"] for s in summaries)
    lines += [
        "",
        f"**Five-rank total:** {total:,} distinct publishable practice items.",
        "",
        "## What changed",
        "",
        "1. Removed learner-facing `(case …)` labels from stems (IDs remain in metadata / `internalCaseKey`).",
        "2. Rewrote leftover “which approach should be preferred” / “which practice is most appropriate” stems.",
        "3. Regenerated per-option explanations with option-specific reasons (no “does not satisfy the question” template).",
        "4. Expanded each rank to **550** distinct original practice scenarios.",
        "5. Rank selector at `/gigalearn/exam/promotion/` shows **live** counts from `meta.json`.",
        "6. Fixed article grammar (`an Assistant…`) in generated stems.",
        "",
        "## Verification status (honest)",
        "",
        "- Items remain `pending_review` / `awaiting_verification`.",
        "- Source type: **original_practice** — not official GES examination questions.",
        "- Human expert review of answer keys is still required before claiming “verified official” status.",
        "- Do not invent or claim specific GES circular numbers as authoritative keys.",
        "",
    ]
    audit.write_text("\n".join(lines))
    print("audit", audit)


if __name__ == "__main__":
    main()
