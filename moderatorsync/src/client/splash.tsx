import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface DossierData {
  userId: string;
  username: string;
  subredditId: string;
  subredditName: string;
  meta: {
    status_badge: string;
    total_removals: number;
    total_approvals: number;
    automod_catches: number;
    watchlist_expiration: number;
    first_local_interaction: number;
  };
  notes: Array<{
    note_id: string;
    author_username: string;
    content: string;
    note_type: string;
    timestamp: number;
  }>;
}

const ModSyncApp: React.FC = () => {
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'actions'>('overview');
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<'info' | 'warning' | 'positive'>('info');
  const [saving, setSaving] = useState(false);

  const loadDossier = async () => {
    try {
      const subredditId = context.subredditId || '';
      console.log('Loading dossier for subreddit:', subredditId);

      if (!subredditId) {
        setLoading(false);
        return;
      }

      // Check for pending dossier
      const response = await fetch(`/api/dossier/pending/${subredditId}`);
      console.log('Pending dossier response:', response.status);

      if (response.ok) {
        const pendingData = await response.json();
        console.log('Pending data:', pendingData);

        if (pendingData.userId && pendingData.username) {
          // Fetch full dossier data
          const dossierResponse = await fetch(
            `/api/dossier/${subredditId}/${pendingData.userId}?username=${pendingData.username}`
          );

          if (dossierResponse.ok) {
            const fullData = await dossierResponse.json();
            console.log('Full dossier data:', fullData);
            setDossier({
              userId: pendingData.userId,
              username: pendingData.username,
              subredditId: subredditId,
              subredditName: pendingData.subredditName || context.subredditName || '',
              meta: fullData.meta,
              notes: fullData.notes || [],
            });
          }
        }
      }
    } catch (err) {
      console.error('Error loading dossier:', err);
      setError(String(err));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDossier();
  }, []);

  const handleAddNote = async () => {
    if (!dossier || !noteText.trim()) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/dossier/${dossier.subredditId}/${dossier.userId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteText,
          noteType: noteType,
          modUsername: context.username || 'Unknown',
          modId: context.userId || '',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDossier(prev => prev ? { ...prev, notes: result.notes || prev.notes } : null);
        setNoteText('');
        setActiveTab('notes');
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
    setSaving(false);
  };

  const handleSetStatus = async (status: 'TRUSTED' | 'RISK' | 'NEUTRAL') => {
    if (!dossier) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/dossier/${dossier.subredditId}/${dossier.userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const result = await response.json();
        setDossier(prev => prev ? { ...prev, meta: result.meta } : null);
      }
    } catch (err) {
      console.error('Error setting status:', err);
    }
    setSaving(false);
  };

  const handleWatchlist = async (action: 'add' | 'remove', hours?: number) => {
    if (!dossier) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/dossier/${dossier.subredditId}/${dossier.userId}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, hours }),
      });

      if (response.ok) {
        const result = await response.json();
        setDossier(prev => prev ? { ...prev, meta: result.meta } : null);
      }
    } catch (err) {
      console.error('Error updating watchlist:', err);
    }
    setSaving(false);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'white', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
          <p style={{ color: '#666' }}>Loading ModSync...</p>
        </div>
      </div>
    );
  }

  // Show dossier if available
  if (dossier) {
    const badgeColors: Record<string, string> = {
      TRUSTED: '#22c55e',
      RISK: '#ef4444',
      WATCHLIST: '#eab308',
      NEUTRAL: '#6b7280',
    };
    const badgeColor = badgeColors[dossier.meta.status_badge] || '#6b7280';
    const totalActions = dossier.meta.total_removals + dossier.meta.total_approvals;
    const removalRate = totalActions > 0 ? Math.round((dossier.meta.total_removals / totalActions) * 100) : 0;
    const isOnWatchlist = dossier.meta.status_badge === 'WATCHLIST' && dossier.meta.watchlist_expiration > Date.now() / 1000;

    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'white', fontFamily: 'system-ui, sans-serif' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid #e5e7eb', padding: '16px', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>u/{dossier.username}</h1>
              <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: '14px' }}>in r/{dossier.subredditName}</p>
            </div>
            <span style={{ backgroundColor: badgeColor, color: 'white', padding: '6px 16px', borderRadius: '9999px', fontSize: '14px', fontWeight: 'bold' }}>
              {dossier.meta.status_badge}
            </span>
          </div>
          {isOnWatchlist && (
            <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '8px 12px', marginTop: '12px', fontSize: '14px', color: '#92400e' }}>
              👁️ On Watchlist - monitoring activity
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          {(['overview', 'notes', 'actions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === tab ? '#2563eb' : '#666', fontWeight: activeTab === tab ? 'bold' : 'normal'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Removals</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626', margin: '4px 0 0 0' }}>{dossier.meta.total_removals}</p>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Approvals</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', margin: '4px 0 0 0' }}>{dossier.meta.total_approvals}</p>
              </div>
              <div style={{ backgroundColor: '#faf5ff', padding: '16px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>AutoMod Catches</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#9333ea', margin: '4px 0 0 0' }}>{dossier.meta.automod_catches}</p>
              </div>
              <div style={{ backgroundColor: '#fff7ed', padding: '16px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Removal Rate</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#ea580c', margin: '4px 0 0 0' }}>{removalRate}%</p>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              {dossier.notes.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '32px' }}>No notes yet. Add one in the Actions tab!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dossier.notes.map((note, idx) => (
                    <div key={note.note_id || idx} style={{
                      backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px',
                      borderLeft: `4px solid ${note.note_type === 'warning' ? '#eab308' : note.note_type === 'positive' ? '#22c55e' : '#3b82f6'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>@{note.author_username}</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>{new Date(note.timestamp * 1000).toLocaleDateString()}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Add Note */}
              <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Add Note</h3>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add context about this user..."
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', marginBottom: '8px', minHeight: '80px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {(['info', 'warning', 'positive'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setNoteType(type)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                        backgroundColor: noteType === type ? (type === 'warning' ? '#eab308' : type === 'positive' ? '#22c55e' : '#3b82f6') : '#e5e7eb',
                        color: noteType === type ? 'white' : '#374151'
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAddNote}
                  disabled={saving || !noteText.trim()}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    backgroundColor: saving || !noteText.trim() ? '#9ca3af' : '#2563eb', color: 'white', fontWeight: 'bold'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>

              {/* Set Status */}
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Set Status</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['NEUTRAL', 'TRUSTED', 'RISK'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => handleSetStatus(status)}
                      disabled={saving}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
                        backgroundColor: dossier.meta.status_badge === status ? '#2563eb' : '#e5e7eb',
                        color: dossier.meta.status_badge === status ? 'white' : '#374151'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Watchlist */}
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Watchlist</h3>
                {isOnWatchlist ? (
                  <button
                    onClick={() => handleWatchlist('remove')}
                    disabled={saving}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#dc2626', color: 'white', fontWeight: 'bold' }}
                  >
                    Remove from Watchlist
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[12, 24, 48].map(hours => (
                      <button
                        key={hours}
                        onClick={() => handleWatchlist('add', hours)}
                        disabled={saving}
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#eab308', color: 'white', fontWeight: 'bold' }}
                      >
                        {hours}h
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default splash screen
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'white', fontFamily: 'system-ui, sans-serif', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛡️</div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>ModSync</h1>
      <p style={{ color: '#666', margin: '0 0 24px 0', maxWidth: '300px' }}>Collaborative memory for Reddit moderators</p>
      <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', maxWidth: '300px' }}>
        <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
          <strong>How to use:</strong><br/>
          Click the ⋯ menu on any post or comment, then select "ModSync Dossier"
        </p>
      </div>
      {error && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '16px' }}>Error: {error}</p>}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModSyncApp />
  </StrictMode>
);
