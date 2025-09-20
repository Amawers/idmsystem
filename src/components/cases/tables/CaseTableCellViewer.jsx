//! ===========================================
//! TO BE MODIFIED, SAMPLE DATA ONLY FOR RENDER
//! ===========================================

import * as React from "react";

import { IconTrendingUp } from "@tabler/icons-react";

// Chart (Recharts) imports
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";

// UI components from shadcn
import { Button } from "@/components/ui/button";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ====================
//! Chart data + config
// ====================
const chartData = [
	{ month: "January", desktop: 186, mobile: 80 },
	{ month: "February", desktop: 305, mobile: 200 },
	{ month: "March", desktop: 237, mobile: 120 },
	{ month: "April", desktop: 73, mobile: 190 },
	{ month: "May", desktop: 209, mobile: 130 },
	{ month: "June", desktop: 214, mobile: 140 },
];

const chartConfig = {
	desktop: {
		label: "Desktop",
		color: "var(--primary)",
	},
	mobile: {
		label: "Mobile",
		color: "var(--primary)",
	},
};

// ====================
//! Drawer with Chart + Form (opens on header click)
// ====================
export default function CaseTableCellViewer({ item }) {
	const isMobile = useIsMobile(); // detect mobile for drawer direction

	return (
		<Drawer direction={isMobile ? "bottom" : "right"}>
			{/* Trigger button (clickable cell header) */}
			<DrawerTrigger asChild>
				<Button
					variant="link"
					className="text-foreground w-fit px-0 text-left"
				>
					{item.id}
				</Button>
			</DrawerTrigger>

			{/* Drawer content */}
			<DrawerContent>
				<DrawerHeader className="gap-1">
					<DrawerTitle>{item.header}</DrawerTitle>
					<DrawerDescription>
						Showing total visitors for the last 6 months hindot
					</DrawerDescription>
				</DrawerHeader>

				{/* Main drawer body (scrollable) */}
				<div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
					{/* Chart only shows on desktop */}
					{!isMobile && (
						<>
							{/* Chart container */}
							<ChartContainer config={chartConfig}>
								<AreaChart
									accessibilityLayer
									data={chartData}
									margin={{ left: 0, right: 10 }}
								>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="month"
										tickLine={false}
										axisLine={false}
										tickMargin={8}
										tickFormatter={(value) =>
											value.slice(0, 3)
										}
										hide
									/>
									{/* Tooltip */}
									<ChartTooltip
										cursor={false}
										content={
											<ChartTooltipContent indicator="dot" />
										}
									/>
									{/* Stacked areas */}
									<Area
										dataKey="mobile"
										type="natural"
										fill="var(--color-mobile)"
										fillOpacity={0.6}
										stroke="var(--color-mobile)"
										stackId="a"
									/>
									<Area
										dataKey="desktop"
										type="natural"
										fill="var(--color-desktop)"
										fillOpacity={0.4}
										stroke="var(--color-desktop)"
										stackId="a"
									/>
								</AreaChart>
							</ChartContainer>

							{/* Info below chart */}
							<Separator />
							<div className="grid gap-2">
								<div className="flex gap-2 leading-none font-medium">
									Trending up by 5.2% this month{" "}
									<IconTrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									Showing total visitors for the last 6
									months. This is just some random text to
									test the layout. It spans multiple lines and
									should wrap around.
								</div>
							</div>
							<Separator />
						</>
					)}

					{/* Form inputs */}
					<form className="flex flex-col gap-4">
						{/* Header input */}
						<div className="flex flex-col gap-3">
							<Label htmlFor="header">Header</Label>
							<Input id="header" defaultValue={item.header} />
						</div>

						{/* Type + Status selectors */}
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-3">
								<Label htmlFor="type">Type</Label>
								<Select defaultValue={item.type}>
									<SelectTrigger id="type" className="w-full">
										<SelectValue placeholder="Select a type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Table of Contents">
											Table of Contents
										</SelectItem>
										<SelectItem value="Executive Summary">
											Executive Summary
										</SelectItem>
										<SelectItem value="Technical Approach">
											Technical Approach
										</SelectItem>
										<SelectItem value="Design">
											Design
										</SelectItem>
										<SelectItem value="Capabilities">
											Capabilities
										</SelectItem>
										<SelectItem value="Focus Documents">
											Focus Documents
										</SelectItem>
										<SelectItem value="Narrative">
											Narrative
										</SelectItem>
										<SelectItem value="Cover Page">
											Cover Page
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-col gap-3">
								<Label htmlFor="status">Status</Label>
								<Select defaultValue={item.status}>
									<SelectTrigger id="status" className="w-full">
										<SelectValue placeholder="Select a status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Done">Done</SelectItem>
										<SelectItem value="In Progress">
											In Progress
										</SelectItem>
										<SelectItem value="Not Started">
											Not Started
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Target + Limit inputs */}
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-3">
								<Label htmlFor="target">Target</Label>
								<Input id="target" defaultValue={item.target} />
							</div>
							<div className="flex flex-col gap-3">
								<Label htmlFor="limit">Limit</Label>
								<Input id="limit" defaultValue={item.limit} />
							</div>
						</div>

						{/* Case manager selector */}
						<div className="flex flex-col gap-3">
							<Label htmlFor="caseManager">Case Manager</Label>
							<Select defaultValue={item.case_manager}>
								<SelectTrigger id="caseManager" className="w-full">
									<SelectValue placeholder="Select a Case Manager" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Eddie Lake">
										Eddie Lake
									</SelectItem>
									<SelectItem value="Jamik Tashpulatov">
										Jamik Tashpulatov
									</SelectItem>
									<SelectItem value="Emily Whalen">
										Emily Whalen
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</form>
				</div>

				{/* Drawer footer with actions */}
				<DrawerFooter>
					<Button>Submit</Button>
					<DrawerClose asChild>
						<Button variant="outline">Done</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
