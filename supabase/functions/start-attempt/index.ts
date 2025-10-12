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

    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'NO_AUTH_HEADER',
          message: 'No authorization header provided' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
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
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { test_id } = await req.json();

    if (!test_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'MISSING_TEST_ID',
          message: 'Test ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if test exists
    const { data: test, error: testError } = await supabaseClient
      .from('tests')
      .select('*')
      .eq('id', test_id)
      .single();

    if (testError || !test) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'TEST_NOT_FOUND',
          message: 'Test not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user already has an active attempt
    const { data: existingAttempt } = await supabaseClient
      .from('attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('test_id', test_id)
      .eq('status', 'active')
      .single();

    if (existingAttempt) {
      // Return existing attempt
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: existingAttempt
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create new attempt
    const now = new Date();
    const endsAt = new Date(now.getTime() + (test.duration_minutes * 60 * 1000));

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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'ATTEMPT_CREATION_FAILED',
          message: 'Failed to create attempt' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: newAttempt
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in start-attempt:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error_code: 'INTERNAL_ERROR',
        message: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});