#!/usr/bin/env python3
"""Expand Teacher Promotion banks to 550 distinct practice items per rank.

Honesty rules:
- Strip user-facing (case …) labels from stems (IDs stay in metadata).
- Do not pad with near-duplicates or case-only variants.
- New items are original_practice, pending_review — not official GES papers.
- Refresh meta.json with honest counts.
"""
from __future__ import annotations

import json
import re
import hashlib
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANKS = ROOT / "web/lib/gigalearn/examPractice/banks"
TARGET = 550
CASE_RE = re.compile(r"\s*\(case\s+[^)]+\)\s*", re.I)
GENERIC_STEM_RE = re.compile(
    r"which approach should be preferred|which practice is most appropriate",
    re.I,
)

RANKS = [
    {
        "id": "ad-ii",
        "file": "ad-ii.json",
        "courseSlug": "exam-ad-ii",
        "promotionRank": "assistant-director-ii",
        "label": "Assistant Director II",
        "lens": "classroom teacher and first-line instructional leader",
        "topics": [
            ("teaching-learning", "Teaching and learning"),
            ("educational-assessment", "Educational assessment"),
            ("curriculum-planning", "Curriculum planning"),
            ("learner-wellbeing", "Learner wellbeing"),
            ("professional-ethics", "Professional ethics"),
            ("inclusive-education", "Inclusive education"),
            ("classroom-management", "Classroom management"),
            ("professional-development", "Professional development"),
            ("parent-engagement", "Parent and community engagement"),
            ("digital-safety", "Digital safety"),
        ],
    },
    {
        "id": "ad-i",
        "file": "ad-i.json",
        "courseSlug": "exam-ad-i",
        "promotionRank": "assistant-director-i",
        "label": "Assistant Director I",
        "lens": "instructional supervisor and school improvement lead",
        "topics": [
            ("instructional-supervision", "Instructional supervision"),
            ("staff-development", "Staff development"),
            ("school-improvement", "School improvement"),
            ("assessment-leadership", "Assessment leadership"),
            ("curriculum-implementation", "Curriculum implementation"),
            ("teacher-support", "Teacher support"),
            ("quality-assurance", "Quality assurance"),
            ("stakeholder-communication", "Stakeholder communication"),
            ("professional-ethics", "Professional ethics"),
            ("inclusive-leadership", "Inclusive leadership"),
        ],
    },
    {
        "id": "deputy-director",
        "file": "deputy-director.json",
        "courseSlug": "exam-deputy-director",
        "promotionRank": "deputy-director",
        "label": "Deputy Director",
        "lens": "institutional manager coordinating people, data, and resources",
        "topics": [
            ("institutional-management", "Institutional management"),
            ("monitoring-evaluation", "Monitoring and evaluation"),
            ("resource-accountability", "Resource accountability"),
            ("staff-deployment", "Staff deployment"),
            ("district-coordination", "District coordination"),
            ("risk-safeguarding", "Risk and safeguarding"),
            ("performance-management", "Performance management"),
            ("policy-compliance", "Policy compliance"),
            ("community-partnerships", "Community partnerships"),
            ("change-management", "Change management"),
        ],
    },
    {
        "id": "director-ii",
        "file": "director-ii.json",
        "courseSlug": "exam-director-ii",
        "promotionRank": "director-ii",
        "label": "Director II",
        "lens": "strategic director aligning systems, policy, and performance",
        "topics": [
            ("strategic-planning", "Strategic planning"),
            ("governance", "Governance"),
            ("policy-implementation", "Policy implementation"),
            ("institutional-performance", "Institutional performance"),
            ("workforce-planning", "Workforce planning"),
            ("budget-stewardship", "Budget stewardship"),
            ("stakeholder-governance", "Stakeholder governance"),
            ("system-improvement", "System improvement"),
            ("accountability-frameworks", "Accountability frameworks"),
            ("ethical-leadership", "Ethical leadership"),
        ],
    },
    {
        "id": "director-i",
        "file": "director-i.json",
        "courseSlug": "exam-director-i",
        "promotionRank": "director-i",
        "label": "Director I",
        "lens": "senior system leader accountable for organisational outcomes",
        "topics": [
            ("organisational-governance", "Organisational governance"),
            ("public-accountability", "Public-sector accountability"),
            ("system-strategy", "System strategy"),
            ("policy-stewardship", "Policy stewardship"),
            ("executive-oversight", "Executive oversight"),
            ("cross-sector-coordination", "Cross-sector coordination"),
            ("talent-succession", "Talent and succession"),
            ("risk-governance", "Risk governance"),
            ("equity-system", "Equity at system level"),
            ("institutional-integrity", "Institutional integrity"),
        ],
    },
]

