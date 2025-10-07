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
import { LocationForm } from "@/components/intake sheet FAC/LocationForm";
import { HeadOfFamilyForm } from "@/components/intake sheet FAC/HeadOfFamilyForm";
import { FamilyInformationForm } from "@/components/intake sheet FAC/FamilyInformationForm";
import { VulnerableMembersForm } from "@/components/intake sheet FAC/VulnerableMembersForm";
import { FinalDetailsForm } from "@/components/intake sheet FAC/FinalDetailsForm";

const tabOrder = [
  "location-of-affected-family",
  "head-of-family",
  "family-information",
  "vulnerable-members",
  "final-details",
];

export default function IntakeSheetFAC({ open, setOpen }) {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [completedTabs, setCompletedTabs] = useState(new Set());

  // Go to next tab
  const goNext = () => {
    setCompletedTabs((prev) => new Set([...prev, currentTabIndex]));
    if (currentTabIndex < tabOrder.length - 1) {
      setCurrentTabIndex((prev) => prev + 1);
    } else {
      // Last tab completed - close dialog
      setOpen(false);
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
    const container = document.getElementById("fac-tabs-container");
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
          <DialogTitle>Family Assistance Card</DialogTitle>
        </DialogHeader>

        <Tabs
          value={currentTab}
          onValueChange={(tab) => setCurrentTabIndex(tabOrder.indexOf(tab))}
          className="w-full flex flex-col gap-4"
        >
          {/* Scrollable Tabs */}
          <div
            id="fac-tabs-container"
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
                  {/* Show completion badge */}
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
                  {tab.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Main tab content */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="location-of-affected-family">
              <LocationForm
                sectionKey="locationOfAffectedFamily"
                goNext={goNext}
                goBack={goBack}
              />
            </TabsContent>

            <TabsContent value="head-of-family">
              <HeadOfFamilyForm
                sectionKey="headOfFamily"
                goNext={goNext}
                goBack={goBack}
              />
            </TabsContent>

            <TabsContent value="family-information">
              <FamilyInformationForm
                sectionKey="familyInformation"
                goNext={goNext}
                goBack={goBack}
              />
            </TabsContent>

            <TabsContent value="vulnerable-members">
              <VulnerableMembersForm
                sectionKey="vulnerableMembers"
                goNext={goNext}
                goBack={goBack}
              />
            </TabsContent>

            <TabsContent value="final-details">
              <FinalDetailsForm
                sectionKey="finalDetails"
                goNext={goNext}
                goBack={goBack}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}