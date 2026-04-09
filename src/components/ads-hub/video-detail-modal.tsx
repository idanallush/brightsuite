'use client';

import { useVideoDetail } from '@/hooks/ads-hub/use-overview';
import { X, Link2, Copy } from 'lucide-react';
import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

interface VideoDetailModalProps {
  videoId: string;
  onClose: () => void;
}

export const VideoDetailModal = ({ videoId, onClose }: VideoDetailModalProps) => {
  const { data, isLoading } = useVideoDetail(videoId);
  const [transcript, setTranscript] = useState('');
  const [saving, setSaving] = useState(false);

  const video = data?.video;
  const performance = data?.performance || [];

  // Build retention funnel from latest performance entry
  const latestPerf = performance[performance.length - 1];
  const retentionData = latestPerf
    ? [
        { stage: '25%', value: Number(latestPerf.p25 || 0) },
        { stage: '50%', value: Number(latestPerf.p50 || 0) },
        { stage: '75%', value: Number(latestPerf.p75 || 0) },
        { stage: '95%', value: Number(latestPerf.p95 || 0) },
        { stage: '100%', value: Number(latestPerf.p100 || 0) },
      ]
    : [];

  const utmUrl = video
    ? `?utm_source=${video.utm_source || 'meta'}&utm_medium=${video.utm_medium || 'paid'}&utm_campaign=${video.utm_campaign || ''}&utm_content=${video.utm_content || ''}`
    : '';

  const handleCopyUtm = () => {
    navigator.clipboard.writeText(utmUrl);
    toast.success('UTM הועתק');
  };

  const handleSaveTranscript = async () => {
    setSaving(true);
    try {
      await fetch(`/api/ads-hub/video-library/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      toast.success('תמליל נשמר');
    } catch {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-5"
        style={{ background: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {video?.ad_name || 'טוען...'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-48 rounded bg-gray-100 animate-pulse" />
            <div className="h-32 rounded bg-gray-100 animate-pulse" />
          </div>
        ) : (
          <>
            {/* Thumbnail */}
            {video?.thumbnail_url && (
              <img
                src={video.thumbnail_url as string}
                alt={video.ad_name as string}
                className="w-full h-48 object-cover rounded-xl"
              />
            )}

            {/* UTM */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                UTM Link
              </h4>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 text-xs font-mono p-2 rounded-lg overflow-x-auto"
                  style={{ background: '#f4f2ee', color: 'var(--text-secondary)' }}
                  dir="ltr"
                >
                  <Link2 size={12} className="inline mr-1" />
                  {utmUrl}
                </div>
                <button
                  onClick={handleCopyUtm}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  title="העתק UTM"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            {/* Retention Funnel */}
            {retentionData.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  משפך שימור
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={retentionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Transcript */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                תמליל
              </h4>
              <textarea
                value={transcript || (video?.transcript as string) || ''}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="הוסיפו תמליל לסרטון..."
                rows={4}
                className="w-full text-sm p-3 rounded-lg border resize-none"
                style={{
                  background: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleSaveTranscript}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: '#1a1a1a',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'שומר...' : 'שמור תמליל'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
