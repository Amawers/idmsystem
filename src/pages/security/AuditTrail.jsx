/**
 * @file AuditTrail.jsx
 * @description Audit Trail / Activity Log - Display and filter user actions
 * @module pages/security/AuditTrail
 */

import React, { useState, useEffect } from "react";
// TEMP: Import sample data
import sampleAuditLogs from "@/../SAMPLE_AUDIT_LOGS.json";
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
import { format } from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	RefreshCw,
	Search,
	AlertCircle,
	Shield,
	Info,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuditTrail() {
	// TEMP: Use sample data instead of hook
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState({
		category: "all",
		severity: "all",
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(5);

	// Load sample data
	useEffect(() => {
		setLoading(true);
		setTimeout(() => {
			setData(sampleAuditLogs);
			setLoading(false);
		}, 500);
	}, []);

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedLog, setSelectedLog] = useState(null);

	// Reset to page 1 when filters or rows per page change
	useEffect(() => {
		setCurrentPage(1);
	}, [filters, searchTerm, rowsPerPage]);

	// Filter data by category, severity and search term
	const filteredData = data.filter((log) => {
		const search = searchTerm.toLowerCase();
		const matchesSearch =
			log.user_email?.toLowerCase().includes(search) ||
			log.action?.toLowerCase().includes(search) ||
			log.resource_type?.toLowerCase().includes(search);
		
		const matchesCategory = filters.category === "all" || log.category === filters.category;
		const matchesSeverity = filters.severity === "all" || log.severity === filters.severity;

		return matchesSearch && matchesCategory && matchesSeverity;
	});

	// Pagination
	const totalPages = Math.ceil(filteredData.length / rowsPerPage);
	const paginatedData = filteredData.slice(
		(currentPage - 1) * rowsPerPage,
		currentPage * rowsPerPage
	);

	const nextPage = () => {
		if (currentPage < totalPages) setCurrentPage(currentPage + 1);
	};

	const prevPage = () => {
		if (currentPage > 1) setCurrentPage(currentPage - 1);
	};

	const reload = () => {
		setLoading(true);
		setTimeout(() => {
			setData([...sampleAuditLogs]);
			setLoading(false);
		}, 500);
	};

	// Get severity badge variant
	const getSeverityBadge = (severity) => {
		switch (severity) {
			case "critical":
				return <Badge variant="destructive">Critical</Badge>;
			case "high":
				return <Badge variant="destructive">High</Badge>;
			case "medium":
				return <Badge variant="outline" className="border-orange-500 text-orange-600">Medium</Badge>;
			case "low":
				return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Low</Badge>;
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
			system: "default",
		};
		return <Badge variant={variants[category] || "default"}>{category}</Badge>;
	};

	const hasNextPage = currentPage < totalPages;
	const hasPrevPage = currentPage > 1;

	return (
		<>
			{/* ================= HEADER ================= */}
			<div className="flex items-center justify-between px-4 lg:px-6 pb-4">
				<div>
					<h2 className="text-base font-bold tracking-tight">Audit Trail</h2>
					<p className="text-muted-foreground text-[11px]">
						Track and monitor all user activities and system events
					</p>
				</div>
			</div>

			{/* ================= FILTERS & SEARCH ================= */}
			<div className="px-4 lg:px-6 space-y-4">
				<Card>
					<CardHeader className="pb-0">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Shield className="h-5 w-5" />
								<CardTitle className="text-lg">Activity Log</CardTitle>
							</div>
							<div className="flex gap-2">
								{/* Search Bar */}
								<div className="relative w-[280px]">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="pl-10 h-9"
									/>
								</div>

								{/* Category Filter */}
								<Select
									value={filters.actionCategory || "all"}
									onValueChange={(value) =>
										setFilters({
											actionCategory: value === "all" ? null : value,
										})
									}
								>
									<SelectTrigger className="w-[160px]">
										<SelectValue placeholder="Category" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Categories</SelectItem>
										<SelectItem value="auth">Authentication</SelectItem>
										<SelectItem value="case">Case Management</SelectItem>
										<SelectItem value="user">User Management</SelectItem>
										<SelectItem value="permission">Permissions</SelectItem>
										<SelectItem value="system">System</SelectItem>
									</SelectContent>
								</Select>

								{/* Severity Filter */}
								<Select
									value={filters.severity || "all"}
									onValueChange={(value) =>
										setFilters({ severity: value === "all" ? null : value })
									}
								>
									<SelectTrigger className="w-[140px]">
										<SelectValue placeholder="Severity" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Severities</SelectItem>
										<SelectItem value="info">Info</SelectItem>
										<SelectItem value="warning">Warning</SelectItem>
										<SelectItem value="critical">Critical</SelectItem>
									</SelectContent>
								</Select>

								<Button variant="outline" size="sm" onClick={reload}>
									<RefreshCw className="h-4 w-4 mr-2" />
									Refresh
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						{/* ================= TABLE ================= */}
						{loading ? (
							<div className="space-y-2">
								{[...Array(5)].map((_, i) => (
									<Skeleton key={i} className="h-12 w-full" />
								))}
							</div>
						) : filteredData.length === 0 ? (
							<div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
								<Info className="h-12 w-12 mb-4 opacity-50" />
								<p>No audit logs found</p>
							</div>
						) : (
							<div className="border rounded-lg overflow-hidden">
								<div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
									<Table>
										<TableHeader className="sticky top-0 z-10">
											<TableRow className="bg-muted/50">
												<TableHead className="bg-muted/50">Timestamp</TableHead>
												<TableHead className="bg-muted/50">User</TableHead>
												<TableHead className="bg-muted/50">Action</TableHead>
												<TableHead className="bg-muted/50">Category</TableHead>
												<TableHead className="bg-muted/50">Description</TableHead>
												<TableHead className="bg-muted/50">Severity</TableHead>
												<TableHead className="bg-muted/50 text-right">Details</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{paginatedData.map((log) => (
											<TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
												<TableCell className="font-mono text-xs">
													{format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
												</TableCell>
												<TableCell>
													<div className="flex flex-col">
														<span className="text-sm">{log.user_email}</span>
													</div>
												</TableCell>
												<TableCell className="font-mono text-xs">
													{log.action}
												</TableCell>
												<TableCell>{getCategoryBadge(log.category)}</TableCell>
												<TableCell className="max-w-md truncate">
													{log.resource_type && `${log.resource_type}: ${log.resource_id || 'N/A'}`}
												</TableCell>
												<TableCell>{getSeverityBadge(log.severity)}</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setSelectedLog(log)}
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
						<div className="flex items-center justify-between mt-4">
							<div className="flex items-center gap-4">
								<div className="text-sm text-muted-foreground">
									Page {currentPage} of {totalPages || 1}
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">Rows per page:</span>
									<Select
										value={String(rowsPerPage)}
										onValueChange={(value) => setRowsPerPage(Number(value))}
									>
										<SelectTrigger className="w-[70px] h-8">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="5">5</SelectItem>
											<SelectItem value="10">10</SelectItem>
											<SelectItem value="15">15</SelectItem>
											<SelectItem value="25">25</SelectItem>
											<SelectItem value="50">50</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={prevPage}
									disabled={!hasPrevPage || loading}
								>
									<ChevronLeft className="h-4 w-4 mr-1" />
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={nextPage}
									disabled={!hasNextPage || loading}
								>
									Next
									<ChevronRight className="h-4 w-4 ml-1" />
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* ================= DETAILS DIALOG ================= */}
			<Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Audit Log Details</DialogTitle>
						<DialogDescription>
							Detailed information about this activity
						</DialogDescription>
					</DialogHeader>
					{selectedLog && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Timestamp
									</label>
									<p className="text-sm font-mono">
										{format(new Date(selectedLog.timestamp), "PPpp")}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										User Email
									</label>
									<p className="text-sm">{selectedLog.user_email}</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Action
									</label>
									<p className="text-sm font-mono">{selectedLog.action}</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Category
									</label>
									<div className="mt-1">{getCategoryBadge(selectedLog.category)}</div>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Severity
									</label>
									<div className="mt-1">{getSeverityBadge(selectedLog.severity)}</div>
								</div>
								{selectedLog.resource_type && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Resource Type
										</label>
										<p className="text-sm">{selectedLog.resource_type}</p>
									</div>
								)}
								{selectedLog.resource_id && (
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Resource ID
										</label>
										<p className="text-sm font-mono">{selectedLog.resource_id}</p>
									</div>
								)}
							</div>
							{selectedLog.details && (
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Details
									</label>
									<pre className="text-xs bg-muted p-3 rounded-lg mt-1 overflow-auto max-h-32">
										{JSON.stringify(selectedLog.details, null, 2)}
									</pre>
								</div>
							)}
							{selectedLog.changes && (
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Changes Made
									</label>
									<pre className="text-xs bg-muted p-3 rounded-lg mt-1 overflow-auto max-h-32">
										{JSON.stringify(selectedLog.changes, null, 2)}
									</pre>
								</div>
							)}
							{selectedLog.metadata && (
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Additional Metadata
									</label>
									<pre className="text-xs bg-muted p-3 rounded-lg mt-1 overflow-auto max-h-32">
										{JSON.stringify(selectedLog.metadata, null, 2)}
									</pre>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
