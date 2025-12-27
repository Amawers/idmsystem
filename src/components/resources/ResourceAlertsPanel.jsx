/**
 * @file ResourceAlertsPanel.jsx
 * @description Notifications for low stock, budget thresholds, and critical alerts
 * @module components/resources/ResourceAlertsPanel
 * 
 * Features:
 * - Real-time alerts for inventory and budget
 * - Severity-based filtering
 * - Alert resolution tracking
 * - Action recommendations
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, AlertCircle, Bell, CheckCircle } from "lucide-react";
import supabase from "@/../config/supabase";
import { useResourceStore } from "@/store/useResourceStore";

function AlertItem({ alert, onResolve }) {
  const getSeverityConfig = (severity) => {
    const configs = {
      critical: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle },
      high: { color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", icon: AlertCircle },
      medium: { color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", icon: Bell },
      low: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: Bell },
    };
    return configs[severity] || configs.medium;
  };

  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;

  return (
    <div className={`p-4 border rounded-lg ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.color} mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-start justify-between mb-1">
            <h4 className={`font-semibold ${config.color}`}>{alert.title}</h4>
            <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
              {alert.severity}
            </Badge>
          </div>
          <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
          
          {alert.item_name && (
            <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
              <span>Item: <strong>{alert.item_name}</strong></span>
              {alert.current_value !== null && (
                <span>Current: <strong>{alert.current_value}</strong></span>
              )}
              {alert.threshold_value !== null && (
                <span>Threshold: <strong>{alert.threshold_value}</strong></span>
              )}
            </div>
          )}
          
          {alert.action_required && (
            <p className="text-xs font-medium text-gray-800 mb-3">
              Action Required: {alert.action_required}
            </p>
          )}
          
          <div className="flex items-center gap-2">
            {!alert.is_resolved && (
              <Button size="sm" variant="outline" onClick={() => onResolve(alert.id)}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Resolve
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(alert.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResourceAlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("unresolved");
  const [loading, setLoading] = useState(false);
  const { resolveAlert } = useResourceStore();
  const pollRef = useRef(null);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    // Initial load + polling (no Supabase realtime)
    fetchAlerts();

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (isOnline) {
      pollRef.current = window.setInterval(() => {
        fetchAlerts();
      }, 60_000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, isOnline]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inventory_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'unresolved') {
        query = query.eq('is_resolved', false);
      } else if (filter === 'critical') {
        query = query.eq('severity', 'critical').eq('is_resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const unresolvedCount = alerts.filter(a => !a.is_resolved).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.is_resolved).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Immediate action required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unresolved Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unresolvedCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <Tabs value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="unresolved">
                Unresolved ({unresolvedCount})
              </TabsTrigger>
              <TabsTrigger value="critical">
                Critical ({criticalCount})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({alerts.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : alerts.length > 0 ? (
            alerts.map((alert) => (
              <AlertItem 
                key={alert.id} 
                alert={alert} 
                onResolve={handleResolveAlert}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No alerts to display
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
