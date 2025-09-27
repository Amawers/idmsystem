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
            {/* <IdentifyingDataForm
                            sectionKey="IdentifyingData"
                            goNext={goNext}
                            goBack={goBack}
                        /> */}
            Profile-of-CICL/CAR
          </TabsContent>

          <TabsContent value="Family-Background">Family-Background</TabsContent>

          <TabsContent value="Violation-Offense-of-CICL/CAR">
            Violation-Offense-of-CICL/CAR
          </TabsContent>

          <TabsContent value="Record-Details">Record-Details</TabsContent>

          <TabsContent value="Complainant">Complainant</TabsContent>

          <TabsContent value="Remarks">Remarks</TabsContent>

          <TabsContent value="Services">Services</TabsContent>

          <TabsContent value="Referral">Referral</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
