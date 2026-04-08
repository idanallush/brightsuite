"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/cpa/ui/tabs";
import { Card } from "@/components/cpa/ui/card";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { FbConnectionTab } from "@/components/cpa/settings/fb-connection-tab";
import { ClientsTab } from "@/components/cpa/settings/clients-tab";
import { TopicsTab } from "@/components/cpa/settings/topics-tab";
import { AlertsTab } from "@/components/cpa/settings/alerts-tab";
import { UsersTab } from "@/components/cpa/settings/users-tab";
import { useAuth } from "@/hooks/use-auth";

export default function CpaSettingsPage() {
  const { loading, hasToolAccess } = useAuth();

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
      <Tabs defaultValue="fb-connection" dir="rtl">
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
    </div>
  );
}
