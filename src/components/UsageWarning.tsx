
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, XCircle } from 'lucide-react';
import { getUsageStats, isApproachingLimit, isLimitExceeded } from '@/services/usage-tracker';

interface UsageWarningProps {
  onViewUsage?: () => void;
}

export const UsageWarning: React.FC<UsageWarningProps> = ({ onViewUsage }) => {
  const stats = getUsageStats();
  const approaching = isApproachingLimit();
  const exceeded = isLimitExceeded();

  if (!approaching && !exceeded) {
    return null;
  }

  const percentage = Math.round((stats.totalApiCalls / stats.monthlyLimit) * 100);

  return (
    <Alert variant={exceeded ? "destructive" : "default"} className="mb-6">
      {exceeded ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <AlertTitle>
        {exceeded ? 'Monthly API Limit Exceeded' : 'Approaching API Limit'}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          You've used {stats.totalApiCalls} of {stats.monthlyLimit} API calls this month ({percentage}%).
          {exceeded ? ' Please consider upgrading your plan or wait for next month.' : ' Consider monitoring your usage.'}
        </span>
        {onViewUsage && (
          <Button variant="outline" size="sm" onClick={onViewUsage} className="ml-4">
            View Usage
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
