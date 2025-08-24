import { Link, useLocation } from "react-router-dom"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export function NavMain({ items }) {
  const location = useLocation()

  return (
    <SidebarMenu>
      {items.map((item) => {
        // check if current route starts with the item path
        const isActive = location.pathname.startsWith(item.path)

        return (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton asChild>
              <Link
                to={item.path}
                className={
                  isActive
                    ? // ================= ACTIVE STYLE =================
                      "bg-primary text-primary-foreground min-w-8 transition-all duration-300 ease-in-out pointer-events-none"
                    : // ================= INACTIVE STYLE =================
                      "text-muted-foreground hover:bg-muted hover:text-foreground min-w-8 transition-all duration-300 ease-in-out"
                }
              >
                {/* icon + label */}
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
