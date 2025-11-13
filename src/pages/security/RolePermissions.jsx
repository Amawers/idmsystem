/**
 * @file RolePermissions.jsx
 * @description User Permission Management - Configure what each user can do
 * @module pages/security/RolePermissions
 * 
 * @overview
 * This component allows heads to manage individual user permissions.
 * Unlike role-based access control, permissions are granted per user.
 * Changes are staged and can be saved in batch.
 * 
 * @dependencies
 * - Supabase for user list and permission data
 * - auditLog for tracking permission changes
 */

import React, { useState, useEffect } from "react";
import supabase from "@/../config/supabase";
import { useAuthStore } from "@/store/authStore";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
	AlertCircle,
	Shield,
	Save,
	Lock,
	Unlock,
	Search,
	UserCog,
} from "lucide-react";
import { toast } from "sonner";

export default function RolePermissions() {
	// ================= STATE MANAGEMENT =================
	const currentUser = useAuthStore((state) => state.user);
	
	const [permissions, setPermissions] = useState([]);
	const [userPermissions, setUserPermissions] = useState({});
	const [permissionsLoading, setPermissionsLoading] = useState(true);
	const [permissionsError, setPermissionsError] = useState(null);

	const [users, setUsers] = useState([]);
	const [usersLoading, setUsersLoading] = useState(true);
	const [selectedUser, setSelectedUser] = useState(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [pendingChanges, setPendingChanges] = useState({});
	const [saving, setSaving] = useState(false);

	// ================= LOAD DATA FROM DATABASE =================
	useEffect(() => {
		loadPermissions();
		loadUsers();
		loadUserPermissions();
	}, []);

	// Fetch all available permissions
	const loadPermissions = async () => {
		try {
			setPermissionsLoading(true);
			const { data, error } = await supabase
				.from("permissions")
				.select("*")
				.order("category", { ascending: true })
				.order("display_name", { ascending: true });

			if (error) throw error;
			setPermissions(data || []);
			setPermissionsError(null);
		} catch (err) {
			console.error("Error loading permissions:", err);
			setPermissionsError(err.message);
		} finally {
			setPermissionsLoading(false);
		}
	};

	// Fetch all users from profile table
	const loadUsers = async () => {
		try {
			setUsersLoading(true);
			const { data, error } = await supabase
				.from("profile")
				.select("id, email, role, status")
				.order("email", { ascending: true });

			if (error) throw error;
			setUsers(data || []);
		} catch (err) {
			console.error("Error loading users:", err);
		} finally {
			setUsersLoading(false);
		}
	};

	// Fetch all user permissions with permission details
	const loadUserPermissions = async () => {
		try {
			const { data, error } = await supabase
				.from("user_permissions")
				.select(`
					id,
					user_id,
					permission_id,
					granted_at,
					granted_by,
					permissions:permission_id (
						id,
						name,
						display_name,
						description,
						category
					)
				`);

			if (error) throw error;

			// Organize by user_id
			const permsByUser = {};
			(data || []).forEach((up) => {
				if (!permsByUser[up.user_id]) {
					permsByUser[up.user_id] = [];
				}
				permsByUser[up.user_id].push(up);
			});
			setUserPermissions(permsByUser);
		} catch (err) {
			console.error("Error loading user permissions:", err);
		}
	};

	// ================= FILTERING =================
	const filteredUsers = users.filter((user) => {
		// Only show case managers, not heads
		if (user.role !== "case_manager") return false;
		
		const matchesSearch =
			user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.role?.toLowerCase().includes(searchTerm.toLowerCase());
		return matchesSearch;
	});

	// ================= PERMISSION HELPERS =================
	// HEAD-ONLY permissions that cannot be assigned to case managers
	const HEAD_ONLY_PERMISSIONS = [
		'update_inventory_stock',
		'create_inventory_item',
		'approve_resource_request',
		'reject_resource_request',
		'manage_staff_assignment'
	];

	// Group permissions by category
	const groupedPermissions = permissions.reduce((acc, perm) => {
		if (!acc[perm.category]) {
			acc[perm.category] = [];
		}
		acc[perm.category].push(perm);
		return acc;
	}, {});

	// Check if a permission can be assigned to the selected user
	const canAssignPermission = (permissionName) => {
		if (!selectedUser) return false;
		
		// If user is a head, they already have all permissions by default
		if (selectedUser.role === 'head') return false;
		
		// Case managers cannot be assigned HEAD-ONLY permissions
		if (selectedUser.role === 'case_manager' && HEAD_ONLY_PERMISSIONS.includes(permissionName)) {
			return false;
		}
		
		return true;
	};

	// Check if a permission is currently enabled for the selected user
	const isPermissionEnabled = (permissionId) => {
		if (!selectedUser) return false;

		// Check if there's a pending change
		const changeKey = `${selectedUser.id}_${permissionId}`;
		if (pendingChanges[changeKey] !== undefined) {
			return pendingChanges[changeKey];
		}

		// Otherwise check the current state
		const userPerms = userPermissions[selectedUser.id] || [];
		return userPerms.some((up) => up.permission_id === permissionId);
	};

	// Toggle permission (staged)
	const togglePermission = (permissionId, permissionName, currentState) => {
		if (!selectedUser) return;
		
		// Prevent toggling HEAD-ONLY permissions for case managers
		if (!canAssignPermission(permissionName)) {
			toast.error("This permission can only be assigned to heads");
			return;
		}

		const key = `${selectedUser.id}_${permissionId}`;
		const newState = !currentState;

		setPendingChanges((prev) => ({
			...prev,
			[key]: newState,
		}));
	};

	// ================= SAVE/DISCARD CHANGES =================
	const saveChanges = async () => {
		if (!selectedUser || Object.keys(pendingChanges).length === 0) {
			toast.info("No changes to save");
			return;
		}

		setSaving(true);

		try {
			const changes = [];
			const grantsToAdd = [];
			const grantsToRemove = [];

			// Process each pending change
			for (const [key, shouldGrant] of Object.entries(pendingChanges)) {
				const [userId, permissionId] = key.split("_");
				const permission = permissions.find((p) => p.id === permissionId);

				changes.push({
					action: shouldGrant ? "granted" : "revoked",
					user: selectedUser.email,
					permission: permission?.display_name,
				});

				if (shouldGrant) {
					// Add permission
					grantsToAdd.push({
						user_id: userId,
						permission_id: permissionId,
						granted_by: currentUser.id,
					});
				} else {
					// Remove permission - need to find the existing record
					const existingPerm = userPermissions[userId]?.find(
						(up) => up.permission_id === permissionId
					);
					if (existingPerm) {
						grantsToRemove.push(existingPerm.id);
					}
				}
			}

			// Execute database operations
			if (grantsToAdd.length > 0) {
				const { error: insertError } = await supabase
					.from("user_permissions")
					.insert(grantsToAdd);
				if (insertError) throw insertError;
			}

			if (grantsToRemove.length > 0) {
				const { error: deleteError } = await supabase
					.from("user_permissions")
					.delete()
					.in("id", grantsToRemove);
				if (deleteError) throw deleteError;
			}

			// Create audit log entries for each change
			for (const change of changes) {
				await createAuditLog({
					actionType:
						change.action === "granted"
							? AUDIT_ACTIONS.GRANT_PERMISSION
							: AUDIT_ACTIONS.REVOKE_PERMISSION,
					actionCategory: AUDIT_CATEGORIES.PERMISSION,
					description: `${change.action === "granted" ? "Granted" : "Revoked"} permission "${change.permission}" ${change.action === "granted" ? "to" : "from"} user ${change.user}`,
					resourceType: "user_permission",
					resourceId: selectedUser.id,
					metadata: {
						targetUser: change.user,
						permission: change.permission,
						action: change.action,
					},
					severity: "warning",
				});
			}

			// Reload user permissions to reflect changes
			await loadUserPermissions();

			toast.success(
				`Permissions updated successfully! (${changes.length} ${changes.length === 1 ? "change" : "changes"})`
			);
			setPendingChanges({});
		} catch (err) {
			console.error("Error saving permissions:", err);
			toast.error("Failed to save permissions. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const discardChanges = () => {
		setPendingChanges({});
		toast.info("Changes discarded");
	};

	// ================= CATEGORY STYLING =================
	const getCategoryInfo = (category) => {
		const info = {
			case: { label: "Case Management", color: "bg-blue-100 text-blue-700" },
			user: { label: "User Management", color: "bg-purple-100 text-purple-700" },
			system: { label: "System & Security", color: "bg-red-100 text-red-700" },
			report: { label: "Reports & Analytics", color: "bg-green-100 text-green-700" },
			resource: { label: "Resource Management", color: "bg-yellow-100 text-yellow-700" },
			program: { label: "Program Management", color: "bg-pink-100 text-pink-700" },
		};
		return info[category] || { label: category, color: "bg-gray-100 text-gray-700" };
	};

	const hasPendingChanges = Object.keys(pendingChanges).length > 0;

	// ================= RENDER =================
	return (
		<>
			{/* ================= HEADER ================= */}
			<div className="flex items-center justify-between px-4 lg:px-6 pb-4">
				<div>
					<h2 className="text-base font-bold tracking-tight">
						User Permission Management
					</h2>
					<p className="text-muted-foreground text-[11px]">
						Configure individual permissions for each user
					</p>
				</div>
			</div>

			{/* ================= MAIN CONTENT ================= */}
			<div className="px-4 lg:px-6 space-y-4">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
					{/* ================= USER LIST (LEFT PANEL) ================= */}
					<Card className="lg:col-span-1">
						<CardHeader>
							<CardTitle className="text-lg flex items-center gap-2">
								<UserCog className="h-5 w-5" />
								Users
							</CardTitle>
							<CardDescription>Select a user to manage permissions</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Search */}
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search users..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>

							{/* User List */}
							<div className="border rounded-lg divide-y overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 400px)' }}>
								{usersLoading ? (
									<div className="p-4 space-y-2">
										{[...Array(5)].map((_, i) => (
											<Skeleton key={i} className="h-12 w-full" />
										))}
									</div>
								) : filteredUsers.length === 0 ? (
									<div className="p-4 text-sm text-muted-foreground text-center">
										No users found
									</div>
								) : (
									filteredUsers.map((user) => (
										<button
											key={user.id}
											onClick={() => {
												setSelectedUser(user);
												setPendingChanges({});
											}}
											className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
												selectedUser?.id === user.id ? "bg-muted" : ""
											}`}
										>
											<div className="font-medium text-sm">{user.email}</div>
											<Badge variant="secondary" className="mt-1 text-xs">
												{user.role === "head" ? "Head" : "Case Manager"}
											</Badge>
										</button>
									))
								)}
							</div>
						</CardContent>
					</Card>

					{/* ================= PERMISSIONS PANEL (RIGHT) ================= */}
					<Card className="lg:col-span-2">
						<CardHeader>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Shield className="h-5 w-5" />
									<CardTitle className="text-lg">Permissions</CardTitle>
								</div>
							{hasPendingChanges && (
								<Badge variant="outline" className="border-orange-500 text-orange-600">
									{Object.keys(pendingChanges).length} unsaved change{Object.keys(pendingChanges).length !== 1 ? "s" : ""}
								</Badge>
							)}
							</div>
							{selectedUser ? (
								<CardDescription>
									Managing permissions for: <strong>{selectedUser.email}</strong>
								</CardDescription>
							) : (
								<CardDescription>Select a user from the list to manage permissions</CardDescription>
							)}
						</CardHeader>
						<CardContent className="pb-0">
							{!selectedUser ? (
								<div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
									<UserCog className="h-12 w-12 mb-4 opacity-50" />
									<p>Select a user from the list to view and manage their permissions</p>
								</div>
							) : permissionsLoading ? (
								<div className="space-y-2">
									{[...Array(5)].map((_, i) => (
										<Skeleton key={i} className="h-12 w-full" />
									))}
								</div>
							) : permissionsError ? (
								<div className="flex items-center justify-center p-8 text-destructive">
									<AlertCircle className="h-5 w-5 mr-2" />
									Failed to load permissions. Please try again.
								</div>
							) : (
								<>
									<div className="space-y-6 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 400px)' }}>
										{/* Permissions by Category */}
										{Object.entries(groupedPermissions).map(([category, perms]) => {
										const categoryInfo = getCategoryInfo(category);
										return (
											<div key={category} className="space-y-3">
												<div className={`px-3 py-2 rounded-md ${categoryInfo.color}`}>
													<h4 className="font-medium text-sm">
														{categoryInfo.label}
													</h4>
												</div>
												<div className="border rounded-lg overflow-hidden">
													<Table>
														<TableHeader>
															<TableRow>
																<TableHead className="w-12">Enabled</TableHead>
																<TableHead>Permission</TableHead>
																<TableHead>Description</TableHead>
																<TableHead className="w-24 text-right">
																	Status
																</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{perms.map((perm) => {
																const isEnabled = isPermissionEnabled(perm.id);
																const isChanged =
																	pendingChanges[
																		`${selectedUser.id}_${perm.id}`
																	] !== undefined;
																const isHeadOnly = HEAD_ONLY_PERMISSIONS.includes(perm.name);
																const canAssign = canAssignPermission(perm.name);
																const isDisabled = !canAssign || selectedUser?.role === 'head';

																return (
																	<TableRow key={perm.id} className={isHeadOnly && selectedUser?.role === 'case_manager' ? 'opacity-50' : ''}>
																		<TableCell>
																			<Checkbox
																				checked={isEnabled}
																				disabled={isDisabled}
																				onCheckedChange={() =>
																					togglePermission(
																						perm.id,
																						perm.name,
																						isEnabled
																					)
																				}
																			/>
																		</TableCell>
																		<TableCell className="font-medium">
																			{perm.display_name}
																			{isHeadOnly && selectedUser?.role === 'case_manager' && (
																				<Badge variant="secondary" className="ml-2 text-xs">
																					<Shield className="h-3 w-3 mr-1" />
																					Head Only
																				</Badge>
																			)}
																		</TableCell>
																		<TableCell className="text-sm text-muted-foreground">
																			{perm.description}
																		</TableCell>
																		<TableCell className="text-right">
																			{selectedUser?.role === 'head' ? (
																				<Badge
																					variant="outline"
																					className="border-blue-500 text-blue-600"
																				>
																					<Shield className="h-3 w-3 mr-1" />
																					Default
																				</Badge>
																			) : isChanged ? (
																				<Badge
																					variant="outline"
																					className="border-orange-500 text-orange-600"
																				>
																					Modified
																				</Badge>
																			) : isEnabled ? (
																				<Badge
																					variant="outline"
																					className="border-green-500 text-green-600"
																				>
																					<Unlock className="h-3 w-3 mr-1" />
																					Granted
																				</Badge>
																			) : (
																				<Badge variant="secondary">
																					<Lock className="h-3 w-3 mr-1" />
																					Denied
																				</Badge>
																			)}
																		</TableCell>
																	</TableRow>
																);
															})}
														</TableBody>
													</Table>
												</div>
											</div>
										);
									})}
									</div>

									{/* ================= ACTION BUTTONS ================= */}
									{hasPendingChanges && (
										<div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t">
											<Button
												variant="outline"
												onClick={discardChanges}
												disabled={saving}
											>
												Discard Changes
											</Button>
											<Button onClick={saveChanges} disabled={saving}>
												<Save className="h-4 w-4 mr-2" />
												{saving ? "Saving..." : "Save Changes"}
											</Button>
										</div>
									)}
								</>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	);
}