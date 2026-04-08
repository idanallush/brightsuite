'use client';

import { redirect } from 'next/navigation';

// Campaigns view is integrated into the dashboard page as a tab.
// Redirect users who navigate directly here.
export default function CampaignsPage() {
  redirect('/ads/dashboard?tab=campaigns');
}
