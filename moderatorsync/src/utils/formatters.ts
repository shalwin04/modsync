// Utility functions for formatting dates, numbers, etc.

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

export function formatMaturityDelta(accountCreatedAt: number, firstLocalInteraction: number): string {
  if (!firstLocalInteraction || firstLocalInteraction === 0) {
    return 'Never';
  }

  const delta = firstLocalInteraction - accountCreatedAt;
  const days = Math.floor(delta / 86400);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo after acct`;
  if (days > 0) return `${days}d after acct`;
  return 'Day 1';
}

export function formatPercentage(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  const percent = Math.round((numerator / denominator) * 100);
  return `${percent}%`;
}

export function formatWatchlistRemaining(expirationTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = expirationTimestamp - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function formatCount(count: number): string {
  if (count === 0) return '0';
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
