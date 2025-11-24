/**
 * @file AuditTrail.jsx
 * @description Audit Trail / Activity Log - Display and filter user actions with real-time updates
 * @module pages/security/AuditTrail
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { WifiOff } from "lucide-react";
import supabase from "@/../config/supabase";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { AUDIT_CATEGORIES, AUDIT_SEVERITY } from "@/lib/auditLog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	RefreshCw,
	Search,
	AlertCircle,
	Shield,
	Info,
	Download,
	Calendar,
	TrendingUp,
	Activity,
	X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AuditTrail() {
	// Filter state
	const [filterState, setFilterState] = useState({
		actionCategory: null,
		severity: null,
		startDate: null,
		endDate: null,
		limit: 10,
		offset: 0,
	});

	// Search and UI state
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedLog, setSelectedLog] = useState(null);
	const [dateRange, setDateRange] = useState("all");
	const [showStats, setShowStats] = useState(true);

	// Use audit logs hook
	const { data, count, loading, error, reload, setFilters } = useAuditLogs(filterState);

	// Online state
	const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

	useEffect(() => {
		const goOnline = () => setIsOnline(true);
		const goOffline = () => setIsOnline(false);

		window.addEventListener("online", goOnline);
		window.addEventListener("offline", goOffline);

		return () => {
			window.removeEventListener("online", goOnline);
			window.removeEventListener("offline", goOffline);
		};
	}, []);

	// Real-time subscription for new audit logs (only when online)
	useEffect(() => {
		if (!isOnline) return;

		const channel = supabase
			.channel("audit_log_changes")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "audit_log",
				},
				(payload) => {
					console.log("New audit log:", payload.new);
					toast.info("New activity detected", {
						description: payload.new.description,
					});
					reload();
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [reload, isOnline]);

	// Handle date range preset changes
	useEffect(() => {
		let startDate = null;
		let endDate = null;

		switch (dateRange) {
			case "today":
				startDate = startOfDay(new Date());
				endDate = endOfDay(new Date());
				break;
			case "week":
				startDate = startOfDay(subDays(new Date(), 7));
				endDate = endOfDay(new Date());
				break;
			case "month":
				startDate = startOfDay(subDays(new Date(), 30));
				endDate = endOfDay(new Date());
				break;
			case "all":
			default:
				startDate = null;
				endDate = null;
				break;
		}

		setFilterState((prev) => ({ ...prev, startDate, endDate, offset: 0 }));
	}, [dateRange]);

	// Apply filters to hook
	useEffect(() => {
		setFilters(filterState);
	}, [filterState, setFilters]);

	// Client-side search filtering
	const filteredData = useMemo(() => {
		if (!searchTerm) return data;

		const search = searchTerm.toLowerCase();
		return data.filter(
			(log) =>
				log.user_email?.toLowerCase().includes(search) ||
				log.action_type?.toLowerCase().includes(search) ||
				log.resource_type?.toLowerCase().includes(search) ||
				log.description?.toLowerCase().includes(search)
		);
	}, [data, searchTerm]);

	// Calculate statistics
	const stats = useMemo(() => {
		if (!data || data.length === 0) {
			return {
				total: 0,
				critical: 0,
				warning: 0,
				info: 0,
				categories: {},
			};
		}

		return {
			total: count || data.length,
			critical: data.filter((log) => log.severity === "critical").length,
			warning: data.filter((log) => log.severity === "warning").length,
			info: data.filter((log) => log.severity === "info").length,
			categories: data.reduce((acc, log) => {
				acc[log.action_category] = (acc[log.action_category] || 0) + 1;
				return acc;
			}, {}),
		};
	}, [data, count]);

	// Pagination
	const totalPages = Math.ceil(count / filterState.limit) || 1;
	const currentPage = Math.floor(filterState.offset / filterState.limit) + 1;

	const nextPage = () => {
		if (currentPage < totalPages) {
			setFilterState((prev) => ({
				...prev,
				offset: prev.offset + prev.limit,
			}));
		}
	};

	const prevPage = () => {
		if (currentPage > 1) {
			setFilterState((prev) => ({
				...prev,
				offset: Math.max(0, prev.offset - prev.limit),
			}));
		}
	};

	const firstPage = () => {
		setFilterState((prev) => ({
			...prev,
			offset: 0,
		}));
	};

	const lastPage = () => {
		const lastOffset = Math.max(0, (totalPages - 1) * filterState.limit);
		setFilterState((prev) => ({
			...prev,
			offset: lastOffset,
		}));
	};

	// Export to CSV
	const exportToCSV = useCallback(() => {
		if (!data || data.length === 0) {
			toast.error("No data to export");
			return;
		}

		const headers = [
			"Timestamp",
			"User Email",
			"Action",
			"Category",
			"Resource Type",
			"Resource ID",
			"Description",
			"Severity",
		];

		const rows = data.map((log) => [
			format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
			log.user_email,
			log.action_type,
			log.action_category,
			log.resource_type || "",
			log.resource_id || "",
			log.description,
			log.severity,
		]);

		const csvContent = [
			headers.join(","),
			...rows.map((row) =>
				row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
			),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`audit_trail_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		toast.success("Audit trail exported successfully");
	}, [data]);

	// Get severity badge variant
	const getSeverityBadge = (severity) => {
		switch (severity) {
			case "critical":
				return <Badge variant="destructive">Critical</Badge>;
			case "warning":
				return <Badge variant="outline" className="border-orange-500 text-orange-600">Warning</Badge>;
			case "info":
			default:
				return <Badge variant="secondary">Info</Badge>;
		}
	};

	// Get category badge color
	const getCategoryBadge = (category) => {
		const variants = {
			auth: "default",
			case: "secondary",
			user: "outline",
			permission: "destructive",
			program: "default",
			partner: "default",
			system: "default",
		};
		return <Badge variant={variants[category] || "default"}>{category}</Badge>;
	};

	const hasNextPage = currentPage < totalPages;
	const hasPrevPage = currentPage > 1;

	// If offline, show a focused offline message and hide controls
	if (!isOnline) {
		return (
			<div className="px-4 lg:px-6 py-12 flex items-center justify-center">
				<div className="max-w-md w-full text-center space-y-4">
					<div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-muted/20">
						<WifiOff className="h-10 w-10 text-muted-foreground" />
					</div>
					<h2 className="text-lg font-semibold">You’re offline</h2>
					<p className="text-sm text-muted-foreground">Audit Trail requires an internet connection.</p>
					<p className="text-sm text-muted-foreground">Viewing will resume automatically when you are back online.</p>
				</div>
			</div>
		);
	}

	return (
		<>
			{/* ================= HEADER ================= */}
			<div className="flex items-center justify-between px-4 lg:px-6 pb-4">
				<div>
					<h2 className="text-base font-bold tracking-tight">Audit Trail</h2>
					<p className="text-muted-foreground text-[11px]">
						Track and monitor all user activities and system events in real-time
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowStats(!showStats)}
					>
						<TrendingUp className="h-4 w-4 mr-2" />
						{showStats ? "Hide" : "Show"} Stats
					</Button>
					<Button variant="outline" size="sm" onClick={exportToCSV} disabled={loading || !data?.length}>
						<Download className="h-4 w-4 mr-2" />
						Export CSV
					</Button>
					<Button variant="outline" size="sm" onClick={reload} disabled={loading}>
						<RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>
			</div>

			{/* ================= ERROR ALERT ================= */}
			{error && (
				<div className="px-4 lg:px-6 mb-4">
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Failed to load audit logs: {error.message || "Unknown error"}
						</AlertDescription>
					</Alert>
				</div>
			)}

			{/* ================= STATISTICS CARDS ================= */}
			{showStats && (
				<div className="px-4 lg:px-6 mb-4">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<Card>
							<CardHeader className="pb-2">
								<CardDescription className="flex items-center gap-2">
									<Activity className="h-4 w-4" />
									Total Activities
								</CardDescription>
								<CardTitle className="text-2xl">{stats.total.toLocaleString()}</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardDescription className="flex items-center gap-2">
									<AlertCircle className="h-4 w-4 text-red-500" />
									Critical
								</CardDescription>
								<CardTitle className="text-2xl text-red-600">{stats.critical}</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardDescription className="flex items-center gap-2">
									<AlertCircle className="h-4 w-4 text-orange-500" />
									Warning
								</CardDescription>
								<CardTitle className="text-2xl text-orange-600">{stats.warning}</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader className="pb-2">
								<CardDescription className="flex items-center gap-2">
									<Info className="h-4 w-4 text-blue-500" />
									Info
								</CardDescription>
								<CardTitle className="text-2xl text-blue-600">{stats.info}</CardTitle>
							</CardHeader>
						</Card>
					</div>
				</div>
			)}

			{/* ================= FILTERS & SEARCH ================= */}
			<div className="px-4 lg:px-6 space-y-4">
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Shield className="h-5 w-5" />
								<CardTitle className="text-lg">Activity Log</CardTitle>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="flex flex-wrap gap-2 mb-4">
							{/* Search Bar */}
							<div className="relative w-[280px]">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search user, action, resource..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 h-9"
								/>
								{searchTerm && (
									<button
										onClick={() => setSearchTerm("")}
										className="absolute right-3 top-1/2 transform -translate-y-1/2"
									>
										<X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
									</button>
								)}
							</div>

							{/* Date Range Filter */}
							<Select value={dateRange} onValueChange={setDateRange}>
								<SelectTrigger className="w-[140px] h-9">
									<Calendar className="h-4 w-4 mr-2" />
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Time</SelectItem>
									<SelectItem value="today">Today</SelectItem>
									<SelectItem value="week">Last 7 Days</SelectItem>
									<SelectItem value="month">Last 30 Days</SelectItem>
								</SelectContent>
							</Select>

							{/* Category Filter */}
							<Select
								value={filterState.actionCategory || "all"}
								onValueChange={(value) =>
									setFilterState((prev) => ({
										...prev,
										actionCategory: value === "all" ? null : value,
										offset: 0,
									}))
								}
							>
								<SelectTrigger className="w-[160px] h-9">
									<SelectValue placeholder="Category" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Categories</SelectItem>
									{Object.entries(AUDIT_CATEGORIES).map(([key, value]) => (
										<SelectItem key={value} value={value}>
											{key.charAt(0) + key.slice(1).toLowerCase()}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Severity Filter */}
							<Select
								value={filterState.severity || "all"}
								onValueChange={(value) =>
									setFilterState((prev) => ({
										...prev,
										severity: value === "all" ? null : value,
										offset: 0,
									}))
								}
							>
								<SelectTrigger className="w-[140px] h-9">
									<SelectValue placeholder="Severity" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Severities</SelectItem>
									{Object.entries(AUDIT_SEVERITY).map(([key, value]) => (
										<SelectItem key={value} value={value}>
											{key.charAt(0) + key.slice(1).toLowerCase()}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Active Filters Indicator */}
							{(filterState.actionCategory || filterState.severity || searchTerm || dateRange !== "all") && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setFilterState({
											...filterState,
											actionCategory: null,
											severity: null,
											startDate: null,
											endDate: null,
											offset: 0,
										});
										setSearchTerm("");
										setDateRange("all");
									}}
									className="h-9"
								>
									<X className="h-4 w-4 mr-2" />
									Clear Filters
								</Button>
							)}
						</div>
						{/* ================= TABLE ================= */}
						{loading ? (
							<div className="space-y-2">
								{[...Array(5)].map((_, i) => (
									<Skeleton key={i} className="h-12 w-full" />
								))}
							</div>
						) : filteredData.length === 0 ? (
							<div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg">
								<Info className="h-12 w-12 mb-4 opacity-50" />
								<p className="text-lg font-medium">No audit logs found</p>
								<p className="text-sm">Try adjusting your filters or search terms</p>
							</div>
						) : (
							<div className="border rounded-lg overflow-hidden">
								<div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
									<Table>
										<TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
											<TableRow>
												<TableHead>Timestamp</TableHead>
												<TableHead>User</TableHead>
												<TableHead>Action</TableHead>
												<TableHead>Category</TableHead>
												<TableHead>Description</TableHead>
												<TableHead>Severity</TableHead>
												<TableHead className="text-right">Details</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredData.map((log) => (
												<TableRow
													key={log.id}
													className="cursor-pointer hover:bg-muted/50"
													onClick={() => setSelectedLog(log)}
												>
													<TableCell className="font-mono text-xs">
														{format(new Date(log.created_at), "MMM dd, HH:mm:ss")}
													</TableCell>
													<TableCell>
														<div className="flex flex-col">
															<span className="text-sm font-medium">{log.user_email}</span>
															{log.user_role && (
																<span className="text-xs text-muted-foreground">{log.user_role}</span>
															)}
														</div>
													</TableCell>
													<TableCell className="font-mono text-xs">
														{log.action_type}
													</TableCell>
													<TableCell>{getCategoryBadge(log.action_category)}</TableCell>
													<TableCell className="max-w-md">
														<p className="truncate text-sm">{log.description}</p>
														{log.resource_type && (
															<p className="text-xs text-muted-foreground truncate">
																{log.resource_type}: {log.resource_id || "N/A"}
															</p>
														)}
													</TableCell>
													<TableCell>{getSeverityBadge(log.severity)}</TableCell>
													<TableCell className="text-right">
														<Button
															variant="ghost"
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																setSelectedLog(log);
															}}
														>
															View
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						)}
						
						{/* ================= PAGINATION ================= */}
						{!loading && filteredData.length > 0 && (
							<div className="flex items-center justify-between mt-4 pt-4 border-t">
								<div className="flex items-center gap-4">
									<div className="text-sm text-muted-foreground">
										Showing {filteredData.length} of {count.toLocaleString()} total entries
									</div>
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">Rows per page:</span>
										<Select
											value={String(filterState.limit)}
											onValueChange={(value) =>
												setFilterState((prev) => ({
													...prev,
													limit: Number(value),
													offset: 0,
												}))
											}
										>
											<SelectTrigger className="w-[70px] h-8">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="5">5</SelectItem>
												<SelectItem value="10">10</SelectItem>
												<SelectItem value="25">25</SelectItem>
												<SelectItem value="50">50</SelectItem>
												<SelectItem value="100">100</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										Page {currentPage} of {totalPages}
									</span>
									<div className="flex gap-1">
										<Button
											variant="outline"
											size="sm"
											onClick={firstPage}
											disabled={!hasPrevPage || loading}
											title="First page"
										>
											<ChevronLeft className="h-4 w-4" />
											<ChevronLeft className="h-4 w-4 -ml-3" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={prevPage}
											disabled={!hasPrevPage || loading}
											title="Previous page"
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={nextPage}
											disabled={!hasNextPage || loading}
											title="Next page"
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={lastPage}
											disabled={!hasNextPage || loading}
											title="Last page"
										>
											<ChevronRight className="h-4 w-4 -mr-3" />
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* ================= DETAILS DIALOG ================= */}
			<Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
				<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Activity className="h-5 w-5" />
							Audit Log Details
						</DialogTitle>
						<DialogDescription>
							Complete information about this activity
						</DialogDescription>
					</DialogHeader>
					{selectedLog && (
						<div className="space-y-6">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Timestamp
									</label>
									<p className="text-sm font-mono mt-1">
										{format(new Date(selectedLog.created_at), "PPpp")}
									</p>
								</div>
								<div>
									<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										User
									</label>
									<p className="text-sm mt-1">{selectedLog.user_email}</p>
									{selectedLog.user_role && (
										<p className="text-xs text-muted-foreground">{selectedLog.user_role}</p>
									)}
								</div>
								<div>
									<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Action Type
									</label>
									<p className="text-sm font-mono mt-1">{selectedLog.action_type}</p>
								</div>
								<div>
									<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Category
									</label>
									<div className="mt-1">{getCategoryBadge(selectedLog.action_category)}</div>
								</div>
								<div>
									<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Severity
									</label>
									<div className="mt-1">{getSeverityBadge(selectedLog.severity)}</div>
								</div>
								<div>
									<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										User ID
									</label>
									<p className="text-xs font-mono mt-1 break-all">{selectedLog.user_id}</p>
								</div>
								{selectedLog.resource_type && (
									<div>
										<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Resource Type
										</label>
										<p className="text-sm mt-1">{selectedLog.resource_type}</p>
									</div>
								)}
								{selectedLog.resource_id && (
									<div>
										<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Resource ID
										</label>
										<p className="text-sm font-mono mt-1 break-all">{selectedLog.resource_id}</p>
									</div>
								)}
							</div>

							<div>
								<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Description
								</label>
								<p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedLog.description}</p>
							</div>

							{selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
								<div>
									<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
										Additional Metadata
									</label>
									<pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64 border">
										{JSON.stringify(selectedLog.metadata, null, 2)}
									</pre>
								</div>
							)}

							<div className="flex justify-end pt-4 border-t">
								<Button variant="outline" onClick={() => setSelectedLog(null)}>
									Close
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
