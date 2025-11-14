/**
 * @file HiddenCasesManager.jsx
 * @description Component for heads to manage which cases are hidden from specific case managers
 * @module pages/security/HiddenCasesManager
 * 
 * @overview
 * Allows heads to hide sensitive case records from specific case managers.
 * Provides search, filter, and management interface for hidden cases.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { EyeOff, Eye, Plus, Search, Trash2 } from "lucide-react";
import { useHiddenCases } from "@/hooks/useHiddenCases";
import supabase from "@/../config/supabase";
import { toast } from "sonner";

export default function HiddenCasesManager() {
	const { hiddenCases, loading, hideCase, unhideCase, refresh } = useHiddenCases();
	
	const [showHideDialog, setShowHideDialog] = useState(false);
	const [cases, setCases] = useState([]);
	const [users, setUsers] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	
	// Form state for hiding a case
	const [selectedCase, setSelectedCase] = useState("");
	const [selectedUser, setSelectedUser] = useState("");
	const [hideReason, setHideReason] = useState("");
	const [submitting, setSubmitting] = useState(false);
	
	// Search and filter state for case selection
	const [caseSearchTerm, setCaseSearchTerm] = useState("");
	const [caseTypeFilter, setCaseTypeFilter] = useState("all");

	// Helper function to get case name from the cases array
	const getCaseName = (caseId, tableType) => {
		const caseData = cases.find(c => c.id === caseId && c.table_type === tableType);
		return caseData?.identifying_name || "Unknown Case";
	};

	// Load cases and users
	useEffect(() => {
		loadCases();
		loadUsers();
	}, []);

	const loadCases = async () => {
		try {
			// Load from all three case tables with their specific field names
			const [casesResult, ciclCarResult, farResult] = await Promise.all([
				supabase
					.from("case")
					.select("id, identifying_name, identifying_case_type, case_manager")
					.order("identifying_name", { ascending: true }),
				supabase
					.from("ciclcar_case")
					.select("id, profile_name, case_manager")
					.order("profile_name", { ascending: true }),
				supabase
					.from("far_case")
					.select("id, receiving_member, case_manager")
					.order("receiving_member", { ascending: true }),
			]);

			// Check for errors
			if (casesResult.error) throw casesResult.error;
			if (ciclCarResult.error) throw ciclCarResult.error;
			if (farResult.error) throw farResult.error;

			// Combine and normalize field names with table_type property
			const allCases = [
				...(casesResult.data || []).map(c => ({ 
					...c, 
					table_type: "Cases",
					// Keep original field name
				})),
				...(ciclCarResult.data || []).map(c => ({ 
					...c, 
					table_type: "CICL/CAR",
					identifying_name: c.profile_name, // Map to common field
					identifying_case_type: "CICL/CAR", // Default type
				})),
				...(farResult.data || []).map(c => ({ 
					...c, 
					table_type: "Incidence on VAC",
					identifying_name: c.receiving_member, // Map to common field
					identifying_case_type: "FAR", // Default type
				})),
			];

			// Sort by name
			allCases.sort((a, b) => {
				const nameA = a.identifying_name || "";
				const nameB = b.identifying_name || "";
				return nameA.localeCompare(nameB);
			});

			setCases(allCases);
		} catch (err) {
			console.error("Error loading cases:", err);
			toast.error("Failed to load cases");
		}
	};

	const loadUsers = async () => {
		try {
			const { data, error } = await supabase
				.from("profile")
				.select("id, email, full_name")
				.eq("role", "case_manager")
				.eq("status", "active")
				.order("email", { ascending: true });

			if (error) throw error;
			setUsers(data || []);
		} catch (err) {
			console.error("Error loading users:", err);
		}
	};

	const handleHideCase = async () => {
		if (!selectedCase || !selectedUser) {
			toast.error("Please select both a case and a user");
			return;
		}

		// Find the selected case to get its table_type
		const caseData = cases.find(c => c.id === selectedCase);
		if (!caseData) {
			toast.error("Selected case not found");
			return;
		}

		setSubmitting(true);
		const success = await hideCase(selectedCase, selectedUser, caseData.table_type, hideReason);
		setSubmitting(false);

		if (success) {
			setShowHideDialog(false);
			setSelectedCase("");
			setSelectedUser("");
			setHideReason("");
		}
	};

	const handleUnhideCase = async (hiddenCaseId) => {
		if (confirm("Are you sure you want to unhide this case?")) {
			await unhideCase(hiddenCaseId);
		}
	};

	// Filter hidden cases by search term
	const filteredHiddenCases = hiddenCases.filter(hc => {
		const searchLower = searchTerm.toLowerCase();
		const caseName = getCaseName(hc.case_id, hc.table_type);
		const userEmail = hc.hidden_from_user?.email || "";
		const userName = hc.hidden_from_user?.full_name || "";
		
		return (
			caseName.toLowerCase().includes(searchLower) ||
			userEmail.toLowerCase().includes(searchLower) ||
			userName.toLowerCase().includes(searchLower) ||
			hc.table_type.toLowerCase().includes(searchLower)
		);
	});

	// Filter cases for selection dialog (with wildcard search and case type filter)
	const filteredCasesForSelection = cases.filter(c => {
		// Search filter - supports wildcard with *
		const searchLower = caseSearchTerm.toLowerCase().trim();
		const caseName = (c.identifying_name || "").toLowerCase();
		const caseManager = (c.case_manager || "").toLowerCase();
		
		let matchesSearch = true;
		if (searchLower) {
			if (searchLower.includes('*')) {
				// Wildcard search - convert * to regex
				const pattern = searchLower.replace(/\*/g, '.*');
				const regex = new RegExp(pattern, 'i');
				matchesSearch = regex.test(caseName) || regex.test(caseManager);
			} else {
				// Regular contains search
				matchesSearch = caseName.includes(searchLower) || caseManager.includes(searchLower);
			}
		}
		
		// Case type filter
		const matchesCaseType = caseTypeFilter === "all" || c.table_type === caseTypeFilter;
		
		return matchesSearch && matchesCaseType;
	});

	// Define available table types
	const tableTypes = ["Cases", "CICL/CAR", "Incidence on VAC"];

	return (
		<div className="space-y-4">
			{/* Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<EyeOff className="h-5 w-5" />
								Hidden Cases Management
							</CardTitle>
							<CardDescription>
								Hide sensitive case records from specific case managers
							</CardDescription>
						</div>
						<Button onClick={() => setShowHideDialog(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Hide Case
						</Button>
					</div>
				</CardHeader>
			</Card>

			{/* Hidden Cases List */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">
							Currently Hidden Cases ({filteredHiddenCases.length})
						</CardTitle>
						<div className="relative w-64">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="text-center py-8 text-muted-foreground">
							Loading hidden cases...
						</div>
					) : filteredHiddenCases.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							{searchTerm ? "No hidden cases match your search" : "No cases are currently hidden"}
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Case Name</TableHead>
										<TableHead>Case Type</TableHead>
										<TableHead>Hidden From</TableHead>
										<TableHead>Reason</TableHead>
										<TableHead>Hidden At</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredHiddenCases.map((hc) => (
										<TableRow key={hc.id}>
											<TableCell className="font-medium">
												{getCaseName(hc.case_id, hc.table_type)}
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{hc.table_type}
												</Badge>
											</TableCell>
											<TableCell>
												<div>
													<p className="text-sm font-medium">
														{hc.hidden_from_user?.full_name || "Unknown"}
													</p>
													<p className="text-xs text-muted-foreground">
														{hc.hidden_from_user?.email}
													</p>
												</div>
											</TableCell>
											<TableCell className="max-w-xs">
												<p className="text-sm truncate">
													{hc.reason || <span className="text-muted-foreground italic">No reason provided</span>}
												</p>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{new Date(hc.hidden_at).toLocaleDateString()}
											</TableCell>
											<TableCell className="text-right">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleUnhideCase(hc.id)}
												>
													<Eye className="mr-2 h-4 w-4" />
													Unhide
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Hide Case Dialog */}
			<Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Hide Case from User</DialogTitle>
						<DialogDescription>
							Select a case and a case manager to hide this sensitive record from their view
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{/* Search and Filter for Cases */}
						<div className="space-y-2">
							<Label>Search Cases</Label>
							<div className="flex gap-2">
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search by name or case manager (use * for wildcard)..."
										value={caseSearchTerm}
										onChange={(e) => setCaseSearchTerm(e.target.value)}
										className="pl-10"
									/>
								</div>
								<Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
									<SelectTrigger className="w-[200px]">
										<SelectValue placeholder="Filter by table..." />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Tables</SelectItem>
										{tableTypes.map((type) => (
											<SelectItem key={type} value={type}>
												{type}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<p className="text-xs text-muted-foreground">
								Tip: Use * as wildcard (e.g., "John*" or "*Smith") • Showing {filteredCasesForSelection.length} of {cases.length} cases
							</p>
						</div>

						<div className="space-y-2">
							<Label>Select Case *</Label>
							<Select value={selectedCase} onValueChange={setSelectedCase}>
								<SelectTrigger>
									<SelectValue placeholder="Choose a case..." />
								</SelectTrigger>
								<SelectContent className="max-h-[300px]">
									{filteredCasesForSelection.length === 0 ? (
										<div className="p-4 text-sm text-muted-foreground text-center">
											No cases found matching your search
										</div>
									) : (
										filteredCasesForSelection.map((c) => (
											<SelectItem key={c.id} value={c.id}>
												<span className="font-medium">[{c.table_type}]</span> {c.identifying_name || "Unnamed Case"}
												{c.case_manager && <span className="text-muted-foreground"> • CM: {c.case_manager}</span>}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Hide From (Case Manager) *</Label>
							<Select value={selectedUser} onValueChange={setSelectedUser}>
								<SelectTrigger>
									<SelectValue placeholder="Choose a case manager..." />
								</SelectTrigger>
								<SelectContent>
									{users.map((u) => (
										<SelectItem key={u.id} value={u.id}>
											{u.full_name || u.email} ({u.email})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Reason (Optional)</Label>
							<Textarea
								placeholder="Why is this case being hidden? (optional)"
								value={hideReason}
								onChange={(e) => setHideReason(e.target.value)}
								rows={3}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setShowHideDialog(false);
								setSelectedCase("");
								setSelectedUser("");
								setHideReason("");
							}}
							disabled={submitting}
						>
							Cancel
						</Button>
						<Button onClick={handleHideCase} disabled={submitting}>
							{submitting ? "Hiding..." : "Hide Case"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
