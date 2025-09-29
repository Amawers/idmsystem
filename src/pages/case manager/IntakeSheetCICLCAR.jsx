"use client";
import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProfileCICLCARForm } from "@/components/intake sheet CICLCAR/ProfileCICLCARForm";
import { FamilyBackgroundForm } from "@/components/intake sheet CICLCAR/FamilyBackgroundForm";
import { ViolationCICLCARForm } from "@/components/intake sheet CICLCAR/ViolationCICLCARForm";
import { RecordDetailsForm } from "@/components/intake sheet CICLCAR/RecordDetails";
import { ComplainantForm } from "@/components/intake sheet CICLCAR/ComplainantForm";
import { RemarksForm } from "@/components/intake sheet CICLCAR/RemarksForm";
import { ReferralForm } from "@/components/intake sheet CICLCAR/ReferralForm";
import { ServicesForm } from "@/components/intake sheet CICLCAR/ServicesForm";
//* PROFILE OF CICL/CAR
//* FAMILY BACKGROUND
//* VIOLATION OFFENSE OF CICL/CAR
//* RECORD DETAILS
//* COMPLAINANT
//* REMARKS
//* SERVICES
//* REFERRAL

const tabOrder = [
	"Profile-of-CICL/CAR",
	"Family-Background",
	"Violation-Offense-of-CICL/CAR",
	"Record-Details",
	"Complainant",
	"Remarks",
	"Services",
	"Referral",
];

export default function IntakeSheetCICLCAR({ open, setOpen }) {
	const [activeTab, setActiveTab] = useState(tabOrder[0]);

	const goNext = () => {
		const idx = tabOrder.indexOf(activeTab);
		if (idx < tabOrder.length - 1) setActiveTab(tabOrder[idx + 1]);
	};

	const goBack = () => {
		const idx = tabOrder.indexOf(activeTab);
		if (idx > 0) setActiveTab(tabOrder[idx - 1]);
	};

	// ✅ Auto-center active tab
	useEffect(() => {
		const container = document.getElementById("tabs-container");
		const activeEl = container?.querySelector(`[data-state="active"]`);
		if (activeEl && container) {
			const containerWidth = container.offsetWidth;
			const elLeft = activeEl.offsetLeft;
			const elWidth = activeEl.offsetWidth;
			container.scrollTo({
				left: elLeft - containerWidth / 2 + elWidth / 2,
				behavior: "smooth",
			});
		}
	}, [activeTab]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
				<DialogHeader>
					<DialogTitle>Intake Sheet for CICL/CAR</DialogTitle>
				</DialogHeader>

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="w-full flex flex-col gap-4"
				>
					{/* ✅ Scrollable Tabs */}
					<div
						id="tabs-container"
						className="w-full overflow-x-auto scrollbar-hide scrollbar-thin"
					>
						<TabsList className="flex w-max gap-2 px-2">
							{tabOrder.map((tab, i) => (
								<TabsTrigger
									key={tab}
									value={tab}
									className="flex items-center whitespace-nowrap"
								>
									<Badge variant="secondary">{i + 1}</Badge>
									{tab.replace(/-/g, " ").replace("2", "")}
								</TabsTrigger>
							))}
						</TabsList>
					</div>
					{/*//* MAIN TAB CONTENT */}
					<TabsContent value="Profile-of-CICL/CAR">
						<ProfileCICLCARForm
							sectionKey="profileOfCICLCar"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="Family-Background">
						<FamilyBackgroundForm
							sectionKey="familyBackground"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="Violation-Offense-of-CICL/CAR">
						<ViolationCICLCARForm
							sectionKey="violationOfCICLCar"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="Record-Details">
						<RecordDetailsForm
							sectionKey="recordDetails"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>
					<TabsContent value="Complainant">
						<ComplainantForm
							sectionKey="complainant"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="Remarks">
						<RemarksForm
							sectionKey="remarks"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>
					<TabsContent value="Services" >
						<ServicesForm
							sectionKey="remarks"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>
					<TabsContent value="Referral">
						<ReferralForm
							sectionKey="referal"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
