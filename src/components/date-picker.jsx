/**
 * Sidebar date picker.
 *
 * Lightweight wrapper around the shared `Calendar` UI component, styled to match
 * the sidebar layout.
 */

import { Calendar } from "@/components/ui/calendar";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";

/**
 * Render a calendar inside a sidebar group.
 * @returns {import('react').ReactElement}
 */
export function DatePicker() {
	return (
		<SidebarGroup className="px-0">
			<SidebarGroupContent>
				<Calendar className="[&_[role=gridcell].bg-accent]:bg-sidebar-primary [&_[role=gridcell].bg-accent]:text-sidebar-primary-foreground [&_[role=gridcell]]:w-[32px]" />
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
