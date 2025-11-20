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
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { toast } from "sonner";
import { createOrUpdateLocalCase } from "@/services/caseOfflineService";

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const forceCaseTabReload = () => {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("caseManagement.activeTab", "CASE");
	sessionStorage.setItem("caseManagement.forceTabAfterReload", "CASE");
	sessionStorage.setItem("caseManagement.forceCaseSync", "true");
	window.location.reload();
};

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


export default function IntakeSheetCaseCreate({ open, setOpen, onSuccess }) {
	// DISABLED: Skip directly to the last form (recommendation2)
	// Set currentTabIndex to last tab index (15 = recommendation2)
	const [currentTabIndex, setCurrentTabIndex] = useState(15);
	const [completedTabs, setCompletedTabs] = useState(new Set());
	const { getAllData, resetAll } = useIntakeFormStore();
	const [isSaving, setIsSaving] = useState(false);

	// Helper function to safely extract value from data
	const pick = (obj, ...keys) => {
		for (const k of keys) {
			const v = obj?.[k];
			if (v !== undefined && v !== null && v !== "") return v;
		}
		return null;
	};

	// Helper function to normalize dates
	const normalizeDate = (v) => {
		if (!v) return null;
		const d = v instanceof Date ? v : new Date(v);
		if (Number.isNaN(d.getTime())) return null;
		return d.toISOString().slice(0, 10);
	};

	// Create case record
	const handleCreate = async () => {
		try {
			setIsSaving(true);
			const all = getAllData() || {};

			console.log("🔍 Full intake data:", all);

			// Extract all form sections
			const identifying = all.IdentifyingData || {};
			const familyData = all.FamilyData || {};
			const perpetrator = all.PerpetratorInfo || {};
			const problem = all.PresentingProblem || {};
			const background = all.BackgroundInfo || {};
			const community = all.CommunityInfo || {};
			const assessment = all.Assessment || {};
			const recommendation = all.Recommendation || {};
			const caseDetails = all.caseDetails || {};

			// Part 2 data
			const identifying2 = all.IdentifyingData2 || {};
			const familyData2 = all.FamilyData2 || {};
			const victim2 = all.VictimInfo2 || {};
			const problem2 = all.PresentingProblem2 || {};
			const background2 = all.BackgroundInfo2 || {};
			const community2 = all.CommunityInfo2 || {};
			const assessment2 = all.Assessment2 || {};
			const recommendation2 = all.Recommendation2 || {};

			// Extract family members
			const familyMembers = [
				...(Array.isArray(familyData?.members) ? familyData.members : []),
				...(Array.isArray(familyData2?.members) ? familyData2.members : []),
			];

			// Build case payload
			const casePayload = {
				case_manager: pick(caseDetails, "caseManager", "case_manager") ?? null,
				status: pick(caseDetails, "status") ?? null,
				priority: pick(caseDetails, "priority") ?? null,

				// Identifying data
				identifying_name: pick(identifying, "name", "fullName") ?? null,
				identifying_referral_source: pick(identifying, "referralSource", "referral_source") ?? null,
				identifying_alias: pick(identifying, "alias") ?? null,
				identifying_age: pick(identifying, "age") ?? null,
				identifying_status: pick(identifying, "civilStatus", "status") ?? null,
				identifying_occupation: pick(identifying, "occupation") ?? null,
				identifying_income: pick(identifying, "income") ?? null,
				identifying_sex: pick(identifying, "sex") ?? null,
				identifying_address: pick(identifying, "address") ?? null,
				identifying_case_type: pick(identifying, "caseType", "case_type") ?? null,
				identifying_religion: pick(identifying, "religion") ?? null,
				identifying_educational_attainment: pick(identifying, "educationalAttainment", "educational_attainment") ?? null,
				identifying_contact_person: pick(identifying, "contactPerson", "contact_person") ?? null,
				identifying_birth_place: pick(identifying, "birthPlace", "birth_place") ?? null,
				identifying_respondent_name: pick(identifying, "respondentName", "respondent_name") ?? null,
				identifying_birthday: normalizeDate(pick(identifying, "birthday", "birth_date")) ?? null,
				identifying_intake_date: normalizeDate(pick(identifying, "intakeDate", "intake_date")) ?? null,

				// Perpetrator data
				perpetrator_name: pick(perpetrator, "name") ?? null,
				perpetrator_age: pick(perpetrator, "age") ?? null,
				perpetrator_alias: pick(perpetrator, "alias") ?? null,
				perpetrator_sex: pick(perpetrator, "sex") ?? null,
				perpetrator_address: pick(perpetrator, "address") ?? null,
				perpetrator_victim_relation: pick(perpetrator, "victimRelation", "victim_relation") ?? null,
				perpetrator_offence_type: pick(perpetrator, "offenceType", "offence_type") ?? null,
				perpetrator_commission_datetime: normalizeDate(pick(perpetrator, "commissionDatetime", "commission_datetime")) ?? null,

				// Problems/Assessment/Recommendation
				presenting_problem: pick(problem, "problem", "presentingProblem") ?? null,
				background_info: pick(background, "backgroundInfo", "background") ?? null,
				community_info: pick(community, "communityInfo", "community") ?? null,
				assessment: pick(assessment, "assessment") ?? null,
				recommendation: pick(recommendation, "recommendation") ?? null,

				// Part 2 - Identifying data
				identifying2_intake_date: normalizeDate(pick(identifying2, "intakeDate", "intake_date")) ?? null,
				identifying2_name: pick(identifying2, "name", "fullName") ?? null,
				identifying2_referral_source: pick(identifying2, "referralSource", "referral_source") ?? null,
				identifying2_alias: pick(identifying2, "alias") ?? null,
				identifying2_age: pick(identifying2, "age") ?? null,
				identifying2_status: pick(identifying2, "civilStatus", "status") ?? null,
				identifying2_occupation: pick(identifying2, "occupation") ?? null,
				identifying2_income: pick(identifying2, "income") ?? null,
				identifying2_sex: pick(identifying2, "sex") ?? null,
				identifying2_address: pick(identifying2, "address") ?? null,
				identifying2_case_type: pick(identifying2, "caseType", "case_type") ?? null,
				identifying2_religion: pick(identifying2, "religion") ?? null,
				identifying2_educational_attainment: pick(identifying2, "educationalAttainment", "educational_attainment") ?? null,
				identifying2_contact_person: pick(identifying2, "contactPerson", "contact_person") ?? null,
				identifying2_birth_place: pick(identifying2, "birthPlace", "birth_place") ?? null,
				identifying2_respondent_name: pick(identifying2, "respondentName", "respondent_name") ?? null,
				identifying2_birthday: normalizeDate(pick(identifying2, "birthday", "birth_date")) ?? null,

				// Part 2 - Victim data
				victim2_name: pick(victim2, "name") ?? null,
				victim2_age: pick(victim2, "age") ?? null,
				victim2_alias: pick(victim2, "alias") ?? null,
				victim2_sex: pick(victim2, "sex") ?? null,
				victim2_address: pick(victim2, "address") ?? null,
				victim2_victim_relation: pick(victim2, "victimRelation", "victim_relation") ?? null,
				victim2_offence_type: pick(victim2, "offenceType", "offence_type") ?? null,
				victim2_commission_datetime: normalizeDate(pick(victim2, "commissionDatetime", "commission_datetime")) ?? null,

				// Part 2 - Problems/Assessment/Recommendation
				presenting_problem2: pick(problem2, "problem", "presentingProblem") ?? null,
				background_info2: pick(background2, "backgroundInfo", "background") ?? null,
				community_info2: pick(community2, "communityInfo", "community") ?? null,
				assessment2: pick(assessment2, "assessment") ?? null,
				recommendation2: pick(recommendation2, "recommendation") ?? null,
			};

			console.log("💾 Final case payload:", casePayload);
			console.log("👨‍👩‍👧‍👦 Family members:", familyMembers);

			await createOrUpdateLocalCase({
				casePayload,
				familyMembers,
				mode: "create",
			});

			// Done - close modal and clean up
			resetAll();
			setOpen(false);

			const online = isBrowserOnline();
			toast.success(online ? "Case Saved" : "Case Saved Offline", {
				description: online
					? "Case was stored and will sync shortly."
					: "Changes were stored locally and will sync once you're reconnected.",
			});

			// Fire-and-forget parent refresh
			if (onSuccess) {
				try {
					onSuccess();
				} catch (callbackError) {
					console.error("Case create onSuccess callback failed:", callbackError);
				}
			}

			if (online) {
				setTimeout(forceCaseTabReload, 0);
			}
		} catch (err) {
			console.error("Failed to create case record:", err);
			toast.error("Creation Failed", {
				description: err.message || "An error occurred while creating the case. Please try again.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	// Go to next tab
	const goNext = async () => {
		setCompletedTabs((prev) => new Set([...prev, currentTabIndex]));
		if (currentTabIndex < tabOrder.length - 1) {
			setCurrentTabIndex((prev) => prev + 1);
		} else {
			// last tab completed - create record
			await handleCreate();
		}
	};

	// Go to previous tab
	const goBack = () => {
		if (currentTabIndex > 0) {
			setCurrentTabIndex((prev) => prev - 1);
		}
	};

	// Reset when dialog opens/closes
	useEffect(() => {
		if (!open) {
			setCurrentTabIndex(15); // Reset to last tab (disabled step-by-step)
			setCompletedTabs(new Set());
		}
	}, [open]);

	// Ensure a fresh form when creating a new record
	useEffect(() => {
		if (open) {
			resetAll();
		}
	}, [open, resetAll]);

	// Auto-center active tab
	useEffect(() => {
		const container = document.getElementById("case-tabs-container");
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
	}, [currentTabIndex]);

	const currentTab = tabOrder[currentTabIndex];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
				<DialogHeader>
					<DialogTitle>Create Case Record</DialogTitle>
				</DialogHeader>

				<Tabs
					value={currentTab}
					onValueChange={(tab) => setCurrentTabIndex(tabOrder.indexOf(tab))}
					className="w-full flex flex-col gap-4"
				>
					{/* Scrollable Tabs */}
					<div
						id="case-tabs-container"
						className="w-full overflow-x-auto scrollbar-hide scrollbar-thin"
					>
						<TabsList className="flex w-max gap-2 px-2">
							{tabOrder.map((tab, index) => (
								<TabsTrigger
									key={tab}
									value={tab}
									className="flex items-center whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
									onClick={() => setCurrentTabIndex(index)}
									// DISABLED: Allow navigation to all tabs
									disabled={false}
								>
									{completedTabs.has(index) ? (
										<Badge
											variant="secondary"
											className="mr-2 h-4 w-4 rounded-full p-0 text-xs bg-green-100 text-green-700"
										>
											✓
										</Badge>
									) : (
										<Badge variant="secondary" className="mr-2">
											{index + 1}
										</Badge>
									)}
									{tab.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
								</TabsTrigger>
							))}
						</TabsList>
					</div>

					<div className="flex-1 overflow-auto">
						{/*//* PART 1*/}
						<TabsContent value="identifying-data">
							<IdentifyingDataForm
								sectionKey="IdentifyingData"
								goNext={goNext}
								goBack={goBack}
								isFirstStep={true}
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
								setOpen={setOpen}
								submitDisabled={isSaving}
								useOfflineSubmit={true}
							/>
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
