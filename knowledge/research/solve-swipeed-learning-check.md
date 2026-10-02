---
type: research
title: SwipeEd and the Solve 2027 Learning challenge
description: Whether The Equal Lens's SwipeEd app fits MIT Solve's 2027 Global Learning Challenge, scored on every Solve criterion and each focus area from SwipeEd's own knowledge base, audit and Plane state, with what must change before applying.
status: draft
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4c360517-0dc6-4d85-ac83-204ae7fc932b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b5102688-5f14-4a95-afbf-edbcde5bba62
---

# SwipeEd and the Solve 2027 Learning challenge

This was read on 2 October 2026 from the SwipeEd repository (`/Users/priyanshu/swipeed-equal-lens`, read only) and its Plane project (SWED).

- **What was read:** its README, knowledge base, the question bank audit of 14 September 2026 and the playtest plan.
- **Why it lives here:** it sits beside the other Solve research. It belongs with SwipeEd, and can move into SwipeEd's knowledge base under a SWED ticket.
- **The scale is ours.** Scores are an internal 1 to 5, because Solve publishes no scale. The criteria are in [solve-criteria-check.md](solve-criteria-check.md).

## 1. The verdict
- **SwipeEd fits the Learning challenge much better than Nivel does.** It scores about 3 across the screening criteria, against under 2 for Nivel.
  - It teaches learners from age 3 to parenthood.
  - It is India-first.
  - It addresses a real gap in relationships, sexuality and life-skills education.
- **Its strongest criteria are Innovative Approach and Technical Feasibility.** One engine runs 69 games, and the interaction is the lesson. AI agents generated 33,542 scenarios, and every one passed deterministic gates and a different-context adversarial review.
- **Two things must happen before any application.**
  - **The critical audit fixes.** The audit of 14 September found two critical errors that the live app shows to minors and parents. Their tickets, SWED-79 and SWED-80, were still in Todo on 2 October, and so were SWED-81 and SWED-82 (rated high).
    - Content says transgender self-identification is current law, when the 2026 amendment removed it.
    - Content tells 15-to-18-year-olds that mandatory reporting is a myth.
    - Reviewers will open the app. More importantly, children are using it.
  - **The clinical content decision (SWED-84).** The Equal Lens's own rule is no clinical content, yet the app has about 1,400 scenarios on contraception, STIs or treatment. An application must state one position.
- **There is no evidence of learning yet.** Testing so far is friends playing one chapter. A small, measured pilot is the single biggest gain available.

## 2. The challenge, briefly
- **The question:** "How can we close global education gaps while improving outcomes for every learner?"
- **The focus areas:**
  - "Strengthen teachers' instructional practice through evidence-grounded tools"
  - "Work in emergency or low-resource settings"
  - "Include assistive technology or multilingual capabilities"
  - "Improve assessment of what learners truly know and can do"
- **Who it emphasises:** children out of school, learners with disabilities, speakers of non-dominant languages, and low-resource or emergency settings.
- **Entering more than one challenge:** one solution may enter several Global Challenges, but a team that advances in more than one must pick one. Whether one organisation can enter two different solutions (Nivel and SwipeEd) is worth confirming in Solve's FAQ.

## 3. Fit with each focus area
| Focus area | SwipeEd today | What would make it fit |
|---|---|---|
| Teachers' instructional practice | the app faces learners; a School-Comfort Mode filters one deck; Classroom Mode is listed as planned in several game docs | a facilitator mode that uses SwipeEd inside The Equal Lens's school programmes for ages 5 to 18 |
| Emergency or low-resource settings | a web app with no offline mode, because its service worker only clears caches; a 2D fallback for devices without 3D graphics | offline play and low data use. This is the weakest area |
| Assistive or multilingual | read-aloud for early readers, text size, a calm mode, colour never the only signal; English only, with Hindi planned in several game docs | Hindi first, through the same generate, gate and review pipeline, with Hindi-speaking reviewers |
| Assessment of what learners know | no assessment; no accounts and no analytics by design. The Unlearn, Relearn, Grow ritual surfaces each misconception | a short misconception check before and after each chapter, paired on the device and sent only as counts. This is the most natural fit |

