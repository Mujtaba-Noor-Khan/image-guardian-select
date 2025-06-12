
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, AlertTriangle } from 'lucide-react';

interface ApiCredentialsInputProps {
  onCredentialsSet: (apiUser: string, apiSecret: string) => void;
}

export const ApiCredentialsInput: React.FC<ApiCredentialsInputProps> = ({
  onCredentialsSet,
}) => {
  const [apiUser, setApiUser] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiUser.trim() && apiSecret.trim()) {
      onCredentialsSet(apiUser.trim(), apiSecret.trim());
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Lock className="h-5 w-5" />
          Sightengine API Credentials
        </CardTitle>
        <CardDescription>
          Enter your Sightengine API credentials to analyze image quality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Security Notice:</p>
              <p>Your credentials are stored temporarily in your browser session and are never sent to our servers.</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="apiUser">API User ID</Label>
            <Input
              id="apiUser"
              type="text"
              value={apiUser}
              onChange={(e) => setApiUser(e.target.value)}
              placeholder="Enter your Sightengine API User ID"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your Sightengine API Secret"
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={!apiUser.trim() || !apiSecret.trim()}>
            Set Credentials
          </Button>
        </form>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Don't have API credentials? <a href="https://sightengine.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Sign up at Sightengine</a></p>
        </div>
      </CardContent>
    </Card>
  );
};
