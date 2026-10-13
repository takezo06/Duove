// Run: node duove-backend/supabase/functions/qa/day.check.mts
import assert from "node:assert/strict";
import { clock, pickQuestion, answersFor } from "./day.mts";

// 2026-10-12 20:30 UTC is 04:30 on the 13th in Manila (UTC+8): 19.5h left there, 3.5h in UTC.
const t = new Date("2026-10-12T20:30:00Z");
assert.deepEqual(clock("Asia/Manila", t), { today: "2026-10-13", secondsUntilNext: 19.5 * 3600 });
assert.deepEqual(clock(null, t), { today: "2026-10-12", secondsUntilNext: 3.5 * 3600 });
assert.equal(clock("Not/AZone", t).today, "2026-10-12");

const pool = [{ id: "a" }, { id: "b" }, { id: "c" }];
const used = [
  { question_id: "b", assigned_date: "2026-10-12" },
  { question_id: "a", assigned_date: "2026-10-11" },
];
assert.equal(pickQuestion(pool, used)?.id, "c"); // only unused one
assert.equal(pickQuestion(pool, used, "c")?.id, "a"); // exhausted -> oldest use
assert.equal(pickQuestion([{ id: "a" }], [], "a"), null); // nothing left to skip to
assert.equal(pickQuestion(pool, [], undefined, () => 0.99)?.id, "c");

const asg = { question_id: "a", assigned_date: "2026-10-13" };
const ans = [
  { question_id: "a", submitted_at: "2026-10-12T17:00:00+00:00" }, // Manila morning of the 13th
  { question_id: "a", submitted_at: "2026-09-01T10:00:00+00:00" }, // same question, earlier round
  { question_id: "b", submitted_at: "2026-10-13T01:00:00+00:00" },
];
assert.deepEqual(answersFor(asg, ans), [ans[0]]);

console.log("qa day checks passed");
