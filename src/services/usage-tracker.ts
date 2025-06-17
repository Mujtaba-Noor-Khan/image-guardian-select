
export interface UsageEntry {
  id: string;
  timestamp: Date;
  apiCallsUsed: number;
  imagesProcessed: number;
  source: 'file' | 'excel';
  fileName?: string;
}

export interface UsageStats {
  totalApiCalls: number;
  totalImagesProcessed: number;
  lastReset: Date;
  monthlyLimit: number;
}

const USAGE_STORAGE_KEY = 'sightengine_usage_stats';
const HISTORY_STORAGE_KEY = 'sightengine_usage_history';
const DEFAULT_MONTHLY_LIMIT = 1000;

// Get current usage stats
export const getUsageStats = (): UsageStats => {
  try {
    const stored = localStorage.getItem(USAGE_STORAGE_KEY);
    if (stored) {
      const stats = JSON.parse(stored);
      return {
        ...stats,
        lastReset: new Date(stats.lastReset),
      };
    }
  } catch (error) {
    console.error('Error reading usage stats:', error);
  }

  // Return default stats
  return {
    totalApiCalls: 0,
    totalImagesProcessed: 0,
    lastReset: new Date(),
    monthlyLimit: DEFAULT_MONTHLY_LIMIT,
  };
};

// Update usage stats
export const updateUsageStats = (apiCalls: number, imagesProcessed: number): void => {
  const current = getUsageStats();
  const updated: UsageStats = {
    ...current,
    totalApiCalls: current.totalApiCalls + apiCalls,
    totalImagesProcessed: current.totalImagesProcessed + imagesProcessed,
  };

  try {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving usage stats:', error);
  }
};

// Reset monthly usage
export const resetMonthlyUsage = (): void => {
  const current = getUsageStats();
  const reset: UsageStats = {
    ...current,
    totalApiCalls: 0,
    totalImagesProcessed: 0,
    lastReset: new Date(),
  };

  try {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(reset));
  } catch (error) {
    console.error('Error resetting usage stats:', error);
  }
};

// Update monthly limit
export const updateMonthlyLimit = (newLimit: number): void => {
  const current = getUsageStats();
  const updated: UsageStats = {
    ...current,
    monthlyLimit: newLimit,
  };

  try {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating monthly limit:', error);
  }
};

// Get usage history
export const getUsageHistory = (): UsageEntry[] => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      const history = JSON.parse(stored);
      return history.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    }
  } catch (error) {
    console.error('Error reading usage history:', error);
  }

  return [];
};

// Add usage entry to history
export const addUsageEntry = (
  apiCallsUsed: number,
  imagesProcessed: number,
  source: 'file' | 'excel',
  fileName?: string
): void => {
  const entry: UsageEntry = {
    id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    apiCallsUsed,
    imagesProcessed,
    source,
    fileName,
  };

  try {
    const history = getUsageHistory();
    const updated = [entry, ...history].slice(0, 100); // Keep only last 100 entries
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving usage entry:', error);
  }
};

// Clear usage history
export const clearUsageHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing usage history:', error);
  }
};

// Check if approaching limit
export const isApproachingLimit = (): boolean => {
  const stats = getUsageStats();
  return stats.totalApiCalls >= stats.monthlyLimit * 0.8; // 80% threshold
};

// Check if limit exceeded
export const isLimitExceeded = (): boolean => {
  const stats = getUsageStats();
  return stats.totalApiCalls >= stats.monthlyLimit;
};
