# Phase 1: Concurrent Processing Deployment Guide

## 🚀 What's Implemented

### ✅ Backend (Supabase Edge Functions)
- **Queue Management System**: Handles concurrent submissions with priority-based processing
- **Batch Processing**: Processes test cases in batches of 3 for better performance
- **Status Tracking**: Real-time submission status monitoring
- **Health Check Endpoint**: `/health` endpoint for monitoring queue status

### ✅ Frontend (React Components)
- **Queue Status Indicators**: Visual feedback for queued/processing submissions
- **Real-time Updates**: Polling mechanism to check submission status
- **Enhanced UI**: Updated buttons and status messages
- **Error Handling**: Improved error handling for queue-related issues

## 🔧 Configuration

### Environment Variables
```env
# Supabase (already configured)
SUPABASE_URL=https://hnrrruofqimutiqipqfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Judge0 API
JUDGE0_API_KEY=your_rapidapi_key

# Optional: Override defaults
MAX_CONCURRENT_SUBMISSIONS=3
BATCH_SIZE=3
```

### Queue Settings
- **Max Concurrent Submissions**: 3 (adjustable based on VM capacity)
- **Batch Size**: 3 test cases processed simultaneously
- **Priority Levels**: Submit requests (2) > Run requests (1)
- **Polling Interval**: 2 seconds for status updates

## 📊 Performance Improvements

### Before Phase 1
- ❌ Sequential test case processing
- ❌ No queue management
- ❌ Blocking submissions
- ❌ No status feedback

### After Phase 1
- ✅ Concurrent test case processing (3x faster)
- ✅ Queue-based submission handling
- ✅ Non-blocking submissions
- ✅ Real-time status updates
- ✅ Priority-based processing

## 🚀 Deployment Steps

### 1. Deploy Supabase Functions
```bash
# Deploy the updated run-code function
supabase functions deploy run-code

# Set environment variables
supabase secrets set JUDGE0_API_KEY=your_rapidapi_key
```

### 2. Deploy Frontend
```bash
# Build and deploy to Vercel
npm run build
vercel --prod
```

### 3. Test the Implementation
1. **Start an exam** with multiple students
2. **Submit code simultaneously** from different browsers
3. **Verify queue behavior** - submissions should be queued
4. **Check status indicators** - should show queue position
5. **Monitor performance** - should handle 3+ concurrent submissions

## 📈 Expected Performance

### Concurrent Capacity
- **2 CPU + 4GB VM**: 3-5 concurrent submissions
- **4 CPU + 8GB VM**: 8-12 concurrent submissions
- **8 CPU + 16GB VM**: 15-20 concurrent submissions

### Response Times
- **Queue Time**: 0-30 seconds (depending on load)
- **Processing Time**: 2-10 seconds per submission
- **Total Time**: 2-40 seconds (queue + processing)

## 🔍 Monitoring

### Health Check
```bash
curl https://your-project.supabase.co/functions/v1/run-code/health
```

Response:
```json
{
  "status": "healthy",
  "queue_length": 2,
  "processing": 1,
  "max_concurrent": 3,
  "uptime": 1234567890
}
```

### Queue Status
- **Queue Length**: Number of pending submissions
- **Processing**: Currently processing submissions
- **Max Concurrent**: Maximum concurrent processing limit

## 🐛 Troubleshooting

### Common Issues

1. **Submissions Stuck in Queue**
   - Check Judge0 API key
   - Verify VM resources
   - Check function logs

2. **Status Not Updating**
   - Verify polling interval
   - Check network connectivity
   - Review browser console

3. **Performance Issues**
   - Reduce MAX_CONCURRENT_SUBMISSIONS
   - Increase VM resources
   - Check Judge0 API limits

### Debug Commands
```bash
# Check function logs
supabase functions logs run-code

# Monitor queue status
curl https://your-project.supabase.co/functions/v1/run-code/health

# Test submission
curl -X POST https://your-project.supabase.co/functions/v1/run-code \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"attempt_id":"test","question_id":"test","language":"python","code":"print(1)","run_type":"run"}'
```

## 🎯 Next Steps (Phase 2)

1. **Redis Integration**: Replace in-memory queue with Redis
2. **Advanced Monitoring**: Add detailed metrics and alerts
3. **Auto-scaling**: Dynamic resource allocation based on load
4. **Circuit Breakers**: Handle Judge0 API failures gracefully
5. **Load Testing**: Comprehensive performance testing

## 📝 Notes

- **Queue is in-memory**: Restarts will clear the queue
- **No persistence**: Submissions are not saved to database during processing
- **Basic error handling**: Limited retry mechanisms
- **Single instance**: Not suitable for horizontal scaling yet

This Phase 1 implementation provides a solid foundation for concurrent processing while maintaining simplicity and ease of deployment.
