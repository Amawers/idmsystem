/**
 * @file IncidenceVACForm.jsx
 * @description Incidence on Violence Against Children (VAC) form component
 * Displays a table with fixed barangay records and nested column structure for tracking VAC incidents
 * 
 * @author IDM System
 * @date 2025-10-29
 */

"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconX, IconPlus, IconFilter, IconEye, IconEyeOff, IconChevronDown } from "@tabler/icons-react";
import supabase from "@/../config/supabase";

// Fixed list of barangays
const BARANGAYS = [
  "Balacanas",
  "Dayawan",
  "Imelda",
  "Katipunan",
  "Kimaya",
  "Looc",
  "Poblacion 1",
  "Poblacion 2",
  "Poblacion 3",
  "San Martin",
  "Tambobong",
];

// Schema for a single barangay record
const barangayRecordSchema = z.object({
  barangay: z.string(),
  vacVictims: z.string().default("0"),
  genderMale: z.string().default("0"),
  genderFemale: z.string().default("0"),
  age0to4: z.string().default("0"),
  age5to9: z.string().default("0"),
  age10to14: z.string().default("0"),
  age15to17: z.string().default("0"),
  age18Plus: z.string().default("0"),
  physicalAbuse: z.string().default("0"),
  sexualAbuse: z.string().default("0"),
  psychologicalAbuse: z.string().default("0"),
  neglect: z.string().default("0"),
  violenceOthers: z.string().default("0"),
  perpImmediateFamily: z.string().default("0"),
  perpCloseRelative: z.string().default("0"),
  perpAcquaintance: z.string().default("0"),
  perpStranger: z.string().default("0"),
  perpLocalOfficial: z.string().default("0"),
  perpLawOfficer: z.string().default("0"),
  perpOthers: z.string().default("0"),
  actionLSWDO: z.string().default("0"),
  actionPNP: z.string().default("0"),
  actionNBI: z.string().default("0"),
  actionMedical: z.string().default("0"),
  actionLegal: z.string().default("0"),
  actionOthers: z.string().default("0"),
});

// Main schema
const schema = z.object({
  province: z.string().default("Misamis Oriental"),
  municipality: z.string().default("Villanueva"),
  records: z.array(barangayRecordSchema),
  // Case management fields
  caseManagers: z.array(z.string()).default([]),
  status: z.string().optional(),
});

// Initialize default records for all barangays
const initializeRecords = () => {
  return BARANGAYS.map((barangay) => ({
    barangay,
    vacVictims: "0",
    genderMale: "0",
    genderFemale: "0",
    age0to4: "0",
    age5to9: "0",
    age10to14: "0",
    age15to17: "0",
    age18Plus: "0",
    physicalAbuse: "0",
    sexualAbuse: "0",
    psychologicalAbuse: "0",
    neglect: "0",
    violenceOthers: "0",
    perpImmediateFamily: "0",
    perpCloseRelative: "0",
    perpAcquaintance: "0",
    perpStranger: "0",
    perpLocalOfficial: "0",
    perpLawOfficer: "0",
    perpOthers: "0",
    actionLSWDO: "0",
    actionPNP: "0",
    actionNBI: "0",
    actionMedical: "0",
    actionLegal: "0",
    actionOthers: "0",
  }));
};

