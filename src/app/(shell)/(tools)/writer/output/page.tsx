'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Download, Loader2, FileText } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import TabBar, { platformToTab } from '@/components/writer/TabBar';
import FacebookTab from '@/components/writer/FacebookTab';
import GoogleTab from '@/components/writer/GoogleTab';
import DesignTab from '@/components/writer/DesignTab';
import LandingPageTab from '@/components/writer/LandingPageTab';
import PdfReport from '@/components/writer/pdf/PdfExport';
import { regenerateBlock, regenerateBatch } from '@/lib/writer/api-client';
import { useWriterToast as useToast } from '@/hooks/use-writer-toast';
import { useWriterContext } from '../layout';

const tabComponents: Record<string, any> = {
  facebook: FacebookTab,
  google: GoogleTab,
  design: DesignTab,
  landing: LandingPageTab,
};

// Map API output keys to tab IDs
const outputKeyToTab: Record<string, string> = {
  facebook: 'facebook',
  google: 'google',
  'copy-design': 'design',
  'copy_design': 'design',
  design: 'design',
  landing: 'landing',
  landing_page: 'landing',
};

export default function WriterOutputPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    outputData,
    setOutputData,
    currentClient,
    url,
    fetchedContent,
    additionalNotes,
    language,
    toneOfVoice,
  } = useWriterContext();

  const regenerateContext = {
    clientId: currentClient?.id,
    url,
    fetchedContent,
    additionalNotes,
    language,
    toneOfVoice,
  };

  // Build available tabs from the output data keys
  const availableTabs = outputData
    ? [...new Set(Object.keys(outputData).map((k) => outputKeyToTab[k] || k).filter((id) => tabComponents[id]))]
    : [];

  const [activeTab, setActiveTab] = useState(availableTabs[0] || 'facebook');
  const [pdfLoading, setPdfLoading] = useState(false);

  // Reset active tab when data changes
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [outputData]);

  // Find the data for the active tab by checking all possible keys
  const getTabData = (tabId: string) => {
    if (!outputData) return null;
    for (const [key, mappedTab] of Object.entries(outputKeyToTab)) {
      if (mappedTab === tabId && (outputData as any)[key]) return (outputData as any)[key];
    }
    return (outputData as any)[tabId] || null;
  };

  // Find the original key for a tab ID (needed for inline editing)
  const getOriginalKey = (tabId: string) => {
    if (!outputData) return tabId;
    for (const [key, mappedTab] of Object.entries(outputKeyToTab)) {
      if (mappedTab === tabId && (outputData as any)[key]) return key;
    }
    return tabId;
  };

  // Handle inline data changes from tab components
  const handleTabDataChange = (tabId: string, newData: any) => {
    if (!setOutputData) return;
    const key = getOriginalKey(tabId);
    setOutputData((prev: any) => ({ ...prev, [key]: newData }));
  };

  // Handle single-block regeneration
  const handleRegenerate = async (platform: string, section: string, index: number, keywords?: string[]) => {
    if (!regenerateContext) return;

    try {
      const currentItem = getTabData(outputKeyToTab[platform] || platform)?.[section]?.[index];
      const result: any = await regenerateBlock({
        ...regenerateContext,
        platform,
        section,
        index,
        currentText: currentItem?.text || '',
        ...(keywords?.length ? { keywords } : {}),
      });

      // Update the specific item in outputData
      const key = getOriginalKey(outputKeyToTab[platform] || platform);
      setOutputData((prev: any) => {
        const updated = { ...prev };
        const platformData = { ...(updated[key] || {}) };
        const sectionArr = [...(platformData[section] || [])];
        if (sectionArr[index]) {
          sectionArr[index] = { ...sectionArr[index], ...result.item };
        }
        platformData[section] = sectionArr;
        updated[key] = platformData;
        return updated;
      });

      showToast('הטקסט יוצר מחדש בהצלחה', 'success');
    } catch (err: any) {
      showToast('שגיאה בייצור מחדש: ' + err.message, 'error');
      throw err;
    }
  };

  // Handle batch regeneration (all Google sections with keywords)
  const handleBatchRegenerate = async (keywords: string[], currentSections: any) => {
    if (!regenerateContext) return;

    try {
      const result: any = await regenerateBatch({
        ...regenerateContext,
        keywords,
        sections: currentSections,
      });

      // Replace all Google data with the batch result
      const key = getOriginalKey('google');
      setOutputData((prev: any) => ({
        ...prev,
        [key]: result.output,
      }));

      showToast('כל הטקסטים יוצרו מחדש בהצלחה', 'success');
    } catch (err: any) {
      showToast('שגיאה בייצור מחדש: ' + err.message, 'error');
      throw err;
    }
  };

  // ─── PDF Export ───
  const handleExportPdf = useCallback(async () => {
    if (!outputData || pdfLoading) return;
    setPdfLoading(true);

    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const fileDate = now.toISOString().slice(0, 10);
      const safeName = (currentClient?.name || 'Client').replace(/[^a-zA-Z0-9\u0590-\u05FF ]/g, '').replace(/\s+/g, '_');
      const fileName = `MultiWrite_${safeName}_${fileDate}.pdf`;

      const blob = await pdf(
        <PdfReport
          outputData={outputData}
          clientName={currentClient?.name}
          date={dateStr}
        />
      ).toBlob();

      // Trigger download
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      showToast('שגיאה בייצוא PDF: ' + err.message, 'error');
    } finally {
      setPdfLoading(false);
    }
  }, [outputData, currentClient?.name, pdfLoading]);

  const handleBack = () => router.push('/writer');

  // Empty state
  if (!outputData || availableTabs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center mb-5">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--accent-fg)' }}
          >
            <ArrowRight className="w-4 h-4" />
            <span>חזרה לבריף</span>
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-24">
          <FileText className="w-14 h-14 mb-4" style={{ color: 'var(--text-disabled)' }} />
          <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>אין תוצאות עדיין</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>בחרו לקוח ומלאו את הבריף כדי לייצר קופי</p>
        </div>
      </div>
    );
  }

  const ActiveTabComponent = tabComponents[activeTab];

  return (
    <div className="max-w-4xl mx-auto p-6 animate-[fadeIn_0.25s_ease-out]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: 'var(--accent-fg)' }}
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה לבריף</span>
        </button>
        <button
          onClick={handleExportPdf}
          disabled={pdfLoading}
          className="btn-ghost flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
        >
          {pdfLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{pdfLoading ? 'מייצא...' : 'ייצוא PDF'}</span>
        </button>
      </div>

      {/* Inline editing hint */}
      <p className="text-[11px] mb-4 text-center" style={{ color: 'var(--text-secondary)' }}>לחצו פעמיים על טקסט כדי לערוך אותו</p>

      {/* Tab bar */}
      <div className="mb-6">
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          availableTabs={availableTabs}
        />
      </div>

      {/* Tab content */}
      {ActiveTabComponent && (
        <ActiveTabComponent
          data={getTabData(activeTab)}
          onDataChange={(newData: any) => handleTabDataChange(activeTab, newData)}
          onRegenerate={handleRegenerate}
          {...(activeTab === 'google' ? { onBatchRegenerate: handleBatchRegenerate } : {})}
        />
      )}
    </div>
  );
}