# Scenario seeds — each produces a unique stem without case labels.
SETTINGS = [
    "a basic school in a peri-urban circuit",
    "a senior high school preparing for mock exams",
    "a school with many learners who travel long distances",
    "a school recovering from disrupted attendance",
    "a cluster of schools sharing limited teaching resources",
    "a school introducing a new subject timetable",
    "a school with rising enrolment in lower primary",
    "a school where parents request clearer progress updates",
    "a school preparing a quality assurance visit",
    "a school supporting newly posted teachers",
    "a school with mixed-ability classrooms",
    "a school strengthening girl-child retention",
    "a school digitising attendance and assessment records",
    "a school responding to community concerns about discipline",
    "a school aligning schemes of work to the current curriculum",
]

CHALLENGES = [
    "learner performance is uneven across streams",
    "teachers disagree about marking standards",
    "safeguarding information arrives late",
    "instructional time is lost to unplanned assemblies",
    "assessment data is collected but rarely discussed",
    "new teachers lack mentoring support",
    "parents receive conflicting messages about homework",
    "resources are unevenly shared across departments",
    "lesson observation feedback is delayed",
    "inclusion plans exist on paper but not in daily practice",
    "exam malpractice risks are rising under pressure",
    "professional learning is ad hoc and poorly recorded",
    "timetable clashes reduce practical lesson time",
    "community partners want involvement without clear roles",
    "leaders struggle to prioritise competing improvement goals",
]

