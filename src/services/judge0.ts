// Judge0 API Integration - Direct connection to Google Cloud VM
const JUDGE0_API_URL = "http://34.14.221.217:2358"; // Your Google VM instance

interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
}

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
}

// Language IDs for Judge0
export const LANGUAGE_IDS = {
  c: 50,
  cpp: 54,
  python: 71,
  java: 62,
  javascript: 63,
};

export class Judge0Service {
  // Test if Judge0 server is reachable
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${JUDGE0_API_URL}/languages`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout for test
      });
      return response.ok;
    } catch (error) {
      console.error('Judge0 connection test failed:', error);
      return false;
    }
  }

  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${JUDGE0_API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Judge0 API error: ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timeout - Judge0 server may be down or unreachable');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to Judge0 server. Please check if the server is running and accessible.');
      }
      throw error;
    }
  }

  static async submitCode(submission: Judge0Submission): Promise<{ token: string }> {
    return this.makeRequest('/submissions', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  static async getSubmissionResult(token: string): Promise<Judge0Result> {
    return this.makeRequest(`/submissions/${token}`);
  }

  // Simple, direct code execution - no queues, straightforward submission
  static async executeCode(
    code: string,
    language: string,
    testCases: Array<{ input: string; expected_output: string }>
  ): Promise<Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    executionTime?: number;
    memoryUsed?: number;
  }>> {
    const languageId = LANGUAGE_IDS[language as keyof typeof LANGUAGE_IDS];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const results = [];

    for (const testCase of testCases) {
      try {
        // Submit code directly to Judge0
        const submission = await this.submitCode({
          source_code: code,
          language_id: languageId,
          stdin: testCase.input,
          expected_output: testCase.expected_output,
        });

        // Simple polling - wait for result
        let result: Judge0Result;
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds max wait time

        do {
          await new Promise(resolve => setTimeout(resolve, 500));
          result = await this.getSubmissionResult(submission.token);
          attempts++;
        } while (result.status.id <= 2 && attempts < maxAttempts);

        // Process result
        const actualOutput = result.stdout?.trim() || result.stderr?.trim() || '';
        const expectedOutput = testCase.expected_output.trim();
        const passed = actualOutput === expectedOutput && result.status.id === 3;

        results.push({
          input: testCase.input,
          expectedOutput: testCase.expected_output,
          actualOutput: actualOutput,
          passed,
          executionTime: result.time ? parseFloat(result.time) * 1000 : undefined,
          memoryUsed: result.memory || undefined,
        });
      } catch (error) {
        console.error('Error executing test case:', error);
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expected_output,
          actualOutput: 'Execution Error',
          passed: false,
        });
      }
    }

    return results;
  }
}

// Mock service for development (when Judge0 API is not available)
export class MockJudge0Service {
  static async executeCode(
    code: string,
    languageId: number,
    testCases: Array<{ input: string; output: string }>
  ): Promise<Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    executionTime?: number;
    memoryUsed?: number;
  }>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return testCases.map((testCase, index) => {
      // Mock some passing and some failing results for demo
      const passed = index < Math.ceil(testCases.length * 0.7); // 70% pass rate
      
      return {
        input: testCase.input,
        expectedOutput: testCase.output,
        actualOutput: passed ? testCase.output : 'Wrong Answer',
        passed,
        executionTime: Math.floor(Math.random() * 100) + 10,
        memoryUsed: Math.floor(Math.random() * 1000) + 100,
      };
    });
  }
}