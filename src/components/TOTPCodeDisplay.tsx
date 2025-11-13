import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Eye, EyeOff, RefreshCw, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TOTPCodeDisplayProps {
  code: string;
  timeRemaining: number; // 0-30 seconds
  progress: number; // 0-100
  isRefreshing: boolean;
  mode: 'static' | 'dynamic';
  onRefresh: () => Promise<void>;
  isExpiringSoon?: boolean;
}

/**
 * Microsoft Authenticator-style TOTP Code Display
 * Shows:
 * - 6-digit code with copy button
 * - Progress bar showing time remaining
 * - Live countdown timer
 * - Current mode (static/dynamic)
 */
export const TOTPCodeDisplay: React.FC<TOTPCodeDisplayProps> = ({
  code,
  timeRemaining,
  progress,
  isRefreshing,
  mode,
  onRefresh,
  isExpiringSoon = false,
}) => {
  const [showCode, setShowCode] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: '✅ Copied!',
        description: `TOTP code ${code} copied to clipboard`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: '❌ Failed',
        description: 'Could not copy code to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await onRefresh();
    } catch (err) {
      console.error('Error refreshing TOTP:', err);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            Live TOTP Code
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-slate-700 rounded-full text-slate-300">
              {mode === 'dynamic' ? '🔄 Live' : '🔒 Static'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Code Display Box */}
        <div className="bg-slate-750 p-6 rounded-lg border border-slate-600 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 font-semibold">Current Code</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCode(!showCode)}
              className="h-6 w-6 p-0 hover:bg-slate-700"
            >
              {showCode ? (
                <Eye className="w-4 h-4 text-slate-400 hover:text-slate-200" />
              ) : (
                <EyeOff className="w-4 h-4 text-slate-400 hover:text-slate-200" />
              )}
            </Button>
          </div>

          {/* Large Code Display */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="text-5xl font-mono font-bold text-slate-100 tracking-widest">
              {showCode ? code : '••••••'}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className={`h-10 px-3 transition-all ${
                copied 
                  ? 'bg-green-900/50 border-green-600 text-green-200' 
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Copy className={`w-4 h-4 ${copied ? 'text-green-400' : ''}`} />
              <span className="ml-2 text-xs font-medium">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>

          {/* Progress Bar with Live Countdown */}
          <div className="space-y-2">
            {/* Progress Bar */}
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
              <div
                className={`h-full transition-all duration-100 ${
                  isExpiringSoon
                    ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/50'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Timer Display */}
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-slate-400">Time Remaining</span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-mono font-bold tabular-nums ${
                    isExpiringSoon
                      ? 'text-red-400 animate-pulse'
                      : 'text-cyan-400'
                  }`}
                >
                  {timeRemaining}s
                </span>
                <span className="text-xs text-slate-500">/ 30s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Generating New Code...' : 'Refresh Now'}
        </Button>

        {/* Info Box */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-1 text-xs text-slate-400">
          <p className="flex items-center gap-2">
            <span>⏱️</span>
            <span>
              Code refreshes automatically every 30 seconds{' '}
              {mode === 'dynamic' ? '(dynamic mode)' : '(static mode)'}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <span>📋</span>
            <span>Copy this code to mark attendance</span>
          </p>
          {isExpiringSoon && (
            <p className="flex items-center gap-2 text-amber-400">
              <span>⚠️</span>
              <span>Code expiring soon - a new one will be generated</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
