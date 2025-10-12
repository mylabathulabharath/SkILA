import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_IDS = {
  c: 50,
  cpp: 54,
  python: 71,
  java: 62,
  javascript: 63,
};

const JUDGE0_API_URL = "http://34.14.221.217:2358"; // Your Google VM instance
const JUDGE0_FALLBACK_URL = "http://34.93.252.188:2358"; // Fallback endpoint

const processTestCases = async (testCases: any[], code: string, language: string) => {
  const languageId = LANGUAGE_IDS[language as keyof typeof LANGUAGE_IDS];
  const results: any[] = [];
  let passedCount = 0;
  let totalTime = 0;
  let totalMemory = 0;

  console.log(`Processing ${testCases.length} test cases sequentially`);

  for (const testCase of testCases) {
    try {
      const result = await executeSingleTestCase(testCase, code, languageId);
      results.push(result);
      
      if (result.status === 'pass') passedCount++;
      if (result.time) totalTime += result.time;
      if (result.memory) totalMemory += result.memory;
    } catch (error) {
      console.error('Error executing test case:', error);
      results.push({
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: 'Execution Error',
        status: 'error',
        case_order: testCase.order_index
      });
    }
  }

  return { results, passedCount, totalTime, totalMemory };
};

const executeSingleTestCase = async (testCase: any, code: string, languageId: number) => {
  // Submit to Judge0 with fallback
  let submissionResponse;
  let submission;
  
  try {
    // Try main endpoint first
    submissionResponse = await fetch(`${JUDGE0_API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: testCase.input,
        expected_output: testCase.expected_output,
        cpu_time_limit: 2,
        memory_limit: 128000,
        enable_network: false,
      }),
    });
    
    if (!submissionResponse.ok) {
      const errorText = await submissionResponse.text();
      throw new Error(`Judge0 main endpoint failed: ${submissionResponse.status} - ${errorText}`);
    }
    
    submission = await submissionResponse.json();
  } catch (error) {
    console.log('Main Judge0 endpoint failed, trying fallback:', error.message);
    
    // Try fallback endpoint
    submissionResponse = await fetch(`${JUDGE0_FALLBACK_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: testCase.input,
        expected_output: testCase.expected_output,
        cpu_time_limit: 2,
        memory_limit: 128000,
        enable_network: false,
      }),
    });
    
    if (!submissionResponse.ok) {
      const errorText = await submissionResponse.text();
      throw new Error(`Judge0 fallback endpoint also failed: ${submissionResponse.status} - ${errorText}`);
    }
    
    submission = await submissionResponse.json();
  }
  
  // Poll for result
  let result;
  let attempts = 0;
  const maxAttempts = 30;

  // Use the same endpoint for polling
  const pollUrl = JUDGE0_API_URL;
  
  do {
    await new Promise(resolve => setTimeout(resolve, 500));
    const resultResponse = await fetch(`${pollUrl}/submissions/${submission.token}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    result = await resultResponse.json();
    attempts++;
  } while (result.status.id <= 2 && attempts < maxAttempts);

  // Normalize outputs
  const actualOutput = (result.stdout || result.stderr || '').trim().replace(/\r\n/g, '\n');
  const expectedOutput = testCase.expected_output.trim().replace(/\r\n/g, '\n');
  const passed = actualOutput === expectedOutput && result.status.id === 3;

  return {
    input: testCase.input,
    expected_output: testCase.expected_output,
    actual_output: actualOutput,
    status: passed ? 'pass' : 'fail',
    case_order: testCase.order_index,
    time: result.time ? parseFloat(result.time) * 1000 : 0,
    memory: result.memory || 0
  };
};

const storeSubmissionResults = async (attemptId: string, questionId: string, language: string, code: string, runType: string, testCases: any[], results: any[], passedCount: number, avgTime: number, avgMemory: number, verdict: string, supabaseClient: any) => {
  // Store submission
  const { data: submissionData, error: submissionError } = await supabaseClient
    .from('submissions')
    .insert({
      attempt_id: attemptId,
      question_id: questionId,
      language: language,
      code: code,
      run_type: runType,
      passed_count: passedCount,
      total_count: testCases.length,
      time_ms: avgTime,
      memory_kb: avgMemory,
      verdict,
      stdout_preview: results[0]?.actual_output.slice(0, 500) || ''
    })
    .select()
    .single();

  if (submissionError) {
    console.error('Error storing submission:', submissionError);
    throw submissionError;
  }

  // Store case results
  if (submissionData) {
    const caseResults = results.map(result => ({
      submission_id: submissionData.id,
      ...result
    }));
    
    await supabaseClient
      .from('submission_case_results')
      .insert(caseResults);
  }

  // Update attempt score if this is a submit
  if (runType === 'submit' && submissionData) {
    await updateAttemptScore(attemptId, questionId, submissionData, passedCount, testCases.length, supabaseClient);
  }

  return submissionData;
};

const updateAttemptScore = async (attemptId: string, questionId: string, submissionData: any, passedCount: number, totalCount: number, supabaseClient: any) => {
  // First get the attempt to get the test_id
  const { data: attempt } = await supabaseClient
    .from('attempts')
    .select('test_id')
    .eq('id', attemptId)
    .single();

  if (!attempt) {
    throw new Error('Attempt not found');
  }

  // Get question points
  const { data: testQuestion } = await supabaseClient
    .from('test_questions')
    .select('points')
    .eq('test_id', attempt.test_id)
    .eq('question_id', questionId)
    .single();

  const questionPoints = testQuestion?.points || 100;
  const scorePercentage = totalCount > 0 ? passedCount / totalCount : 0;
  const questionScore = Math.round(questionPoints * scorePercentage);

  // Get current attempt to see if we need to update the score
  const { data: currentAttempt } = await supabaseClient
    .from('attempts')
    .select('score')
    .eq('id', attemptId)
    .single();

  // Get all previous submissions for this question in this attempt
  const { data: previousSubmissions } = await supabaseClient
    .from('submissions')
    .select('verdict, passed_count, total_count')
    .eq('attempt_id', attemptId)
    .eq('question_id', questionId)
    .eq('run_type', 'submit')
    .order('created_at', { ascending: false });

  // Find the best score for this question
  let bestScore = 0;
  if (previousSubmissions && previousSubmissions.length > 0) {
    bestScore = Math.max(...previousSubmissions.map(sub => {
      const percentage = sub.total_count > 0 ? sub.passed_count / sub.total_count : 0;
      return Math.round(questionPoints * percentage);
    }));
  }

  // Only update if this submission has a better score
  if (questionScore > bestScore) {
    const newTotalScore = (currentAttempt?.score || 0) - bestScore + questionScore;
    
    await supabaseClient
      .from('attempts')
      .update({ 
        score: newTotalScore
      })
      .eq('id', attemptId);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('--- RECEIVED REQUEST BODY ---', body);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    console.log('Supabase URL configured:', !!supabaseUrl);
    console.log('Service role key configured:', !!supabaseServiceKey);
    console.log('Judge0 VM URL:', JUDGE0_API_URL);
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });


    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
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
    
    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'AUTH_ERROR',
          message: 'Authentication failed: ' + authError.message 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!user) {
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


    const { attempt_id, question_id, language, code, run_type } = body;
    
    console.log('run-code function called with:', {
      attempt_id,
      question_id,
      language,
      run_type,
      codeLength: code?.length
    });


    // Validate required fields
    if (!attempt_id || !question_id || !language || !code || !run_type) {
      console.error('Missing required fields:', { attempt_id, question_id, language, code: !!code, run_type });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'MISSING_FIELDS',
          message: 'Missing required fields: attempt_id, question_id, language, code, run_type' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate attempt ownership and status (using service role to bypass RLS)
    const { data: attempt } = await supabaseClient
      .from('attempts')
      .select('*, tests!inner(*)')
      .eq('id', attempt_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!attempt) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'INVALID_ATTEMPT',
          message: 'Invalid or expired attempt' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if attempt is still valid (not expired)
    if (new Date() >= new Date(attempt.ends_at)) {
      await supabaseClient
        .from('attempts')
        .update({ status: 'auto_submitted', submitted_at: new Date().toISOString() })
        .eq('id', attempt_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'TIME_EXPIRED',
          message: 'Time has expired for this attempt' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate question and language
    const { data: question } = await supabaseClient
      .from('questions')
      .select('*')
      .eq('id', question_id)
      .single();

    console.log('Question validation:', {
      question_id,
      question: question ? { id: question.id, title: question.title, supported_languages: question.supported_languages } : null,
      requested_language: language
    });

    if (!question) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'QUESTION_NOT_FOUND',
          message: `Question ${question_id} not found` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!question.supported_languages.includes(language)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'LANG_NOT_ALLOWED',
          message: `Language '${language}' not supported for this question. Supported languages: ${question.supported_languages.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if language is supported by Judge0
    if (!LANGUAGE_IDS[language as keyof typeof LANGUAGE_IDS]) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'LANG_NOT_SUPPORTED',
          message: `Language '${language}' is not supported by the code execution system. Supported languages: ${Object.keys(LANGUAGE_IDS).join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Rate limiting check (simplified - in production, use Redis or similar)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentSubmissions } = await supabaseClient
      .from('submissions')
      .select('id')
      .eq('attempt_id', attempt_id)
      .eq('run_type', run_type)
      .gte('created_at', oneMinuteAgo);

    const rateLimit = run_type === 'run' ? 20 : 3;
    if (recentSubmissions && recentSubmissions.length >= rateLimit) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Max ${rateLimit} ${run_type} requests per minute.` 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get test cases (using service role to bypass RLS)
    let testCasesQuery = supabaseClient
      .from('question_test_cases')
      .select('*')
      .eq('question_id', question_id)
      .order('order_index');
    
    // For 'run' type, only get public test cases
    // For 'submit' type, get all test cases (including null is_public)
    if (run_type === 'run') {
      testCasesQuery = testCasesQuery.eq('is_public', true);
    }
    // For 'submit' type, we don't filter by is_public, so we get all test cases
    
    let { data: testCases } = await testCasesQuery;

    console.log('Test cases found:', {
      question_id,
      run_type,
      testCasesCount: testCases?.length || 0,
      testCases: testCases?.map(tc => ({ id: tc.id, is_public: tc.is_public, input: tc.input }))
    });
    
    // Debug: Check if any test cases have null is_public
    if (testCases && testCases.length > 0) {
      const nullCases = testCases.filter(tc => tc.is_public === null);
      if (nullCases.length > 0) {
        console.log('WARNING: Found test cases with null is_public:', nullCases.length);
        nullCases.forEach(tc => {
          console.log(`  - ID: ${tc.id}, Input: "${tc.input}", is_public: ${tc.is_public}`);
        });
      }
    }

    if (!testCases || testCases.length === 0) {
      console.error('No test cases found for question:', question_id);
      
      // Try to get all test cases without any filter to debug
      const { data: allTestCases } = await supabaseClient
        .from('question_test_cases')
        .select('*')
        .eq('question_id', question_id);
      
      console.log('All test cases (without filter):', allTestCases?.length || 0);
      if (allTestCases && allTestCases.length > 0) {
        console.log('Test cases with null is_public:', allTestCases.filter(tc => tc.is_public === null).length);
        console.log('Test cases with true is_public:', allTestCases.filter(tc => tc.is_public === true).length);
        console.log('Test cases with false is_public:', allTestCases.filter(tc => tc.is_public === false).length);
        
        // If we have test cases but they're not being found due to null is_public,
        // let's use them anyway for submit operations
        if (run_type === 'submit' && allTestCases && allTestCases.length > 0) {
          console.log('Using all test cases for submit operation');
          testCases = allTestCases;
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error_code: 'NO_TEST_CASES',
              message: `No test cases available for question ${question_id}. Please contact your instructor.` 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error_code: 'NO_TEST_CASES',
            message: `No test cases available for question ${question_id}. Please contact your instructor.` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Process test cases directly - simple approach
    console.log('Processing test cases directly...');
    
    try {
      const { results, passedCount, totalTime, totalMemory } = await processTestCases(testCases, code, language);
      
      const avgTime = Math.round(totalTime / testCases.length);
      const avgMemory = Math.round(totalMemory / testCases.length);
      const verdict = passedCount === testCases.length ? 'passed' : 'failed';
      
      // Store submission results
      const submissionData = await storeSubmissionResults(
        attempt_id, 
        question_id, 
        language, 
        code, 
        run_type, 
        testCases, 
        results, 
        passedCount, 
        avgTime, 
        avgMemory, 
        verdict, 
        supabaseClient
      );
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            submission_id: submissionData.id,
            status: 'completed',
            passed_count: passedCount,
            total_count: testCases.length,
            verdict: verdict,
            time_ms: avgTime,
            memory_kb: avgMemory,
            results: results
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Error processing test cases:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        cause: error.cause
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'PROCESSING_ERROR',
          message: 'Failed to process test cases: ' + error.message,
          details: error.stack
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Error in run-code:', error);
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