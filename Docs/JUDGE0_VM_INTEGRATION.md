# Judge0 VM Integration Guide

## Overview
This guide helps you integrate your Google VM-hosted Judge0 instance (`http://34.93.252.188:2358`) with your exam system.

## Quick Test
Run the comprehensive test suite to verify your VM setup:

```bash
node test-judge0-vm-comprehensive.js
```

Or in browser console:
```javascript
// Copy and paste the content of test-judge0-vm-comprehensive.js
// Then run:
main()
```

## Integration Steps

### 1. Update Judge0 Service
The `src/services/judge0.ts` file has been updated to use your VM endpoint:
- ✅ Changed API URL to `http://34.93.252.188:2358`
- ✅ Removed RapidAPI headers (not needed for self-hosted)

### 2. Test Your VM
Use the test scripts provided:

**Basic Test:**
```bash
node test-judge0-vm.js
```

**Comprehensive Test:**
```bash
node test-judge0-vm-comprehensive.js
```

### 3. Update Supabase Edge Functions
If you're using Supabase edge functions for code execution, update the Judge0 URL in:
- `supabase/functions/run-code/index.ts`
- `supabase/functions/start-attempt/index.ts`
- `supabase/functions/finalize-attempt/index.ts`

### 4. Environment Configuration
Consider using environment variables for the Judge0 URL:

```typescript
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "http://34.93.252.188:2358";
```

## Supported Languages
Your VM supports these language IDs:
- **C**: 50
- **C++**: 54
- **Java**: 62
- **JavaScript**: 63
- **Python**: 71

## Test Cases Included
The comprehensive test suite includes:
1. Simple C Hello World
2. C with Input (matching your dummy client test)
3. Python Hello World
4. Python with Input
5. JavaScript Hello World
6. Java Hello World
7. C++ Hello World

## Configuration Options
Your VM is configured with:
- CPU Time Limit: 5 seconds
- CPU Extra Time: 1 second
- Wall Time Limit: 10 seconds
- Memory Limit: 128MB
- Stack Limit: 64MB
- Max Processes: 60
- Network: Disabled
- Max File Size: 1KB

## Troubleshooting

### Common Issues
1. **Connection Refused**: Check if Judge0 is running on the VM
2. **Timeout**: Increase timeout limits in your code
3. **Memory Limit**: Adjust memory limits for complex programs
4. **Language Not Supported**: Verify language ID is correct

### Health Check
```javascript
// Quick health check
fetch('http://34.93.252.188:2358/languages')
  .then(response => response.json())
  .then(languages => console.log('Supported languages:', languages.length))
  .catch(error => console.error('Health check failed:', error));
```

### VM Setup Verification
Ensure your Google VM has:
- ✅ Judge0 running on port 2358
- ✅ Firewall allowing port 2358
- ✅ Sufficient resources (CPU, RAM)
- ✅ Docker containers running properly

## Next Steps
1. Run the comprehensive test suite
2. Update your exam system to use the VM endpoint
3. Test with actual exam questions
4. Monitor performance and adjust limits as needed

## Security Considerations
- Consider adding authentication headers if needed
- Monitor resource usage to prevent abuse
- Set up proper firewall rules
- Consider rate limiting for production use
