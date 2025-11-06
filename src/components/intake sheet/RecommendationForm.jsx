"use client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";
import { submitCase } from "@/lib/caseSubmission";
import { Label } from "@/components/ui/label";
import supabase from "@/../config/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  IconCircleCheckFilled,
  IconClipboardText,
  IconCheckbox,
  IconLoader,
} from "@tabler/icons-react";

// DISABLED FOR TESTING: All fields are now optional
const schema = z.object({
  recommendation: z
    .string()
    .trim()
    .refine(
      (val) => val.split(/\s+/).filter(Boolean).length >= 5,
      "Please provide recommendation (min 5 words)"
    ),
});

export function RecommendationForm({ sectionKey, goNext, goBack, isSecond, submitLabel, onSuccess, setOpen, isEditMode }) {
  const { data, setSectionField } = useIntakeFormStore();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      recommendation: data[sectionKey]?.recommendation || "",
    },
  });

  // State for case managers from database
  const [caseManagers, setCaseManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(true);

  // Fetch case managers from database
  useEffect(() => {
    async function fetchCaseManagers() {
      try {
        const { data: profiles, error } = await supabase
          .from("profile")
          .select("id, full_name, email")
          .eq("status", "active")
          .eq("role", "case manager")
          .order("full_name", { ascending: true });

        if (error) {
          console.error("Error fetching case managers:", error);
          toast.error("Failed to load case managers");
          return;
        }

        setCaseManagers(profiles || []);
      } catch (err) {
        console.error("Unexpected error fetching case managers:", err);
      } finally {
        setLoadingManagers(false);
      }
    }

    fetchCaseManagers();
  }, []);

  const statuses = [
    {
      value: "Filed",
      label: "Filed",
      icon: <IconClipboardText className="text-gray-500" size={16} />,
    },
    {
      value: "Assessed",
      label: "Assessed",
      icon: <IconCheckbox className="text-blue-500" size={16} />,
    },
    {
      value: "In Process",
      label: "In Process",
      icon: <IconLoader className="text-orange-500 animate-spin" size={16} />,
    },
    {
      value: "Resolved",
      label: "Resolved",
      icon: <IconCircleCheckFilled className="text-green-500" size={16} />,
    },
  ];

  const priorities = [
    {
      value: "Low",
      label: "Low",
      className: "bg-green-100 text-green-700",
    },
    {
      value: "Medium",
      label: "Medium",
      className: "bg-yellow-100 text-yellow-700",
    },
    {
      value: "High",
      label: "High",
      className: "bg-red-100 text-red-700",
    },
  ];

  const [priority, setPriority] = useState(data.caseDetails?.priority || undefined);
  const current = priorities.find((p) => p.value === priority);

  const [submitting, setSubmitting] = useState(false);

  async function handleFinalSubmit(finalData) {
    setSubmitting(true);
    try {
      const { caseId, error } = await submitCase(finalData);
      if (error) {
        console.error("Case submission error", error);
        toast.error("Failed to save case", {
          description: error.message || "Unknown error",
        });
        return;
      }
      toast.success("Case saved", {
        description: `Case ID: ${caseId}`,
      });
      
      // Close the dialog
      if (setOpen) {
        setOpen(false);
      }
      
      // Trigger refresh of case data
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(values) {
    setSectionField(sectionKey, values);

    // In edit mode, always use goNext (which will trigger handleUpdate on last tab)
    if (isEditMode) {
      goNext();
      return;
    }

    // In create mode, check if this is the second/final form
    if (isSecond) {
      const finalData = {
        ...data,
        [sectionKey]: { ...(data[sectionKey] || {}), ...values },
      };
      handleFinalSubmit(finalData);
    } else {
      goNext();
    }
  }

  function handleCaseDetailChange(field, value) {
    setSectionField("caseDetails", field, value);
  }

  return (
    <div className="flex w-full gap-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
          <div className="flex gap-4">
            {/* LEFT COLUMN - Case Details (Only show in Part 2) */}
            {isSecond && (
              <div className="w-3/12 flex flex-col items-center justify-center border rounded-lg p-4">
                <span className="font-bold mb-2">Case Details</span>

                {/* Case Manager */}
                <div className="space-y-1 mb-1">
                  <Label htmlFor="caseManager">Case Manager</Label>
                  <Select
                    defaultValue={data.caseDetails?.caseManager}
                    onValueChange={(val) => handleCaseDetailChange("caseManager", val)}
                    disabled={loadingManagers}
                  >
                    <SelectTrigger className="w-[225px]" id="caseManager">
                      <SelectValue placeholder={loadingManagers ? "Loading..." : "Select Case Manager"} />
                    </SelectTrigger>
                    <SelectContent>
                      {caseManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.full_name}>
                          {manager.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1 mb-1">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    defaultValue={data.caseDetails?.status}
                    onValueChange={(val) => handleCaseDetailChange("status", val)}
                  >
                    <SelectTrigger className="w-[225px]" id="status">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            {status.icon}
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-1 mb-1">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    defaultValue={data.caseDetails?.priority}
                    onValueChange={(val) => {
                      handleCaseDetailChange("priority", val);
                      setPriority(val);
                    }}
                  >
                    <SelectTrigger
                      id="priority"
                      className={`w-[225px] ${current?.className || ""}`}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem
                          key={p.value}
                          value={p.value}
                          className={`px-2 py-0.5 rounded-md text-sm font-medium ${p.className}`}
                        >
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* RIGHT COLUMN - Recommendation */}
            <div className={`${isSecond ? "w-9/12" : "w-full"}`}>
              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Enter recommendation..."
                        className="min-h-80 resize w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between w-full">
            <Button type="button" variant="outline" onClick={goBack}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : (submitLabel || (isSecond ? "Submit All" : "Next"))}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
