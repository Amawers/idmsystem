import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Sidebar() {
	//! NAVIGATION STYLE NOT YET DONE

	// GET CURRENT ROLE FROM AUTH STORE
	// -> This determines which role-specific menu items will be shown
	const { role } = useAuthStore();

	// COMMON NAVIGATION ITEMS (always visible regardless of role)
	//! ITEMS NOT YET FINAL (placeholders for now)
	const commonNav = [
		{ path: "/dashboard", label: "Dashboard" },
		{ path: "/cases", label: "Cases" },
		{ path: "/programs", label: "Programs" },
	];

	// ROLE-SPECIFIC NAVIGATION ITEMS
	// -> Each role gets additional menu items on top of the commonNav
	//! ITEMS NOT YET FINAL (placeholders for now)
	const roleNav = {
		// Admin staff has access to user, resource, and record management
		admin_staff: [
			{ path: "/users", label: "Manage Users" },
			{ path: "/resources", label: "Resources" },
			{ path: "/records", label: "Records" },
		],
		// Case manager can see only their own cases and request features
		case_manager: [
			{ path: "/my-cases", label: "My Cases" },
			{ path: "/requests", label: "Requests" },
		],
		// Head role gets overview, audit, and approval features
		head: [
			{ path: "/overview", label: "Overview" },
			{ path: "/audit-logs", label: "Audit Logs" },
			{ path: "/approve-requests", label: "Approve Requests" },
		],
	};

	// FINAL NAVIGATION ITEMS
	// -> Merge common navigation with role-specific items (if role is valid)
	// -> If role is not found, only show common navigation
	const navItems = [...commonNav, ...(roleNav[role] || [])];

	return (
		<aside className="p-4 w-60 bg-gray-100 h-screen">
			{/* SIDEBAR TITLE */}
			<h2 className="text-lg font-bold mb-4">Menu</h2>

			{/* LOOP THROUGH navItems TO RENDER LINKS */}
			{/* Each item uses its path as the key and links with react-router-dom */}
			<ul>
				{navItems.map((item) => (
					<li key={item.path}>
						<Link
							to={item.path}
							className="block p-2 rounded hover:bg-gray-200"
						>
							{item.label}
						</Link>
					</li>
				))}
			</ul>
		</aside>
	);
}
