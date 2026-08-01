import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, serviceClient, json, fail, authAttempt, sectionPayload,
} from '../_shared/exam.ts';

// Full exam state for the taker runner (initial load + resume). Returns exam
// meta, every section with its status + deadline, and SANITIZED question
// payloads for sections the taker may currently work on (status = 'active').
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { attempt_id, session_token } = await req.json();
    const supabase = serviceClient();
    const attempt = await authAttempt(supabase, attempt_id, session_token);
    if (!attempt) return fail('INVALID_TOKEN', 'Invalid or expired exam session', 403);

    const { data: test } = await supabase.from('tests')
      .select('name, navigation_mode, timing_mode')
      .eq('id', attempt.test_id).single();

    const { data: sections } = await supabase.from('exam_sections')
      .select('id, title, section_type, order_index')
      .eq('test_id', attempt.test_id).order('order_index');

    const { data: progress } = await supabase.from('attempt_section_progress')
      .select('section_id, status, ends_at, score')
      .eq('attempt_id', attempt_id);
    const progressBy = new Map((progress || []).map((p: any) => [p.section_id, p]));

    const sectionsOut: any[] = [];
    for (const s of sections || []) {
      const p = progressBy.get(s.id) || { status: 'locked' };
      const entry: any = {
        id: s.id, title: s.title, type: s.section_type, order_index: s.order_index,
        status: p.status, ends_at: p.ends_at ?? null, score: p.score ?? null,
      };
      if (p.status === 'active') {
        entry.questions = await sectionPayload(supabase, attempt_id, s.id);
      }
      sectionsOut.push(entry);
    }

    return json({
      success: true,
      data: {
        attempt_id,
        status: attempt.status,
        score: attempt.score,
        max_score: attempt.max_score,
        exam: {
          name: test?.name,
          navigation_mode: test?.navigation_mode,
          timing_mode: test?.timing_mode,
          ends_at: attempt.ends_at,     // overall clock (null if per-section only)
        },
        sections: sectionsOut,
      },
    });
  } catch (e) {
    console.error('get-exam-state error:', e);
    return fail('INTERNAL_ERROR', 'Failed to load exam: ' + (e as Error).message, 500);
  }
});
