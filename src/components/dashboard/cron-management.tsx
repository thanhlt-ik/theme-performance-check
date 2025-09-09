'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Play, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Timer,
  Activity,
  Settings,
  Copy,
  ExternalLink
} from 'lucide-react';
import { formatMeasurementDate, formatRelativeTime } from '@/lib/utils/date';

interface CronStatus {
  lastRun: string | null;
  lastResults: {
    totalProducts: number;
    successCount: number;
    failureCount: number;
    duration: string;
    timestamp: string;
  } | null;
  status: string;
}

export function CronManagement() {
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    fetchCronStatus();
  }, []);
  
  // Auto-retry on error, up to maxRetries
  useEffect(() => {
    if (error && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        console.log(`Retrying cron status fetch (${retryCount + 1}/${maxRetries})...`);
        setRetryCount(prev => prev + 1);
        fetchCronStatus();
      }, 3000); // Retry after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  const fetchCronStatus = async () => {
    try {
      setLoading(true);
      // Reset retry counter if manually refreshing
      if (retryCount > 0) {
        setRetryCount(0);
      }
      // Use the correct cron secret from .env
      const response = await fetch('/api/cron/measurements', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer VZ8pbAbvh0hq2mdt2Yj4WXeNA/PjG3eiB68FJx37Ai8=`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setCronStatus(data);
        setError(null);
      } else {
        // Handle API error responses with specific messages
        const errorMessage = data.error || `Failed to fetch cron status (${response.status})`;
        console.error('Cron status error:', errorMessage);
        
        // For database connection issues, provide a more helpful message
        if (errorMessage.includes('Database connection issue')) {
          setError(`Database connection error: The application is currently running in demo mode. Some features may be limited. ${data.status || ''}`);
        } else {
          throw new Error(errorMessage);
        }
      }
    } catch (err) {
      console.error('Error fetching cron status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cron status');
    } finally {
      setLoading(false);
    }
  };

  const runManualTest = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/cron/measurements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer VZ8pbAbvh0hq2mdt2Yj4WXeNA/PjG3eiB68FJx37Ai8=`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('Manual cron test started:', result);
        
        // Refresh status after successful run
        await fetchCronStatus();
        
        // Don't use alert() anymore, show notification in UI
        setSuccessMessage(`Cron job started successfully! Processing ${result.totalProducts || 0} products in the background. The measurements will take several minutes to complete.`);
      } else {
        // Handle specific error responses
        const errorMessage = result.error || `Failed to run cron job (${response.status})`;
        console.error('Cron job error:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error running manual test:', err);
      setError(err instanceof Error ? err.message : 'Failed to run cron job');
    } finally {
      setIsRunning(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/cron/measurements`;
    navigator.clipboard.writeText(webhookUrl);
    alert('Webhook URL copied to clipboard!');
  };

  const getNextRunTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 2 AM tomorrow
    return tomorrow;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading cron status...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Automated Measurements
              </CardTitle>
              <CardDescription>
                Schedule automatic performance measurements for all your Shopify themes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCronStatus}
                disabled={loading}
              >
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={runManualTest}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <Timer className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Run
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {successMessage && (
            <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Active & Ready</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Last Run</div>
              <div className="text-sm">
                {cronStatus?.lastRun ? (
                  <div>
                    <div>{formatRelativeTime(cronStatus.lastRun)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatMeasurementDate(cronStatus.lastRun)}
                    </div>
                  </div>
                ) : (
                  'Never'
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Next Run</div>
              <div className="text-sm">
                <div>{formatRelativeTime(getNextRunTime().toISOString())}</div>
                <div className="text-xs text-muted-foreground">
                  Daily at 2:00 AM
                </div>
              </div>
            </div>
          </div>

          {/* Last Run Results */}
          {cronStatus?.lastResults && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Last Run Summary</h4>
                <Badge variant="secondary">
                  {formatRelativeTime(cronStatus.lastResults.timestamp)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Products</div>
                  <div className="font-medium">{cronStatus.lastResults.totalProducts}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Success</div>
                  <div className="font-medium text-green-600">{cronStatus.lastResults.successCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Failed</div>
                  <div className="font-medium text-red-600">{cronStatus.lastResults.failureCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Duration</div>
                  <div className="font-medium">{cronStatus.lastResults.duration}</div>
                </div>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium">External Cron Setup</h4>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium mb-1">Webhook URL:</div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-xs">
                  <span className="flex-1">{typeof window !== 'undefined' ? `${window.location.origin}/api/cron/measurements` : 'https://your-domain.com/api/cron/measurements'}</span>
                  <Button variant="ghost" size="sm" onClick={copyWebhookUrl}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="font-medium mb-1">Method:</div>
                <Badge variant="secondary">POST</Badge>
              </div>
              
              <div>
                <div className="font-medium mb-1">Headers:</div>
                <div className="p-2 bg-muted rounded font-mono text-xs">
                  Authorization: Bearer your_cron_secret
                </div>
              </div>
              
              <div>
                <div className="font-medium mb-1">Recommended Schedule:</div>
                <div className="text-muted-foreground">Daily at 2:00 AM (0 2 * * *)</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  cron-job.org
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://console.cron-job.org/jobs" target="_blank" rel="noopener noreferrer">
                  <Calendar className="h-3 w-3 mr-1" />
                  Create Job
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
