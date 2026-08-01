import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, serviceClient, json, fail, authAttempt,
  gradeMcqSection, gradeCodingSection, finalizeAttempt, sectionEndsAt, sectionPayload,
} from '../_shared/exam.ts';

// Grade + lock the given section, then apply the exam's gating rule:
//   free              -> complete this section; finalize when all are done
//   sequential_lock   -> unlock the next section (or finalize if last)
//   sequential_cutoff -> unlock next only if score% >= pass_cutoff, else finalize
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { attempt_id, session_token, section_id } = await req.json();
    if (!section_id) return fail('MISSING_FIELDS', 'section_id is required');

    const supabase = serviceClient();
    const attempt = await authAttempt(supabase, attempt_id, session_token);
    if (!attempt) return fail('INVALID_TOKEN', 'Invalid or expired exam session', 403);
    if (attempt.status !== 'active') return fail('NOT_ACTIVE', 'This attempt is no longer active', 409);

    const { data: section } = await supabase.from('exam_sections')
      .select('id, test_id, section_type, order_index, pass_cutoff_percent, time_limit_minutes')
      .eq('id', section_id).eq('test_id', attempt.test_id).maybeSingle();
    if (!section) return fail('INVALID_SECTION', 'Section not part of this exam', 400);

    const { data: prog } = await supabase.from('attempt_section_progress')
      .select('status').eq('attempt_id', attempt_id).eq('section_id', section_id).maybeSingle();
    if (!prog || prog.status !== 'active') {
      return fail('SECTION_NOT_ACTIVE', 'This section is not open for submission', 409);
    }

    const { data: test } = await supabase.from('tests')
      .select('navigation_mode, timing_mode').eq('id', attempt.test_id).single();

    // 1. Grade server-side and lock the section.
    const { score, possible } = section.section_type === 'mcq'
      ? await gradeMcqSection(supabase, attempt_id, section_id)
      : await gradeCodingSection(supabase, attempt_id, section_id);

    await supabase.from('attempt_section_progress').update({
      status: 'completed', score, completed_at: new Date().toISOString(),
    }).eq('attempt_id', attempt_id).eq('section_id', section_id);

    // 2. Cutoff gate.
    if (test?.navigation_mode === 'sequential_cutoff' && section.pass_cutoff_percent != null) {
      const percent = possible > 0 ? (score / possible) * 100 : 0;
      if (percent < section.pass_cutoff_percent) {
        const final = await finalizeAttempt(supabase, attempt_id);
        return json({
          success: true,
          data: {
            section_score: score, section_possible: possible,
            gate: 'failed_cutoff', finalized: true, ...final,
          },
        });
      }
    }

    // 3. Advance. Free mode: finalize once all sections are completed.
    if (test?.navigation_mode === 'free') {
      const [{ count: total }, { count: done }] = await Promise.all([
        supabase.from('exam_sections').select('id', { count: 'exact', head: true }).eq('test_id', attempt.test_id),
        supabase.from('attempt_section_progress').select('id', { count: 'exact', head: true })
          .eq('attempt_id', attempt_id).eq('status', 'completed'),
      ]);
      if ((done ?? 0) >= (total ?? 0)) {
        const final = await finalizeAttempt(supabase, attempt_id);
        return json({ success: true, data: { section_score: score, section_possible: possible, finalized: true, ...final } });
      }
      return json({ success: true, data: { section_score: score, section_possible: possible, finalized: false } });
    }

    // 3b. Sequential: unlock the next section, or finalize if this was the last.
    const { data: next } = await supabase.from('exam_sections')
      .select('id, title, section_type, time_limit_minutes')
      .eq('test_id', attempt.test_id).gt('order_index', section.order_index)
      .order('order_index').limit(1).maybeSingle();

    if (!next) {
      const final = await finalizeAttempt(supabase, attempt_id);
      return json({ success: true, data: { section_score: score, section_possible: possible, finalized: true, ...final } });
    }

    const now = new Date();
    const nextEndsAt = sectionEndsAt(test?.timing_mode ?? null, next.time_limit_minutes, now);
    await supabase.from('attempt_section_progress').update({
      status: 'active', started_at: now.toISOString(), ends_at: nextEndsAt,
    }).eq('attempt_id', attempt_id).eq('section_id', next.id);
    await supabase.from('attempts').update({ current_section_id: next.id }).eq('id', attempt_id);

    const questions = await sectionPayload(supabase, attempt_id, next.id);
    return json({
      success: true,
      data: {
        section_score: score, section_possible: possible, finalized: false,
        next_section: {
          id: next.id, title: next.title, type: next.section_type,
          ends_at: nextEndsAt, questions,
        },
      },
    });
  } catch (e) {
    console.error('submit-section error:', e);
    return fail('INTERNAL_ERROR', 'Failed to submit section: ' + (e as Error).message, 500);
  }
});
