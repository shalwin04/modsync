import type React from 'react';

interface Props {
  riskScore?: number;
  isHighRisk?: boolean;
  totalRemovals: number;
  automodCatches: number;
  removalRate: string;
  maturityDelta: string;
}

export const MetricsPanel: React.FC<Props> = ({ riskScore = 0, isHighRisk = false, totalRemovals, automodCatches, removalRate, maturityDelta }) => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${isHighRisk ? 'bg-red-600 text-white' : 'bg-green-100 text-green-800'}`}>
          {riskScore}
        </div>
        <div className="mt-2 text-sm font-semibold">Risk Score</div>
        {isHighRisk && <div className="mt-1 text-xs text-red-600">High Risk</div>}
      </div>

      <div className="bg-white p-3 rounded border">
        <div className="text-xs text-gray-500 font-semibold mb-2">Key Stats</div>
        <div className="flex justify-between text-sm mb-1">
          <div className="text-gray-600">Removals</div>
          <div className="font-medium text-gray-800">{totalRemovals}</div>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <div className="text-gray-600">AutoMod</div>
          <div className="font-medium text-gray-800">{automodCatches}</div>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <div className="text-gray-600">Removal Rate</div>
          <div className="font-medium text-gray-800">{removalRate}</div>
        </div>
        <div className="flex justify-between text-sm">
          <div className="text-gray-600">Maturity Delta</div>
          <div className="font-medium text-gray-800">{maturityDelta}</div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
