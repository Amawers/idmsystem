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
	IconLogs,
	IconDashboard,
	IconFolders,
	IconShieldLock,
	IconKey,
	IconPackage,
	IconCircleCheck,
	IconUserCheck,
	IconTarget,
	IconBell
} from "@tabler/icons-react"
import logo from "@/assets/temp_logo.png"
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
    case_manager: [
      { 
        path: "/case", 
        label: "Case Management", 
        icon: IconHeartHandshake,
        items: [
          { path: "/case/dashboard", label: "Dashboard", icon: IconDashboard },
          { path: "/case/management", label: "Management", icon: IconFolders },
        ]
      },
      { 
        path: "/program", 
        label: "Program Management", 
        icon: IconListDetails,
        items: [
          { path: "/program/dashboard", label: "Dashboard", icon: IconDashboard },
          { path: "/program/catalog", label: "Programs", icon: IconFolders },
          { path: "/program/enrollments", label: "Enrollments", icon: IconUsersGroup },
          { path: "/program/service-delivery", label: "Service Delivery", icon: IconClipboardData },
          { path: "/program/partners", label: "Partners", icon: IconHeartHandshake },
        ]
      },
      { 
        path: "/resource", 
        label: "Resource Allocation", 
        icon: IconChartBar,
        items: [
          { path: "/resource/dashboard", label: "Dashboard", icon: IconDashboard },
          { path: "/resource/stock", label: "Stock", icon: IconPackage },
          { path: "/resource/approvals", label: "Approvals", icon: IconCircleCheck },
          { path: "/resource/staff", label: "Staff", icon: IconUserCheck },
          { path: "/resource/programs", label: "Programs", icon: IconFolders },
          { path: "/resource/alerts", label: "Alerts", icon: IconBell },
        ]
      },
      // Security & Audit is hidden for case managers (heads only)
    ],
    head: [
      { 
        path: "/case", 
        label: "Case Management", 
        icon: IconHeartHandshake,
        items: [
          { path: "/case/dashboard", label: "Dashboard", icon: IconDashboard },
          { path: "/case/management", label: "Management", icon: IconFolders },
        ]
      },
      { 
        path: "/program", 
        label: "Program Management", 
        icon: IconListDetails,
        items: [
          { path: "/program/dashboard", label: "Dashboard", icon: IconDashboard },
          { path: "/program/catalog", label: "Programs", icon: IconFolders },
          { path: "/program/enrollments", label: "Enrollments", icon: IconUsersGroup },
          { path: "/program/service-delivery", label: "Service Delivery", icon: IconClipboardData },
          { path: "/program/partners", label: "Partners", icon: IconHeartHandshake },
        ]
      },
      { 
        path: "/resource", 
        label: "Resource Allocation", 
        icon: IconChartBar,
        items: [
          { path: "/resource/dashboard", label: "Dashboard", icon: IconDashboard },
          { path: "/resource/stock", label: "Stock", icon: IconPackage },
          { path: "/resource/approvals", label: "Approvals", icon: IconCircleCheck },
          { path: "/resource/staff", label: "Staff", icon: IconUserCheck },
          { path: "/resource/programs", label: "Programs", icon: IconFolders },
          { path: "/resource/alerts", label: "Alerts", icon: IconBell },
        ]
      },
      { path: "/account", label: "Account Management", icon: IconUsersGroup },
      { 
        path: "/controls", 
        label: "Security & Audit", 
        icon: IconLogs,
        items: [
          { path: "/controls/audit", label: "Audit Trail", icon: IconShieldLock },
          { path: "/controls/permissions", label: "Role Permissions", icon: IconKey },
        ]
      },
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
