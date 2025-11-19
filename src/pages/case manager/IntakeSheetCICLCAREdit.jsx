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
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import supabase from "@/../config/supabase";
import { toast } from "sonner";
import { createOrUpdateLocalCase } from "@/services/ciclcarOfflineService";

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

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

// Convert various inputs to value accepted by <input type="datetime-local">
const normalizeDateTimeLocal = (v) => {
    if (!v) return "";
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
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
//* REFERRAL

const tabOrder = [
    "Profile-of-CICL/CAR",
    "Family-Background",
    "Violation-Offense-of-CICL/CAR",
    "Record-Details",
    "Complainant",
    "Remarks",
    "Referral",
];

export default function IntakeSheetCICLCAREdit({ open, setOpen, row, onSuccess }) {
    const [activeTab, setActiveTab] = useState(tabOrder[0]);
    const { getAllData, resetAll, setSectionField } = useIntakeFormStore();
    const [isSaving, setIsSaving] = useState(false);
    const [prefillLoading, setPrefillLoading] = useState(false);
    const isEditing = Boolean(row?.id ?? row?.localId);

    // Prefill form data when editing an existing record
    useEffect(() => {
        if (open && row) {
            setPrefillLoading(true);
            console.log("📝 Prefilling CICL/CAR edit form with data:", row);

            // Prefill Profile section
            setSectionField("profileOfCICLCar", {
                name: row.profile_name || "",
                alias: row.profile_alias || "",
                sex: row.profile_sex || "",
                gender: row.profile_gender || "",
                birthday: row.profile_birth_date || "",
                age: row.profile_age || "",
                // keep both keys for backward compatibility; UI uses `status`
                civilStatus: row.profile_status || "",
                status: (row.profile_status || "").toLowerCase(),
                religion: row.profile_religion || "",
                address: row.profile_address || "",
                clientCategory: row.profile_client_category || "",
                ipGroup: row.profile_ip_group || "",
                nationality: row.profile_nationality || "",
                disability: row.profile_disability || "",
                contactNumber: row.profile_contact_number || "",
                educationalAttainment: row.profile_educational_attainment || "",
                educationalStatus: row.profile_educational_status || "",
            });

            // Prefill Violation section
            setSectionField("violationOfCICLCar", {
                violation: row.violation || "",
                // ensure datetime-local compatible string
                dateTimeCommitted: normalizeDateTimeLocal(
                    row.violation_date_time_committed
                ),
                specificViolation: row.specific_violation || "",
                placeCommitted: row.violation_place_committed || "",
                status: row.violation_status || "",
                admissionDate: normalizeDate(row.violation_admission_date) || "",
                repeatOffender: row.repeat_offender || "",
                previousOffense: row.violation_previous_offense || "",
            });

            // Prefill Complainant section
            setSectionField("complainant", {
                name: row.complainant_name || "",
                alias: row.complainant_alias || "",
                victim: row.complainant_victim || "",
                relationship: row.complainant_relationship || "",
                contactNumber: row.complainant_contact_number || "",
                sex: row.complainant_sex || "",
                birthday: row.complainant_birth_date || "",
                address: row.complainant_address || "",
            });

            // Prefill Record Details section
            setSectionField("recordDetails", {
                // component expects `recordDetails` key
                recordDetails: row.record_details || "",
            });

            // Prefill Remarks section
            setSectionField("remarks", {
                remarks: row.remarks || "",
            });

            // Prefill Referral section (including caseDetails)
            setSectionField("referral", {
                region: row.referral_region || "",
                province: row.referral_province || "",
                city: row.referral_city || "",
                barangay: row.referral_barangay || "",
                referredTo: row.referral_referred_to || "",
                dateReferred: row.referral_date_referred || "",
                referralReason: row.referral_reason || "",
                caseDetails: {
                    caseManager: row.case_manager || "",
                    status: row.status || "",
                    priority: row.priority || "",
                },
            });

            // Fetch and prefill family background and services from related tables
            const applyFamilyData = async () => {
                try {
                    if (Array.isArray(row.family_background) && row.family_background.length) {
                        setSectionField("familyBackground", "members", row.family_background);
                        return;
                    }

                    if (!isBrowserOnline() || !row.id) return;

                    const { data, error } = await supabase
                        .from("ciclcar_family_background")
                        .select("*")
                        .eq("ciclcar_case_id", row.id);
                    if (error) {
                        console.error("Error fetching family background:", error);
                        return;
                    }
                    const fallbackMembers = (data || []).map((member) => ({
                        name: member.name || "",
                        relationship: member.relationship || "",
                        age: member.age || "",
                        sex: member.sex || "",
                        status: member.status || "",
                        contactNumber: member.contact_number || "",
                        educationalAttainment: member.educational_attainment || "",
                        employment: member.employment || "",
                    }));
                    setSectionField("familyBackground", "members", fallbackMembers);
                } catch (error) {
                    console.error("Error fetching related data:", error);
                } finally {
                    setPrefillLoading(false);
                }
            };

            applyFamilyData();
        }
    }, [open, row, setSectionField]);

    // Update CICL/CAR case and related rows
    const handleCreate = async () => {
        try {
            setIsSaving(true);
            const all = getAllData() || {};
            const isEditing = row && row.id;

            console.log(isEditing ? "✏️ Updating CICL/CAR record" : "🔍 Creating new CICL/CAR record", all);

            const profile = all.profileOfCICLCar || {};
            const violation = all.violationOfCICLCar || {};
            const complainant = all.complainant || {};
            const remarks = all.remarks || {};
            const referral = all.referral || all.referal || {}; // support old key
            const recordDetails = all.recordDetails || {};

            console.log("📝 Profile data:", profile);
            console.log("⚖️ Violation data:", violation);
            console.log("👥 Complainant data:", complainant);
            console.log("📍 Referral data:", referral);

            // Normalize family background rows
            const familyRows = Array.isArray(all.familyBackground)
                ? all.familyBackground
                : Array.isArray(all.familyBackground?.members)
                ? all.familyBackground.members
                : [];

            // Extract case details from the referral section (where they're actually stored)
            const caseDetails = referral?.caseDetails || {};

            // Base case payload
            const casePayload = {
                case_manager: pick(caseDetails, "caseManager", "case_manager") ?? null,
                status: pick(caseDetails, "status", "caseStatus") ?? null,
                priority: pick(caseDetails, "priority", "casePriority", "case_priority") ?? null,

                profile_name: pick(profile, "name", "fullName") ?? null,
                profile_alias: pick(profile, "alias") ?? null,
                profile_sex: pick(profile, "sex") ?? null,
                profile_gender: pick(profile, "gender") ?? null,
                profile_birth_date: normalizeDate(pick(profile, "birthday", "birthDate", "birth_date", "dob", "dateOfBirth")),
                profile_age:
                    pick(profile, "age") ??
                    computeAge(normalizeDate(pick(profile, "birthday", "birthDate", "birth_date", "dob", "dateOfBirth"))),
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
                violation_previous_offense: pick(violation, "previousOffense", "previouseOffense", "prevOffense", "previous_offense") ?? null,

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
                complainant_birth_date: normalizeDate(pick(complainant, "birthday", "birthDate", "birth_date", "dob", "dateOfBirth")),
                complainant_address: pick(complainant, "address") ?? null,

                remarks: pick(remarks, "remarks", "notes") ?? null,

                referral_region: pick(referral, "region") ?? null,
                referral_province: pick(referral, "province") ?? null,
                referral_city: pick(referral, "city") ?? null,
                referral_barangay: pick(referral, "barangay") ?? null,
                referral_referred_to: pick(referral, "referredTo", "referred_to") ?? null,
                referral_date_referred: normalizeDate(pick(referral, "dateReferred", "date_referred")),
                referral_reason: pick(referral, "referralReason", "reason", "referral_reason") ?? null,
            };

            console.log("💾 Final case payload:", casePayload);

            await createOrUpdateLocalCase({
                casePayload,
                familyMembers: familyRows,
                targetId: row?.id ?? null,
                localId: row?.localId ?? null,
                mode: isEditing ? "update" : "create",
            });

            // Done - close modal and clean up
            resetAll();
            setOpen(false);
            
            // Call onSuccess callback to reload data in parent component
            if (onSuccess) {
                await onSuccess();
            }
            
            const online = isBrowserOnline();
            toast.success(isEditing ? "Changes Saved" : "Case Saved", {
                description: online
                    ? "Sync queued. Remote data will update shortly."
                    : "Changes stored locally and will sync once reconnected.",
            });
        } catch (err) {
            console.error("Failed to create/update CICL/CAR record:", err);
            toast.error(isEditing ? "Update Failed" : "Creation Failed", {
                description: err.message || "An error occurred while saving the case.",
            });
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

    // Only reset the form store when dialog closes to avoid wiping prefilled values on open
    useEffect(() => {
        if (!open) {
            resetAll();
        }
    }, [open, resetAll]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit CICL/CAR Record</DialogTitle>
                </DialogHeader>

                {/* Delay mounting tab content until prefill is done so defaultValues take effect */}
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
                                    className="flex items-center whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    <Badge variant="secondary">{i + 1}</Badge>
                                    {tab.replace(/-/g, " ").replace("2", "")}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    {/*//* MAIN TAB CONTENT */}
                    {prefillLoading ? (
                        <div className="p-6 text-sm text-muted-foreground">Loading case data…</div>
                    ) : (
                        <>
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
                            <TabsContent value="Referral">
                                <ReferralForm
                                    // filepath: support correct section key; legacy 'referal' still read in handleCreate
                                    sectionKey="referral"
                                    goNext={goNext}
                                    goBack={goBack}
                                    isSaving={isSaving}
                                    isEditing={true}
                                />
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
