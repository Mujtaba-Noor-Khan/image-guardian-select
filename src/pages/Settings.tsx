
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Trash2, RotateCcw, Calendar, FileText, Image } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  getUsageStats,
  getUsageHistory,
  updateMonthlyLimit,
  resetMonthlyUsage,
  clearUsageHistory,
  UsageEntry
} from '@/services/usage-tracker';
import { clearCredentials } from '@/services/sightengine/api-client';

const Settings = () => {
  const [stats, setStats] = useState(getUsageStats());
  const [history, setHistory] = useState(getUsageHistory());
  const [newLimit, setNewLimit] = useState(stats.monthlyLimit.toString());

  const refreshData = () => {
    setStats(getUsageStats());
    setHistory(getUsageHistory());
  };

  const handleUpdateLimit = () => {
    const limit = parseInt(newLimit);
    if (isNaN(limit) || limit < 1) {
      toast({
        title: "Invalid limit",
        description: "Please enter a valid number greater than 0.",
        variant: "destructive",
      });
      return;
    }

    updateMonthlyLimit(limit);
    refreshData();
    toast({
      title: "Limit updated",
      description: `Monthly API limit set to ${limit} calls.`,
    });
  };

  const handleResetUsage = () => {
    resetMonthlyUsage();
    refreshData();
    toast({
      title: "Usage reset",
      description: "Monthly usage has been reset to 0.",
    });
  };

  const handleClearHistory = () => {
    clearUsageHistory();
    refreshData();
    toast({
      title: "History cleared",
      description: "Usage history has been cleared.",
    });
  };

  const handleClearCredentials = () => {
    clearCredentials();
    toast({
      title: "Credentials cleared",
      description: "API credentials have been cleared. You'll need to enter them again.",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getSourceIcon = (source: UsageEntry['source']) => {
    return source === 'excel' ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />;
  };

  const usagePercentage = Math.round((stats.totalApiCalls / stats.monthlyLimit) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <SettingsIcon className="h-10 w-10" />
            Settings
          </h1>
          <p className="text-xl text-gray-600">
            Manage your API usage and application settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-600" />
                Monthly Usage Statistics
              </CardTitle>
              <CardDescription>
                Track your Sightengine API usage this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalApiCalls}
                  </div>
                  <div className="text-sm text-blue-700">API Calls Used</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.totalImagesProcessed}
                  </div>
                  <div className="text-sm text-green-700">Images Processed</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {usagePercentage}%
                  </div>
                  <div className="text-sm text-purple-700">of Monthly Limit</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="monthly-limit">Monthly API Limit</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="monthly-limit"
                      type="number"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      placeholder="Enter monthly limit"
                    />
                    <Button onClick={handleUpdateLimit}>Update</Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleResetUsage}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Monthly Usage
                  </Button>
                </div>

                <p className="text-sm text-gray-600">
                  Last reset: {formatDate(stats.lastReset)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage History */}
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                Recent tool usage sessions (last 100 entries)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">
                  {history.length} entries in history
                </p>
                <Button variant="outline" size="sm" onClick={handleClearHistory}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear History
                </Button>
              </div>

              {history.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No usage history yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getSourceIcon(entry.source)}
                        <div>
                          <div className="font-medium">
                            {entry.fileName || `${entry.source} processing`}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(entry.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {entry.apiCallsUsed} API calls
                        </Badge>
                        <Badge variant="outline">
                          {entry.imagesProcessed} images
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Settings */}
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
              <CardDescription>
                Manage your Sightengine API credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleClearCredentials}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear API Credentials
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                This will remove your stored API credentials. You'll need to enter them again when uploading images.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
