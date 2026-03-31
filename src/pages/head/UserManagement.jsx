/**
 * User Management page.
 *
 * Responsibilities:
 * - Fetch and display user accounts from Supabase `profile`.
 * - Provide client-side search, filtering, and pagination.
 * - Route all user-management mutations through one page-level source of truth.
 * - Keep UI dialogs focused on form UX while this page owns data operations.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";
import {
	createAuditLog,
	AUDIT_ACTIONS,
	AUDIT_CATEGORIES,
} from "@/lib/auditLog";

const ITEMS_PER_PAGE = 10;

/**
 * @typedef {"active"|"inactive"|"banned"} UserStatus
 */

/**
 * @typedef {Object} ManagedUser
 * @property {string} id
 * @property {string} email
 * @property {string} full_name
 * @property {string} role
 * @property {UserStatus} status
 * @property {string | null} created_at
 * @property {string | null} updated_at
 * @property {string | null} banned_at
 * @property {string | null} banned_by
 */

/**
 * Normalize profile status for consistent UI behavior.
 * @param {unknown} status
 * @returns {UserStatus}
 */
const normalizeStatus = (status) => {
	if (!status) return "active";

	const value = String(status).trim().toLowerCase();
	if (value === "inactive" || value === "banned") return value;
	return "active";
};

/**
 * Convert a profile row into the shape expected by the page.
 * @param {Record<string, any>} row
 * @returns {ManagedUser}
 */
const normalizeUserRow = (row) => ({
	id: row.id,
	email: row.email || "N/A",
	full_name: row.full_name || "",
	role: row.role || "social_worker",
	status: normalizeStatus(row.status),
	created_at: row.created_at || null,
	updated_at: row.updated_at || null,
	banned_at: row.banned_at || null,
	banned_by: row.banned_by || null,
});

/**
 * Format an ISO timestamp for display.
 * @param {string | undefined | null} dateString
 * @returns {string}
 */