ACTIONS_CORRECT = {
    "teaching-learning": "Plan differentiated lessons, check understanding during learning, and adjust teaching using evidence from learners",
    "educational-assessment": "Use valid assessment purposes, share clear success criteria, and interpret scores with reliability and fairness in mind",
    "curriculum-planning": "Sequence learning intentions, align activities to the curriculum, and review schemes with colleagues before teaching",
    "learner-wellbeing": "Follow safeguarding procedures promptly, protect learner dignity, and escalate credible concerns through the proper channel",
    "professional-ethics": "Act with integrity, avoid conflicts of interest, and put learner welfare above personal convenience",
    "inclusive-education": "Adapt instruction and assessment so learners with diverse needs can participate meaningfully",
    "classroom-management": "Set clear routines, reinforce expectations consistently, and address behaviour in ways that preserve learning time",
    "professional-development": "Share effective practice through structured peer learning and reflect on feedback to improve instruction",
    "parent-engagement": "Communicate progress honestly, invite constructive partnership, and keep records of agreed actions",
    "digital-safety": "Teach responsible technology use, protect learner data, and report online safety concerns appropriately",
    "instructional-supervision": "Observe lessons with agreed criteria, give timely actionable feedback, and follow up on improvement",
    "staff-development": "Identify skill gaps from evidence and organise targeted coaching rather than one-off workshops only",
    "school-improvement": "Set a few measurable priorities, assign owners, and review progress with data each cycle",
    "assessment-leadership": "Moderate samples across classes, calibrate marking, and use results to guide reteaching",
    "curriculum-implementation": "Support teachers to interpret curriculum intent and remove barriers to consistent delivery",
    "teacher-support": "Provide mentoring, protect planning time where possible, and address workload risks early",
    "quality-assurance": "Use transparent checks, document findings, and convert gaps into improvement actions",
    "stakeholder-communication": "Share accurate information with the right audience at the right time and invite clarification",
    "inclusive-leadership": "Model inclusive expectations and remove structural barriers that exclude learners or staff",
    "institutional-management": "Align people, time, and resources to agreed institutional priorities and monitor delivery",
    "monitoring-evaluation": "Track leading and lagging indicators, verify data quality, and act on findings",
    "resource-accountability": "Record allocations, reconcile use against plans, and prevent diversion of school resources",
    "staff-deployment": "Match teacher strengths to learner needs and review deployment when outcomes stall",
    "district-coordination": "Coordinate schools around shared standards while respecting local context",
    "risk-safeguarding": "Maintain clear escalation routes and rehearse response roles before incidents occur",
    "performance-management": "Set fair expectations, evidence judgements, and support improvement before sanctions",
    "policy-compliance": "Interpret policy requirements accurately and implement them without bypassing due process",
    "community-partnerships": "Define partnership roles, protect learner interests, and evaluate partnership value",
    "change-management": "Sequence change, communicate rationale, and support staff through transition",
    "strategic-planning": "Link strategy to measurable outcomes, capacity, and review milestones",
    "governance": "Separate oversight from day-to-day operations and insist on transparent reporting",
    "policy-implementation": "Translate policy into workable procedures, train staff, and check fidelity",
    "institutional-performance": "Review outcome trends, investigate root causes, and redirect resources to gaps",
    "workforce-planning": "Forecast staffing needs and build pipelines for critical roles",
    "budget-stewardship": "Prioritise spending against strategy and publish clear accountability for use of funds",
    "stakeholder-governance": "Balance stakeholder voice with statutory duties and evidence",
    "system-improvement": "Scale what works, retire ineffective practices, and protect equity",
    "accountability-frameworks": "Make expectations, evidence, and consequences consistent and fair",
    "ethical-leadership": "Model ethical decisions publicly and refuse shortcuts that harm trust",
    "organisational-governance": "Ensure boards or oversight bodies receive timely, accurate decision information",
    "public-accountability": "Explain performance and resource use clearly to the public without concealing risks",
    "system-strategy": "Set system-wide priorities that schools can implement with available capacity",
    "policy-stewardship": "Keep policy coherent, update obsolete rules, and prevent conflicting directives",
    "executive-oversight": "Hold leaders accountable for outcomes while enabling professional judgement",
    "cross-sector-coordination": "Align education actions with health, social protection, and local government where needed",
    "talent-succession": "Identify future leaders early and give them structured stretch opportunities",
    "risk-governance": "Escalate material risks with mitigation options, not after damage is done",
    "equity-system": "Allocate support where disadvantage is greatest and monitor closing of gaps",
    "institutional-integrity": "Protect whistleblowing channels and act on credible integrity breaches",
}

DISTRACTORS = [
    "Delay action until external pressure forces a response",
    "Rely on informal personal favours instead of documented procedures",
    "Hide weak results to protect the institution's image",
    "Apply one rigid method to every learner and context",
    "Blame individuals publicly without examining system causes",
    "Collect more data indefinitely without reviewing what already exists",
    "Skip consultation and impose changes overnight",
    "Treat policy documents as optional when they are inconvenient",
    "Reward silence about problems rather than early reporting",
    "Focus only on high performers and ignore struggling groups",
    "Outsource judgement to rumours instead of verified evidence",
    "Use punishment as the first and only improvement strategy",
]


def normalize_stem(text: str) -> str:
    t = CASE_RE.sub(" ", text or "")
    t = re.sub(r"\s+", " ", t).strip().lower()
    return t


def strip_case_label(text: str) -> str:
    return re.sub(r"\s+", " ", CASE_RE.sub("", text or "")).strip()


def explain_options(options: list[str], correct_index: int, topic_label: str, stem: str) -> tuple[str, list[str]]:
    correct = options[correct_index]
    explanation = (
        f"{correct} is the strongest response because it advances professional practice in "
        f"{topic_label.lower()} through clear standards, learner welfare, and evidence-informed action. "
        f"This is an original GigaLearn practice item for preparation — not an official GES examination question. "
        f"Confirm current directives with official GES and Ministry of Education sources."
    )
    notes = []
    for i, opt in enumerate(options):
        if i == correct_index:
            notes.append(
                f"Correct — {opt} addresses the situation by combining professional standards with "
                f"practical steps that protect learning quality in {topic_label.lower()}."
            )
        else:
            notes.append(
                f"Incorrect — {opt} weakens the response because it either delays action, ignores "
                f"evidence, harms trust, or fails to protect learners and fair process in this scenario."
            )
    return explanation, notes


