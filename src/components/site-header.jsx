import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useLocation } from "react-router-dom"
import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import { NotificationBell } from "@/components/notifications/NotificationBell"

// Map each route path to a human-readable page title
// This allows the header to show a title that matches the current active page
const pageTitles = {
  "/dashboard": "Dashboard",
  
  // Case Management
  "/case": "Case Management",
  "/case/dashboard": "Dashboard",
  "/case/management": "Management",
  
  // Program Management
  "/program": "Program Management",
  "/program/dashboard": "Dashboard",
  "/program/catalog": "Catalog",
  "/program/enrollments": "Enrollments",
  "/program/service-delivery": "Service Delivery",
  "/program/partners": "Partners",
  
  // Resource Allocation
  "/resource": "Resource Allocation",
  "/resource/dashboard": "Dashboard",
  "/resource/stock": "Stock Management",
  "/resource/approvals": "Approvals",
  "/resource/staff": "Staff",
  "/resource/programs": "Programs",
  
  // Account Management
  "/account": "Account Management",
  
  // Security & Audit
  "/controls": "Security & Audit",
  "/controls/audit": "Audit Trail",
  "/controls/documents": "Documents",
  "/controls/permissions": "Role Permissions",
}

// Map parent sections for breadcrumb navigation
const parentSections = {
  // Case Management sub-pages
  "/case/dashboard": "Case Management",
  "/case/management": "Case Management",
  
  // Program Management sub-pages
  "/program/dashboard": "Program Management",
  "/program/catalog": "Program Management",
  "/program/enrollments": "Program Management",
  "/program/service-delivery": "Program Management",
  "/program/partners": "Program Management",
  
  // Resource Allocation sub-pages
  "/resource/dashboard": "Resource Allocation",
  "/resource/stock": "Resource Allocation",
  "/resource/approvals": "Resource Allocation",
  "/resource/staff": "Resource Allocation",
  "/resource/programs": "Resource Allocation",
  
  // Security & Audit sub-pages
  "/controls/audit": "Security & Audit",
  "/controls/documents": "Security & Audit",
  "/controls/permissions": "Security & Audit",
}

export function SiteHeader() {
  // Get the current route (pathname) from React Router
  const location = useLocation()

  // Compute the correct page title based on the current route
  // If the path doesn't exist in the map, fallback to "Documents"
  const pageTitle = useMemo(() => {
    return pageTitles[location.pathname] || "Documents"
  }, [location.pathname])

  // Get parent section for breadcrumb
  const parentSection = useMemo(() => {
    return parentSections[location.pathname] || null
  }, [location.pathname])

  return (
    <header
      className="
        flex h-(--header-height) shrink-0 items-center border-b
        transition-[width,height] ease-linear
        group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)
      "
    >
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          {/* Sidebar toggle button (hamburger menu) */}
          <SidebarTrigger className="-ml-1 cursor-pointer" />

          {/* Thin vertical separator for better visual grouping */}
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />

          {/* Page title that changes dynamically with route */}
          {parentSection ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">{parentSection}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-medium">{pageTitle}</h1>
            </div>
          ) : (
            <h1 className="text-base font-medium">{pageTitle}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
