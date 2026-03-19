import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Users, MapPin, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PatternAlert {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  count: number;
  icon: LucideIcon;
}

interface CrossReferences {
  similarClaims: number;
  suspiciousProviders: number;
  watchlistMatches: number;
}

interface FraudScanResults {
  overallThreat: 'high' | 'medium' | 'low';
  patternAlerts: PatternAlert[];
  crossReferences: CrossReferences;
  riskScore: number;
}

interface ClaimData {
  claim: {
    _id?: string;
    aiScore?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface FraudDetectionProps {
  claim: ClaimData;
}

const base_url = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');

export const FraudDetection: React.FC<FraudDetectionProps> = ({ claim }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<FraudScanResults | null>(null);

  const runFraudScan = async () => {
    const claimId = claim?.claim?._id as string | undefined;
    const token = localStorage.getItem("JWT");

    if (!claimId || !token) {
      console.warn("Missing claim id or auth token for fraud scan");
      return;
    }

    setIsScanning(true);
    try {
      const response = await fetch(`${base_url}/insurer/getFraudReport/${claimId}`, {
        method: "GET",
        headers: {
          token,
        },
      });

      if (!response.ok) {
        console.error("Fraud report endpoint failed", response.status);
        setIsScanning(false);
        return;
      }

      const json = await response.json();
      const payload = json?.responseFromAi ?? json ?? {};

      const riskFactors = Array.isArray(payload.risk_factors) ? payload.risk_factors : [];
      const suspiciousFiles = Array.isArray(payload.suspicious_files) ? payload.suspicious_files : [];

      const patternAlerts: PatternAlert[] = riskFactors.map((rf: any) => ({
        type: rf.label || rf.description || "Risk Factor",
        severity: (rf.severity as 'high' | 'medium' | 'low') || 'medium',
        description: rf.description || rf.label || "Potential anomaly detected",
        count: 1,
        icon: MapPin,
      }));

      const threat: 'high' | 'medium' | 'low' =
        patternAlerts.some((p) => p.severity === 'high') || suspiciousFiles.length > 0
          ? 'high'
          : patternAlerts.length
          ? 'medium'
          : 'low';

      const aiScoreRaw = typeof payload.aiScore === "number" ? payload.aiScore : claim.claim.aiScore ?? 0;
      const riskScore = aiScoreRaw ? Math.min(Math.max(aiScoreRaw / 100, 0), 1) : threat === 'high' ? 0.8 : threat === 'medium' ? 0.5 : 0.2;

      setScanResults({
        overallThreat: threat,
        patternAlerts,
        crossReferences: {
          similarClaims: suspiciousFiles.length,
          suspiciousProviders: 0,
          watchlistMatches: 0,
        },
        riskScore,
      });
    } catch (err) {
      console.error("Failed to run fraud scan", err);
    } finally {
      setIsScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-white border-red-600';
      case 'medium': return 'text-yellow-400 bg-white border-yellow-600';
      case 'low': return 'text-green-400 bg-green-white border-green-600';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-8 w-8 text-blue-400" />
        <div>
          <h3 className="text-xl font-semibold text-white">Fraud Detection</h3>
          <p className="text-gray-400">Pattern-based fraud analysis and alerts</p>
        </div>
      </div>

      {!scanResults && !isScanning && (
        <div className="text-center py-8">
          <Shield className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <button
            onClick={runFraudScan}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-medium transition-colors"
          >
            Run Fraud Detection Scan
          </button>
          <p className="text-gray-400 mt-2">
            Analyze patterns and cross-reference with fraud databases
          </p>
        </div>
      )}

      {isScanning && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <span className="text-white">Scanning for fraud patterns...</span>
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-400">Checking geographic patterns...</div>
            <div className="text-sm text-gray-400">Cross-referencing databases...</div>
            <div className="text-sm text-gray-400">Analyzing behavioral patterns...</div>
          </div>
        </div>
      )}

      {scanResults && (
        <div className="space-y-6">
          {/* Threat Level Overview */}
          <div className="bg-white p-6 rounded-lg border border-gray-300">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Threat Assessment</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${
                  scanResults.overallThreat === 'high' ? 'bg-red-500' :
                  scanResults.overallThreat === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}>
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-black font-semibold">
                    {scanResults.overallThreat.toUpperCase()} THREAT LEVEL
                  </p>
                  <p className="text-gray-600">
                    Risk Score: {(scanResults.riskScore * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Alerts Triggered</p>
                <p className="text-2xl font-bold text-black">{scanResults.patternAlerts.length}</p>
              </div>
            </div>
          </div>

          {/* Pattern Alerts */}
          <div className="bg-white p-6 rounded-lg border border-gray-400">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Pattern Alerts</h4>
            <div className="space-y-4">
              {scanResults.patternAlerts.map((alert: PatternAlert, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start space-x-3">
                    <alert.icon className="h-6 w-6 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className={`font-semibold ${
                            alert.severity === 'high' ?  'text-red-500' :
                            alert.severity === 'medium' ?  'text-yellow-600' :
                            'text-green-500'
                          }`}>{alert.type}</h5>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold">Count: {alert.count}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.severity === 'high' ? 'bg-red-500 text-white' :
                            alert.severity === 'medium' ? 'bg-yellow-500 text-white' :
                            'bg-green-500 text-white'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="text-black">{alert.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cross Reference Results */}
          <div className="bg-white p-6 rounded-lg border border-gray-400">
            <h4 className="text-lg font-semibold text-black mb-4">Cross-Reference Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-gray-200 border border-gray-300 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800">Similar Claims</span>
                  <span className="text-2xl font-bold text-yellow-400">
                    {scanResults.crossReferences.similarClaims}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">In past 12 months</p>
              </div>

              <div className="bg-gray-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800">Suspicious Providers</span>
                  <span className="text-2xl font-bold text-orange-400">
                    {scanResults.crossReferences.suspiciousProviders}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Connected entities</p>
              </div>

              <div className="bg-gray-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800">Watchlist Matches</span>
                  <span className="text-2xl font-bold text-green-400">
                    {scanResults.crossReferences.watchlistMatches}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Known fraudsters</p>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className={`p-6 rounded-lg border-2 ${
            scanResults.overallThreat === 'high' 
              ? 'bg-white border-red-400' 
              : scanResults.overallThreat === 'medium'
              ? 'bg-white border-yellow-400'
              : 'bg-white border-green-400'
          }`}>
            <div className="flex items-center space-x-3">
              {scanResults.overallThreat === 'high' ? (
                <AlertTriangle className="h-8 w-8 text-red-400" />
              ) : scanResults.overallThreat === 'medium' ? (
                <AlertTriangle className="h-8 w-8 text-yellow-400" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-400" />
              )}
              <div>
                <h4 className={`font-semibold ${
                  scanResults.overallThreat === 'high' ? 'text-red-400' :
                  scanResults.overallThreat === 'medium' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>Fraud Detection Result</h4>
                <p className={`${
                  scanResults.overallThreat === 'high' ? 'text-red-400' :
                  scanResults.overallThreat === 'medium' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {scanResults.overallThreat === 'high' 
                    ? 'High fraud risk detected - Recommend immediate investigation'
                    : scanResults.overallThreat === 'medium'
                    ? 'Medium fraud risk - Additional verification recommended'
                    : 'Low fraud risk - Claim appears legitimate'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
