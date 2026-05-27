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
}

export function calculateMetrics(
  meta: UserMeta,
  accountCreatedAt: number
): UserMetrics {
  const totalActions = meta.total_removals + meta.total_approvals;
  const removalRate = formatPercentage(meta.total_removals, totalActions);
  const maturityDelta = formatMaturityDelta(accountCreatedAt, meta.first_local_interaction);

  // High risk if: >50% removal rate AND >5 removals OR >20 AutoMod catches
  const isHighRisk =
    meta.total_removals > 5 &&
    meta.total_removals / totalActions > 0.5 &&
    totalActions > 0 ||
    meta.automod_catches > 20;

  return {
    removalRate,
    maturityDelta,
    totalActions,
    isHighRisk,
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
