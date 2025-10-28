import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useLocation } from "react-router-dom"
import { useMemo } from "react"
import { ChevronRight } from "lucide-react"

// Map each route path to a human-readable page title
// This allows the header to show a title that matches the current active page
const pageTitles = {
  "/dashboard": "Dashboard",
  "/case": "Case Management",
  "/case/dashboard": "Dashboard",
  "/case/management": "Management",
  "/program": "Program Management",
  "/resource": "Resource Allocation",
  "/account": "Account Management",
  "/controls": "Security & Audit",
}

// Map parent sections for breadcrumb navigation
const parentSections = {
  "/case/dashboard": "Case Management",
  "/case/management": "Case Management",
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
        flex h-(--header-height) shrink-0 items-center gap-2 border-b
        transition-[width,height] ease-linear
        group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)
      "
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
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
    </header>
  )
}
