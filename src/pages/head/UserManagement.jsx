// =============================================
// User Management Page
// ---------------------------------------------
// Purpose: Main page for heads to manage user accounts.
// Displays user list with search, filter, sort, and CRUD operations.
//
// Features:
// - View all users in a data table
// - Search by email or role
// - Filter by status (all/active/inactive/banned)
// - Sort by various columns
// - Create new users
// - Edit existing users
// - Ban/unban users
// - Pagination support
// - Responsive design
//
// Access: Head role only (enforced by ProtectedRoute in App.jsx)
//
// Dependencies:
// - useUserManagementStore: State management for users
// - CreateUserDialog: Dialog for creating users
// - EditUserDialog: Dialog for editing users
// - BanUserDialog: Dialog for banning/unbanning users
// - shadcn/ui components
//
// Example Usage:
// ```jsx
// // In App.jsx
// <Route
//   path="/account"
//   element={
//     <ProtectedRoute allowedRoles={["head"]}>
//       <Layout>
//         <UserManagement />
//       </Layout>
//     </ProtectedRoute>
//   }
// />
// ```
// =============================================

import { useEffect, useState } from "react";
import { useUserManagementStore } from "@/store/useUserManagementStore";
import { CreateUserDialog } from "@/components/user-management/CreateUserDialog";
import { EditUserDialog } from "@/components/user-management/EditUserDialog";
import { BanUserDialog } from "@/components/user-management/BanUserDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	UserPlus,
	Search,
	MoreVertical,
	Edit,
	Ban,
	CheckCircle,
	Loader2,
	Users,
	UserCheck,
	UserX,
	ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
	const {
		users,
		loading,
		error,
		fetchUsers,
		getFilteredUsers,
		setSearchQuery,
		setStatusFilter,
		searchQuery,
		statusFilter,
	} = useUserManagementStore();

	// Dialog states
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editUser, setEditUser] = useState(null);
	const [banAction, setBanAction] = useState(null);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// Fetch users on mount
	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	// Show error toast if error occurs
	useEffect(() => {
		if (error) {
			toast.error("Error loading users", {
				description: error,
			});
		}
	}, [error]);

	// Get filtered users
	const filteredUsers = getFilteredUsers();

	// Pagination calculations
	const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

	// Reset to page 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, statusFilter]);

	// Statistics
	const stats = {
		total: users.length,
		active: users.filter((u) => u.status === "active").length,
		inactive: users.filter((u) => u.status === "inactive").length,
		banned: users.filter((u) => u.status === "banned").length,
	};

	// Handle search
	const handleSearch = (e) => {
		setSearchQuery(e.target.value);
	};

	// Handle status filter
	const handleStatusFilter = (value) => {
		setStatusFilter(value);
	};

	// Format date
	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Get status badge
	const getStatusBadge = (status) => {
		const variants = {
			active: "bg-green-500/10 text-green-700 border-green-200",
			inactive: "bg-gray-500/10 text-gray-700 border-gray-200",
			banned: "bg-red-500/10 text-red-700 border-red-200",
		};

		return (
			<Badge variant="outline" className={variants[status] || ""}>
				{status}
			</Badge>
		);
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">User Management</h1>
					<p className="text-muted-foreground mt-1">
						Manage case manager and head accounts
					</p>
				</div>
				<Button onClick={() => setCreateDialogOpen(true)}>
					<UserPlus className="mr-2 h-4 w-4" />
					Create User
				</Button>
			</div>

			{/* Statistics Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active</CardTitle>
						<UserCheck className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{stats.active}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Inactive</CardTitle>
						<UserX className="h-4 w-4 text-gray-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Banned</CardTitle>
						<ShieldAlert className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{stats.banned}</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters and Search */}
			<Card>
				<CardHeader>
					<CardTitle>User List</CardTitle>
					<CardDescription>
						Search and filter user accounts
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col md:flex-row gap-4 mb-4">
						{/* Search */}
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by email or role..."
								value={searchQuery}
								onChange={handleSearch}
								className="pl-9"
							/>
						</div>

						{/* Status Filter */}
						<Select value={statusFilter} onValueChange={handleStatusFilter}>
							<SelectTrigger className="w-full md:w-[180px]">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
								<SelectItem value="banned">Banned</SelectItem>
							</SelectContent>
						</Select>

						{/* Refresh Button */}
						<Button
							variant="outline"
							onClick={() => fetchUsers()}
							disabled={loading}
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Refresh"
							)}
						</Button>
					</div>

					{/* Table */}
					{loading && users.length === 0 ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : (
						<>
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Email</TableHead>
											<TableHead>Role</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Created</TableHead>
											<TableHead>Last Updated</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paginatedUsers.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={6}
													className="text-center text-muted-foreground py-8"
												>
													No users found
												</TableCell>
											</TableRow>
										) : (
											paginatedUsers.map((user) => (
												<TableRow key={user.id}>
													<TableCell className="font-medium">
														{user.email}
													</TableCell>
													<TableCell>
														<Badge variant="outline" className="capitalize">
															{user.role?.replace("_", " ")}
														</Badge>
													</TableCell>
													<TableCell>{getStatusBadge(user.status)}</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{formatDate(user.created_at)}
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{formatDate(user.updated_at)}
													</TableCell>
													<TableCell className="text-right">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button variant="ghost" size="icon">
																	<MoreVertical className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuLabel>Actions</DropdownMenuLabel>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	onClick={() => setEditUser(user)}
																>
																	<Edit className="mr-2 h-4 w-4" />
																	Edit User
																</DropdownMenuItem>
																{user.status === "banned" ? (
																	<DropdownMenuItem
																		onClick={() =>
																			setBanAction({
																				user,
																				action: "unban",
																			})
																		}
																	>
																		<CheckCircle className="mr-2 h-4 w-4" />
																		Unban User
																	</DropdownMenuItem>
																) : (
																	<DropdownMenuItem
																		onClick={() =>
																			setBanAction({
																				user,
																				action: "ban",
																			})
																		}
																		className="text-destructive"
																	>
																		<Ban className="mr-2 h-4 w-4" />
																		Ban User
																	</DropdownMenuItem>
																)}
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between mt-4">
									<p className="text-sm text-muted-foreground">
										Showing {startIndex + 1} to{" "}
										{Math.min(endIndex, filteredUsers.length)} of{" "}
										{filteredUsers.length} users
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
											disabled={currentPage === 1}
										>
											Previous
										</Button>
										<span className="flex items-center px-3 text-sm">
											Page {currentPage} of {totalPages}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setCurrentPage((p) => Math.min(totalPages, p + 1))
											}
											disabled={currentPage === totalPages}
										>
											Next
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Dialogs */}
			<CreateUserDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={() => fetchUsers()}
			/>

			<EditUserDialog
				open={!!editUser}
				onOpenChange={(open) => !open && setEditUser(null)}
				user={editUser}
				onSuccess={() => fetchUsers()}
			/>

			<BanUserDialog
				open={!!banAction}
				onOpenChange={(open) => !open && setBanAction(null)}
				user={banAction?.user}
				action={banAction?.action}
				onSuccess={() => fetchUsers()}
			/>
		</div>
	);
}
