/**
 * @file ServiceDeliveryPage.jsx
 * @description Service delivery tracking and logging page
 * @module pages/case-manager/ServiceDeliveryPage
 * 
 * Features:
 * - Log service sessions
 * - Track attendance
 * - Record progress notes
 * - View delivery statistics
 */

import ServiceDeliveryTable from "@/components/programs/ServiceDeliveryTable";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { fetchAndCacheCasesByType, fetchAndCachePrograms } from "@/services/serviceDeliveryOfflineService";

/**
 * Service Delivery Page Component
 * @returns {JSX.Element} Service delivery page
 */
export default function ServiceDeliveryPage() {
  const isOnline = useNetworkStatus();
  const wasOfflineRef = useRef(!isOnline);
  const [shouldAutoSync, setShouldAutoSync] = useState(false);
  const handleAutoSyncHandled = useCallback(() => setShouldAutoSync(false), []);

  useEffect(() => {
    const prefetchData = async () => {
      if (!isOnline) return;
      console.log("[ServiceDeliveryPage] Pre-fetching cases and programs...");
      const caseTypes = ["CICL/CAR", "VAC", "FAC", "FAR", "IVAC"];
      const promises = caseTypes.map((t) => fetchAndCacheCasesByType(t).catch((e) => console.error(e)));
      await Promise.all(promises);
      await fetchAndCachePrograms().catch((e) => console.error(e));
      console.log("[ServiceDeliveryPage] Pre-fetch complete");
    };

    prefetchData();
  }, [isOnline]);

  // Reconnection handling similar to enrollments page
  useEffect(() => {
    if (!wasOfflineRef.current && !isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current && isOnline) {
      sessionStorage.setItem("serviceDelivery.forceSync", "true");
      window.location.reload();
    }
  }, [isOnline]);

  useEffect(() => {
    const flagged = sessionStorage.getItem("serviceDelivery.forceSync");
    if (flagged === "true") {
      sessionStorage.removeItem("serviceDelivery.forceSync");
      setShouldAutoSync(true);
    }
  }, []);

  return (
    <div className="flex-1 space-y-4 p-0 md:px-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Service Delivery</h2>
        <p className="text-muted-foreground">
          Track service sessions and attendance records
        </p>
      </div>

      {/* Service Delivery Component */}
      <ServiceDeliveryTable
        autoSync={shouldAutoSync}
        onAutoSyncHandled={handleAutoSyncHandled}
      />
    </div>
  );
}
