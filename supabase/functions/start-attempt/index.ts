import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { initSectionedAttempt, sectionPayload } from '../_shared/exam.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('start-attempt function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'NO_AUTH_HEADER',
          message: 'No authorization header provided'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    const body = await req.json();
    const { test_id } = body;

    if (!test_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'MISSING_TEST_ID',
          message: 'Test ID is required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─────────────────────────────────────────────
    // 1. Fetch the test to verify it exists + get duration
    // ─────────────────────────────────────────────
    const { data: test, error: testError } = await supabaseClient
      .from('tests')
      .select('id, time_limit_minutes, name, is_sectioned, navigation_mode, timing_mode, overall_time_limit_minutes')
      .eq('id', test_id)
      .single();

    if (testError || !test) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'TEST_NOT_FOUND',
          message: 'Test not found'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Test found:', test.name, '| Duration:', test.time_limit_minutes, 'min');

    // ─────────────────────────────────────────────
    // 2. Check ALL existing attempts for this user+test (any status)
    // ─────────────────────────────────────────────
    const { data: allAttempts, error: attemptsError } = await supabaseClient
      .from('attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('test_id', test_id)
      .order('started_at', { ascending: false });

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
    }

    const attempts = allAttempts || [];
    const activeAttempt = attempts.find(a => a.status === 'active');
    const submittedAttempts = attempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted');

    console.log(`Found ${attempts.length} total attempts, ${activeAttempt ? 1 : 0} active, ${submittedAttempts.length} submitted`);

    // ─────────────────────────────────────────────
    // 3. CASE A: There IS an active attempt → resume or expire it
    // ─────────────────────────────────────────────
    if (activeAttempt) {
      const now = new Date();
      const endsAt = new Date(activeAttempt.ends_at);

      if (now > endsAt) {
        // Attempt has expired but is still marked active → auto-submit it
        console.log('Active attempt is expired. Auto-submitting:', activeAttempt.id);
        await supabaseClient
          .from('attempts')
          .update({
            status: 'auto_submitted',
            submitted_at: endsAt.toISOString(),
            score: activeAttempt.score || 0,
            max_score: activeAttempt.max_score || 0
          })
          .eq('id', activeAttempt.id);

        // After auto-submitting, fall through to create a new attempt or block
        // Actually, if the test window has closed, we should NOT create a new one.
        // We return a clear message.
        return new Response(
          JSON.stringify({
            success: false,
            error_code: 'ATTEMPT_EXPIRED',
            message: 'Your previous attempt has expired and been auto-submitted.',
            data: {
              attempt_id: activeAttempt.id,
              status: 'auto_submitted',
              was_expired: true
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Attempt is still live → RESUME it
        const remainingMs = endsAt.getTime() - now.getTime();
        const remainingMinutes = Math.floor(remainingMs / 60000);
        const remainingSec = Math.floor((remainingMs % 60000) / 1000);

        console.log(`Resuming active attempt: ${activeAttempt.id} | Time left: ${remainingMinutes}m ${remainingSec}s`);

        return new Response(
          JSON.stringify({
            success: true,
            resumed: true,
            message: `Welcome back! Resuming your exam. Time remaining: ${remainingMinutes}m ${remainingSec}s`,
            data: activeAttempt
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ─────────────────────────────────────────────
    // 4. CASE B: No active attempt, but already submitted → tell user
    // ─────────────────────────────────────────────
    if (submittedAttempts.length > 0) {
      const latest = submittedAttempts[0]; // most recent submitted
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'ALREADY_SUBMITTED',
          message: 'You have already completed this exam.',
          data: {
            attempt_id: latest.id,
            status: latest.status,
            score: latest.score,
            max_score: latest.max_score,
            submitted_at: latest.submitted_at
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─────────────────────────────────────────────
    // 5. CASE C: No attempts at all → create a fresh one
    // ─────────────────────────────────────────────
    console.log('No existing attempts. Creating fresh attempt.');
    const now = new Date();

    // ── Sectioned (professional) exam for a logged-in student ──────────────
    // Create the attempt with a session token, freeze the randomized paper,
    // and hand back the same token-based shape the taker runner uses.
    if (test.is_sectioned) {
      const sessionToken = crypto.randomUUID();
      const { data: secAttempt, error: secErr } = await supabaseClient
        .from('attempts')
        .insert({
          user_id: user.id, test_id, status: 'active',
          started_at: now.toISOString(), score: 0, max_score: 0,
          meta: { session_token: sessionToken },
        })
        .select().single();
      if (secErr) throw secErr;

      const { first, attemptEndsAt, firstEndsAt, sections } =
        await initSectionedAttempt(supabaseClient, test, secAttempt.id, now);
      const questions = await sectionPayload(supabaseClient, secAttempt.id, first.id);

      return new Response(JSON.stringify({
        success: true,
        data: {
          attempt_id: secAttempt.id,
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
            id: first.id, title: first.title, type: first.section_type,
            ends_at: firstEndsAt, questions,
          },
        },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const durationMs = (test.time_limit_minutes || 60) * 60 * 1000;
    const endsAt = new Date(now.getTime() + durationMs);

    const { data: newAttempt, error: attemptError } = await supabaseClient
      .from('attempts')
      .insert({
        user_id: user.id,
        test_id: test_id,
        status: 'active',
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        score: 0,
        max_score: 0
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error creating attempt:', attemptError);

      // Handle race condition: unique constraint violation
      if (attemptError.code === '23505') {
        // Another request created the attempt between our check and insert
        const { data: retryAttempt } = await supabaseClient
          .from('attempts')
          .select()
          .eq('user_id', user.id)
          .eq('test_id', test_id)
          .eq('status', 'active')
          .maybeSingle();

        if (retryAttempt) {
          return new Response(
            JSON.stringify({
              success: true,
              resumed: true,
              message: 'Session recovered. Resuming your exam.',
              data: retryAttempt
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'ATTEMPT_CREATION_FAILED',
          message: 'Failed to start exam session. Please try again.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fresh attempt created:', newAttempt.id);

    return new Response(
      JSON.stringify({
        success: true,
        resumed: false,
        message: 'Exam session started successfully.',
        data: newAttempt
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in start-attempt:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error_code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});