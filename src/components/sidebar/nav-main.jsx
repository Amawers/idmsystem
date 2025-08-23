import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupLabel
} from "@/components/ui/sidebar"
import { Link } from "react-router-dom"

export function NavMain({ items }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">

        {/* ================= NAVIGATION HEADER ================= */}
        <SidebarGroupLabel>Navigations</SidebarGroupLabel>

        {/* ================= NAVIGATION MENU ================= */}
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild>
                {/* LINK TO NAVIGATE TO ROUTE */}
                <Link to={item.path}>
                  {/* ITEM ICON */}
                  <item.icon className="mr-2 h-5 w-5" />
                  {/* ITEM LABEL/TITLE */}
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

      </SidebarGroupContent>
    </SidebarGroup>
  )
}
