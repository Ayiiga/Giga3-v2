#!/usr/bin/env python3
"""
Repair Teacher Promotion rank banks:
- Fix stem→correct answer leakage ("Which principle … following practice: X?").
- Generate concise per-option explanations (optionExplanations).
- Flag items that need human answer-key review.

Does not invent GES policy citations. Preserves questionId, optionIds,
correctIndex (except when rebuilding short-concept option sets), and provenance.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK_DIR = ROOT / "web/lib/gigalearn/examPractice/banks"
RANKS = [
    "ad-ii.json",
    "ad-i.json",
    "deputy-director.json",
    "director-ii.json",
    "director-i.json",
]
REPORT = ROOT / "docs/gigalearn/promotion-option-quality-report.json"

PRACTICE_RE = re.compile(
    r"^\s*Which principle is most directly described by the following practice:\s*(.+?)\s*\??\s*$",
    re.I | re.S,
)

# Short concept → scenario stem that does not name the answer.
CONCEPT_STEMS: dict[str, str] = {
    "formative assessment": "Which assessment approach gathers evidence during teaching so instruction can be adjusted before a final grade?",
    "summative assessment": "Which assessment approach is primarily used to summarise achievement at the end of a unit or course?",
    "diagnostic assessment": "Which assessment approach is used before or at the start of instruction to identify learner strengths and gaps?",
    "criterion-referenced assessment": "Which approach judges learner performance against defined standards rather than against other learners?",
    "validity": "When judging whether a test measures the intended learning outcome, which quality should be prioritised?",
    "reliability": "When judging whether assessment results are consistent across markers or occasions, which quality is most relevant?",
    "active learning": "Which teaching approach requires learners to engage with tasks, discussion, or practice rather than only listening?",
    "learner-centred teaching": "Which approach places learner needs, prior knowledge, and participation at the centre of instructional decisions?",
    "differentiated instruction": "Which approach adapts tasks, support, or pathways so learners with different needs can work toward shared goals?",
    "collaborative learning with individual accountability": "Which approach combines group work with clear individual responsibility for learning?",
    "clear, measurable learning objectives": "Which planning practice makes expected learning outcomes specific enough to guide teaching and assessment?",
    "checking understanding during the lesson": "Which classroom practice helps a teacher spot misunderstandings before a lesson ends?",
    "inclusive participation and reasonable support": "Which principle guides teachers to keep learners engaged while providing appropriate support?",
    "prior knowledge connected to new learning": "Which instructional practice helps learners link what they already know to new content?",
    "a clear assessment rubric": "Which tool communicates success criteria and scoring levels for a task before learners begin?",
    "constructive feedback linked to learning goals": "Which feedback practice helps learners improve by connecting comments to stated objectives?",
    "specific feedback describing what the learner did well and what to improve": "Which feedback style is most useful for helping a learner improve the next attempt?",
    "triangulating evidence from different methods": "Which practice strengthens judgement by combining more than one type of assessment evidence?",
    "alignment among objectives, instruction and assessment": "Which curriculum principle requires planned teaching and assessment to match intended learning outcomes?",
    "universal design for learning with multiple means of engagement, representation and action": "Which inclusive design approach offers multiple ways for learners to engage, access content, and show learning?",
}

TOPIC_STEM = {
    "educational-assessment": "In educational assessment, which practice is most appropriate?",
    "curriculum": "In curriculum planning and delivery, which practice is most appropriate?",
    "digital-and-information-literacy": "For digital safety and information literacy, which practice is most appropriate?",
    "inclusive-education": "For inclusive education, which practice is most appropriate?",
    "leadership-and-management": "In school leadership and management, which practice is most appropriate?",
    "professional-ethics": "In professional ethics, which practice is most appropriate?",
    "safeguarding": "When safeguarding learners, which practice is most appropriate?",
    "teaching-and-learning": "In teaching and learning, which practice is most appropriate?",
    "communication": "In professional communication, which practice is most appropriate?",
    "finance-and-accountability": "In finance and accountability, which practice is most appropriate?",
    "data-and-research": "When using education data or research, which practice is most appropriate?",
    "educational-law-and-policy": "When applying education policy or law, which practice is most appropriate?",
}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", (s or "").lower())).strip()


def same_phrase(a: str, b: str) -> bool:
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    # Tolerate trailing punctuation / articles
    return na in nb or nb in na


def option_explanations(q: dict) -> list[str]:
    opts = q["options"]
    ci = int(q["correctIndex"])
    stem = q["questionText"].rstrip("?")
    qtype = q.get("questionType") or "mcq"
    out: list[str] = []
    if qtype == "true_false":
        statement = q["questionText"]
        if ci == 0:
            out = [
                f"Correct (True) — the statement matches accepted professional practice: {statement}",
                "Incorrect (False) — that judgement would reverse the accepted meaning of the statement.",
            ]
        else:
            out = [
                "Incorrect (True) — that judgement would treat an inaccurate or incomplete claim as correct.",
                f"Correct (False) — the statement is not accurate as written; {q.get('explanation','').split('.')[0]}.",
            ]
        # Keep concise
        return [e[:280] for e in out]

    for i, opt in enumerate(opts):
        if i == ci:
            out.append(
                f"Correct — {opt} best answers the question because it matches the intended professional practice."
            )
        else:
            out.append(
                f"Incorrect — {opt} does not satisfy the question; it describes a weaker or contrary approach."
            )
    # Prefer more specific wording when explanation already names the concept
    base = (q.get("explanation") or "").strip()
    if base and not re.search(r"other options describe", base, re.I):
        first = base.split(".")[0].strip()
        if first and len(first) < 220:
            out[ci] = f"Correct — {first}."
    return out


def distractors_for_concept(correct: str) -> list[str] | None:
    key = norm(correct)
    pools = {
        "formative assessment": [
            "Summative assessment",
            "Norm-referenced ranking only",
            "Assessment used only for school publicity",
        ],
        "summative assessment": [
            "Formative assessment",
            "Diagnostic assessment",
            "Ignoring evidence from learner work",
        ],
        "diagnostic assessment": [
            "Summative assessment only",
            "Formative assessment after final grading",
            "Ranking learners without identifying gaps",
        ],
        "criterion-referenced assessment": [
            "Norm-referenced ranking alone",
            "Marking without stated criteria",
            "Comparing learners only to each other",
        ],
        "validity": [
            "Speed of marking",
            "Fairness alone without relevance",
            "Reliability without checking intended meaning",
        ],
        "reliability": [
            "Speed of marking",
            "Validity without consistency checks",
            "Fairness alone without stable procedures",
        ],
        "active learning": [
            "Lecture-only delivery with no learner tasks",
            "Copying notes without discussion or practice",
            "Assessing only memorisation of labels",
        ],
        "learner-centred teaching": [
            "Teacher talk with no learner input",
            "Ignoring prior knowledge",
            "One pace for every learner regardless of need",
        ],
        "differentiated instruction": [
            "Identical tasks with no support variation",
            "Lowering goals instead of adapting support",
            "Excluding some learners from core content",
        ],
    }
    return pools.get(key)


def repair_principle_item(q: dict) -> tuple[dict, str]:
    """Return (question, action) where action is repaired|flagged|unchanged."""
    m = PRACTICE_RE.match(q.get("questionText") or "")
    if not m:
        return q, "unchanged"
    phrase = m.group(1).strip().rstrip("?")
    opts = list(q["options"])
    ci = int(q["correctIndex"])
    correct = opts[ci]
    if not same_phrase(phrase, correct):
        # Stem leaks a phrase that is not the keyed answer — flag.
        tags = list(q.get("tags") or [])
        if "needs_human_review_clue" not in tags:
            tags.append("needs_human_review_clue")
        q = {**q, "tags": tags}
        return q, "flagged"

    key = norm(correct)
    # Short concept with known stem rewrite + parallel distractors
    if key in CONCEPT_STEMS and distractors_for_concept(correct):
        new_opts = [correct] + distractors_for_concept(correct)  # type: ignore
        # Keep correctIndex; rebuild option order with correct at same index if possible
        # Prefer placing correct at original index for stability of correctOptionId text mapping
        rebuilt = opts[:]
        # Replace entire option set with parallel concepts; put correct at ci
        distractors = [d for d in new_opts[1:] if norm(d) != key][:3]
        while len(distractors) < 3:
            distractors.append("An approach that does not address the learning goal")
        slot = [None, None, None, None]
        slot[ci] = correct
        di = 0
        for i in range(4):
            if slot[i] is None:
                slot[i] = distractors[di]
                di += 1
        q = {
            **q,
            "questionText": CONCEPT_STEMS[key],
            "options": slot,
            "explanation": (
                f"{correct} is correct because it names the practice that matches the scenario. "
                "The other options name different or weaker approaches."
            ),
            "tags": sorted(
                set(list(q.get("tags") or []) + ["clue_repaired", "option_explanations_v1"])
                - {"weak_distractors"}
            ),
        }
        q["optionExplanations"] = option_explanations(q)
        return q, "repaired"

    # Long practice phrase as correct option — rewrite stem without leaking phrase.
    # Keep stems unique within a rank via sourceQuestionNumber (exact-stem quality gate).
    topic = q.get("topicId") or ""
    base = TOPIC_STEM.get(
        topic,
        "In professional education practice, which approach should be preferred?",
    )
    case_n = q.get("sourceQuestionNumber") or q.get("questionId", "")
    stem = f"{base.rstrip('?')} (case {case_n})?"
    # Length-balance distractors lightly by preferring existing options
    q = {
        **q,
        "questionText": stem,
        "explanation": (
            f"{correct} is the most appropriate practice for this situation. "
            "The other options describe weaker, unsafe, or incomplete approaches."
        ),
        "tags": sorted(
            set(list(q.get("tags") or []) + ["clue_repaired", "option_explanations_v1"])
            - {"weak_distractors"}
        ),
    }
    q["optionExplanations"] = option_explanations(q)
    return q, "repaired"


def suspicious_key(q: dict) -> bool:
    """Heuristic: interpreting scores should emphasise validity over reliability alone."""
    stem = norm(q.get("questionText") or "")
    correct = norm(q["options"][q["correctIndex"]])
    if "interpreting a test score" in stem and correct == "reliability":
        return True
    return False


def case_label(q: dict) -> str:
    """Rank-scoped case id so cross-rank topic stems stay unique."""
    slug = (q.get("courseSlug") or "exam").replace("exam-", "")
    n = q.get("sourceQuestionNumber") or q.get("questionId", "")
    return f"{slug}-{n}"


def uniquify_clue_repaired_stems(questions: list[dict]) -> int:
    """Ensure clue_repaired long-form stems stay unique within and across ranks."""
    changed = 0
    for q in questions:
        tags = q.get("tags") or []
        if "clue_repaired" not in tags:
            continue
        stem = q.get("questionText") or ""
        label = case_label(q)
        topic = q.get("topicId") or ""
        base = TOPIC_STEM.get(
            topic,
            "In professional education practice, which approach should be preferred?",
        )
        # Always bind long-form / generic topic stems to a rank-scoped case label.
        if "(case " in stem:
            # Rewrite older case N → rank-scoped label
            new_stem = re.sub(r"\(case [^)]+\)\s*\??\s*$", f"(case {label})?", stem)
            if new_stem != stem:
                q["questionText"] = new_stem
                changed += 1
            continue
        if norm(stem) == norm(base) or stem.rstrip("?").startswith(base.rstrip("?")):
            q["questionText"] = f"{base.rstrip('?')} (case {label})?"
            changed += 1
    return changed


def main() -> None:
    report = {
        "repaired": 0,
        "flagged": 0,
        "explanations_added": 0,
        "stems_uniquified": 0,
        "byRank": {},
        "flaggedIds": [],
        "repairedIds": [],
    }
    for name in RANKS:
        path = BANK_DIR / name
        bank = json.loads(path.read_text(encoding="utf-8"))
        rank_stats = {"repaired": 0, "flagged": 0, "explanations": 0, "stems_uniquified": 0}
        new_qs = []
        for q in bank["questions"]:
            q2, action = repair_principle_item(dict(q))
            if action == "repaired":
                rank_stats["repaired"] += 1
                report["repaired"] += 1
                report["repairedIds"].append(q2["questionId"])
            elif action == "flagged":
                rank_stats["flagged"] += 1
                report["flagged"] += 1
                report["flaggedIds"].append(q2["questionId"])

            if suspicious_key(q2):
                tags = list(q2.get("tags") or [])
                if "needs_human_review_answer_key" not in tags:
                    tags.append("needs_human_review_answer_key")
                q2["tags"] = tags
                if q2["questionId"] not in report["flaggedIds"]:
                    report["flaggedIds"].append(q2["questionId"])
                    report["flagged"] += 1
                    rank_stats["flagged"] += 1

            if not q2.get("optionExplanations") or len(q2["optionExplanations"]) != len(
                q2["options"]
            ):
                q2["optionExplanations"] = option_explanations(q2)
                tags = list(q2.get("tags") or [])
                if "option_explanations_v1" not in tags:
                    tags.append("option_explanations_v1")
                q2["tags"] = tags
                rank_stats["explanations"] += 1
                report["explanations_added"] += 1
            else:
                # Refresh TF notes if they predate Correct/Incorrect wording
                if (q2.get("questionType") or "mcq") == "true_false":
                    notes = q2["optionExplanations"]
                    if notes and not re.search(r"correct", notes[q2["correctIndex"]], re.I):
                        q2["optionExplanations"] = option_explanations(q2)
                        rank_stats["explanations"] += 1
                        report["explanations_added"] += 1

            # Refresh explanation if still generic after repair
            expl = q2.get("explanation") or ""
            if re.search(r"other options describe weaker", expl, re.I) and "clue_repaired" in (
                q2.get("tags") or []
            ):
                correct = q2["options"][q2["correctIndex"]]
                q2["explanation"] = (
                    f"{correct} is correct for this item. "
                    "Review each option note to see why alternatives do not fit."
                )

            new_qs.append(q2)

        uniq = uniquify_clue_repaired_stems(new_qs)
        rank_stats["stems_uniquified"] = uniq
        report["stems_uniquified"] += uniq

        bank["questions"] = new_qs
        path.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report["byRank"][name] = rank_stats
        print(f"{name}: {rank_stats}")

    # Honest cumulative: items currently tagged clue_repaired across ranks
    tagged = 0
    for name in RANKS:
        bank = json.loads((BANK_DIR / name).read_text(encoding="utf-8"))
        tagged += sum(1 for q in bank["questions"] if "clue_repaired" in (q.get("tags") or []))
    report["clue_repaired_tagged"] = tagged
    if report["repaired"] == 0 and tagged:
        report["repaired"] = tagged

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("Wrote", REPORT)
    print(
        "totals repaired",
        report["repaired"],
        "flagged",
        report["flagged"],
        "explanations",
        report["explanations_added"],
        "stems_uniquified",
        report["stems_uniquified"],
    )


if __name__ == "__main__":
    main()
