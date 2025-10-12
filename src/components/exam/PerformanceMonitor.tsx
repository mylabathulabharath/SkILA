import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Judge0Service } from "@/services/judge0";
import { Activity, Zap, Database, Wifi, WifiOff } from "lucide-react";

interface PerformanceStats {
  cacheSize: number;
  cacheHitRate: number;
  activeConnections: number;
  currentEndpoint: string;
}

interface HealthCheck {
  endpoints: Array<{ url: string; status: 'healthy' | 'unhealthy'; responseTime: number }>;
  recommendedEndpoint: string;
}

export const PerformanceMonitor = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const updateStats = () => {
    const currentStats = Judge0Service.getPerformanceStats();
    setStats(currentStats);
  };

  const performHealthCheck = async () => {
    try {
      const health = await Judge0Service.healthCheck();
      setHealthCheck(health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  useEffect(() => {
    updateStats();
    performHealthCheck();
    
    const interval = setInterval(() => {
      updateStats();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Performance Monitor</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cache Stats */}
        {stats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Database className="h-3 w-3" />
                Cache Size
              </span>
              <Badge variant="outline">{stats.cacheSize}/100</Badge>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Zap className="h-3 w-3" />
                Active Connections
              </span>
              <Badge variant={stats.activeConnections > 5 ? "destructive" : "outline"}>
                {stats.activeConnections}
              </Badge>
            </div>
          </div>
        )}

        {/* Health Check */}
        {healthCheck && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Judge0 Endpoints</div>
            {healthCheck.endpoints.map((endpoint, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  {endpoint.status === 'healthy' ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  {endpoint.url.split('//')[1].split(':')[0]}
                </span>
                <Badge 
                  variant={endpoint.status === 'healthy' ? "default" : "destructive"}
                  className="text-xs"
                >
                  {endpoint.responseTime}ms
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={performHealthCheck}
            className="flex-1"
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              Judge0Service.cleanup();
              updateStats();
            }}
            className="flex-1"
          >
            Cleanup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
