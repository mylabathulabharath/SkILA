import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { attempt_id } = await req.json();

    // Validate attempt ownership and status
    const { data: attempt } = await supabaseClient
      .from('attempts')
      .select('*')
      .eq('id', attempt_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!attempt) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'INVALID_ATTEMPT',
          message: 'Invalid or already submitted attempt' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine status based on time
    const now = new Date();
    const endsAt = new Date(attempt.ends_at);
    const status = now >= endsAt ? 'auto_submitted' : 'submitted';

    // Calculate final score based on all submissions
    const { data: submissions } = await supabaseClient
      .from('submissions')
      .select(`
        question_id,
        verdict,
        passed_count,
        total_count
      `)
      .eq('attempt_id', attempt_id)
      .eq('run_type', 'submit');

    let finalScore = 0;
    const questionScores = new Map();

    // Calculate score for each question (best submission per question)
    for (const submission of submissions || []) {
      const questionId = submission.question_id;
      const passedCount = submission.passed_count || 0;
      const totalCount = submission.total_count || 1;
      
      // Get points for this question from test_questions table
      const { data: testQuestion } = await supabaseClient
        .from('test_questions')
        .select('points')
        .eq('test_id', attempt.test_id)
        .eq('question_id', questionId)
        .single();
      
      const points = testQuestion?.points || 100;
      
      // Calculate score based on percentage of test cases passed
      const scorePercentage = totalCount > 0 ? passedCount / totalCount : 0;
      const questionScore = Math.round(points * scorePercentage);
      
      if (!questionScores.has(questionId)) {
        questionScores.set(questionId, 0);
      }
      
      // Keep the best score for this question
      if (questionScore > questionScores.get(questionId)) {
        questionScores.set(questionId, questionScore);
      }
    }

    // Sum up all question scores
    finalScore = Array.from(questionScores.values()).reduce((sum, score) => sum + score, 0);

    // Get max possible score
    const { data: testQuestions } = await supabaseClient
      .from('test_questions')
      .select('points')
      .eq('test_id', attempt.test_id);

    const maxScore = testQuestions?.reduce((sum, q) => sum + (q.points || 100), 0) || 100;

    // Finalize attempt with calculated score
    const { error } = await supabaseClient
      .from('attempts')
      .update({ 
        status,
        submitted_at: now.toISOString(),
        score: finalScore,
        max_score: maxScore
      })
      .eq('id', attempt_id);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          status,
          score: finalScore,
          max_score: maxScore,
          submitted_at: now.toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in finalize-attempt:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error_code: 'INTERNAL_ERROR',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});