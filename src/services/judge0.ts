// Judge0 API Integration - Optimized with multiple endpoints and caching
const JUDGE0_ENDPOINTS = [
  "http://34.14.221.217:2358", // Primary endpoint
  "http://34.93.252.188:2358", // Fallback endpoint
];

// Connection pool for better performance
const connectionPool = new Map<string, AbortController>();
const CACHE_SIZE = 100;
const codeCache = new Map<string, any>();

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
  private static currentEndpointIndex = 0;
  private static getCurrentEndpoint(): string {
    return JUDGE0_ENDPOINTS[this.currentEndpointIndex];
  }

  private static switchToNextEndpoint(): void {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % JUDGE0_ENDPOINTS.length;
  }

  // Test if Judge0 server is reachable with endpoint rotation
  static async testConnection(): Promise<boolean> {
    for (let i = 0; i < JUDGE0_ENDPOINTS.length; i++) {
      try {
        const response = await fetch(`${JUDGE0_ENDPOINTS[i]}/languages`, {
          signal: AbortSignal.timeout(3000), // Reduced timeout for faster testing
        });
        if (response.ok) {
          this.currentEndpointIndex = i; // Set working endpoint as current
          return true;
        }
      } catch (error) {
        console.warn(`Judge0 endpoint ${i} failed:`, error);
      }
    }
    console.error('All Judge0 endpoints failed');
    return false;
  }

  // Generate cache key for code submissions
  private static generateCacheKey(code: string, language: string, input: string): string {
    return `${language}:${btoa(code)}:${btoa(input)}`;
  }

  // Check cache before making request
  private static getCachedResult(cacheKey: string): any {
    if (codeCache.has(cacheKey)) {
      const cached = codeCache.get(cacheKey);
      codeCache.delete(cacheKey); // Move to end (LRU)
      codeCache.set(cacheKey, cached);
      return cached;
    }
    return null;
  }

  // Add result to cache with LRU eviction
  private static setCachedResult(cacheKey: string, result: any): void {
    if (codeCache.size >= CACHE_SIZE) {
      const firstKey = codeCache.keys().next().value;
      codeCache.delete(firstKey);
    }
    codeCache.set(cacheKey, result);
  }

  private static async makeRequest(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const maxRetries = 2;
    const currentEndpoint = this.getCurrentEndpoint();
    
    try {
      // Create abort controller for this request
      const abortController = new AbortController();
      const requestId = `${Date.now()}-${Math.random()}`;
      connectionPool.set(requestId, abortController);

      const response = await fetch(`${currentEndpoint}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          ...options.headers,
        },
        signal: abortController.signal,
        // Dynamic timeout based on request type
        timeout: endpoint.includes('/submissions') ? 15000 : 5000,
      });

      // Clean up connection
      connectionPool.delete(requestId);

      if (!response.ok) {
        throw new Error(`Judge0 API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      // Clean up connection on error
      connectionPool.forEach((controller, id) => {
        if (id.includes(endpoint)) {
          controller.abort();
          connectionPool.delete(id);
        }
      });

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Judge0 server may be overloaded');
      }

      // Retry with different endpoint if available
      if (retryCount < maxRetries && JUDGE0_ENDPOINTS.length > 1) {
        console.warn(`Request failed, retrying with different endpoint (attempt ${retryCount + 1})`);
        this.switchToNextEndpoint();
        return this.makeRequest(endpoint, options, retryCount + 1);
      }

      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to Judge0 server. All endpoints may be down.');
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

  // Optimized code execution with parallel processing and caching
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

    // Pre-validate code syntax for common issues
    if (!this.validateCodeSyntax(code, language)) {
      throw new Error('Code contains syntax errors or invalid characters');
    }

    // Process test cases in parallel for better performance
    const promises = testCases.map(async (testCase, index) => {
      const cacheKey = this.generateCacheKey(code, language, testCase.input);
      
      // Check cache first
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        console.log(`Cache hit for test case ${index + 1}`);
        return cachedResult;
      }

      try {
        // Submit code with optimized parameters
        const submission = await this.submitCode({
          source_code: code,
          language_id: languageId,
          stdin: testCase.input,
          expected_output: testCase.expected_output,
          cpu_time_limit: 2,
          memory_limit: 128000,
          enable_network: false,
        });

        // Optimized polling with exponential backoff
        const result = await this.pollForResult(submission.token, index);

        // Process result
        const actualOutput = result.stdout?.trim() || result.stderr?.trim() || '';
        const expectedOutput = testCase.expected_output.trim();
        const passed = actualOutput === expectedOutput && result.status.id === 3;

        const testResult = {
          input: testCase.input,
          expectedOutput: testCase.expected_output,
          actualOutput: actualOutput,
          passed,
          executionTime: result.time ? parseFloat(result.time) * 1000 : undefined,
          memoryUsed: result.memory || undefined,
        };

        // Cache successful results
        if (passed) {
          this.setCachedResult(cacheKey, testResult);
        }

        return testResult;
      } catch (error) {
        console.error(`Error executing test case ${index + 1}:`, error);
        return {
          input: testCase.input,
          expectedOutput: testCase.expected_output,
          actualOutput: 'Execution Error',
          passed: false,
        };
      }
    });

    // Wait for all test cases to complete
    const results = await Promise.all(promises);
    return results;
  }

  // Optimized polling with exponential backoff
  private static async pollForResult(token: string, testCaseIndex: number): Promise<Judge0Result> {
    let result: Judge0Result;
    let attempts = 0;
    const maxAttempts = 30;
    let delay = 200; // Start with 200ms delay

    do {
      await new Promise(resolve => setTimeout(resolve, delay));
      result = await this.getSubmissionResult(token);
      attempts++;
      
      // Exponential backoff: 200ms, 400ms, 800ms, 1600ms, then 2000ms max
      delay = Math.min(delay * 1.5, 2000);
      
      // Log progress for long-running submissions
      if (attempts % 10 === 0) {
        console.log(`Test case ${testCaseIndex + 1} still processing... (attempt ${attempts})`);
      }
    } while (result.status.id <= 2 && attempts < maxAttempts);

    if (result.status.id <= 2) {
      throw new Error(`Test case ${testCaseIndex + 1} timed out after ${maxAttempts} attempts`);
    }

    return result;
  }

  // Basic code validation to catch common issues early
  private static validateCodeSyntax(code: string, language: string): boolean {
    if (!code || code.trim().length === 0) {
      return false;
    }

    // Check for common problematic patterns
    const problematicPatterns = [
      /import\s+os\s*$/m, // Block OS imports
      /import\s+subprocess/m, // Block subprocess
      /system\s*\(/m, // Block system calls
      /exec\s*\(/m, // Block exec calls
      /eval\s*\(/m, // Block eval calls
    ];

    for (const pattern of problematicPatterns) {
      if (pattern.test(code)) {
        console.warn('Code contains potentially dangerous patterns');
        return false;
      }
    }

    return true;
  }

  // Performance monitoring and statistics
  static getPerformanceStats(): {
    cacheSize: number;
    cacheHitRate: number;
    activeConnections: number;
    currentEndpoint: string;
  } {
    return {
      cacheSize: codeCache.size,
      cacheHitRate: 0, // Would need to track hits/misses for accurate rate
      activeConnections: connectionPool.size,
      currentEndpoint: this.getCurrentEndpoint(),
    };
  }

  // Cleanup method to clear cache and abort connections
  static cleanup(): void {
    // Abort all active connections
    connectionPool.forEach((controller) => {
      controller.abort();
    });
    connectionPool.clear();
    
    // Clear cache
    codeCache.clear();
    
    console.log('Judge0 service cleaned up');
  }

  // Health check for all endpoints
  static async healthCheck(): Promise<{
    endpoints: Array<{ url: string; status: 'healthy' | 'unhealthy'; responseTime: number }>;
    recommendedEndpoint: string;
  }> {
    const healthChecks = JUDGE0_ENDPOINTS.map(async (endpoint) => {
      const startTime = Date.now();
      try {
        const response = await fetch(`${endpoint}/languages`, {
          signal: AbortSignal.timeout(3000),
        });
        const responseTime = Date.now() - startTime;
        return {
          url: endpoint,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime,
        };
      } catch (error) {
        return {
          url: endpoint,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
        };
      }
    });

    const results = await Promise.all(healthChecks);
    const healthyEndpoints = results.filter(r => r.status === 'healthy');
    const recommendedEndpoint = healthyEndpoints.length > 0 
      ? healthyEndpoints.sort((a, b) => a.responseTime - b.responseTime)[0].url
      : JUDGE0_ENDPOINTS[0];

    return {
      endpoints: results,
      recommendedEndpoint,
    };
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