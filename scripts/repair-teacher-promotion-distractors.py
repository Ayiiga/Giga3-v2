#!/usr/bin/env python3
"""
Repair weak_distractors tags in teacher-promotion.json.

Preserves correct answer text and correctIndex. Replaces generic filler
distractors with topic-plausible alternatives of similar length.
Does not invent verified GES policy — items stay pending_review where
already provisional.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

BANK = Path("web/lib/gigalearn/examPractice/banks/teacher-promotion.json")
META = Path("web/lib/gigalearn/examPractice/banks/meta.json")
IMPORT_REPORT_EXAM = Path("web/lib/gigalearn/examPractice/banks/import-report.json")
IMPORT_REPORT_TECH = Path("web/lib/gigalearn/academy/techBanks/import-report.json")

GENERIC = {
    "A personal preference without evidence",
    "A record or process unrelated to the question",
    "A decision that ignores professional responsibilities",
    "An action taken without following relevant procedures",
}


def pad_to(text: str, target: int) -> str:
    """Light length balancing without changing meaning — prefer natural phrasing."""
    t = text.strip()
    if len(t) >= target - 4:
        return t
    # Prefer clause extensions that stay plausible as distractors
    extensions = [
        " in this context",
        " for routine cases",
        " without further review",
        " as a secondary option",
        " under ordinary conditions",
    ]
    i = 0
    while len(t) < target - 4 and i < 20:
        t = t + extensions[i % len(extensions)]
        i += 1
    return t


def balance_lengths(correct: str, distractors: list[str]) -> list[str]:
    target = len(correct)
    out = []
    for d in distractors:
        if abs(len(d) - target) > 18 and len(d) < target:
            out.append(pad_to(d, target))
        else:
            out.append(d)
    return out


def unique_options(correct: str, distractors: list[str]) -> list[str]:
    seen = {correct.strip().lower()}
    out = []
    for d in distractors:
        key = d.strip().lower()
        if not d.strip() or key in seen:
            continue
        seen.add(key)
        out.append(d.strip())
        if len(out) == 3:
            break
    fillers = [
        "An approach that overlooks relevant professional standards",
        "A choice that conflicts with sound educational practice",
        "A response that lacks the required procedural safeguards",
    ]
    for f in fillers:
        if len(out) >= 3:
            break
        if f.lower() not in seen and f.lower() != correct.strip().lower():
            out.append(f)
            seen.add(f.lower())
    return out[:3]


# --- curated distractor factories -------------------------------------------------

YEARS = {
    "1974": ["1957", "1961", "1987"],
    "2017": ["2008", "2015", "2020"],
}

LEGAL = {
    "NRCD 247": ["NRCD 102", "PNDCL 42", "CI 15"],
    "Act 506": ["Act 560", "Act 651", "Act 788"],
    "Act 778": ["Act 506", "Act 651", "Act 1023"],
    "Act 1049": ["Act 1023", "Act 778", "Act 506"],
    "Act 1023": ["Act 1049", "Act 778", "Act 560"],
}

ARTICLES = {
    "Article 25": ["Article 21", "Article 38", "Article 12"],
}

INSTITUTIONS = {
    "NTC": ["NaCCA", "NaSIA", "GTEC"],
    "NaCCA": ["NTC", "NaSIA", "WAEC"],
    "NaSIA": ["NaCCA", "NTC", "CTVET"],
    "WAEC": ["NaCCA", "GTEC", "NTC"],
    "GTEC": ["WAEC", "CTVET", "NaSIA"],
    "CTVET": ["GTEC", "NaCCA", "WAEC"],
    "The Director-General": [
        "The District Chief Executive alone",
        "The School Prefects' Association",
        "The Ministry of Finance cashier",
    ],
}

TOPIC_POOLS: dict[str, list[str]] = {
    "Professional Ethics & Conduct": [
        "Disclose confidential learner records casually to colleagues",
        "Accept gifts that could influence an official decision",
        "Ignore a safeguarding concern that falls outside lesson time",
        "Follow only personal convenience when duties conflict",
        "Share examination materials before an authorised release",
        "Treat complaints as gossip with no recorded follow-up",
        "Prioritise friendships over fair treatment of staff",
        "Skip required reporting because the matter seems minor",
    ],
    "Finance & Public Accountability": [
        "Spend public funds without documented authorisation",
        "Keep cash transactions only as informal verbal notes",
        "Select suppliers based solely on personal relationships",
        "Omit inventory updates after receiving new equipment",
        "Delay banking of school fees without a recorded reason",
        "Approve payment before checking the permitted purpose",
        "Destroy vouchers once a term ends to clear storage",
        "Treat audit queries as optional advice to ignore",
    ],
    "Ges History & Legislation": [
        "A framework that applies only to private universities",
        "A colonial ordinance that never covered education",
        "A local by-law limited to market trading days",
        "An internal staff memo with no legal force",
        "A sports federation constitution for athletics only",
        "A banking regulation unrelated to school governance",
    ],
    "Ges Administration & Institutions": [
        "A body that only manages sports tournaments",
        "An office limited to vehicle licensing services",
        "A private firm with no public education mandate",
        "A temporary PTA subcommittee without statutory power",
        "A regional market association for traders",
        "A student club with no administrative authority",
    ],
    "School Leadership & Improvement": [
        "Leadership that ignores teaching and learning data",
        "A plan written once and never reviewed against results",
        "Decision-making that excludes all staff input by default",
        "Focusing only on buildings while neglecting instruction",
        "Setting targets without evidence from school performance",
        "Treating supervision as fault-finding without support",
    ],
    "Staff Management & Discipline": [
        "Punish first and gather facts afterwards if needed",
        "Skip documentation because the case seems obvious",
        "Delegate a task and deny any remaining accountability",
        "Refuse to hear a grievance once a complaint is filed",
        "Set expectations but provide no feedback or support",
        "Discuss a staff case publicly before a fair hearing",
    ],
    "Child Protection, Inclusion & Ict": [
        "Delay safeguarding action until a convenient time",
        "Share a learner's personal data on public social media",
        "Assume accessibility is only for examination venues",
        "Block parent contact when attendance concerns arise",
        "Ignore unsafe online contact reported by a learner",
        "Use resources that exclude learners with known needs",
    ],
    "Reasoning & General Aptitude": [
        "A conclusion that does not follow from the premises",
        "An estimate that reverses the given relationship",
        "A result obtained by adding instead of the required step",
        "A time that ignores part of the stated duration",
    ],
    "Applied Education Administration & Professional Judgement": [
        "An action that skips required professional judgement",
        "A choice based only on convenience, not evidence",
        "A response that contradicts applicable education guidance",
    ],
}


def rotate(items: list[str], offset: int) -> list[str]:
    if not items:
        return items
    o = offset % len(items)
    return items[o:] + items[:o]


def distractors_for(q: dict) -> list[str]:
    correct = q["options"][q["correctIndex"]].strip()
    topic = q.get("topicLabel") or ""
    stem = q["questionText"].strip()
    stem_l = stem.lower()
    qid = q.get("questionId", "")
    offset = sum(ord(c) for c in qid) + sum(ord(c) for c in stem[:40])

    if correct in YEARS:
        return YEARS[correct][:]
    if correct in LEGAL:
        return LEGAL[correct][:]
    if correct in ARTICLES:
        return ARTICLES[correct][:]
    if correct in INSTITUTIONS:
        return INSTITUTIONS[correct][:]

    # Numeric / sequence reasoning
    if correct == "10":
        return ["9", "12", "16"]
    if correct == "48":
        return ["36", "30", "42"]
    if correct == "60 learners":
        return ["40 learners", "50 learners", "80 learners"]
    if correct == "15 scripts":
        return ["12 scripts", "18 scripts", "45 scripts"]
    if correct == "11:50":
        return ["11:35", "12:00", "10:50"]

    # Stem-specific high-quality sets
    specific: dict[str, list[str]] = {
        "Which reforms are associated with the 6-3-3 structure?": [
            "1957 independence education reforms only",
            "2007 tertiary mergers alone",
            "2020 regulatory bodies realignment only",
        ],
        "What does FCUBE stand for?": [
            "Federal Council for University Basic Education",
            "Funded Classroom Upgrades for Basic Educators",
            "Free Coaching Under Boarding Enrolment",
        ],
        "When was Free SHS introduced?": ["2008", "2015", "2020"],
        "Which policy aims to reduce financial barriers to SHS?": [
            "Free Compulsory Universal Basic Education only",
            "School Feeding without tuition relief",
            "Capitation grant limited to primary grades",
        ],
        "What is the Ministry of Education's broad role?": [
            "Day-to-day classroom teaching in every school",
            "Marking BECE scripts for all candidates",
            "Operating private textbook shops nationwide",
        ],
        "What is GES's broad role?": [
            "Set national monetary policy for education loans",
            "License private universities across Ghana",
            "Conduct WASSCE marking for WAEC alone",
        ],
        "What should guide answers about current law?": [
            "An outdated circular with no legal status",
            "A social media summary without checking the Act",
            "A draft bill that has not been passed",
        ],
    }
    if stem in specific:
        return specific[stem][:]

    # Stem keyword boosts (unique per theme)
    if "safeguard" in stem_l or "abuse" in stem_l:
        return [
            "Dismiss the report if no written statement is ready",
            "Investigate alone beyond one's authorised role",
            "Share identifying details with uninvolved colleagues",
        ]
    if "confidential" in stem_l:
        return [
            "Discuss sensitive cases in public staff rooms",
            "Post learner details on a class WhatsApp group",
            "Leave confidential files open on a shared desk",
        ]
    if "conflict of interest" in stem_l:
        return [
            "A routine timetable clash between two subjects",
            "A disagreement about preferred teaching methods",
            "A delay caused by power outage during marking",
        ]
    if "instructional leadership" in stem_l:
        return [
            "Leadership focused only on estate maintenance",
            "Leadership that avoids classroom observation",
            "Leadership limited to ceremonial school events",
        ]
    if "due process" in stem_l:
        return [
            "Deciding a case before hearing the other side",
            "Skipping notice because the outcome seems clear",
            "Relying on rumours without recorded evidence",
        ]
    if "procurement" in stem_l:
        return [
            "Buying from a relative without competitive checks",
            "Paying cash with no voucher or receipt trail",
            "Accepting goods that do not match the order",
        ]
    if "value for money" in stem_l:
        return [
            "Choosing the cheapest option regardless of quality",
            "Spending the full budget before year-end by default",
            "Avoiding documentation to speed up purchases",
        ]

    # Expand topic pools with rotated, stem-conditioned variants so neighbours differ
    base_pool = list(
        TOPIC_POOLS.get(
            topic, TOPIC_POOLS["Applied Education Administration & Professional Judgement"]
        )
    )
    variants = base_pool + [
        f"Rely on informal advice instead of {topic.split('&')[0].strip().lower()} guidance",
        f"Treat {stem_l[:28].rstrip()} as optional when inconvenient",
        "Postpone action until external pressure makes it unavoidable",
        "Substitute personal opinion for documented professional criteria",
        "Limit attention to appearances rather than learner outcomes",
        "Escalate immediately without checking available facts first",
        "Close the matter orally with no record for later review",
        "Apply a one-size approach that ignores the case specifics",
    ]
    rotated = rotate(variants, offset)
    corr_l = correct.lower()
    picks = [p for p in rotated if p.lower() != corr_l][:3]
    return picks


def repair_question(q: dict) -> dict:
    correct_index = q["correctIndex"]
    correct = q["options"][correct_index]
    raw = distractors_for(q)
    distractors = unique_options(correct, raw)
    distractors = balance_lengths(correct, distractors)

    # Rebuild options: keep correct at same index
    options = list(q["options"])
    di = 0
    for i in range(4):
        if i == correct_index:
            options[i] = correct
        else:
            options[i] = distractors[di]
            di += 1

    tags = [t for t in q.get("tags", []) if t != "weak_distractors"]
    if "distractors_repaired" not in tags:
        tags.append("distractors_repaired")
    # Keep honesty about verification for legal/history items
    if q.get("topicId") in {
        "ges-history-legislation",
        "ges-administration-institutions",
    } or any(
        k in q["questionText"].lower()
        for k in ("act ", "nrcd", "article", "decree", "constitution")
    ):
        if "needs_authoritative_verification" not in tags:
            tags.append("needs_authoritative_verification")

    expl = q.get("explanation", "")
    if "Provisional" not in expl and q.get("reviewStatus") == "pending_review":
        expl = (
            expl.rstrip()
            + " Provisional practice key — confirm against current Acts, GES directives, and official notices before high-stakes use."
        )

    out = dict(q)
    out["options"] = options
    out["tags"] = tags
    out["explanation"] = expl
    # Ensure correctIndex still points at correct text
    assert out["options"][out["correctIndex"]] == correct
    return out


def main() -> None:
    data = json.loads(BANK.read_text())
    repaired = 0
    still_generic = 0
    length_clue = 0
    questions = []
    for q in data["questions"]:
        if "weak_distractors" in q.get("tags", []):
            q2 = repair_question(q)
            repaired += 1
            # post checks
            for i, o in enumerate(q2["options"]):
                if i != q2["correctIndex"] and o in GENERIC:
                    still_generic += 1
            lens = [len(o) for o in q2["options"]]
            ci = q2["correctIndex"]
            if lens[ci] == max(lens) and lens[ci] > sorted(lens)[-2] + 18:
                length_clue += 1
            questions.append(q2)
        else:
            questions.append(q)

    data["questions"] = questions
    BANK.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    weak_left = sum(1 for q in questions if "weak_distractors" in q.get("tags", []))
    report = {
        "repaired": repaired,
        "weak_distractors_remaining": weak_left,
        "still_containing_generic_filler": still_generic,
        "correct_clearly_longest_after": length_clue,
        "pending_review": sum(1 for q in questions if q["reviewStatus"] == "pending_review"),
        "needs_authoritative_verification": sum(
            1 for q in questions if "needs_authoritative_verification" in q.get("tags", [])
        ),
    }
    Path("/opt/cursor/artifacts/weak-distractors-repair-report.json").write_text(
        json.dumps(report, indent=2)
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
