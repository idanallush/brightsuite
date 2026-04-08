'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useWriterContext } from './layout';
import { Zap, RotateCcw, Globe, Loader2, Check, ChevronDown, ChevronUp, Sparkles, Shield } from 'lucide-react';
import OutputSettings from '@/components/writer/OutputSettings';
import LoadingState from '@/components/writer/LoadingState';
import { getClient, getClients, generateCopy, fetchUrl } from '@/lib/writer/api-client';
import { useWriterToast as useToast } from '@/hooks/use-writer-toast';
import { HelpTip } from '@/components/ui/help-tip';
import { SyncIndicator } from '@/components/ui/sync-progress';

const toneOptions = [
  { id: 'professional', label: 'מקצועי' },
  { id: 'warm', label: 'חם ואמפתי' },
  { id: 'humorous', label: 'הומוריסטי' },
  { id: 'dramatic', label: 'דרמטי' },
  { id: 'inspirational', label: 'מעורר השראה' },
  { id: 'direct', label: 'ישיר ותכליתי' },
];

export default function WriterGeneratePage() {
  const { hasToolAccess } = useAuth();
  const router = useRouter();
  const {
    currentClient,
    setCurrentClient,
    setOutputData,
    url,
    setUrl,
    fetchedContent,
    setFetchedContent,
    additionalNotes,
    setAdditionalNotes,
    language,
    setLanguage,
    activePlatforms,
    setActivePlatforms,
    toneOfVoice,
    setToneOfVoice,
  } = useWriterContext();

  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [clientProfile, setClientProfile] = useState('');
  const [analyzedBrief, setAnalyzedBrief] = useState<any>(null);
  const [showBriefDetails, setShowBriefDetails] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load clients list
  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load client profile when client changes
  useEffect(() => {
    if (!currentClient?.id) {
      setClientProfile('');
      return;
    }
    getClient(currentClient.id)
      .then((client) => {
        setClientProfile(client.about || '');
      })
      .catch(() => showToast('שגיאה בטעינת פרטי לקוח', 'error'));
  }, [currentClient?.id]);

  // Reset fetch success indicator when URL changes (but not on initial load)
  const prevUrlRef = useRef(url);
  useEffect(() => {
    if (prevUrlRef.current !== url) {
      prevUrlRef.current = url;
      setFetchSuccess(false);
      setFetchedContent('');
      setAnalyzedBrief(null);
      setShowBriefDetails(false);
    }
  }, [url]);

  const handleFetch = async () => {
    if (!url || fetching) return;
    setFetching(true);
    setFetchSuccess(false);
    setAnalyzedBrief(null);
    try {
      const result: any = await fetchUrl(url);

      // Store analyzed brief if AI returned it
      if (result.analyzed) {
        setAnalyzedBrief(result.analyzed);
        // Send analyzed JSON as fetchedContent for the prompt
        setFetchedContent(JSON.stringify(result.analyzed));
      } else {
        // Fallback: combine raw content into a string
        const raw = result.raw || result;
        const parts: string[] = [];
        if (raw.title) parts.push(`Title: ${raw.title}`);
        if (raw.metaDescription) parts.push(`Meta: ${raw.metaDescription}`);
        if (raw.h1) parts.push(`H1: ${raw.h1}`);
        if (raw.h2s?.length) parts.push(`H2s: ${raw.h2s.join(' | ')}`);
        if (raw.bodyText) parts.push(`Content: ${raw.bodyText}`);
        setFetchedContent(parts.join('\n'));
      }

      setFetchSuccess(true);
      showToast(result.analyzed ? 'התוכן נותח בהצלחה עם AI' : 'התוכן נשלף בהצלחה', 'success');
    } catch {
      showToast('שגיאה בשליפת התוכן מהלינק', 'error');
    } finally {
      setFetching(false);
    }
  };

  const validate = () => {
    if (!fetchedContent && !additionalNotes) {
      showToast('שלפו תוכן מ-URL או הוסיפו הנחיות', 'error');
      return false;
    }
    if (activePlatforms.length === 0) {
      showToast('בחרו לפחות פלטפורמה אחת', 'error');
      return false;
    }
    return true;
  };

  const handleGenerate = useCallback(async () => {
    if (loading) return;
    if (!validate()) return;

    setError(null);
    setIsTimeout(false);
    setLoading(true);

    try {
      const result: any = await generateCopy({
        clientId: currentClient?.id,
        url,
        fetchedContent,
        additionalNotes,
        language,
        platforms: activePlatforms,
        toneOfVoice,
      });
      setOutputData(result.output);
      router.push('/writer/output');
    } catch (err: any) {
      if (err.message === 'TIMEOUT') {
        setError('הייצור לקח יותר מדי זמן. נסו שוב.');
        setIsTimeout(true);
      } else if (err.message === 'NETWORK_ERROR') {
        showToast('שגיאת חיבור, נסו שוב', 'error');
        setError(null);
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  }, [loading, currentClient?.id, url, fetchedContent, additionalNotes, language, activePlatforms, toneOfVoice]);

  // Ctrl+Enter / Cmd+Enter keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleGenerate]);

  if (loading) {
    return <LoadingState />;
  }

  if (!hasToolAccess('writer')) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass-card p-8 text-center">
          <Shield size={48} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>אין גישה</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>אין לך הרשאה לכלי הזה. פנה למנהל המערכת.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4 animate-[fadeIn_0.25s_ease-out]">
      {/* Client Selector */}
      <div ref={dropdownRef} className="relative flex items-center gap-2">
        <button
          onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
          className="flex items-center gap-2.5 px-4 py-2.5 glass-card rounded-xl border border-white/[0.08] hover:border-[#1877F2]/40 transition-colors"
        >
          {currentClient?.logo ? (
            <img src={currentClient.logo} alt={currentClient.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <div className={`w-7 h-7 ${currentClient?.color || 'bg-gray-400'} rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
              {currentClient?.initial || '?'}
            </div>
          )}
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{currentClient?.name || 'בחר לקוח'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${clientDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </button>
        <HelpTip text="בחר לקוח כדי לטעון את פרופיל המותג שלו. ניתן להוסיף לקוחות חדשים בלשונית 'לקוחות'." />

        {clientDropdownOpen && (
          <div className="absolute top-full start-0 mt-1 glass-card border border-white/[0.08] rounded-xl z-20 min-w-[200px] animate-[fadeIn_0.15s_ease-out]">
            {clients.map((client: any) => (
              <button
                key={client.id}
                onClick={() => {
                  setCurrentClient(client);
                  setClientDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-right first:rounded-t-xl last:rounded-b-xl transition-colors ${
                  currentClient?.id === client.id ? 'bg-[#1877F2]/10' : ''
                }`}
                style={{ '--hover-bg': 'var(--card-bg-hover)' } as any}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = currentClient?.id === client.id ? 'rgba(101,105,167,0.1)' : 'transparent')}
              >
                {client.logo ? (
                  <img src={client.logo} alt={client.name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className={`w-6 h-6 ${client.color} rounded-full flex items-center justify-center text-white text-[10px] font-semibold`}>
                    {client.initial}
                  </div>
                )}
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{client.name}</span>
              </button>
            ))}
            {clients.length === 0 && (
              <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>אין לקוחות</div>
            )}
          </div>
        )}
      </div>

      {/* URL + Additional Notes Card */}
      <div className="glass-card rounded-2xl border border-white/[0.08] p-5 space-y-4">
        {/* URL Input */}
        <div>
          <label htmlFor="url-input" className="flex items-center gap-1.5 text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            URL של דף הנחיתה / אתר
            <HelpTip text="הדבק כתובת דף נחיתה או אתר. המערכת תנתח את התוכן ותשתמש בו ליצירת הקופי." />
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-disabled)' }} />
              <input
                id="url-input"
                dir="ltr"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="glass-input w-full rounded-xl pr-10 pl-3 py-2.5 text-sm text-left"
              />
            </div>
            <button
              onClick={handleFetch}
              disabled={!url || fetching}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0 flex items-center gap-2 ${
                fetchSuccess
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              style={!fetchSuccess ? { backgroundColor: 'var(--accent)' } : undefined}
            >
              {fetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : fetchSuccess ? (
                <Check className="w-4 h-4" />
              ) : null}
              {fetchSuccess ? 'התוכן נשלף בהצלחה' : 'Fetch'}
            </button>
            {fetching && <SyncIndicator message="מנתח את התוכן..." />}
          </div>
        </div>

        {/* AI Brief Summary Card */}
        {analyzedBrief && (
          <div className="bg-gradient-to-br from-[#1877F2]/15 to-transparent rounded-xl border border-[#1877F2]/20 p-4">
            <button
              onClick={() => setShowBriefDetails(!showBriefDetails)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>בריף AI — {analyzedBrief.business_name || 'ניתוח אתר'}</span>
              </div>
              {showBriefDetails ? (
                <ChevronUp className="w-4 h-4 text-[#1877F2]/70" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#1877F2]/70" />
              )}
            </button>

            {/* Collapsed: quick summary */}
            {!showBriefDetails && (
              <p dir="rtl" className="text-[12px] text-[#1877F2]/70 mt-1.5 line-clamp-2">
                {analyzedBrief.product_or_service && `${analyzedBrief.product_or_service}`}
                {analyzedBrief.target_audience && ` · ${analyzedBrief.target_audience}`}
              </p>
            )}

            {/* Expanded: full brief */}
            {showBriefDetails && (
              <div dir="rtl" className="mt-3 space-y-2 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                {analyzedBrief.business_type && (
                  <div><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>סוג עסק:</span> {analyzedBrief.business_type}</div>
                )}
                {analyzedBrief.product_or_service && (
                  <div><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>מוצר / שירות:</span> {analyzedBrief.product_or_service}</div>
                )}
                {analyzedBrief.target_audience && (
                  <div><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>קהל יעד:</span> {analyzedBrief.target_audience}</div>
                )}
                {analyzedBrief.unique_selling_points?.length > 0 && (
                  <div>
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>USPs:</span>
                    <ul className="list-disc list-inside mr-2 mt-0.5 space-y-0.5">
                      {analyzedBrief.unique_selling_points.map((usp: string, i: number) => <li key={i}>{usp}</li>)}
                    </ul>
                  </div>
                )}
                {analyzedBrief.pain_points?.length > 0 && (
                  <div>
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>נקודות כאב:</span>
                    <ul className="list-disc list-inside mr-2 mt-0.5 space-y-0.5">
                      {analyzedBrief.pain_points.map((pp: string, i: number) => <li key={i}>{pp}</li>)}
                    </ul>
                  </div>
                )}
                {analyzedBrief.offers_and_promotions && (
                  <div><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>מבצעים:</span> {analyzedBrief.offers_and_promotions}</div>
                )}
                {analyzedBrief.social_proof && (
                  <div><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>הוכחה חברתית:</span> {analyzedBrief.social_proof}</div>
                )}
                {analyzedBrief.call_to_action && (
                  <div><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>CTA:</span> {analyzedBrief.call_to_action}</div>
                )}
                {analyzedBrief.key_phrases?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {analyzedBrief.key_phrases.map((phrase: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-[11px] border border-[#1877F2]/25" style={{ color: 'var(--accent)' }}>
                        {phrase}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Additional Notes */}
        <div>
          <label htmlFor="additional-notes" className="flex items-center gap-1.5 text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            הנחיות נוספות (אופציונלי)
            <HelpTip text="הוסף הנחיות ספציפיות כמו קהל יעד, מבצע מיוחד, CTA רצוי, או טקסט שחובה לכלול." />
          </label>
          <textarea
            id="additional-notes"
            dir="rtl"
            rows={2}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="הוסיפו הנחיות ספציפיות, קהל יעד, מבצע מיוחד..."
            className="glass-input w-full rounded-xl px-3 py-2.5 text-sm resize-none text-right"
          />
        </div>

        {/* Tone of Voice */}
        <div>
          <label className="flex items-center gap-1.5 text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            טון דיבור
            <HelpTip text="הטון משפיע על הסגנון של הקופי שייוצר. ניתן לדלג — ברירת מחדל היא מקצועי." />
          </label>
          <div className="flex flex-wrap gap-2">
            {toneOptions.map((tone) => (
              <button
                key={tone.id}
                onClick={() => setToneOfVoice(toneOfVoice === tone.id ? '' : tone.id)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
                  toneOfVoice === tone.id
                    ? 'text-white border-[#1877F2]'
                    : 'border-white/[0.08] hover:border-[#1877F2]/50'
                }`}
                style={
                  toneOfVoice === tone.id
                    ? { backgroundColor: 'var(--accent)' }
                    : { color: 'var(--text-secondary)', background: 'var(--card-bg)' }
                }
                onMouseEnter={(e) => {
                  if (toneOfVoice !== tone.id) {
                    e.currentTarget.style.color = 'var(--accent)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (toneOfVoice !== tone.id) {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Output Settings */}
      <OutputSettings
        language={language}
        onLanguageChange={setLanguage}
        activePlatforms={activePlatforms}
        onPlatformsChange={setActivePlatforms}
      />

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          {isTimeout && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1 text-red-400 font-medium hover:text-red-300"
            >
              <RotateCcw className="w-4 h-4" />
              <span>נסו שוב</span>
            </button>
          )}
        </div>
      )}

      {/* Generate button */}
      <div className="pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={activePlatforms.length === 0}
            className="flex-1 flex items-center justify-center gap-2 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Zap className="w-5 h-5" />
            <span>ייצור קופי</span>
          </button>
          <HelpTip text="הייצור לוקח 30-60 שניות. ניתן לערוך ולשנות את התוצאות אחרי." />
        </div>
        <p className="text-center text-[12px] mt-2" style={{ color: 'var(--text-secondary)' }}>
          הייצור לוקח בין 30 ל-60 שניות | Ctrl+Enter לייצור מהיר
        </p>
      </div>
    </div>
  );
}
