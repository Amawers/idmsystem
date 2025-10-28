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
import supabase from "@/../config/supabase";
import { buildCasePayload } from "@/lib/caseSubmission";

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

export default function IntakeSheetCaseEdit({ open, onOpenChange, row }) {
    // index-based tab state and completed set (match FAC behavior)
    const [currentTabIndex, setCurrentTabIndex] = useState(0);
    const [completedTabs, setCompletedTabs] = useState(new Set());
    const [prefilled, setPrefilled] = useState(false);
    const [saving, setSaving] = useState(false);

    const { resetAll, setSectionField } = useIntakeFormStore();

    // Helpers to format dates for inputs
    const toLocalDate = (val) => {
        if (!val) return "";
        // Accept 'YYYY-MM-DD' or ISO; return 'YYYY-MM-DD'
        if (typeof val === "string") {
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
            // Try ISO
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                return `${yyyy}-${mm}-${dd}`;
            }
        }
        return "";
    };

    const toLocalDateTime = (val) => {
        if (!val) return "";
        // Expected by <input type="datetime-local"> → 'YYYY-MM-DDTHH:mm'
        if (typeof val === "string" && val.includes("T")) {
            // Strip seconds/timezone if present
            return val.slice(0, 16);
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const hh = String(d.getHours()).padStart(2, "0");
            const mi = String(d.getMinutes()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
        }
        return "";
    };

    // Distinguish Part 2 family members with a stable group offset
    const PART2_GROUP_BASE = 2000;

    // Prefill Zustand store from the selected row
    useEffect(() => {
        if (!open) {
            // Clear any prefilled values when closing the edit modal
            resetAll();
            setPrefilled(false);
            setCurrentTabIndex(0);
            setCompletedTabs(new Set());
            return;
        }
        if (!row) return;

        try {
            resetAll();

            // Case Details
            setSectionField("caseDetails", {
                caseManager: row.case_manager || undefined,
                status: row.status || undefined,
                priority: row.priority || undefined,
                visibility: row.visibility || undefined,
            });

            // Part 1: Identifying
            setSectionField("IdentifyingData", {
                intakeDate: toLocalDate(row.identifying_intake_date),
                name: row.header || row.identifying_name || undefined,
                referralSource: row.identifying_referral_source || undefined,
                alias: row.identifying_alias || undefined,
                age: row.identifying_age || undefined,
                status: (row.identifying_status ?? undefined)?.toString?.().toLowerCase?.(),
                occupation: row.identifying_occupation || undefined,
                income: row.identifying_income || undefined,
                sex: (row.identifying_sex ?? undefined)?.toString?.().toLowerCase?.(),
                address: row.identifying_address || undefined,
                caseType: row.identifying_case_type || undefined,
                religion: row.identifying_religion || undefined,
                educationalAttainment: row.identifying_educational_attainment || undefined,
                contactPerson: row.identifying_contact_person || undefined,
                birthday: toLocalDate(row.identifying_birthday),
                birthPlace: row.identifying_birth_place || undefined,
                respondentName: row.identifying_respondent_name || undefined,
            });

            // Part 1: Perpetrator
            setSectionField("PerpetratorInfo", {
                name: row.perpetrator_name || undefined,
                age: row.perpetrator_age || undefined,
                alias: row.perpetrator_alias || undefined,
                sex: row.perpetrator_sex || undefined,
                address: row.perpetrator_address || undefined,
                victimRelation: row.perpetrator_victim_relation || undefined,
                offenceType: row.perpetrator_offence_type || undefined,
                commissionDateTime: toLocalDateTime(row.perpetrator_commission_datetime),
            });

            // Part 1: Narratives
            setSectionField("PresentingProblem", { presentingProblem: row.presenting_problem || "" });
            setSectionField("BackgroundInfo", { backgroundInfo: row.background_info || "" });
            setSectionField("CommunityInfo", { communityInfo: row.community_info || "" });
            setSectionField("Assessment", { assessment: row.assessment || "" });
            setSectionField("Recommendation", { recommendation: row.recommendation || "" });

            // Family members: split into Part 1 and Part 2 using group_no offset
            if (Array.isArray(row.family_members) && row.family_members.length) {
                const part1 = [];
                const part2 = [];
                for (const fm of row.family_members) {
                    const base = Number(fm.group_no) || 0;
                    const target = base >= PART2_GROUP_BASE ? part2 : part1;
                    target.push({
                        name: fm.name || "",
                        age: fm.age || "",
                        relation: fm.relation || "",
                        status: fm.status || "",
                        education: fm.education || "",
                        occupation: fm.occupation || "",
                        income: fm.income || "",
                    });
                }
                setSectionField("FamilyData", { members: part1 });
                setSectionField("FamilyData2", { members: part2 });
            }

            // Part 2: Identifying2
            setSectionField("IdentifyingData2", {
                intakeDate: toLocalDate(row.identifying2_intake_date),
                name: row.identifying2_name || undefined,
                referralSource: row.identifying2_referral_source || undefined,
                alias: row.identifying2_alias || undefined,
                age: row.identifying2_age || undefined,
                status: (row.identifying2_status ?? undefined)?.toString?.().toLowerCase?.(),
                occupation: row.identifying2_occupation || undefined,
                income: row.identifying2_income || undefined,
                sex: (row.identifying2_sex ?? undefined)?.toString?.().toLowerCase?.(),
                address: row.identifying2_address || undefined,
                caseType: row.identifying2_case_type || undefined,
                religion: row.identifying2_religion || undefined,
                educationalAttainment: row.identifying2_educational_attainment || undefined,
                contactPerson: row.identifying2_contact_person || undefined,
                birthday: toLocalDate(row.identifying2_birthday),
                birthPlace: row.identifying2_birth_place || undefined,
                respondentName: row.identifying2_respondent_name || undefined,
            });

            // Part 2: Victim2
            setSectionField("VictimInfo2", {
                name: row.victim2_name || undefined,
                age: row.victim2_age || undefined,
                alias: row.victim2_alias || undefined,
                sex: row.victim2_sex || undefined,
                address: row.victim2_address || undefined,
                victimRelation: row.victim2_victim_relation || undefined,
                offenceType: row.victim2_offence_type || undefined,
                commissionDateTime: toLocalDateTime(row.victim2_commission_datetime),
            });

            // Part 2: Narratives
            setSectionField("PresentingProblem2", { presentingProblem: row.presenting_problem2 || "" });
            setSectionField("BackgroundInfo2", { backgroundInfo: row.background_info2 || "" });
            setSectionField("CommunityInfo2", { communityInfo: row.community_info2 || "" });
            setSectionField("Assessment2", { assessment: row.assessment2 || "" });
            setSectionField("Recommendation2", { recommendation: row.recommendation2 || "" });

            // If you maintain separate second-group family members in the future,
            // setSectionField("FamilyData2", { members: [...] });

            setPrefilled(true);
        } catch (e) {
            console.error("Failed to prefill intake store", e);
            toast.error("Failed to load record for editing");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, row]);

    useEffect(() => {
        if (row) {
            console.log("Record in IntakeSheetEdit:", row);
        }
    }, [row]);

    // Update existing record in Supabase
    const handleUpdate = async () => {
        if (!row?.id) return;
        try {
            setSaving(true);
            const all = useIntakeFormStore.getState().getAllData();

            // Merge both variants' payloads
            const p1 = buildCasePayload(all, false);
            const p2 = buildCasePayload(all, true);
            const payload = { ...p1, ...p2 };

            // Update main case row
            const { error: updateErr } = await supabase
                .from("case")
                .update(payload)
                .eq("id", row.id);
            if (updateErr) throw updateErr;

            // Refresh family members
            const members1 = Array.isArray(all?.FamilyData?.members) ? all.FamilyData.members : [];
            const members2 = Array.isArray(all?.FamilyData2?.members) ? all.FamilyData2.members : [];

            // Replace all existing rows for this case
            const { error: delErr } = await supabase
                .from("case_family_member")
                .delete()
                .eq("case_id", row.id);
            if (delErr) throw delErr;

            const fmRows = [];
            // Persist Part 1 members using natural sequence starting at 1
            members1.forEach((m, idx) => {
                fmRows.push({
                    case_id: row.id,
                    group_no: idx + 1,
                    name: m.name || null,
                    age: m.age || null,
                    relation: m.relation || null,
                    status: m.status || null,
                    education: m.education || null,
                    occupation: m.occupation || null,
                    income: m.income || null,
                });
            });
            // Persist Part 2 members with a stable offset to distinguish in future edits
            members2.forEach((m, idx) => {
                fmRows.push({
                    case_id: row.id,
                    group_no: PART2_GROUP_BASE + idx + 1,
                    name: m.name || null,
                    age: m.age || null,
                    relation: m.relation || null,
                    status: m.status || null,
                    education: m.education || null,
                    occupation: m.occupation || null,
                    income: m.income || null,
                });
            });

            if (fmRows.length > 0) {
                const { error: insErr } = await supabase
                    .from("case_family_member")
                    .insert(fmRows);
                if (insErr) throw insErr;
            }

            toast.success("Case updated successfully");
            onOpenChange(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to update case", { description: e.message });
        } finally {
            setSaving(false);
        }
    };

    // Go to next tab (final tab triggers update)
    const goNext = () => {
        setCompletedTabs((prev) => new Set([...prev, currentTabIndex]));
        if (currentTabIndex < tabOrder.length - 1) {
            setCurrentTabIndex((prev) => prev + 1);
        } else {
            // last tab → update existing record
            handleUpdate();
        }
    };

    // Go to previous tab
    const goBack = () => {
        if (currentTabIndex > 0) {
            setCurrentTabIndex((prev) => prev - 1);
        }
    };

    // Reset when dialog closes (additional to prefill effect above)
    useEffect(() => {
        if (!open) {
            setCurrentTabIndex(0);
            setCompletedTabs(new Set());
        }
    }, [open]);

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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="min-w-4/5 min-h-4/5 flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        Edit Case Record{saving ? " — Saving..." : ""}
                    </DialogTitle>
                </DialogHeader>

                {!prefilled ? (
                    <div className="p-6 text-sm text-muted-foreground">Loading record...</div>
                ) : (
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
                                submitLabel="Update"
                            />
                        </TabsContent>
                    </div>
                </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
