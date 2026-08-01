import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, serviceClient, json, fail, authAttempt } from '../_shared/exam.ts';

// Persist an MCQ selection during an active section. Stores ONLY the selection
// (no grading) — is_correct/marks_awarded are filled in later by submit-section.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { attempt_id, session_token, attempt_question_id, selected_option_ids } = await req.json();
    if (!attempt_question_id) return fail('MISSING_FIELDS', 'attempt_question_id is required');

    const supabase = serviceClient();
    const attempt = await authAttempt(supabase, attempt_id, session_token);
    if (!attempt) return fail('INVALID_TOKEN', 'Invalid or expired exam session', 403);
    if (attempt.status !== 'active') return fail('NOT_ACTIVE', 'This attempt is no longer active', 409);

    // The question must belong to this attempt and live in an ACTIVE section.
    const { data: aq } = await supabase.from('attempt_questions')
      .select('id, section_id, mcq_question_id')
      .eq('id', attempt_question_id).eq('attempt_id', attempt_id).maybeSingle();
    if (!aq || !aq.mcq_question_id) return fail('INVALID_QUESTION', 'Question not in this attempt', 400);

    const { data: prog } = await supabase.from('attempt_section_progress')
      .select('status').eq('attempt_id', attempt_id).eq('section_id', aq.section_id).maybeSingle();
    if (!prog || prog.status !== 'active') {
      return fail('SECTION_LOCKED', 'This section is not open for answering', 409);
    }

    const { error } = await supabase.from('attempt_mcq_responses').upsert({
      attempt_id,
      attempt_question_id,
      mcq_question_id: aq.mcq_question_id,
      selected_option_ids: selected_option_ids ?? [],
    }, { onConflict: 'attempt_id,attempt_question_id' });
    if (error) throw error;

    return json({ success: true });
  } catch (e) {
    console.error('save-mcq-answer error:', e);
    return fail('INTERNAL_ERROR', 'Failed to save answer: ' + (e as Error).message, 500);
  }
});