export function IncidenceVACForm({ sectionKey, goNext, goBack, isSaving, isEditMode }) {
  const { data, setSectionField } = useIntakeFormStore();
  const [availableCaseManagers, setAvailableCaseManagers] = useState([]);
  const [isCaseManagerDropdownOpen, setIsCaseManagerDropdownOpen] = useState(false);
  const [selectedCaseManagerValue, setSelectedCaseManagerValue] = useState("");
  const [selectedBarangays, setSelectedBarangays] = useState(BARANGAYS); // All barangays selected by default
  const [visibleColumns, setVisibleColumns] = useState({
    barangay: true,
    vacVictims: true,
    gender: true,
    age: true,
    violence: true,
    perpetrators: true,
    actions: true,
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      province: "Misamis Oriental",
      municipality: "Villanueva",
      records: data[sectionKey]?.records || initializeRecords(),
      caseManagers: data[sectionKey]?.caseManagers || [],
      status: data[sectionKey]?.status || "",
    },
  });

  // Fetch case managers on component mount
  useEffect(() => {
    const fetchCaseManagers = async () => {
      try {
        const { data: users, error } = await supabase
          .from("profile")
          .select("id, full_name, role")
          .eq("role", "case_manager")
          .eq("status", "active")
          .order("full_name", { ascending: true });

        if (error) {
          console.error("Error fetching case managers:", error);
          return;
        }

        setAvailableCaseManagers(users || []);
      } catch (err) {
        console.error("Failed to fetch case managers:", err);
      }
    };

    fetchCaseManagers();
  }, []);

  // Update form values when data changes (for edit mode)
  useEffect(() => {
    if (data[sectionKey]) {
      form.reset({
        province: "Misamis Oriental",
        municipality: "Villanueva",
        records: data[sectionKey]?.records || initializeRecords(),
        caseManagers: data[sectionKey]?.caseManagers || [],
        status: data[sectionKey]?.status || "",
      });
    }
  }, [data, sectionKey, form]);

  // Calculate totals for all numeric fields
  const calculateTotals = (records) => {
    const totals = {
      barangay: "TOTAL",
      vacVictims: 0,
      genderMale: 0,
      genderFemale: 0,
      age0to4: 0,
      age5to9: 0,
      age10to14: 0,
      age15to17: 0,
      age18Plus: 0,
      physicalAbuse: 0,
      sexualAbuse: 0,
      psychologicalAbuse: 0,
      neglect: 0,
      violenceOthers: 0,
      perpImmediateFamily: 0,
      perpCloseRelative: 0,
      perpAcquaintance: 0,
      perpStranger: 0,
      perpLocalOfficial: 0,
      perpLawOfficer: 0,
      perpOthers: 0,
      actionLSWDO: 0,
      actionPNP: 0,
      actionNBI: 0,
      actionMedical: 0,
      actionLegal: 0,
      actionOthers: 0,
    };

    records.forEach((record) => {
      Object.keys(totals).forEach((key) => {
        if (key !== "barangay") {
          totals[key] += parseInt(record[key] || 0, 10);
        }
      });
    });

    return totals;
  };

  const records = form.watch("records");
  const caseManagers = form.watch("caseManagers");
  
  // Calculate totals only for selected barangays
  const filteredRecords = records.filter(record => selectedBarangays.includes(record.barangay));
  const totals = calculateTotals(filteredRecords);

  // Calculate VAC victims count for a single record
  const calculateVacVictims = (record) => {
    const sum = 
      parseInt(record.genderMale || 0, 10) +
      parseInt(record.genderFemale || 0, 10) +
      parseInt(record.age0to4 || 0, 10) +
      parseInt(record.age5to9 || 0, 10) +
      parseInt(record.age10to14 || 0, 10) +
      parseInt(record.age15to17 || 0, 10) +
      parseInt(record.age18Plus || 0, 10) +
      parseInt(record.physicalAbuse || 0, 10) +
      parseInt(record.sexualAbuse || 0, 10) +
      parseInt(record.psychologicalAbuse || 0, 10) +
      parseInt(record.neglect || 0, 10) +
      parseInt(record.violenceOthers || 0, 10) +
      parseInt(record.perpImmediateFamily || 0, 10) +
      parseInt(record.perpCloseRelative || 0, 10) +
      parseInt(record.perpAcquaintance || 0, 10) +
      parseInt(record.perpStranger || 0, 10) +
      parseInt(record.perpLocalOfficial || 0, 10) +
      parseInt(record.perpLawOfficer || 0, 10) +
      parseInt(record.perpOthers || 0, 10) +
      parseInt(record.actionLSWDO || 0, 10) +
      parseInt(record.actionPNP || 0, 10) +
      parseInt(record.actionNBI || 0, 10) +
      parseInt(record.actionMedical || 0, 10) +
      parseInt(record.actionLegal || 0, 10) +
      parseInt(record.actionOthers || 0, 10);
    return sum.toString();
  };

  // Handle input change for individual cell
  const handleCellChange = (recordIndex, field, value) => {
    const updatedRecords = [...records];
    updatedRecords[recordIndex] = {
      ...updatedRecords[recordIndex],
      [field]: value,
      // Auto-calculate VAC victims
      vacVictims: calculateVacVictims({
        ...updatedRecords[recordIndex],
        [field]: value,
      }),
    };
    form.setValue("records", updatedRecords);
    setSectionField(sectionKey, "records", updatedRecords);
  };

  // Handle adding a case manager from dropdown
  const handleAddCaseManager = (managerId) => {
    const manager = availableCaseManagers.find(m => m.id === managerId);
    if (manager && !caseManagers.includes(manager.full_name)) {
      const updated = [...caseManagers, manager.full_name];
      form.setValue("caseManagers", updated);
      setSectionField(sectionKey, "caseManagers", updated);
    }
    // Reset the select value to allow re-selecting the same manager later
    setSelectedCaseManagerValue("");
    // Keep dropdown open for adding more managers
    setTimeout(() => setIsCaseManagerDropdownOpen(true), 0);
  };

  // Handle removing a case manager
  const handleRemoveCaseManager = (index) => {
    const updated = caseManagers.filter((_, i) => i !== index);
    form.setValue("caseManagers", updated);
    setSectionField(sectionKey, "caseManagers", updated);
  };

  // Toggle column group visibility
  const toggleColumnGroup = (group) => {
    setVisibleColumns(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Show all columns
  const showAllColumns = () => {
    setVisibleColumns({
      barangay: true,
      vacVictims: true,
      gender: true,
      age: true,
      violence: true,
      perpetrators: true,
      actions: true,
    });
  };

  // Hide all except barangay
  const hideAllColumns = () => {
    setVisibleColumns({
      barangay: true,
      vacVictims: false,
      gender: false,
      age: false,
      violence: false,
      perpetrators: false,
      actions: false,
    });
  };

  // Toggle barangay selection
  const toggleBarangay = (barangay) => {
    setSelectedBarangays(prev => {
      if (prev.includes(barangay)) {
        return prev.filter(b => b !== barangay);
      } else {
        return [...prev, barangay];
      }
    });
  };

  // Select all barangays
  const selectAllBarangays = () => {
    setSelectedBarangays(BARANGAYS);
  };

  // Deselect all barangays
  const deselectAllBarangays = () => {
    setSelectedBarangays([]);
  };

  function onSubmit(values) {
    const caseDetails = {
      caseManagers: values.caseManagers,
      status: values.status,
    };

    const finalData = {
      ...values,
      caseDetails,
    };

    console.log("✅ Submitted IVAC values:", finalData);
    Object.keys(finalData).forEach((key) => {
      setSectionField(sectionKey, key, finalData[key]);
    });
    goNext();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex gap-6 max-h-[68vh]"
      >
        {/* Left Sidebar - Case Management (1/3) */}
        <div className="w-3/12 space-y-4 pr-4 border-r">
          <div className="sticky top-0">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Case Management Details</h3>
            
            {/* Case Managers Section */}
            <div className="mb-4">
              <FormLabel>Case Managers</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                {caseManagers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No case managers assigned yet</p>
                ) : (
                  caseManagers.map((manager, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1 pl-3 pr-1 py-1">
                      {manager}
                      <button
                        type="button"
                        onClick={() => handleRemoveCaseManager(index)}
                        className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                      >
                        <IconX className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
              <Select 
                value={selectedCaseManagerValue}
                open={isCaseManagerDropdownOpen} 
                onOpenChange={setIsCaseManagerDropdownOpen}
                onValueChange={handleAddCaseManager}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add Case Manager" />
                </SelectTrigger>
                <SelectContent>
                  {availableCaseManagers.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No available case managers
                    </div>
                  ) : (
                    availableCaseManagers
                      .filter(manager => !caseManagers.includes(manager.full_name))
                      .map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.full_name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-muted" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Municipality</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-muted" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSectionField(sectionKey, "status", val);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Footer buttons in sidebar */}
            <div className="mt-6 pt-4 border-t space-y-2">
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (isEditMode ? "Updating..." : "Submitting...") : (isEditMode ? "Update" : "Submit")}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={goBack} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        </div>

        {/* Right Content - Form Table (2/3) */}
        <div className="w-9/12 flex flex-col">
          {/* Filters Section */}
          <div className="mb-4 pb-4 border-b flex items-center gap-3">
            {/* Column Groups Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <IconFilter className="h-4 w-4 mr-2" />
                  Column Groups
                  <IconChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.vacVictims}
                  onCheckedChange={() => toggleColumnGroup('vacVictims')}
                >
                  <span className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-800 mr-2 inline-block"></span>
                  VAC Victims
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.gender}
                  onCheckedChange={() => toggleColumnGroup('gender')}
                >
                  <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-800 mr-2 inline-block"></span>
                  Gender
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.age}
                  onCheckedChange={() => toggleColumnGroup('age')}
                >
                  <span className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-800 mr-2 inline-block"></span>
                  Age Groups
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.violence}
                  onCheckedChange={() => toggleColumnGroup('violence')}
                >
                  <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-800 mr-2 inline-block"></span>
                  Types of Violence
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.perpetrators}
                  onCheckedChange={() => toggleColumnGroup('perpetrators')}
                >
                  <span className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-800 mr-2 inline-block"></span>
                  Perpetrators
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.actions}
                  onCheckedChange={() => toggleColumnGroup('actions')}
                >
                  <span className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-800 mr-2 inline-block"></span>
                  Actions Taken
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <div className="flex gap-1 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={showAllColumns}
                    className="h-7 text-xs flex-1"
                  >
                    <IconEye className="h-3 w-3 mr-1" />
                    Show All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={hideAllColumns}
                    className="h-7 text-xs flex-1"
                  >
                    <IconEyeOff className="h-3 w-3 mr-1" />
                    Hide All
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Barangay Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <IconFilter className="h-4 w-4 mr-2" />
                  Barangays ({selectedBarangays.length}/{BARANGAYS.length})
                  <IconChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Filter by Barangay</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {BARANGAYS.map((barangay) => (
                  <DropdownMenuCheckboxItem
                    key={barangay}
                    checked={selectedBarangays.includes(barangay)}
                    onCheckedChange={() => toggleBarangay(barangay)}
                  >
                    {barangay}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <div className="flex gap-1 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllBarangays}
                    className="h-7 text-xs flex-1"
                  >
                    <IconEye className="h-3 w-3 mr-1" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllBarangays}
                    className="h-7 text-xs flex-1"
                  >
                    <IconEyeOff className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Scrollable table body */}
          <div className="overflow-auto pr-2 flex-1">
          <table className="w-full border-collapse border border-border text-sm relative">
            <thead className="sticky top-0 z-20 bg-background after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:z-10">
              {/* Main headers row */}
              <tr className="bg-background">
                <th rowSpan={2} className="sticky left-0 z-30 border border-border bg-muted p-2 text-center font-bold text-xs min-w-[120px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:right-0 after:w-[2px] after:bg-primary">
                  Barangay
                </th>
                {visibleColumns.vacVictims && (
                  <th colSpan={1} className="border border-border bg-blue-50 dark:bg-blue-950/30 p-2 text-center font-bold text-xs">
                    VAC Victims
                  </th>
                )}
                {visibleColumns.gender && (
                  <th colSpan={2} className="border border-border bg-green-50 dark:bg-green-950/30 p-2 text-center font-bold text-xs">
                    Gender
                  </th>
                )}
                {visibleColumns.age && (
                  <th colSpan={5} className="border border-border bg-yellow-50 dark:bg-yellow-950/30 p-2 text-center font-bold text-xs">
                    Age
                  </th>
                )}
                {visibleColumns.violence && (
                  <th colSpan={5} className="border border-border bg-red-50 dark:bg-red-950/30 p-2 text-center font-bold text-xs">
                    Types of Violence
                  </th>
                )}
                {visibleColumns.perpetrators && (
                  <th colSpan={7} className="border border-border bg-purple-50 dark:bg-purple-950/30 p-2 text-center font-bold text-xs">
                    Perpetrators
                  </th>
                )}
                {visibleColumns.actions && (
                  <th colSpan={6} className="border border-border bg-orange-50 dark:bg-orange-950/30 p-2 text-center font-bold text-xs">
                    Actions Taken by Barangay/BCPO
                  </th>
                )}
              </tr>
              {/* Sub-headers row */}
              <tr className="bg-background">
                {visibleColumns.vacVictims && (
                  <th className="border border-border bg-blue-50 dark:bg-blue-950/30 p-2 text-center font-semibold text-xs min-w-[100px]">
                    No. of VAC Victims
                  </th>
                )}
                {visibleColumns.gender && (
                  <>
                    <th className="border border-border bg-green-50 dark:bg-green-950/30 p-2 text-center font-semibold text-xs min-w-[80px]">Male</th>
                    <th className="border border-border bg-green-50 dark:bg-green-950/30 p-2 text-center font-semibold text-xs min-w-[80px]">Female</th>
                  </>
                )}
                {visibleColumns.age && (
                  <>
                    <th className="border border-border bg-yellow-50 dark:bg-yellow-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">0–4 Y.O<br/>(3a)</th>
                    <th className="border border-border bg-yellow-50 dark:bg-yellow-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">5–9 Y.O<br/>(3b)</th>
                    <th className="border border-border bg-yellow-50 dark:bg-yellow-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">10–14 Y.O<br/>(3c)</th>
                    <th className="border border-border bg-yellow-50 dark:bg-yellow-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">15–17 Y.O<br/>(3d)</th>
                    <th className="border border-border bg-yellow-50 dark:bg-yellow-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">18+ Y.O</th>
                  </>
                )}
                {visibleColumns.violence && (
                  <>
                    <th className="border border-border bg-red-50 dark:bg-red-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Physical<br/>(4a)</th>
                    <th className="border border-border bg-red-50 dark:bg-red-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Sexual<br/>(4b)</th>
                    <th className="border border-border bg-red-50 dark:bg-red-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Psych<br/>(4c)</th>
                    <th className="border border-border bg-red-50 dark:bg-red-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Neglect<br/>(4d)</th>
                    <th className="border border-border bg-red-50 dark:bg-red-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Others<br/>(4e)</th>
                  </>
                )}
                {visibleColumns.perpetrators && (
                  <>
                    <th className="border border-border bg-purple-50 dark:bg-purple-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Immed Fam<br/>(5a)</th>
                    <th className="border border-border bg-purple-50 dark:bg-purple-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Close Rel<br/>(5b)</th>
                    <th className="border border-border bg-purple-50 dark:bg-purple-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Acquaint<br/>(5c)</th>
                    <th className="border border-border bg-purple-50 dark:bg-purple-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Stranger<br/>(5d)</th>
                    <th className="border border-border bg-purple-50 dark:bg-purple-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Local Off<br/>(5e)</th>
                    <th className="border border-border bg-purple-50 dark:bg-purple-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Law Off<br/>(5f)</th>
                    <th className="border border-border bg-purple-50 dark:bg-purple-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Others<br/>(5g)</th>
                  </>
                )}
                {visibleColumns.actions && (
                  <>
                    <th className="border border-border bg-orange-50 dark:bg-orange-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">LSWDO<br/>(6a)</th>
                    <th className="border border-border bg-orange-50 dark:bg-orange-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">PNP<br/>(6b)</th>
                    <th className="border border-border bg-orange-50 dark:bg-orange-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">NBI<br/>(6c)</th>
                    <th className="border border-border bg-orange-50 dark:bg-orange-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Medical<br/>(6d)</th>
                    <th className="border border-border bg-orange-50 dark:bg-orange-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Legal<br/>(6e)</th>
                    <th className="border border-border bg-orange-50 dark:bg-orange-950/30 p-2 text-center font-semibold text-xs min-w-[90px]">Others<br/>(6f)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Table Body - Barangay Records */}
              {records
                .filter(record => selectedBarangays.includes(record.barangay))
                .map((record, index) => {
                  // Find the original index for handleCellChange
                  const originalIndex = records.findIndex(r => r.barangay === record.barangay);
                  return (
                <tr key={index} className="border-b border-border hover:bg-muted/30">
                  <td className="sticky left-0 z-10 border border-border p-2 font-medium bg-muted text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] relative after:content-[''] after:absolute after:top-0 after:bottom-0 after:right-0 after:w-[2px] after:bg-primary">{record.barangay}</td>
                  {/* VAC Victims - Blue (Auto-calculated, Read-only) */}
                  {visibleColumns.vacVictims && (
                    <td className="border border-border p-2 bg-blue-50/50 dark:bg-blue-950/20">
                      <div className="h-8 flex items-center justify-center font-semibold text-blue-700 dark:text-blue-300">
                        {record.vacVictims}
                      </div>
                    </td>
                  )}
                  {/* Gender - Green */}
                  {visibleColumns.gender && (
                    <>
                      <td className="border border-border p-1 bg-green-50/50 dark:bg-green-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.genderMale} onChange={(e) => handleCellChange(originalIndex, "genderMale", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-green-50/50 dark:bg-green-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.genderFemale} onChange={(e) => handleCellChange(originalIndex, "genderFemale", e.target.value)} />
                      </td>
                    </>
                  )}
                  {/* Age - Yellow */}
                  {visibleColumns.age && (
                    <>
                      <td className="border border-border p-1 bg-yellow-50/50 dark:bg-yellow-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.age0to4} onChange={(e) => handleCellChange(originalIndex, "age0to4", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-yellow-50/50 dark:bg-yellow-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.age5to9} onChange={(e) => handleCellChange(originalIndex, "age5to9", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-yellow-50/50 dark:bg-yellow-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.age10to14} onChange={(e) => handleCellChange(originalIndex, "age10to14", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-yellow-50/50 dark:bg-yellow-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.age15to17} onChange={(e) => handleCellChange(originalIndex, "age15to17", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-yellow-50/50 dark:bg-yellow-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.age18Plus} onChange={(e) => handleCellChange(originalIndex, "age18Plus", e.target.value)} />
                      </td>
                    </>
                  )}
                  {/* Types of Violence - Red */}
                  {visibleColumns.violence && (
                    <>
                      <td className="border border-border p-1 bg-red-50/50 dark:bg-red-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.physicalAbuse} onChange={(e) => handleCellChange(originalIndex, "physicalAbuse", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-red-50/50 dark:bg-red-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.sexualAbuse} onChange={(e) => handleCellChange(originalIndex, "sexualAbuse", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-red-50/50 dark:bg-red-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.psychologicalAbuse} onChange={(e) => handleCellChange(originalIndex, "psychologicalAbuse", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-red-50/50 dark:bg-red-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.neglect} onChange={(e) => handleCellChange(originalIndex, "neglect", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-red-50/50 dark:bg-red-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.violenceOthers} onChange={(e) => handleCellChange(originalIndex, "violenceOthers", e.target.value)} />
                      </td>
                    </>
                  )}
                  {/* Perpetrators - Purple */}
                  {visibleColumns.perpetrators && (
                    <>
                      <td className="border border-border p-1 bg-purple-50/50 dark:bg-purple-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.perpImmediateFamily} onChange={(e) => handleCellChange(originalIndex, "perpImmediateFamily", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-purple-50/50 dark:bg-purple-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.perpCloseRelative} onChange={(e) => handleCellChange(originalIndex, "perpCloseRelative", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-purple-50/50 dark:bg-purple-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.perpAcquaintance} onChange={(e) => handleCellChange(originalIndex, "perpAcquaintance", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-purple-50/50 dark:bg-purple-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.perpStranger} onChange={(e) => handleCellChange(originalIndex, "perpStranger", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-purple-50/50 dark:bg-purple-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.perpLocalOfficial} onChange={(e) => handleCellChange(originalIndex, "perpLocalOfficial", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-purple-50/50 dark:bg-purple-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.perpLawOfficer} onChange={(e) => handleCellChange(originalIndex, "perpLawOfficer", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-purple-50/50 dark:bg-purple-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.perpOthers} onChange={(e) => handleCellChange(originalIndex, "perpOthers", e.target.value)} />
                      </td>
                    </>
                  )}
                  {/* Actions Taken - Orange */}
                  {visibleColumns.actions && (
                    <>
                      <td className="border border-border p-1 bg-orange-50/50 dark:bg-orange-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.actionLSWDO} onChange={(e) => handleCellChange(originalIndex, "actionLSWDO", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-orange-50/50 dark:bg-orange-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.actionPNP} onChange={(e) => handleCellChange(originalIndex, "actionPNP", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-orange-50/50 dark:bg-orange-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.actionNBI} onChange={(e) => handleCellChange(originalIndex, "actionNBI", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-orange-50/50 dark:bg-orange-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.actionMedical} onChange={(e) => handleCellChange(originalIndex, "actionMedical", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-orange-50/50 dark:bg-orange-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.actionLegal} onChange={(e) => handleCellChange(originalIndex, "actionLegal", e.target.value)} />
                      </td>
                      <td className="border border-border p-1 bg-orange-50/50 dark:bg-orange-950/20">
                        <Input type="number" min="0" className="h-8 text-center border-0 bg-transparent" value={record.actionOthers} onChange={(e) => handleCellChange(originalIndex, "actionOthers", e.target.value)} />
                      </td>
                    </>
                  )}
                </tr>
              );
              })}

              {/* Totals Row */}
              <tr className="border-t-2 border-primary font-bold">
                <td className="sticky left-0 z-10 border border-border p-2 text-center bg-muted shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] relative after:content-[''] after:absolute after:top-0 after:bottom-0 after:right-0 after:w-[2px] after:bg-primary">TOTAL</td>
                
                {/* VAC Victims - Blue */}
                {visibleColumns.vacVictims && (
                  <td className="border border-border p-2 text-center bg-blue-100 dark:bg-blue-900/40">{totals.vacVictims}</td>
                )}

                {/* Gender - Green */}
                {visibleColumns.gender && (
                  <>
                    <td className="border border-border p-2 text-center bg-green-100 dark:bg-green-900/40">{totals.genderMale}</td>
                    <td className="border border-border p-2 text-center bg-green-100 dark:bg-green-900/40">{totals.genderFemale}</td>
                  </>
                )}

                {/* Age - Yellow */}
                {visibleColumns.age && (
                  <>
                    <td className="border border-border p-2 text-center bg-yellow-100 dark:bg-yellow-900/40">{totals.age0to4}</td>
                    <td className="border border-border p-2 text-center bg-yellow-100 dark:bg-yellow-900/40">{totals.age5to9}</td>
                    <td className="border border-border p-2 text-center bg-yellow-100 dark:bg-yellow-900/40">{totals.age10to14}</td>
                    <td className="border border-border p-2 text-center bg-yellow-100 dark:bg-yellow-900/40">{totals.age15to17}</td>
                    <td className="border border-border p-2 text-center bg-yellow-100 dark:bg-yellow-900/40">{totals.age18Plus}</td>
                  </>
                )}

                {/* Types of Violence - Red */}
                {visibleColumns.violence && (
                  <>
                    <td className="border border-border p-2 text-center bg-red-100 dark:bg-red-900/40">{totals.physicalAbuse}</td>
                    <td className="border border-border p-2 text-center bg-red-100 dark:bg-red-900/40">{totals.sexualAbuse}</td>
                    <td className="border border-border p-2 text-center bg-red-100 dark:bg-red-900/40">{totals.psychologicalAbuse}</td>
                    <td className="border border-border p-2 text-center bg-red-100 dark:bg-red-900/40">{totals.neglect}</td>
                    <td className="border border-border p-2 text-center bg-red-100 dark:bg-red-900/40">{totals.violenceOthers}</td>
                  </>
                )}

                {/* Perpetrators - Purple */}
                {visibleColumns.perpetrators && (
                  <>
                    <td className="border border-border p-2 text-center bg-purple-100 dark:bg-purple-900/40">{totals.perpImmediateFamily}</td>
                    <td className="border border-border p-2 text-center bg-purple-100 dark:bg-purple-900/40">{totals.perpCloseRelative}</td>
                    <td className="border border-border p-2 text-center bg-purple-100 dark:bg-purple-900/40">{totals.perpAcquaintance}</td>
                    <td className="border border-border p-2 text-center bg-purple-100 dark:bg-purple-900/40">{totals.perpStranger}</td>
                    <td className="border border-border p-2 text-center bg-purple-100 dark:bg-purple-900/40">{totals.perpLocalOfficial}</td>
                    <td className="border border-border p-2 text-center bg-purple-100 dark:bg-purple-900/40">{totals.perpLawOfficer}</td>
                    <td className="border border-border p-2 text-center bg-purple-100 dark:bg-purple-900/40">{totals.perpOthers}</td>
                  </>
                )}

                {/* Actions Taken - Orange */}
                {visibleColumns.actions && (
                  <>
                    <td className="border border-border p-2 text-center bg-orange-100 dark:bg-orange-900/40">{totals.actionLSWDO}</td>
                    <td className="border border-border p-2 text-center bg-orange-100 dark:bg-orange-900/40">{totals.actionPNP}</td>
                    <td className="border border-border p-2 text-center bg-orange-100 dark:bg-orange-900/40">{totals.actionNBI}</td>
                    <td className="border border-border p-2 text-center bg-orange-100 dark:bg-orange-900/40">{totals.actionMedical}</td>
                    <td className="border border-border p-2 text-center bg-orange-100 dark:bg-orange-900/40">{totals.actionLegal}</td>
                    <td className="border border-border p-2 text-center bg-orange-100 dark:bg-orange-900/40">{totals.actionOthers}</td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </form>
    </Form>
  );
}
