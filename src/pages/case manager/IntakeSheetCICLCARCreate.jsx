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
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { useAuthStore } from "@/store/authStore";
import supabase from "@/../config/supabase";

// Helper utilities to make field mapping robust
const pick = (obj, ...keys) => {
    for (const k of keys) {
        const v = obj?.[k];
        if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
};

const normalizeDate = (v) => {
    if (!v) return null;
    // accept Date, ISO, or YYYY-MM-DD; return YYYY-MM-DD for DATE columns
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    // toISOString gives UTC date; slice to YYYY-MM-DD
    return d.toISOString().slice(0, 10);
};

const computeAge = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
};

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

export default function IntakeSheetCICLCARCreate({ open, setOpen }) {
	const [activeTab, setActiveTab] = useState(tabOrder[0]);
	const { getAllData, resetAll } = useIntakeFormStore();
	const { user } = useAuthStore();
	const [isSaving, setIsSaving] = useState(false);

	// Create CICL/CAR case and related rows
	const handleCreate = async () => {
		try {
			setIsSaving(true);
			const all = getAllData() || {};

			const profile = all.profileOfCICLCar || {};
			const violation = all.violationOfCICLCar || {};
			const complainant = all.complainant || {};
			const remarks = all.remarks || {};
			const referral = all.referral || all.referal || {}; // support old key
			const recordDetails = all.recordDetails || {};

			// Normalize family background rows
			const familyRows = Array.isArray(all.familyBackground)
				? all.familyBackground
				: Array.isArray(all.familyBackground?.members)
				? all.familyBackground.members
				: [];

			// Normalize services rows (support multiple shapes/keys)
			const rawServices =
				Array.isArray(all.services) ? all.services :
				Array.isArray(all.services?.items) ? all.services.items :
				Array.isArray(all.servicesProvided) ? all.servicesProvided :
				Array.isArray(all.services_list) ? all.services_list :
				Array.isArray(all.services?.list) ? all.services.list :
				[];

			// Base case payload
			const casePayload = {
				case_manager: user?.id ?? null,
				status: pick(profile, "status", "caseStatus") ?? null,
				priority: pick(profile, "priority", "casePriority", "case_priority") ?? null,
				visibility: pick(profile, "visibility", "caseVisibility", "case_visibility") ?? null,

				profile_name: pick(profile, "name", "fullName") ?? null,
				profile_alias: pick(profile, "alias") ?? null,
				profile_sex: pick(profile, "sex") ?? null,
				profile_gender: pick(profile, "gender") ?? null,
				profile_birth_date: normalizeDate(pick(profile, "birthDate", "birth_date", "dob", "dateOfBirth")),
				profile_age:
					pick(profile, "age") ??
					computeAge(normalizeDate(pick(profile, "birthDate", "birth_date", "dob", "dateOfBirth"))),
				profile_status: pick(profile, "civilStatus", "status", "civil_status") ?? null,
				profile_religion: pick(profile, "religion") ?? null,
				profile_address: pick(profile, "address") ?? null,
				profile_client_category: pick(profile, "clientCategory", "client_category") ?? null,
				profile_ip_group: pick(profile, "ipGroup", "ip_group") ?? null,
				profile_nationality: pick(profile, "nationality") ?? null,
				profile_disability: pick(profile, "disability") ?? null,
				profile_contact_number: pick(profile, "contactNumber", "contact_number") ?? null,
				profile_educational_attainment: pick(profile, "educationalAttainment", "educational_attainment") ?? null,
				profile_educational_status: pick(profile, "educationalStatus", "educational_status") ?? null,

				violation: pick(violation, "violation") ?? null,
				violation_date_time_committed: normalizeDate(pick(violation, "dateTimeCommitted", "date_time_committed")),
				specific_violation: pick(violation, "specificViolation", "specific_violation") ?? null,
				violation_place_committed: pick(violation, "placeCommitted", "place_committed") ?? null,
				violation_status: pick(violation, "status") ?? null,
				violation_admission_date: normalizeDate(pick(violation, "admissionDate", "admission_date")),
				repeat_offender: pick(violation, "repeatOffender", "repeat_offender") ?? null,
				violation_previous_offense: pick(violation, "previousOffense", "prevOffense", "previous_offense") ?? null,

				record_details:
					recordDetails?.details ??
					recordDetails?.recordDetails ??
					null,

				complainant_name: pick(complainant, "name") ?? null,
				complainant_alias: pick(complainant, "alias") ?? null,
				complainant_victim: pick(complainant, "victim") ?? null,
				complainant_relationship: pick(complainant, "relationship") ?? null,
				complainant_contact_number: pick(complainant, "contactNumber", "contact_number") ?? null,
				complainant_sex: pick(complainant, "sex") ?? null,
				complainant_birth_date: normalizeDate(pick(complainant, "birthDate", "birth_date", "dob", "dateOfBirth")),
				complainant_address: pick(complainant, "address") ?? null,

				remarks: pick(remarks, "remarks", "notes") ?? null,

				referral_region: pick(referral, "region") ?? null,
				referral_province: pick(referral, "province") ?? null,
				referral_city: pick(referral, "city") ?? null,
				referral_barangay: pick(referral, "barangay") ?? null,
				referral_referred_to: pick(referral, "referredTo", "referred_to") ?? null,
				referral_date_referred: normalizeDate(pick(referral, "dateReferred", "date_referred")),
				referral_reason: pick(referral, "reason", "referral_reason") ?? null,
			};

			// 1) Insert base case
			const { data: caseRow, error: caseErr } = await supabase
				.from("ciclcar_case")
				.insert([casePayload])
				.select()
				.single();

			if (caseErr) throw caseErr;

			// 2) Insert family members (if any)
			if (caseRow?.id && familyRows.length > 0) {
				const familyPayload = familyRows
					.map((m) => ({
						ciclcar_case_id: caseRow.id,
						name: m?.name ?? null,
						relationship: m?.relationship ?? null,
						age: m?.age ?? null,
						sex: m?.sex ?? null,
						status: m?.status ?? null,
						contact_number: m?.contactNumber ?? null,
						educational_attainment: m?.educationalAttainment ?? null,
						employment: m?.employment ?? null,
					}))
					.filter(Boolean);

				if (familyPayload.length > 0) {
					const { error: famErr } = await supabase
						.from("ciclcar_family_background")
						.insert(familyPayload);
					if (famErr) throw famErr;
				}
			}

			// 3) Insert services (if any)
			if (caseRow?.id && rawServices.length > 0) {
				const servicesPayload = rawServices
					.map((s) => ({
						ciclcar_case_id: caseRow.id,
						service_type: pick(s, "serviceType", "type", "service_type"),
						service: pick(s, "service", "description", "name"),
						service_date_provided: normalizeDate(pick(s, "dateProvided", "date_provided", "providedOn", "startDate")),
						service_date_completed: normalizeDate(pick(s, "dateCompleted", "date_completed", "completedOn", "endDate")),
					}))
					// avoid inserting completely empty rows
					.filter(
						(r) =>
							r.service_type ||
							r.service ||
							r.service_date_provided ||
							r.service_date_completed
					);

				if (servicesPayload.length > 0) {
					const { error: svcErr } = await supabase
						.from("ciclcar_service")
						.insert(servicesPayload);
					if (svcErr) throw svcErr;
				}
			}

			// Done
			resetAll();
			setOpen(false);
		} catch (err) {
			console.error("Failed to create CICL/CAR record:", err);
			// Optional: surface error to UI/toast
		} finally {
			setIsSaving(false);
		}
	};

	const goNext = async () => {
		const idx = tabOrder.indexOf(activeTab);
		if (idx < tabOrder.length - 1) {
			setActiveTab(tabOrder[idx + 1]);
		} else {
			// last tab -> create record
			await handleCreate();
		}
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

	// Reset when dialog opens/closes (mirror CaseCreate behavior)
	useEffect(() => {
		if (!open) {
			setActiveTab(tabOrder[0]);
		}
	}, [open]);

	useEffect(() => {
		if (open) {
			resetAll();
		}
	}, [open, resetAll]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
				<DialogHeader>
					<DialogTitle>Create CICL/CAR record</DialogTitle>
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
							// filepath: fixed to store services in its own section
							sectionKey="services"
							goNext={goNext}
							goBack={goBack}
						/>
					</TabsContent>
					<TabsContent value="Referral">
						<ReferralForm
							// filepath: support correct section key; legacy 'referal' still read in handleCreate
							sectionKey="referral"
							goNext={goNext}
							goBack={goBack}
							isSaving={isSaving}
						/>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
