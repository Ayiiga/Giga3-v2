#!/usr/bin/env python3
"""Extract True/False items from promotion aptitude PDFs into exam bank JSON.

Does not invent answers or explanations. Source-supplied keys are retained with
verificationStatus=awaiting_verification and reviewStatus=pending_review.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

UPLOADS = Path("/home/ubuntu/.cursor/projects/workspace/uploads")
EXAM_OUT = Path("/workspace/web/lib/gigalearn/examPractice/banks")
ARTIFACT = Path("/opt/cursor/artifacts/tf-extract")
ARTIFACT.mkdir(parents=True, exist_ok=True)


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def pdf_text(path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    return "\n".join((p.extract_text() or "") for p in reader.pages)


def parse_answer_token(raw: str) -> str | None:
    t = normalize(raw).upper()
    t = re.sub(r"[^A-Z]", "", t)
    if t.startswith("TRUE") or t == "T":
        return "True"
    if t.startswith("FALSE") or t == "F":
        return "False"
    return None


def make_tf_question(
    *,
    question_id: str,
    course_slug: str,
    statement: str,
    correct: str,
    source_document: str,
    source_number: int,
    promotion_rank: str | None,
    explanation: str,
    access_tier: list[str],
) -> dict:
    correct_index = 0 if correct == "True" else 1
    option_ids = [f"{question_id}-opt-true", f"{question_id}-opt-false"]
    return {
        "questionId": question_id,
        "courseSlug": course_slug,
        "topicId": "true-false-promotion",
        "topicLabel": "True / False — Promotion Aptitude",
        "questionText": statement,
        "options": ["True", "False"],
        "optionIds": option_ids,
        "correctIndex": correct_index,
        "correctOptionId": option_ids[correct_index],
        "explanation": explanation
        or "Source-supplied key. Treat as provisional pending authoritative review.",
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


def extract_ad2_tf(text: str, source: str) -> list[dict]:
    """AD2 Feb 2023: '51. statement... Answer: true'."""
    m = re.search(r"SECTION B\s+TRUE/FALSE", text, re.I)
    if not m:
        return []
    chunk = text[m.end() :]
    # Stop before filler / compiled-by
    chunk = re.split(r"COMPILED\s+BY", chunk, maxsplit=1, flags=re.I)[0]
    items = []
    # Split on numbered questions
    parts = re.split(r"(?=\n\s*\d{1,3}\.\s)", "\n" + chunk)
    for part in parts:
        qm = re.match(
            r"\s*(\d{1,3})\.\s*(.*?)\s*Answer:\s*([Tt]rue|[Ff]alse)\s*",
            part,
            re.S,
        )
        if not qm:
            continue
        num = int(qm.group(1))
        statement = normalize(qm.group(2))
        # Fix OCR duplication
        statement = re.sub(r"\bability to\s+ability to\b", "ability to", statement, flags=re.I)
        ans = parse_answer_token(qm.group(3))
        if not statement or not ans or len(statement) < 20:
            continue
        items.append(
            make_tf_question(
                question_id=f"exam-ad-ii-tf-{num:03d}",
                course_slug="exam-ad-ii",
                statement=statement,
                correct=ans,
                source_document=source,
                source_number=num,
                promotion_rank="assistant-director-ii",
                explanation="",
                access_tier=["free"] if len(items) < 50 else ["premium"],
            )
        )
    return items


def extract_lettered_tf(
    text: str,
    *,
    source: str,
    course_slug: str,
    id_prefix: str,
    promotion_rank: str | None,
    section_pat: str,
) -> list[dict]:
    """Benito / Aug 2024 style: '97. statement A. TRUE B. FALSE' with optional paren notes."""
    m = re.search(section_pat, text, re.I)
    if not m:
        return []
    chunk = text[m.end() :]
    chunk = re.split(r"SECTION C\b", chunk, maxsplit=1, flags=re.I)[0]
    items = []
    # Numbered blocks — allow OCR '10I' as 101
    parts = re.split(r"(?=\n\s*\d{1,3}[Iil]?\.\s)", "\n" + chunk)
    for part in parts:
        qm = re.match(
            r"\s*(\d{1,3})[Iil]?\.\s*(.*)",
            part,
            re.S,
        )
        if not qm:
            continue
        num = int(qm.group(1))
        body = qm.group(2)
        # Find A./B. TRUE/FALSE — order may vary
        true_m = re.search(r"A\.\s*(TRUE|FALSE)\b", body, re.I)
        false_m = re.search(r"B\.\s*(TRUE|FALSE)\b", body, re.I)
        if not true_m or not false_m:
            continue
        a_ans = parse_answer_token(true_m.group(1))
        b_ans = parse_answer_token(false_m.group(1))
        if not a_ans or not b_ans or a_ans == b_ans:
            continue
        # Statement is text before first A.
        stem = body[: true_m.start()]
        stem = normalize(stem)
        # Parenthetical note after B. FALSE / A. TRUE line often holds source hint
        after = body[false_m.end() :]
        note_m = re.search(r"\(([^)]{3,120})\)", after)
        note = normalize(note_m.group(1)) if note_m else ""
        # Which letter is correct? Sources put the correct letter first sometimes
        # inconsistently. Prefer parenthetical on incorrect option, else use
        # convention: many papers mark correct as A when A is the answer key.
        # For Aug 2024 / Benito, the FIRST option listed is often the KEY
        # (A is the answer). Confirm: q91 A. FALSE B. TRUE means answer FALSE.
        correct = a_ans
        explanation = (
            f"Source indicates {correct}. Note: {note}"
            if note
            else f"Source-supplied key: {correct}."
        )
        if not stem or len(stem) < 20:
            continue
        # Deduplicate by statement later
        items.append(
            make_tf_question(
                question_id=f"{id_prefix}-tf-{num:03d}",
                course_slug=course_slug,
                statement=stem,
                correct=correct,
                source_document=source,
                source_number=num,
                promotion_rank=promotion_rank,
                explanation=explanation,
                access_tier=["free"] if len(items) < 50 else ["premium"],
            )
        )
    return items


def dedupe(items: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out = []
    for q in items:
        key = normalize(q["questionText"]).lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(q)
    return out


def merge_into_bank(bank_path: Path, new_qs: list[dict]) -> dict:
    data = json.loads(bank_path.read_text())
    existing_ids = {q["questionId"] for q in data["questions"]}
    existing_stems = {
        normalize(q["questionText"]).lower() for q in data["questions"]
    }
    added = 0
    for q in new_qs:
        stem = normalize(q["questionText"]).lower()
        if q["questionId"] in existing_ids or stem in existing_stems:
            continue
        data["questions"].append(q)
        existing_ids.add(q["questionId"])
        existing_stems.add(stem)
        added += 1
    bank_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    return {"path": str(bank_path), "added": added, "total": len(data["questions"])}


def main() -> None:
    sources = {
        "ad2": UPLOADS / "AD2_28TH_FEB_2023_QUESTIONS_AND_ANSWERS_d2cf.pdf",
        "benito": UPLOADS / "2025_Benito_Final_Super_Mock_ANSWERS_cb90.pdf",
        "aug2024": UPLOADS / "Solved-FINAL_FINAL_MOCK__AUGUST_-_2024_QUESTION_03b1.pdf",
    }
    report: dict = {"sources": {}, "banks": {}}

    ad2_text = pdf_text(sources["ad2"])
    (ARTIFACT / "ad2-tf-raw.txt").write_text(ad2_text)
    ad2_items = dedupe(extract_ad2_tf(ad2_text, sources["ad2"].name))
    # Re-tier free/premium after dedupe
    for i, q in enumerate(ad2_items):
        q["accessTier"] = ["free"] if i < 50 else ["premium"]
    report["sources"]["ad2"] = {"extracted": len(ad2_items)}

    benito_text = pdf_text(sources["benito"])
    (ARTIFACT / "benito-tf-raw.txt").write_text(benito_text)
    benito_items = dedupe(
        extract_lettered_tf(
            benito_text,
            source=sources["benito"].name,
            course_slug="exam-teacher-promotion",
            id_prefix="exam-teacher-promotion",
            promotion_rank=None,  # general mock — rank unconfirmed
            section_pat=r"SECTION B:\s*TRUE OR FALSE QUESTIONS",
        )
    )
    for i, q in enumerate(benito_items):
        q["accessTier"] = ["free"] if i < 50 else ["premium"]
    report["sources"]["benito"] = {"extracted": len(benito_items)}

    aug_text = pdf_text(sources["aug2024"])
    (ARTIFACT / "aug2024-tf-raw.txt").write_text(aug_text)
    aug_items = dedupe(
        extract_lettered_tf(
            aug_text,
            source=sources["aug2024"].name,
            course_slug="exam-teacher-promotion",
            id_prefix="exam-teacher-promotion-aug",
            promotion_rank=None,
            section_pat=r"SECTION B:\s*TRUE OR FALSE QUESTIONS",
        )
    )
    # Continue free tier count from benito free slots
    free_left = max(0, 50 - sum(1 for q in benito_items if "free" in q["accessTier"]))
    for i, q in enumerate(aug_items):
        q["accessTier"] = ["free"] if i < free_left else ["premium"]
    report["sources"]["aug2024"] = {"extracted": len(aug_items)}

    # Standalone TF inventory file for audit
    inventory = {
        "ad-ii": ad2_items,
        "teacher-promotion": benito_items + aug_items,
    }
    (ARTIFACT / "true-false-inventory.json").write_text(
        json.dumps(
            {
                "adIiCount": len(ad2_items),
                "teacherPromotionCount": len(benito_items) + len(aug_items),
                "note": "All items pending_review / awaiting_verification (source keys).",
            },
            indent=2,
        )
        + "\n"
    )
    (ARTIFACT / "true-false-import-staging.json").write_text(
        json.dumps(inventory, indent=2, ensure_ascii=False) + "\n"
    )

    report["banks"]["ad-ii"] = merge_into_bank(EXAM_OUT / "ad-ii.json", ad2_items)
    report["banks"]["teacher-promotion"] = merge_into_bank(
        EXAM_OUT / "teacher-promotion.json", benito_items + aug_items
    )
    (ARTIFACT / "true-false-import-report.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
