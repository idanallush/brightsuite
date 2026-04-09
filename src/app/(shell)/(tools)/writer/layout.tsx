'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ToastProvider } from '@/components/writer/ToastContext';
import Toast from '@/components/writer/Toast';
import { PenLine, Users, Clock, BookOpen } from 'lucide-react';

// ─── Shared Writer Context ───

interface WriterClient {
  id: number;
  name: string;
  initial: string;
  color: string;
  logo?: string;
  about?: string;
  website?: string;
  winning_ads?: string;
  avoid_notes?: string;
}

interface WriterContextValue {
  currentClient: WriterClient | null;
  setCurrentClient: (client: WriterClient | null) => void;
  outputData: Record<string, unknown> | null;
  setOutputData: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  // Generate form state (persisted across navigation)
  url: string;
  setUrl: (url: string) => void;
  fetchedContent: string;
  setFetchedContent: (content: string) => void;
  additionalNotes: string;
  setAdditionalNotes: (notes: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  activePlatforms: string[];
  setActivePlatforms: (platforms: string[]) => void;
  toneOfVoice: string;
  setToneOfVoice: (tone: string) => void;
}

const WriterContext = createContext<WriterContextValue | null>(null);

export function useWriterContext() {
  const ctx = useContext(WriterContext);
  if (!ctx) throw new Error('useWriterContext must be inside WriterLayout');
  return ctx;
}

// ─── Sub-navigation tabs ───

const navItems = [
  { href: '/writer', label: 'ייצור קופי', icon: PenLine },
  { href: '/writer/clients', label: 'לקוחות', icon: Users },
  { href: '/writer/history', label: 'היסטוריה', icon: Clock },
  { href: '/writer/archive', label: 'ארכיון קופי', icon: BookOpen },
];

function WriterNav() {
  const pathname = usePathname();

  // Check active: exact match for /writer, startsWith for sub-pages
  const isActive = (href: string) => {
    if (href === '/writer') {
      return pathname === '/writer' || pathname === '/writer/output';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="border-b border-white/[0.08] px-6">
      <nav className="flex gap-1 -mb-px">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? 'border-[var(--accent)]'
                  : 'border-transparent hover:border-white/[0.1]'
              }`}
              style={{
                color: active ? 'var(--accent-fg)' : 'var(--text-secondary)',
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Layout ───

export default function WriterLayout({ children }: { children: React.ReactNode }) {
  const [currentClient, setCurrentClient] = useState<WriterClient | null>(null);
  const [outputData, setOutputData] = useState<Record<string, unknown> | null>(null);
  const [url, setUrl] = useState('');
  const [fetchedContent, setFetchedContent] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [language, setLanguage] = useState('he');
  const [activePlatforms, setActivePlatforms] = useState(['facebook', 'google', 'copy-design', 'landing']);
  const [toneOfVoice, setToneOfVoice] = useState('');

  const contextValue: WriterContextValue = {
    currentClient,
    setCurrentClient,
    outputData,
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
  };

  return (
    <ToastProvider>
      <WriterContext.Provider value={contextValue}>
        <div className="flex flex-col h-full">
          <WriterNav />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
        <Toast />
      </WriterContext.Provider>
    </ToastProvider>
  );
}