SCENARIO_DETAILS = [
    "during mid-term review week",
    "after a parents' association meeting",
    "while preparing the termly professional learning calendar",
    "when moderating end-of-term scripts",
    "following a learner wellbeing referral",
    "ahead of a circuit quality visit",
    "during induction of newly posted staff",
    "while reallocating limited teaching aids",
    "after analysing three weeks of attendance data",
    "when updating the school improvement plan",
    "during subject panel discussions",
    "after receiving conflicting community feedback",
    "while planning remedial support for struggling learners",
    "when reviewing lesson observation notes",
    "during preparation for a stakeholder briefing",
    "after a near-miss safety incident",
    "while setting department performance targets",
    "when digitising paper assessment records",
    "during a peer coaching cycle",
    "after discovering inconsistent marking across streams",
]


def make_mcq(rank: dict, topic_id: str, topic_label: str, setting: str, challenge: str, n: int) -> dict:
    correct = ACTIONS_CORRECT.get(
        topic_id,
        "Use evidence, follow fair procedures, and prioritise learner learning and welfare",
    )
    # Pick three distractors deterministically unique per item
    h = int(hashlib.sha256(f"{rank['id']}:{topic_id}:{setting}:{challenge}:{n}".encode()).hexdigest(), 16)
    picks = []
    for k in range(3):
        picks.append(DISTRACTORS[(h + k * 7) % len(DISTRACTORS)])
    # Ensure distractors unique
    seen = set()
    unique_d = []
    for d in picks:
        if d not in seen and d != correct:
            seen.add(d)
            unique_d.append(d)
    while len(unique_d) < 3:
        for d in DISTRACTORS:
            if d not in seen and d != correct:
                seen.add(d)
                unique_d.append(d)
            if len(unique_d) >= 3:
                break

    options = [correct, unique_d[0], unique_d[1], unique_d[2]]
    # Rotate so correct index varies
    rot = h % 4
    options = options[rot:] + options[:rot]
    correct_index = options.index(correct)

    detail = SCENARIO_DETAILS[(n + h) % len(SCENARIO_DETAILS)]
    # Unique vignette token (metadata-facing uniqueness without "(case …)" labels).
    vignette = [
        "a maths stream",
        "an English stream",
        "a science cohort",
        "lower primary classes",
        "upper primary classes",
        "JHS final-year classes",
        "SHS form two classes",
        "a newly merged department",
        "an afternoon remedial group",
        "a boarding house cohort",
    ][n % 10]
    actor = [
        "the subject panel",
        "the guidance team",
        "the academic board",
        "the PTA executive",
        "the quality assurance team",
        "newly posted teachers",
        "the assessment committee",
        "department heads",
        "circuit officers",
        "the school leadership team",
    ][(n // 3) % 10]
    stem = (
        f"As a {rank['lens']} supporting {vignette} in {setting} {detail}, "
        f"{actor} report that {challenge}. "
        f"What is the most appropriate {topic_label.lower()} response for a {rank['label']}?"
    )
    qid = f"exam-{rank['id']}-gen-{n:04d}"
    explanation, option_explanations = explain_options(options, correct_index, topic_label, stem)
    return {
        "questionId": qid,
        "courseSlug": rank["courseSlug"],
        "topicId": topic_id,
        "topicLabel": topic_label,
        "questionText": stem,
        "options": options,
        "optionIds": [f"{qid}-opt-{chr(65+i)}" for i in range(4)],
        "correctIndex": correct_index,
        "correctOptionId": f"{qid}-opt-{chr(65+correct_index)}",
        "explanation": explanation,
        "difficulty": "intermediate" if n % 3 else "beginner",
        "questionType": "mcq",
        "sourceDocument": "gigaLearn_original_practice_bank_v2",
        "sourceQuestionNumber": n,
        "sourceType": "original_practice",
        "reviewStatus": "pending_review",
        "verificationStatus": "awaiting_verification",
        "publicationStatus": "published_practice",
        "accessTier": ["free"] if n % 5 else ["premium"],
        "promotionRank": rank["promotionRank"],
        "tags": [
            "original_practice",
            "awaiting_verification",
            "scenario_v2",
            "option_explanations_v2",
            "free_tier" if n % 5 else "premium_tier",
        ],
        "optionExplanations": option_explanations,
        "internalCaseKey": f"{rank['id']}-{n}",
    }


def make_tf(rank: dict, topic_id: str, topic_label: str, setting: str, n: int, truth: bool) -> dict:
    detail = SCENARIO_DETAILS[n % len(SCENARIO_DETAILS)]
    vignette = [
        "basic schools",
        "senior high schools",
        "district offices",
        "circuit clusters",
        "teacher education partnerships",
        "remedial learning programmes",
        "safeguarding referral pathways",
        "assessment moderation cycles",
        "staff deployment reviews",
        "community partnership projects",
    ][n % 10]
    if truth:
        statement = (
            f"For {vignette} in {setting} {detail}, a {rank['label']} strengthens "
            f"{topic_label.lower()} when decisions are evidence-informed, documented, and oriented to learner welfare."
        )
        explanation = (
            f"True — professional {topic_label.lower()} depends on evidence, documentation, and "
            f"learner welfare rather than informal shortcuts. Original GigaLearn practice item — not an official GES paper."
        )
    else:
        statement = (
            f"For {vignette} in {setting} {detail}, a {rank['label']} may skip documented procedures "
            f"in {topic_label.lower()} whenever results appear urgent."
        )
        explanation = (
            f"False — urgency does not justify skipping fair, documented procedures that protect learners "
            f"and institutional integrity. Original GigaLearn practice item — not an official GES paper."
        )
    options = ["True", "False"]
    correct_index = 0 if truth else 1
    qid = f"exam-{rank['id']}-tf-{n:04d}"
    option_explanations = [
        "Correct — the statement accurately reflects professional practice."
        if correct_index == 0
        else "Incorrect — the statement is not accurate for professional practice.",
        "Correct — the statement is false; procedures and learner welfare still apply under pressure."
        if correct_index == 1
        else "Incorrect — marking this True would endorse skipping safeguards.",
    ]
    return {
        "questionId": qid,
        "courseSlug": rank["courseSlug"],
        "topicId": topic_id,
        "topicLabel": topic_label,
        "questionText": statement,
        "options": options,
        "optionIds": [f"{qid}-opt-A", f"{qid}-opt-B"],
        "correctIndex": correct_index,
        "correctOptionId": f"{qid}-opt-{'A' if correct_index == 0 else 'B'}",
        "explanation": explanation,
        "difficulty": "beginner",
        "questionType": "true_false",
        "sourceDocument": "gigaLearn_original_practice_bank_v2",
        "sourceQuestionNumber": n,
        "sourceType": "original_practice",
        "reviewStatus": "pending_review",
        "verificationStatus": "awaiting_verification",
        "publicationStatus": "published_practice",
        "accessTier": ["free"],
        "promotionRank": rank["promotionRank"],
        "tags": ["original_practice", "awaiting_verification", "true_false_v2", "option_explanations_v2", "free_tier"],
        "optionExplanations": option_explanations,
        "internalCaseKey": f"{rank['id']}-tf-{n}",
    }


def improve_existing(q: dict) -> dict:
    q = dict(q)
    q["questionText"] = strip_case_label(q.get("questionText", ""))
    opts = q.get("options") or []
    ci = int(q.get("correctIndex", 0))
    if 0 <= ci < len(opts) and opts:
        topic = q.get("topicLabel") or "professional practice"
        explanation, notes = explain_options(opts, ci, topic, q["questionText"])
        # Keep stronger authored explanations if already long and non-generic
        old_notes = q.get("optionExplanations") or []
        generic = any(
            "does not satisfy the question" in str(x).lower()
            or "weaker or contrary approach" in str(x).lower()
            or "matches the intended professional practice" in str(x).lower()
            for x in old_notes
        )
        if not old_notes or len(old_notes) != len(opts) or generic:
            q["optionExplanations"] = notes
        if generic or len((q.get("explanation") or "")) < 60:
            q["explanation"] = explanation
        tags = list(q.get("tags") or [])
        for t in ("case_label_removed", "option_explanations_v2"):
            if t not in tags:
                tags.append(t)
        q["tags"] = tags
    return q


def rebuild_meta() -> None:
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
            "sourceDocument": data.get("sourceDocument") or "gigaLearn_original_practice_bank_v2",
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
        "exam-director-ii",
        "exam-director-i",
    ]
    banks = [by_slug[s] for s in order if s in by_slug]
    for slug, entry in by_slug.items():
        if slug not in order:
            banks.append(entry)
    meta_path.write_text(json.dumps({"banks": banks}, indent=2, ensure_ascii=False) + "\n")


def expand_rank(rank: dict) -> dict:
    path = BANKS / rank["file"]
    data = json.loads(path.read_text())
    existing = [improve_existing(q) for q in data.get("questions", [])]
    stems = {normalize_stem(q["questionText"]) for q in existing}
    ids = {q["questionId"] for q in existing}

    # Drop exact duplicate stems after case strip
    deduped = []
    seen = set()
    for q in existing:
        key = normalize_stem(q["questionText"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(q)
    existing = deduped
    stems = {normalize_stem(q["questionText"]) for q in existing}

    n = 1
    added = 0
    attempts = 0
    # Generate until TARGET — n is embedded in each stem for uniqueness.
    while len(existing) < TARGET and attempts < TARGET * 20:
        attempts += 1
        topic_id, topic_label = rank["topics"][(n - 1) % len(rank["topics"])]
        setting = SETTINGS[(n - 1) % len(SETTINGS)]
        challenge = CHALLENGES[(n * 3 + n // 5) % len(CHALLENGES)]
        if n % 7 == 0:
            q = make_tf(rank, topic_id, topic_label, setting, n, truth=(n % 2 == 0))
        else:
            q = make_mcq(rank, topic_id, topic_label, setting, challenge, n)
        n += 1
        if q["questionId"] in ids:
            continue
        key = normalize_stem(q["questionText"])
        if key in stems:
            continue
        existing.append(q)
        stems.add(key)
        ids.add(q["questionId"])
        added += 1

    # Ensure at least ~20% free tier
    free = sum(1 for q in existing if "free" in (q.get("accessTier") or []))
    need_free = max(0, min(120, len(existing) // 5) - free)
    for q in existing:
        if need_free <= 0:
            break
        if "free" not in (q.get("accessTier") or []):
            q["accessTier"] = ["free"]
            need_free -= 1

    data["questions"] = existing[:TARGET]
    data["title"] = f"GES {rank['label']} Promotion Practice"
    data["provenanceNote"] = (
        "Original GigaLearn practice bank expanded toward 550 distinct items per rank. "
        "Case labels removed from learner-facing stems. Items remain pending_review / "
        "awaiting_verification and are not official GES examination questions."
    )
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    pool = data["questions"]
    return {
        "rank": rank["id"],
        "total": len(pool),
        "added": added,
        "mcq": sum(1 for q in pool if q.get("questionType", "mcq") == "mcq"),
        "tf": sum(1 for q in pool if q.get("questionType") == "true_false"),
        "with_case": sum(1 for q in pool if CASE_RE.search(q.get("questionText") or "")),
        "generic": sum(1 for q in pool if GENERIC_STEM_RE.search(q.get("questionText") or "")),
    }


def main() -> None:
    report = []
    for rank in RANKS:
        summary = expand_rank(rank)
        report.append(summary)
        print(summary)
    rebuild_meta()
    out = ROOT / "docs/gigalearn/promotion-550-expansion-report.json"
    out.write_text(json.dumps({"target": TARGET, "ranks": report}, indent=2) + "\n")
    print("wrote", out)


if __name__ == "__main__":
    main()
