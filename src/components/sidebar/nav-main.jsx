  import { Link, useLocation } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function NavMain({ items }) {
  const location = useLocation()

  return (
    <SidebarMenu>
      {items.map((item) => {
        // check if current route or any sub-item route is active
        const isActive = location.pathname.startsWith(item.path)
        const hasSubItems = item.items && item.items.length > 0

        // If item has sub-navigation, render collapsible
        if (hasSubItems) {
          return (
            <Collapsible
              key={item.path}
              asChild
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className={
                      isActive
                        ? "bg-primary text-primary-foreground min-w-8 transition-all duration-300 ease-in-out"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground min-w-8 transition-all duration-300 ease-in-out"
                    }
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                    <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path
                      return (
                        <SidebarMenuSubItem key={subItem.path}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isSubActive}
                          >
                            <Link 
                              to={subItem.path}
                              className={isSubActive ? "underline underline-offset-4 decoration-primary decoration-2" : ""}
                            >
                              {subItem.icon && <subItem.icon className="size-4" />}
                              <span>{subItem.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        }

        // Regular menu item without sub-navigation
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
