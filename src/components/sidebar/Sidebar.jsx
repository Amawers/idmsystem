import * as React from "react"
import { Link } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { NavUser } from "@/components/sidebar/nav-user"

import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/sidebar/nav-main"

import { 
	IconHeartHandshake, 
	IconClipboardData, 
	IconListDetails, 
	IconChartBar,
	IconUsersGroup,
	IconLogs
} from "@tabler/icons-react"
import logo from "@/assets/logo.jpg"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { DatePicker } from "@/components/date-picker";

export default function Sidebar(props) {
  const { user, role, avatar_url } = useAuthStore();

  // ================= ROLE-BASED NAVIGATION =================
  const roleNavs = {
    admin_staff: [
      { path: "/case", label: "Case Management", icon: IconHeartHandshake },
      { path: "/program", label: "Program Management", icon: IconClipboardData },
      { path: "/controls", label: "Security & Audit", icon: IconLogs },
    ],
    case_manager: [
      { path: "/case", label: "Case Management", icon: IconHeartHandshake },
      { path: "/program", label: "Program Management", icon: IconListDetails },
      { path: "/resource", label: "Resource Allocation", icon: IconChartBar },
      { path: "/controls", label: "Security & Audit", icon: IconLogs },
    ],
    head: [
      { path: "/case", label: "Case Management", icon: IconHeartHandshake },
      { path: "/program", label: "Program Management", icon: IconListDetails },
      { path: "/resource", label: "Resource Allocation", icon: IconChartBar },
      { path: "/account", label: "Account Management", icon: IconUsersGroup },
      { path: "/controls", label: "Security & Audit", icon: IconLogs },
    ],
  }

  const navItems = roleNavs[role] || [] // get items based on role

  return (
    <ShadcnSidebar collapsible="offcanvas" {...props}>
      
      {/* ================= HEADER ================= */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/dashboard">
               <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={logo} alt="IDMS" />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
                <span className="font-semibold">IDMSystem</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ================= CONTENT ================= */}
      <SidebarContent>
        {/* Dynamic navigation menu (based on role) */}
        <NavMain items={navItems} />
        <DatePicker />

      </SidebarContent>

      {/* ================= FOOTER ================= */}
      <SidebarFooter>
        {/* User dropdown (profile, account, logout, etc.) */}
        <NavUser user={user.user_metadata} avatar={avatar_url}/>
      </SidebarFooter>

    </ShadcnSidebar>
  )
}
