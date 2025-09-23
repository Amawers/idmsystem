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
import { IdentifyingDataForm } from "@/components/intake sheet/IdentifyingDataForm";
import { FamilyCompositionForm } from "@/components/intake sheet/FamilyCompositionForm";
import { PerpetratorInfoForm } from "@/components/intake sheet/PerpetratorInfoForm";
import { ProblemForm } from "@/components/intake sheet/ProblemForm";
import { BackgroundInfoForm } from "@/components/intake sheet/BackgroundInfoForm";
import { CommunityInfoForm } from "@/components/intake sheet/CommunityInforForm";
import { AssessmentForm } from "@/components/intake sheet/AssessmentForm";
import { RecommendationForm } from "@/components/intake sheet/RecommendationForm";

const tabOrder = [
	"identifying-data",
	"family-composition",
	"perpetrator-information",
	"presenting-problem",
	"background-information",
	"community-information",
	"assessment",
	"recommendation",
	"identifying-data2",
	"family-composition2",
	"victim-information2",
	"presenting-problem2",
	"background-information2",
	"community-information2",
	"assessment2",
	"recommendation2",
];

//! capitalize value
//! verifiy input fields from pciture 
//! 


export default function IntakeSheet({ open, setOpen }) {
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
					<DialogTitle>Intake Sheet</DialogTitle>
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
									{tab.replace("-", " ").replace("2", "")}
								</TabsTrigger>
							))}
						</TabsList>
					</div>

					{/*//* PART 1*/}
					<TabsContent value="identifying-data">
						<IdentifyingDataForm
							sectionKey="IdentifyingData"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="family-composition">
						<FamilyCompositionForm
							sectionKey="FamilyData"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="perpetrator-information">
						<PerpetratorInfoForm
							sectionKey="PerpetratorInfo"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="presenting-problem">
						<ProblemForm
							sectionKey="PresentingProblem"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="background-information">
						<BackgroundInfoForm
							sectionKey="BackgroundInfo"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="community-information">
						<CommunityInfoForm
							sectionKey="CommunityInfo"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="assessment">
						<AssessmentForm
							sectionKey="Assessment"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="recommendation">
						<RecommendationForm
							sectionKey="Recommendation"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					{/*//* PART 2*/}
					<TabsContent value="identifying-data2">
						<IdentifyingDataForm
							sectionKey="IdentifyingData2"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="family-composition2">
						<FamilyCompositionForm
							sectionKey="FamilyData2"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="victim-information2">
						<PerpetratorInfoForm
							sectionKey="VictimInfo2"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="presenting-problem2">
						<ProblemForm
							sectionKey="PresentingProblem2"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="background-information2">
						<BackgroundInfoForm
							sectionKey="BackgroundInfo2"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="community-information2">
						<CommunityInfoForm
							sectionKey="CommunityInfo2"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="assessment2">
						<AssessmentForm
							sectionKey="Assessment2"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>

					<TabsContent value="recommendation2">
						<RecommendationForm
							sectionKey="Recommendation2"
							goNext={goNext}
							goBack={goBack}
							isSecond={true}
						/>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
