/**
 * @file PartnersPage.jsx
 * @description Partner organizations management page
 * @module pages/case-manager/PartnersPage
 * 
 * Features:
 * - View partner organizations
 * - Manage partnerships
 * - Track referrals
 * - Partner statistics
 */

import { useCallback, useEffect, useRef, useState } from "react";
import PartnersTable from "@/components/programs/PartnersTable";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { PARTNERS_FORCE_SYNC_KEY } from "@/hooks/usePartners";

/**
 * Partners Page Component
 * @returns {JSX.Element} Partners page
 */
export default function PartnersPage() {
  const isOnline = useNetworkStatus();
  const wasOfflineRef = useRef(!isOnline);
  const [shouldAutoSync, setShouldAutoSync] = useState(false);
  const handleAutoSyncHandled = useCallback(() => setShouldAutoSync(false), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wasOfflineRef.current && !isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current && isOnline) {
      sessionStorage.setItem(PARTNERS_FORCE_SYNC_KEY, "true");
      window.location.reload();
    }
  }, [isOnline]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flagged = sessionStorage.getItem(PARTNERS_FORCE_SYNC_KEY);
    if (flagged === "true") {
      sessionStorage.removeItem(PARTNERS_FORCE_SYNC_KEY);
      setShouldAutoSync(true);
    }
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Partner Organizations</h2>
        <p className="text-muted-foreground">
          Manage partner organizations and service providers
        </p>
      </div>

      {/* Partners Component */}
      <PartnersTable autoSync={shouldAutoSync} onAutoSyncHandled={handleAutoSyncHandled} />
    </div>
  );
}