const formatDate = (dateString) => {
	if (!dateString) return "N/A";
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

/**
 * Render a user status badge.
 * @param {UserStatus} status
 * @returns {JSX.Element}
 */
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

/**
 * Head-only user management view.
 * @returns {JSX.Element}
 */
export default function UserManagement() {
	const signup = useAuthStore((state) => state.signup);
	const initializeAuth = useAuthStore((state) => state.initialize);
	const currentUser = useAuthStore((state) => state.user);

	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [mutationLoading, setMutationLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);

	// Dialog state
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editUser, setEditUser] = useState(null);
	const [banAction, setBanAction] = useState(null);

	const fetchUsers = useCallback(async () => {
		setLoading(true);

		try {
			const { data, error } = await supabase
				.from("profile")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) {
				throw new Error(error.message || "Failed to load users.");
			}

			const normalized = (data || [])
				.map(normalizeUserRow)
				.filter((user) => user.role === "social_worker");

			setUsers(normalized);
		} catch (error) {
			toast.error("Failed to load users", {
				description:
					error instanceof Error
						? error.message
						: "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, statusFilter]);

	const filteredUsers = useMemo(() => {
		const search = searchQuery.trim().toLowerCase();

		return users.filter((user) => {
			const matchesStatus =
				statusFilter === "all" || user.status === statusFilter;
			const matchesSearch =
				!search ||
				user.email.toLowerCase().includes(search) ||
				user.full_name.toLowerCase().includes(search) ||
				user.role.replace(/_/g, " ").toLowerCase().includes(search);

			return matchesStatus && matchesSearch;
		});
	}, [users, searchQuery, statusFilter]);

	const stats = useMemo(() => {
		return {
			total: users.length,
			active: users.filter((user) => user.status === "active").length,
			inactive: users.filter((user) => user.status === "inactive").length,
			banned: users.filter((user) => user.status === "banned").length,
		};
	}, [users]);

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
	}, [filteredUsers.length]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const fromCount = filteredUsers.length === 0 ? 0 : startIndex + 1;
	const toCount =
		filteredUsers.length === 0
			? 0
			: Math.min(endIndex, filteredUsers.length);

	const paginatedUsers = useMemo(() => {
		return filteredUsers.slice(startIndex, endIndex);
	}, [filteredUsers, startIndex, endIndex]);

	const restorePreviousSession = useCallback(
		async (previousSession, previousUserId) => {
			if (!previousUserId) {
				return { restored: true };
			}

			const {
				data: { session: currentSession },
			} = await supabase.auth.getSession();

			if (currentSession?.user?.id === previousUserId) {
				return { restored: true };
			}

			if (
				!previousSession?.access_token ||
				!previousSession?.refresh_token
			) {
				return {
					restored: false,
					message: "Previous session snapshot is unavailable.",
				};
			}

			const { error } = await supabase.auth.setSession({
				access_token: previousSession.access_token,
				refresh_token: previousSession.refresh_token,
			});

			if (error) {
				return {
					restored: false,
					message:
						error.message || "Unable to restore previous session.",
				};
			}

			await initializeAuth();
			return { restored: true };
		},
		[initializeAuth],
	);

	const handleCreateUser = useCallback(
		async ({ fullName, email, password }) => {
			setMutationLoading(true);

			const previousSession = useAuthStore.getState().session;
			const previousUserId = useAuthStore.getState().user?.id || null;

			try {
				const result = await signup({
					fullName,
					email,
					password,
					role: "social_worker",
				});

				if (!result?.success) {
					throw new Error(result?.message || "Failed to create user.");
				}

				const restoreResult = await restorePreviousSession(
					previousSession,
					previousUserId,
				);

				if (!restoreResult.restored) {
					toast.warning("User created but session restore failed", {
						description:
							restoreResult.message ||
							"Please sign in again to continue.",
					});
				}

				const createdUserId = result?.user?.id || null;

				// await createAuditLog({
				// 	actionType: AUDIT_ACTIONS.CREATE_USER,
				// 	actionCategory: AUDIT_CATEGORIES.USER,
				// 	description: `Created user account for ${email}`,
				// 	resourceType: "user",
				// 	resourceId: createdUserId,
				// 	metadata: {
				// 		fullName,
				// 		email,
				// 		role: "social_worker",
				// 		status: "active",
				// 	},
				// 	severity: "info",
				// });

				await fetchUsers();

				return {
					userId: createdUserId,
					password,
				};
			} catch (error) {
				throw new Error(
					error instanceof Error
						? error.message
						: "Failed to create user.",
				);
			} finally {
				setMutationLoading(false);
			}
		},
		[fetchUsers, restorePreviousSession, signup],
	);

	const updateUserStatus = useCallback(
		async (user, nextStatus, actionType) => {
			if (!user?.id) {
				throw new Error("User record is missing.");
			}

			if (user.id === currentUser?.id && nextStatus !== "active") {
				throw new Error(
					"You cannot deactivate or ban your own account while signed in.",
				);
			}

			setMutationLoading(true);

			try {
				const payload = {
					status: nextStatus,
					banned_at:
						nextStatus === "banned"
							? new Date().toISOString()
							: null,
					banned_by:
						nextStatus === "banned"
							? currentUser?.id || null
							: null,
				};

				const { error } = await supabase
					.from("profile")
					.update(payload)
					.eq("id", user.id);

				if (error) {
					throw new Error(error.message || "Failed to update user.");
				}

				const actionDescription =
					actionType === AUDIT_ACTIONS.BAN_USER
						? `Banned user account ${user.email}`
						: actionType === AUDIT_ACTIONS.UNBAN_USER
							? `Unbanned user account ${user.email}`
							: `Updated user account ${user.email} status to ${nextStatus}`;

				await createAuditLog({
					actionType,
					actionCategory: AUDIT_CATEGORIES.USER,
					description: actionDescription,
					resourceType: "user",
					resourceId: user.id,
					metadata: {
						email: user.email,
						role: user.role,
						oldStatus: user.status,
						newStatus: nextStatus,
					},
					severity: nextStatus === "banned" ? "critical" : "info",
				});

				await fetchUsers();
			} catch (error) {
				throw new Error(
					error instanceof Error
						? error.message
						: "Failed to update user.",
				);
			} finally {
				setMutationLoading(false);
			}
		},
		[currentUser?.id, fetchUsers],
	);

	/**
	 * Update the search query.
	 * @param {import("react").ChangeEvent<HTMLInputElement>} event
	 */
	const handleSearch = (event) => {
		setSearchQuery(event.target.value);
	};

	/**
	 * Update the active status filter.
	 * @param {string} value
	 */
	const handleStatusFilter = (value) => {
		setStatusFilter(value);
	};

	const handleUpdateStatus = useCallback(
		async (user, status) => {
			await updateUserStatus(user, normalizeStatus(status), AUDIT_ACTIONS.UPDATE_USER);
		},
		[updateUserStatus],
	);

	const handleBanAction = useCallback(
		async (user, action) => {
			const nextStatus = action === "ban" ? "banned" : "active";
			const actionType =
				action === "ban"
					? AUDIT_ACTIONS.BAN_USER
					: AUDIT_ACTIONS.UNBAN_USER;

			await updateUserStatus(user, nextStatus, actionType);
		},
		[updateUserStatus],
	);

	return (
		<div className="container mx-auto px-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						User Management
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage social worker accounts
					</p>
				</div>
				<Button onClick={() => setCreateDialogOpen(true)}>
					<UserPlus className="mr-2 h-4 w-4" />
					Create User
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 py-3">
						<CardTitle className="text-sm font-medium">
							Total Users
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="pb-3">
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 py-3">
						<CardTitle className="text-sm font-medium">
							Active
						</CardTitle>
						<UserCheck className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent className="pb-3">
						<div className="text-2xl font-bold text-green-600">
							{stats.active}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 py-3">
						<CardTitle className="text-sm font-medium">
							Inactive
						</CardTitle>
						<UserX className="h-4 w-4 text-gray-600" />
					</CardHeader>
					<CardContent className="pb-3">
						<div className="text-2xl font-bold text-gray-600">
							{stats.inactive}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 py-3">
						<CardTitle className="text-sm font-medium">
							Banned
						</CardTitle>
						<ShieldAlert className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent className="pb-3">
						<div className="text-2xl font-bold text-red-600">
							{stats.banned}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>User List</CardTitle>
					<CardDescription>
						Search and filter user accounts
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col md:flex-row gap-4 mb-4">
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by email or role..."
								value={searchQuery}
								onChange={handleSearch}
								className="pl-9"
							/>
						</div>

						<Select
							value={statusFilter}
							onValueChange={handleStatusFilter}
						>
							<SelectTrigger className="w-full md:w-[180px]">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">
									Inactive
								</SelectItem>
								<SelectItem value="banned">Banned</SelectItem>
							</SelectContent>
						</Select>

						<Button
							variant="outline"
							onClick={fetchUsers}
							disabled={loading || mutationLoading}
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Refresh"
							)}
						</Button>
					</div>

					{loading && users.length === 0 ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : (
						<>
							<div className="rounded-md border">
								<div
									className={
										paginatedUsers.length > 3
											? "max-h-[400px] overflow-y-auto"
											: ""
									}
								>
									<Table>
										<TableHeader className="sticky top-0 bg-background z-10">
											<TableRow>
												<TableHead className="bg-background">
													Email
												</TableHead>
												<TableHead className="bg-background">
													Role
												</TableHead>
												<TableHead className="bg-background">
													Status
												</TableHead>
												<TableHead className="bg-background">
													Created
												</TableHead>
												<TableHead className="bg-background">
													Last Updated
												</TableHead>
												<TableHead className="text-right bg-background">
													Actions
												</TableHead>
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
															<Badge
																variant="outline"
																className="capitalize"
															>
																{user.role.replace(/_/g, " ")}
															</Badge>
														</TableCell>
														<TableCell>
															{getStatusBadge(user.status)}
														</TableCell>
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
																	<DropdownMenuLabel>
																		Actions
																	</DropdownMenuLabel>
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
							</div>

							<div className="flex items-center justify-between mt-4 pt-4 border-t">
								<p className="text-sm text-muted-foreground">
									Showing {fromCount} to {toCount} of {filteredUsers.length} users
								</p>
								{totalPages > 1 && (
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setCurrentPage((page) => Math.max(1, page - 1))
											}
											disabled={
												currentPage === 1 || loading || mutationLoading
											}
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
												setCurrentPage((page) =>
													Math.min(totalPages, page + 1),
												)
											}
											disabled={
												currentPage === totalPages ||
												loading ||
												mutationLoading
											}
										>
											Next
										</Button>
									</div>
								)}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<CreateUserDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onCreateUser={handleCreateUser}
				loading={mutationLoading}
			/>

			<EditUserDialog
				open={Boolean(editUser)}
				onOpenChange={(open) => {
					if (!open) setEditUser(null);
				}}
				user={editUser}
				onUpdateStatus={handleUpdateStatus}
				loading={mutationLoading}
			/>

			<BanUserDialog
				open={Boolean(banAction)}
				onOpenChange={(open) => {
					if (!open) setBanAction(null);
				}}
				user={banAction?.user}
				action={banAction?.action}
				onBanAction={handleBanAction}
				loading={mutationLoading}
			/>
		</div>
	);
}
