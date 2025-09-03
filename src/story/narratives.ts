// Prologue + full chapter epilogues/hooks for the SQL Noir story.
// Paste this file into: src/story/narratives.ts

export const PROLOGUE = {
  title: 'Prologue — The Pawnshop Fire',
  paragraphs: [
    '22:41 on 2025-08-27: a fire is reported at Northside Pawn. Scene contained. One fatality confirmed.',
    'Early indicators (burn pattern near the back office, forced damage on the rear door hardware, and a witness timing mismatch) suggest the fire may have been set.',
    'The police asked our unit to reconstruct the timeline from system data. The goal is simple: convert assumptions into verifiable facts so detectives know who to interview, when, and about what.',
    'I am the off-site data analyst on this case. My inputs are shift schedules, door access logs, and POS sessions. I start with shifts because it answers the first hard question: who was present, and when.',
    'Why Chapter 1 matters: a correct roster reduces the search space. From there we isolate outliers—latest departures, missing clock-outs, and unusually late starts. These define people and time windows to cross-check in doors/POS, request footage for, and build precise interview timelines around.',
    'Constraints to keep in mind: power failure may cause partial records; clocks can drift; some entries can be late or manual. We treat every record as a claim to be tested against other systems.',
    'Deliverable for Chapter 1: a clean roster for 2025-08-27 and a shortlist with reasons (late exit, no end time, late start). This gives the field team focus and saves time they would otherwise spend chasing everyone.',
    'My job is not drama. It’s accuracy, speed, and a clear hand-off. That’s how we help the team and the victim’s family—by getting to solid ground fast.'
  ],
  ctaLabel: 'Begin Chapter 1'
};

export const CH1_EPILOGUE = {
  title: 'Chapter 1 — Findings from the Roster',
  paragraphs: [
    'Roster for 2025-08-27 is confirmed: names, roles, start and end times are consistent enough to use for timeline work.',
    'Outliers identified: (1) latest departures at or after 23:00, (2) records with no clock_out, and (3) starts after 20:00. These flags describe behavior, not guilt.',
    'How this helps the team now: detectives can narrow interviews to the people on the shortlist; digital forensics can pull door and POS segments only for the relevant windows; any CCTV request can be time-boxed to these intervals.',
    'Next step (Chapter 2): decide whether these behaviors are routine for each person or unique to fire night. We’ll build 30-day personal baselines and compare fire-night metrics to “normal” to spot meaningful deviation.',
    'Result: we carry forward a small, defensible set of names and time windows. That is how quiet analysis moves a case.'
  ],
  ctaLabel: 'Proceed to Chapter 2'
};

export const CH2_HOOK = {
  title: 'Chapter 2 — Ghost Shift',
  paragraphs: [
    'We shift from one night to patterns across the last 30 days.',
    'For each employee we will: (a) count late nights (clock_out ≥ 23:00), (b) compute average clock-out time, and (c) record earliest and latest clock-out. This defines a personal baseline.',
    'We then compare fire-night behavior to each baseline. Material deviation (later than usual, unusually early, or missing where they normally log cleanly) is flagged for cross-checks in door access and POS sessions.',
    'Outcome for the team: a short anomaly list with reasons and timestamps, ready for correlation and interviews. That is the value: less noise, faster signal.'
  ],
  ctaLabel: 'Start Chapter 2'
};

export const CH2_EPILOGUE = {
  title: 'Chapter 2 — Baselines and Deviations',
  paragraphs: [
    'Thirty-day baselines computed. We can now tell habit from anomaly for each person.',
    'Two buckets emerge: (1) routine late workers whose fire-night hours match their norm, and (2) individuals whose fire-night behavior breaks pattern (unusually late, unusually early, or missing where they are usually consistent).',
    'This matters because anomalies change interview order and evidence triage. A routine late worker is lower priority than someone whose hours shifted only on the night in question.',
    'Hand-off: a named anomaly list with per-person metrics (late-night count, average clock-out, min/max clock-out) and specific fire-night deltas. Digital forensics can now pull the matching door/POS windows precisely.',
    'Next step (Chapter 3): corroborate presence and activity by joining shifts with door access and POS sessions. Patterns that survive corroboration are strong leads.'
  ],
  ctaLabel: 'Proceed to Chapter 3'
};

export const CH3_HOOK = {
  title: 'Chapter 3 — The Cross-check',
  paragraphs: [
    'Objective: test whether shift claims match physical movement and terminal use.',
    'Method: INNER JOIN where corroboration is expected (within time windows), LEFT JOIN to find gaps (e.g., a shift with no matching door or POS), and aliases for clarity.',
    'What we’re looking for: (a) entries/exits outside declared shift windows, (b) door activity without a shift (or vice versa), and (c) POS sessions that overlap with closed hours.',
    'Outcome for the team: a confidence score on each person’s timeline—“corroborated,” “partially corroborated,” or “inconsistent”—with concrete timestamps to check in incident reports and camera pulls.'
  ],
  ctaLabel: 'Start Chapter 3'
};

export const CH3_EPILOGUE = {
  title: 'Chapter 3 — Corroboration Results',
  paragraphs: [
    'We compared shifts with doors and POS. Several timelines are fully corroborated; a few show mismatches.',
    'Notable inconsistencies include: (1) door entries after recorded clock_out, (2) POS sessions active while the roster shows no one on duty, and (3) missing door activity for people who report late starts.',
    'Interpretation: corroborated cases move down the queue; inconsistent cases move up. We now know where to press for explanation and where to request additional footage.',
    'Next step (Chapter 4): follow the paper. Insurance activity before and after the fire can indicate preparation, opportunity, or motive.'
  ],
  ctaLabel: 'Proceed to Chapter 4'
};

