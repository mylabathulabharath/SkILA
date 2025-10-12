import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('Creating Supabase client');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Getting auth header');
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.log('No auth header found');
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

    console.log('Authenticating user');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      console.log('Auth error:', authError);
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

    console.log('User authenticated:', user.id);

    console.log('Parsing request body');
    const body = await req.json();
    console.log('Request body:', body);
    
    const { test_id } = body;

    if (!test_id) {
      console.log('Missing test_id');
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

    console.log('Processing test_id:', test_id);

    // Get test details to get the actual duration
    console.log('Fetching test details');
    const { data: test, error: testError } = await supabaseClient
      .from('tests')
      .select('time_limit_minutes')
      .eq('id', test_id)
      .single();

    if (testError) {
      console.error('Error fetching test:', testError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'TEST_NOT_FOUND',
          message: 'Test not found: ' + testError.message
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Test found, duration:', test.time_limit_minutes, 'minutes');

    // Create attempt with correct duration
    console.log('Creating new attempt');
    const now = new Date();
    const durationMs = (test.time_limit_minutes || 60) * 60 * 1000; // Use test duration or default to 60 minutes
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'ATTEMPT_CREATION_FAILED',
          message: 'Failed to create attempt: ' + attemptError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Attempt created successfully:', newAttempt);

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
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error_code: 'INTERNAL_ERROR',
        message: 'Internal server error: ' + error.message,
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});