// ==========================================================================
// Shared helpers for the sectioned-exam engine (register-candidate,
// get-exam-state, save-mcq-answer, submit-section, finalize-attempt).
//
// GOLDEN RULE: nothing in a "payload" returned to a taker may contain an MCQ
// answer key (`is_correct`) or a hidden (non-public) coding test case.
// All grading happens server-side with the service-role client.
// ==========================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function fail(code: string, message: string, status = 400) {
  return json({ success: false, error_code: code, message }, status);
}

// Validate a taker's opaque session token against attempts.meta.session_token.
// Works for both public candidates and logged-in students (start-attempt seeds
// the same token). Returns the attempt row, or null if the token is wrong.
export async function authAttempt(
  supabase: ReturnType<typeof serviceClient>,
  attemptId: string,
  sessionToken: string,
) {
  if (!attemptId || !sessionToken) return null;
  const { data: attempt } = await supabase.from('attempts')
    .select('*').eq('id', attemptId).maybeSingle();
  if (!attempt) return null;
  const token = (attempt.meta ?? {}).session_token;
  if (!token || token !== sessionToken) return null;
  return attempt;
}

// Simple, unbiased-enough shuffle for question selection.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --------------------------------------------------------------------------
// Materialize a student's frozen paper: for each section, draw `draw_count`
// pool items per difficulty bucket and insert attempt_questions.
// Returns the exam's max_score (sum of drawn points).
// --------------------------------------------------------------------------
export async function drawAndFreeze(
  supabase: ReturnType<typeof serviceClient>,
  attemptId: string,
  sections: Array<{ id: string; section_type: string }>,
): Promise<number> {
  let maxScore = 0;
  const rows: any[] = [];

  for (const section of sections) {
    const [{ data: rules }, { data: pool }] = await Promise.all([
      supabase.from('section_draw_rules').select('difficulty_bucket, draw_count')
        .eq('section_id', section.id),
      supabase.from('section_pool_items')
        .select('question_id, mcq_question_id, difficulty_bucket, points')
        .eq('section_id', section.id),
    ]);

    let order = 0;
    for (const rule of rules || []) {
      if (!rule.draw_count) continue;
      const bucket = (pool || []).filter((p: any) => p.difficulty_bucket === rule.difficulty_bucket);
      const picked = shuffle(bucket).slice(0, rule.draw_count);
      for (const item of picked) {
        maxScore += item.points || 0;
        rows.push({
          attempt_id: attemptId,
          section_id: section.id,
          question_id: item.question_id ?? null,
          mcq_question_id: item.mcq_question_id ?? null,
          order_index: order++,
          points: item.points || 0,
        });
      }
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('attempt_questions').insert(rows);
    if (error) throw error;
  }
  return maxScore;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

// Server-side MCQ grading for one section. Reads is_correct (never exposed to
// the client), sets is_correct/marks_awarded on each response, returns totals.
export async function gradeMcqSection(
  supabase: ReturnType<typeof serviceClient>, attemptId: string, sectionId: string,
) {
  const { data: aqs } = await supabase.from('attempt_questions')
    .select('id, mcq_question_id, points')
    .eq('attempt_id', attemptId).eq('section_id', sectionId)
    .not('mcq_question_id', 'is', null);

  let score = 0, possible = 0;
  for (const aq of aqs || []) {
    possible += aq.points || 0;
    const [{ data: correct }, { data: resp }] = await Promise.all([
      supabase.from('mcq_options').select('id').eq('question_id', aq.mcq_question_id).eq('is_correct', true),
      supabase.from('attempt_mcq_responses').select('selected_option_ids')
        .eq('attempt_id', attemptId).eq('attempt_question_id', aq.id).maybeSingle(),
    ]);
    const correctIds = (correct || []).map((o: any) => o.id);
    const selected = resp?.selected_option_ids ?? [];
    const isCorrect = correctIds.length > 0 && sameSet(selected, correctIds);
    const marks = isCorrect ? (aq.points || 0) : 0;
    score += marks;
    await supabase.from('attempt_mcq_responses')
      .update({ is_correct: isCorrect, marks_awarded: marks })
      .eq('attempt_id', attemptId).eq('attempt_question_id', aq.id);
  }
  return { score, possible };
}

// Coding section score from the best 'submit' run per frozen question.
export async function gradeCodingSection(
  supabase: ReturnType<typeof serviceClient>, attemptId: string, sectionId: string,
) {
  const { data: aqs } = await supabase.from('attempt_questions')
    .select('question_id, points')
    .eq('attempt_id', attemptId).eq('section_id', sectionId)
    .not('question_id', 'is', null);

  let score = 0, possible = 0;
  for (const aq of aqs || []) {
    possible += aq.points || 0;
    const { data: best } = await supabase.from('submissions')
      .select('passed_count, total_count')
      .eq('attempt_id', attemptId).eq('question_id', aq.question_id).eq('run_type', 'submit')
      .order('passed_count', { ascending: false }).limit(1).maybeSingle();
    if (best && best.total_count > 0) {
      score += Math.round((aq.points || 0) * best.passed_count / best.total_count);
    }
  }
  return { score, possible };
}

// Sum completed-section scores and mark the attempt submitted.
export async function finalizeAttempt(
  supabase: ReturnType<typeof serviceClient>, attemptId: string,
) {
  const { data: progress } = await supabase.from('attempt_section_progress')
    .select('score').eq('attempt_id', attemptId).eq('status', 'completed');
  const score = (progress || []).reduce((s: number, p: any) => s + (p.score || 0), 0);
  await supabase.from('attempts')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), score })
    .eq('id', attemptId);
  const { data: att } = await supabase.from('attempts').select('max_score').eq('id', attemptId).single();
  return { score, max_score: att?.max_score ?? 0 };
}

