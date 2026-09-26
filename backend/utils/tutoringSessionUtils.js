// helper utilities related to tutoring session filtering

import { BadRequestError } from "../errors/customErrors.js";

export function escapeRegex(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildFilter(query) {
  const now = new Date();
  let filter = { "schedule.date": { $gte: now } };

  if (query.tutor) filter.tutor = query.tutor;

  // V14-FIX: query.subject was passed raw to MongoDB $regex, allowing regex metacharacters
  // to be interpreted as operators (CWE-1333 — potential ReDoS).
  // The escapeRegex helper already existed and was used correctly for `grade` (line 19).
  // Fix: trim, enforce a maximum length of 100 characters, then escape all metacharacters.
  if (query.subject) {
    const raw = String(query.subject).trim();
    if (raw.length > 100) {
      throw new BadRequestError("subject search term must be 100 characters or fewer");
    }
    const safe = escapeRegex(raw); // All metacharacters become literals
    filter.subject = { $regex: safe, $options: "i" };
  }

  if (query.level) filter.level = query.level;
  if (query.status) filter.status = query.status;

  if (query.grade) {
    const g = query.grade;
    const gradeNum = Number(g);
    const gradeOr = [{ level: { $regex: `^${escapeRegex(g)}$`, $options: "i" } }];
    if (!Number.isNaN(gradeNum)) gradeOr.push({ grade: gradeNum });
    else gradeOr.push({ grade: g });
    filter = { $and: [filter, { $or: gradeOr }] };
  }

  return filter;
}
