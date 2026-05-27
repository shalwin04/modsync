// Metrics Calculator for ModSync
// Computes derived metrics from base data

import {
  formatMaturityDelta,
  formatPercentage,
} from '../../utils/formatters.js';
import type { UserMeta } from '../../types/modsync.js';

export interface UserMetrics {
  removalRate: string;
  maturityDelta: string;
  totalActions: number;
  isHighRisk: boolean;
  riskScore: number;
}

// Improved risk scoring:
// - Points for removals, automod catches, short maturity delta, high removal rate, many notes
// - riskScore >= 3 => isHighRisk
export function calculateMetrics(
  meta: UserMeta,
  accountCreatedAt: number
): UserMetrics {
  const totalActions = meta.total_removals + meta.total_approvals;
  const removalRate = formatPercentage(meta.total_removals, totalActions);
  const maturityDelta = formatMaturityDelta(accountCreatedAt, meta.first_local_interaction);

  let riskScore = 0;

  // Automod catches: 1 point per 5 catches
  riskScore += Math.floor(meta.automod_catches / 5);

  // Removals: 1 point per 3 removals
  riskScore += Math.floor(meta.total_removals / 3);

  // High removal rate (>50%) increases score
  if (totalActions > 0 && meta.total_removals / totalActions > 0.5) {
    riskScore += 1;
  }

  // Many notes indicate attention: 1 point per 5 notes
  riskScore += Math.floor(meta.internal_note_count / 5);

  // Short maturity delta (Day 1 or 'Never' indicates suspicious behavior)
  if (maturityDelta === 'Day 1' || maturityDelta === 'Never') {
    riskScore += 1;
  }

  const isHighRisk = riskScore >= 3 || meta.status_badge === 'RISK' || meta.watchlist_expiration > 0;

  return {
    removalRate,
    maturityDelta,
    totalActions,
    isHighRisk,
    riskScore,
  };
}

export function shouldHighlightUser(meta: UserMeta, metrics: UserMetrics): boolean {
  // Flag users who need attention
  return (
    meta.status_badge === 'RISK' ||
    meta.status_badge === 'WATCHLIST' ||
    metrics.isHighRisk ||
    meta.automod_catches > 10
  );
}