// When does a section's clock run out, given the exam's timing_mode?
export function sectionEndsAt(
  timingMode: string | null,
  sectionTimeLimitMin: number | null,
  from: Date,
): string | null {
  if ((timingMode === 'per_section' || timingMode === 'both') && sectionTimeLimitMin) {
    return new Date(from.getTime() + sectionTimeLimitMin * 60_000).toISOString();
  }
  return null; // overall-only timing lives on attempts.ends_at
}

// --------------------------------------------------------------------------
// Initialize a freshly-created sectioned attempt: draw & freeze the paper,
// seed per-section progress (respecting navigation_mode), set timing, and
// point the attempt at its first section. Shared by register-candidate
// (public) and start-attempt (logged-in). Returns summary for the response.
// --------------------------------------------------------------------------
export async function initSectionedAttempt(
  supabase: ReturnType<typeof serviceClient>,
  test: any,
  attemptId: string,
  now: Date,
) {
  const { data: sections } = await supabase.from('exam_sections')
    .select('id, title, section_type, order_index, time_limit_minutes')
    .eq('test_id', test.id).order('order_index');
  if (!sections || sections.length === 0) throw new Error('This exam has no sections configured');

  const maxScore = await drawAndFreeze(supabase, attemptId, sections);

  let attemptEndsAt: string | null = null;
  if ((test.timing_mode === 'overall' || test.timing_mode === 'both') && test.overall_time_limit_minutes) {
    attemptEndsAt = new Date(now.getTime() + test.overall_time_limit_minutes * 60_000).toISOString();
  }

  const isFree = test.navigation_mode === 'free';
  const progressRows = sections.map((s: any, i: number) => {
    const active = isFree || i === 0;
    return {
      attempt_id: attemptId,
      section_id: s.id,
      status: active ? 'active' : 'locked',
      started_at: active ? now.toISOString() : null,
      ends_at: active ? sectionEndsAt(test.timing_mode, s.time_limit_minutes, now) : null,
    };
  });
  await supabase.from('attempt_section_progress').insert(progressRows);

  const first = sections[0];
  await supabase.from('attempts').update({
    current_section_id: first.id, ends_at: attemptEndsAt, max_score: maxScore,
  }).eq('id', attemptId);

  return { sections, first, attemptEndsAt, firstEndsAt: progressRows[0].ends_at, maxScore };
}

// --------------------------------------------------------------------------
// Build the SANITIZED payload for one section's frozen questions.
// MCQ  -> options WITHOUT is_correct. Coding -> PUBLIC test cases only.
// --------------------------------------------------------------------------
export async function sectionPayload(
  supabase: ReturnType<typeof serviceClient>,
  attemptId: string,
  sectionId: string,
) {
  const { data: aqs } = await supabase.from('attempt_questions')
    .select('id, question_id, mcq_question_id, order_index, points')
    .eq('attempt_id', attemptId).eq('section_id', sectionId)
    .order('order_index');

  const out: any[] = [];
  for (const aq of aqs || []) {
    if (aq.mcq_question_id) {
      const [{ data: q }, { data: opts }, { data: resp }] = await Promise.all([
        supabase.from('mcq_questions').select('id, question_text, difficulty')
          .eq('id', aq.mcq_question_id).single(),
        supabase.from('mcq_options').select('id, option_text, order_index')  // NO is_correct
          .eq('question_id', aq.mcq_question_id).order('order_index'),
        supabase.from('attempt_mcq_responses').select('selected_option_ids')
          .eq('attempt_id', attemptId).eq('attempt_question_id', aq.id).maybeSingle(),
      ]);
      out.push({
        attempt_question_id: aq.id,
        type: 'mcq',
        points: aq.points,
        order_index: aq.order_index,
        question: q,
        options: opts || [],
        selected_option_ids: resp?.selected_option_ids ?? [],
      });
    } else {
      const [{ data: q }, { data: cases }] = await Promise.all([
        supabase.from('questions')
          .select('id, title, problem_statement, supported_languages, difficulty')
          .eq('id', aq.question_id).single(),
        supabase.from('question_test_cases').select('input, expected_output, order_index')
          .eq('question_id', aq.question_id).eq('is_public', true)   // PUBLIC only
          .order('order_index'),
      ]);
      out.push({
        attempt_question_id: aq.id,
        type: 'coding',
        points: aq.points,
        order_index: aq.order_index,
        question: q,
        public_test_cases: cases || [],
      });
    }
  }
  return out;
}