## 4. Scores by criterion
| Criterion | Scored at | Score | Evidence | The gap |
|---|---|---|---|---|
| Alignment | screening | 3 | learners from age 3 to parenthood, India-first; relationships, sexuality and life-skills education is a recognised education gap | the focus areas fit only in part. Lead with assessment, or with assistive and multilingual |
| Potential for Impact | screening | 2.5 | 69 games across 8 age bands; the content is grounded in The Equal Lens's game design documents and Indian law; there is research showing sustained gender-attitude programmes work in Indian schools | no learners counted, no outcome measured, and self-paced app learning is less proven than taught programmes |
| Feasibility | screening | 3 | live at swipeed.vercel.app; disciplined engineering, with gates, tickets and a knowledge base | the critical content fixes are open, it is English only, there is no school deployment plan, and the engine belongs to Owhile, a separate venture |
| Innovative Approach | screening | 4 | a curriculum generated by AI with deterministic safety gates and an adversarial reviewer; games whose mechanic is the lesson; one continuous path from age 3 to parenthood | Duolingo-style micro-learning is familiar; sexuality-education apps exist (for example UNICEF's Oky, and Love Matters India). Name them |
| Human-Centered Design | screening | 2.5 | built safeguarding-first (no fail state, Get Help always one tap away, no accounts); India-real content; accessibility settings | no co-design with children, parents or teachers is documented; the testers so far were friends |
| Scalability | finalists | 3.5 | near-zero cost per learner; the content pipeline can add languages; The Equal Lens has delivery partners for its programmes | no distribution plan or funding plan for the app yet |
| Partnership Potential | finalists | 3 | Solve could help with school systems, evaluation, translation, and safeguarding review | not yet written |
| Technical Feasibility | finalists | 4 | 77 nodes and 33,542 scenarios live; the audit found every answer key structurally sound | the content errors above are not technical, but a reviewer will meet them |

## 5. The AI for Humanity Prize
- **SwipeEd has what Nivel lacks: AI with a specific, load-bearing job.**
  - AI agents generated the curriculum's 33,542 scenarios from game design documents.
  - Deterministic gates prove structure, helpline numbers and age rules.
  - A different-context AI reviewer re-derives every answer key. The build overview records answer keys it caught inverted before release.
- **That is a credible prize story only with the safety design shown working.** Today the audit's critical findings are unfixed. Lead with the fixes, the human sign-off (the founder-approved helpline and law allowlist), and the audit itself as evidence that review works.

## 6. Before applying
1. **Fix SWED-79 to SWED-82,** the critical and high safety and legal content, and have the legal changes checked, as the audit recommends.
2. **Decide SWED-84 (clinical content) and SWED-83 (anatomical words),** and state the curriculum's position in the application.
3. **Run one measured pilot:** a misconception check before and after one chapter, with a classroom or community group, under The Equal Lens's child-safety rules. No photographs of children.
4. **Pick a lead focus area:**
   - assessment (the misconception check);
   - or assistive and multilingual (read-aloud plus Hindi).
5. **State who owns what.** The Equal Lens owns the curriculum, content and brand; Owhile owns the engine. Say on what terms SwipeEd uses it.
6. **Write the team, budget and distribution plan,** naming the delivery partners from The Equal Lens's school programmes, if they agree to be named.

## Sources
- SwipeEd repository, read only:
  - `README.md`;
  - `knowledge/README.md`;
  - `knowledge/games/swipeed.md` and `swipeed-build-overview.md`;
  - `knowledge/audits/question-bank-audit-2026-09-14.md`;
  - `knowledge/playbooks/playtest-feedback-plan-2026-09-15.md`;
  - `knowledge/log/log.md`.
- SwipeEd's Plane project (the-equal-lens, SWED): ticket states read on 2 October 2026.
- MIT Solve, [2027 Global Learning Challenge](https://solve.mit.edu/challenges/2027-global-learning-challenge), read 2 October 2026.
- Related: [solve-criteria-check.md](solve-criteria-check.md), [solve-winning-pitches.md](solve-winning-pitches.md) and [solve-innovation-assessment.md](solve-innovation-assessment.md).
