import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, serviceClient, json, fail,
  initSectionedAttempt, sectionPayload,
} from '../_shared/exam.ts';

// Public candidate registration for a sectioned, publicly-shared exam.
// Creates the candidate + attempt, freezes their randomized paper, and opens
// the first section. Returns an opaque session_token the client uses for all
// later calls (get-exam-state / save-mcq-answer / submit-section / run-code).
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { sharing_token, name, email, roll_number, branch, college } = await req.json();
    if (!sharing_token || !name || !email) {
      return fail('MISSING_FIELDS', 'sharing_token, name and email are required');
    }

    const supabase = serviceClient();

    // 1. Resolve the public sectioned exam.
    const { data: test } = await supabase.from('tests')
      .select('*').eq('sharing_token', sharing_token).eq('is_public', true).maybeSingle();
    if (!test) return fail('EXAM_NOT_FOUND', 'This exam link is invalid or not public', 404);
    if (!test.is_sectioned) return fail('NOT_SECTIONED', 'This link is not a sectioned exam', 400);

    // 2. One attempt per email. If already registered, do not leak the token.
    const emailNorm = String(email).trim().toLowerCase();
    const { data: existing } = await supabase.from('exam_candidates')
      .select('id').eq('test_id', test.id).eq('email', emailNorm).maybeSingle();
    if (existing) {
      return fail('ALREADY_REGISTERED', 'This email has already started this exam.', 409);
    }

    // 3. Create candidate + attempt.
    const { data: candidate, error: candErr } = await supabase.from('exam_candidates')
      .insert({ test_id: test.id, name, email: emailNorm, roll_number, branch, college })
      .select().single();
    if (candErr) throw candErr;

    const sessionToken = crypto.randomUUID();
    const now = new Date();
    const { data: attempt, error: attErr } = await supabase.from('attempts')
      .insert({
        test_id: test.id,
        candidate_id: candidate.id,
        status: 'active',
        started_at: now.toISOString(),
        meta: { session_token: sessionToken },
      }).select().single();
    if (attErr) throw attErr;

    // 4. Draw & freeze the paper, seed progress + timing, open first section.
    if (!test.is_sectioned) return fail('NOT_SECTIONED', 'This exam has no sections', 400);
    const { sections, first, attemptEndsAt, firstEndsAt } =
      await initSectionedAttempt(supabase, test, attempt.id, now);

    const questions = await sectionPayload(supabase, attempt.id, first.id);

    return json({
      success: true,
      data: {
        attempt_id: attempt.id,
        session_token: sessionToken,
        exam: {
          name: test.name,
          navigation_mode: test.navigation_mode,
          timing_mode: test.timing_mode,
          ends_at: attemptEndsAt,
        },
        sections: sections.map((s: any, i: number) => ({
          id: s.id, title: s.title, type: s.section_type, order_index: s.order_index,
          status: (test.navigation_mode === 'free' || i === 0) ? 'active' : 'locked',
        })),
        current_section: {
          id: first.id,
          title: first.title,
          type: first.section_type,
          ends_at: firstEndsAt,
          questions,
        },
      },
    });
  } catch (e) {
    console.error('register-candidate error:', e);
    return fail('INTERNAL_ERROR', 'Registration failed: ' + (e as Error).message, 500);
  }
});
