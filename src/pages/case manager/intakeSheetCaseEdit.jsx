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

export default function IntakeSheetCaseEdit({ open, onOpenChange, row }) {
    // index-based tab state and completed set (match FAC behavior)
    const [currentTabIndex, setCurrentTabIndex] = useState(0);
    const [completedTabs, setCompletedTabs] = useState(new Set());

    useEffect(() => {
        if (row) {
            console.log("Record in IntakeSheetEdit:", row);
        }
    }, [row]);

    // Go to next tab
    const goNext = () => {
        setCompletedTabs((prev) => new Set([...prev, currentTabIndex]));
        if (currentTabIndex < tabOrder.length - 1) {
            setCurrentTabIndex((prev) => prev + 1);
        } else {
            // last tab completed - close dialog
            onOpenChange(false);
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
                    <DialogTitle>Intake Sheet Edits</DialogTitle>
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
                                    disabled={index > currentTabIndex && !completedTabs.has(index)}
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
                                isSecond={true}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
