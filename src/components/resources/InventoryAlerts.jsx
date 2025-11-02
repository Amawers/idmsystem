/**
 * @file InventoryAlerts.jsx
 * @description Component for displaying inventory alerts
 * @module components/resources/InventoryAlerts
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Package } from "lucide-react";

/**
 * Inventory Alerts Component
 * 
 * @param {Object} props
 * @param {Array} props.items - Items needing attention
 * @param {Array} props.expiringSoon - Items expiring soon
 * @param {Function} props.onUpdateStock - Stock update handler
 * @param {boolean} props.compact - Compact view
 * @returns {JSX.Element}
 */
export default function InventoryAlerts({ 
  items = [], 
  expiringSoon = [], 
  onUpdateStock,
  compact = false 
}) {
  const getStatusColor = (status) => {
    const colors = {
      critical_stock: "text-red-600",
      low_stock: "text-yellow-600",
      available: "text-green-600",
    };
    return colors[status] || "text-gray-600";
  };

  const allAlerts = [
    ...items.map(item => ({ ...item, alertType: "stock" })),
    ...(expiringSoon || []).map(item => ({ ...item, alertType: "expiry" }))
  ].slice(0, compact ? 5 : undefined);

  if (allAlerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No alerts at this time</p>
        <p className="text-sm">All inventory levels are sufficient</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allAlerts.map((item) => (
        <div 
          key={`${item.id}-${item.alertType}`} 
          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="mt-0.5">
            {item.alertType === "stock" ? (
              <AlertTriangle className={`h-5 w-5 ${getStatusColor(item.status)}`} />
            ) : (
              <Calendar className="h-5 w-5 text-orange-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">{item.item_name}</p>
              <Badge variant="outline" className={getStatusColor(item.status)}>
                {item.status?.replace("_", " ")}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-1">
              {item.item_code} • {item.category} • {item.location}
            </p>
            
            {item.alertType === "stock" ? (
              <p className="text-xs">
                Current: <span className="font-bold">{item.current_stock} {item.unit}</span>
                {" "}• Min: {item.minimum_stock} {item.unit}
              </p>
            ) : (
              <p className="text-xs text-orange-600">
                Expires: {new Date(item.expiration_date).toLocaleDateString()}
              </p>
            )}
          </div>
          
          {!compact && onUpdateStock && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onUpdateStock(item)}
            >
              Update
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