export const CH4_HOOK = {
  title: 'Chapter 4 — The Paper Crown',
  paragraphs: [
    'We examine insurance drafts and claims around the incident.',
    'Plan: JOIN claims with drafts, aggregate by preparer and business, and use HAVING to surface unusual patterns (e.g., drafts created before the incident date, claims filed unusually fast or unusually large for this shop).',
    'We will look for: (a) any draft referencing the affected business created before 2025-08-27, (b) claim amounts outside typical range, and (c) repeat preparers who appear across multiple drafts.',
    'Outcome for the team: a short list of paperwork anomalies with timestamps and responsible preparers. This directs interview questions and legal requests.'
  ],
  ctaLabel: 'Start Chapter 4'
};

export const CH4_EPILOGUE = {
  title: 'Chapter 4 — Paper Trail Findings',
  paragraphs: [
    'Insurance data reviewed. We identified drafts and claims that sit outside the shop’s normal pattern.',
    'Key signals: (1) drafts referencing the business created unusually close to the incident, (2) claims prepared by the same individual across unrelated businesses, and (3) claim amounts above the store’s historical band.',
    'Impact: these findings add motive/incentive angles to the timeline work. When combined with door and POS anomalies, they elevate certain names from interest to priority.',
    'Next step (Chapter 5): tighten the minute-by-minute timeline around the fire using time ranges and sequences to isolate unsupervised windows.'
  ],
  ctaLabel: 'Proceed to Chapter 5'
};

export const CH5_HOOK = {
  title: 'Chapter 5 — Signal Bleed',
  paragraphs: [
    'Goal: rebuild the critical window precisely using date/time operations and sequences.',
    'We will normalize timestamps, derive ranges from clock_in/out and login/logout, and look for overlaps and gaps. Long gaps near the incident window with no door/POS corroboration are significant.',
    'We’ll also detect sequences (entry → activity → exit). Breaks in expected sequences, or sequences that extend past recorded shifts, are flagged.',
    'Deliverable: a compact table of “unsupervised windows” by person with start/end times and duration, ready for direct field checks.'
  ],
  ctaLabel: 'Start Chapter 5'
};

export const CH5_EPILOGUE = {
  title: 'Chapter 5 — The Window',
  paragraphs: [
    'Critical ranges computed. We isolated specific windows where movement was possible and oversight was low.',
    'Several individuals have clean, continuous sequences that avoid the window entirely. A smaller set overlaps the window or shows gaps consistent with opportunity.',
    'This reduces the case to a small intersection: who had opportunity (window overlap), anomalous behavior (from baselines), and paperwork proximity (from claims/drafts).',
    'Next step (Chapter 6): run integrity checks. If a record should exist and does not, we need to know. If a record exists where it should not, we need to know.'
  ],
  ctaLabel: 'Proceed to Chapter 6'
};

export const CH6_HOOK = {
  title: 'Chapter 6 — False Mirror',
  paragraphs: [
    'Objective: verify data integrity with targeted subqueries and EXISTS/NOT EXISTS checks.',
    'We will mark: (a) clock-outs without a corresponding door exit within a reasonable window, (b) door entries with no shift or POS activity, and (c) POS sessions with no overlapping staff.',
    'Records that fail these checks indicate error or manipulation. Either way, they change credibility and interview strategy.',
    'Outcome: an integrity score per person and a list of missing/present-but-wrong artifacts to escalate to digital forensics.'
  ],
  ctaLabel: 'Start Chapter 6'
};

export const CH6_EPILOGUE = {
  title: 'Chapter 6 — Integrity Report',
  paragraphs: [
    'Integrity checks complete. Most records hold; a subset does not.',
    'The failures align with earlier anomalies: mismatched exits, activity without staffing, and paperwork timing that is hard to explain. This convergence is what matters.',
    'We now have a traceable chain: presence → deviation → corroboration → motive signals → opportunity window → integrity flags.',
    'Next: combine all of it into one defensible view and hand the detectives a short, ranked list with reasons and timestamps.'
  ],
  ctaLabel: 'Proceed to Finale'
};

export const FINALE_HOOK = {
  title: 'Finale — The Reckoning',
  paragraphs: [
    'We will assemble the case with a multi-step CTE: shortlist from Chapter 1, baseline deviations from Chapter 2, corroboration scores from Chapter 3, paperwork anomalies from Chapter 4, window overlaps from Chapter 5, and integrity flags from Chapter 6.',
    'The output is a ranked table: person, key timestamps, anomaly count by category, and a short reason string. This is the interview plan.',
    'Your role is the same as it was at the start: get to the truth quickly and make it easy to act on.'
  ],
  ctaLabel: 'Build the Final Query'
};

export const FINALE_OUTRO = {
  title: 'Case Hand-off — What We Deliver',
  paragraphs: [
    'Deliverable: a one-page brief with the ranked list, timestamps, and the SQL behind each conclusion. Clear enough to validate, strong enough to move.',
    'This is how quiet analysis helps the team and the family: fewer guesses, faster answers.',
    'Close the loop, document the steps, and archive the queries. When the next case lands, we’ll be ready.'
  ],
  ctaLabel: 'Finish'
};
