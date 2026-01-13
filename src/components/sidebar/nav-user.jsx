import { useState } from "react";
import {
	IconLogout,
	IconUserCircle,
	IconDotsVertical,
} from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import Profile from "@/pages/Profile";

export function NavUser({ user, avatar }) {
	const { isMobile } = useSidebar();
	const logout = useAuthStore((s) => s.logout);
	const role = useAuthStore((s) => s.role);

	const [openDialog, setOpenDialog] = useState(false);

	const roleLabels = {
		social_worker: "Social Worker",
	};

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								{/* AVATAR */}
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage src={avatar} alt={user.name} />
									<AvatarFallback className="rounded-lg">U</AvatarFallback>
								</Avatar>

								{/* USER INFO */}
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">
										{roleLabels[role] || "Social Worker"}
									</span>
									<span className="text-muted-foreground truncate text-xs">
										{user.email}
									</span>
								</div>

								<IconDotsVertical className="ml-auto size-4" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>

						<DropdownMenuContent
							className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
							side={isMobile ? "bottom" : "right"}
							align="end"
							sideOffset={4}
						>
							{/* HEADER */}
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage src={avatar} alt={user.name} />
										<AvatarFallback className="rounded-lg">U</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">{user.name}</span>
										<span className="text-muted-foreground truncate text-xs">
											{user.email}
										</span>
									</div>
								</div>
							</DropdownMenuLabel>

							<DropdownMenuSeparator />

							{/* LINKS */}
							<DropdownMenuGroup>
								<DropdownMenuItem onClick={() => setOpenDialog(true)}>
									<IconUserCircle />
									Account
								</DropdownMenuItem>
							</DropdownMenuGroup>

							<DropdownMenuSeparator />

							{/* LOGOUT */}
							<DropdownMenuItem
								onClick={() => {
									logout();
									toast.success("Account logged out.", {
										icon: <IconLogout className="text-red-500" size={20} />,
									});
								}}
								className="cursor-pointer"
							>
								<IconLogout />
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>

			{/* PROFILE PICTURE UPLOAD DIALOG */}
			<Profile open={openDialog} setOpen={setOpenDialog} />
		</>
	);
}
