"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/cpa/ui/tabs";
import { Card } from "@/components/cpa/ui/card";
import { Button } from "@/components/cpa/ui/button";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { FbConnectionTab } from "@/components/cpa/settings/fb-connection-tab";
import { ClientsTab } from "@/components/cpa/settings/clients-tab";
import { TopicsTab } from "@/components/cpa/settings/topics-tab";
import { AlertsTab } from "@/components/cpa/settings/alerts-tab";
import { UsersTab } from "@/components/cpa/settings/users-tab";
import { HealthBanner } from "@/components/cpa/settings/health-banner";
import { SetupWizard } from "@/components/cpa/settings/setup-wizard";
import { useAuth } from "@/hooks/use-auth";
import { Wand2 } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
};

export default function CpaSettingsPage() {
  const { loading, hasToolAccess } = useAuth();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wasOpenedAutomatically, setWasOpenedAutomatically] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState("fb-connection");

  const { data: healthData } = useSWR(
    !loading ? "/api/cpa/health" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!healthData) return;
    const isUnconfigured = healthData.active_clients_count === 0;

    if (isUnconfigured && !userDismissed && !wizardOpen) {
      setWizardOpen(true);
      setWasOpenedAutomatically(true);
      return;
    }

    if (!isUnconfigured && wizardOpen && wasOpenedAutomatically) {
      setWizardOpen(false);
      setWasOpenedAutomatically(false);
    }
  }, [healthData, userDismissed, wizardOpen, wasOpenedAutomatically]);

  function handleWizardOpenChange(open: boolean) {
    setWizardOpen(open);
    if (!open) {
      setUserDismissed(true);
      setWasOpenedAutomatically(false);
    }
  }

  function handleManualOpen() {
    setWizardOpen(true);
    setWasOpenedAutomatically(false);
    setUserDismissed(false);
  }

  function handleNavigateTab(tab: string) {
    setActiveTab(tab);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!hasToolAccess('cpa')) {
    return (
      <Card className="rounded-xl">
        <div className="flex flex-col items-center justify-center p-16 gap-5">
          <p className="font-semibold">אין לך הרשאה לצפות בכלי זה</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button
          variant="outline"
          onClick={handleManualOpen}
          className="gap-1.5 text-sm"
        >
          <Wand2 className="h-4 w-4" />
          אשף הגדרה
        </Button>
      </div>

      <HealthBanner onNavigateTab={handleNavigateTab} />

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full bg-card border rounded-xl p-1.5 h-auto flex-wrap gap-0">
          <TabsTrigger value="fb-connection" className="rounded-none px-4 py-2 text-[13px] font-medium">
            חיבור פייסבוק
          </TabsTrigger>
          <TabsTrigger value="clients" className="rounded-none px-4 py-2 text-[13px] font-medium">
            לקוחות
          </TabsTrigger>
          <TabsTrigger value="topics" className="rounded-none px-4 py-2 text-[13px] font-medium">
            נושאים &amp; TCPA
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-none px-4 py-2 text-[13px] font-medium">
            התראות
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-none px-4 py-2 text-[13px] font-medium">
            משתמשים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fb-connection" className="mt-5">
          <FbConnectionTab />
        </TabsContent>
        <TabsContent value="clients" className="mt-5">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="topics" className="mt-5">
          <TopicsTab />
        </TabsContent>
        <TabsContent value="alerts" className="mt-5">
          <AlertsTab />
        </TabsContent>
        <TabsContent value="users" className="mt-5">
          <UsersTab />
        </TabsContent>
      </Tabs>

      <SetupWizard open={wizardOpen} onOpenChange={handleWizardOpenChange} />
    </div>
  );
}
