"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";
import {
    IconCircleCheckFilled,
    IconClipboardText,
    IconCheckbox,
    IconLoader,
    IconLock,
    IconGlobe,
} from "@tabler/icons-react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useCaseManagers } from "@/hooks/useCaseManagers";

// ✅ Schema with mix of text, select, and date
const schema = z.object({
    region: z.string().min(2, "Required"),
    province: z.string().min(2, "Required"),
    city: z.string().min(2, "Required"),
    barangay: z.string().min(2, "Required"),
    referredTo: z.string().min(2, "Required"),

    dateReferred: z.string({ required_error: "Date & time required" }),
    referralReason: z.string().min(2, "Required"),
});

export function ReferralForm({ sectionKey, goNext, goBack, isSaving, isEditing = false }) {
    // Fetch case managers from database
    const { caseManagers, loading: loadingCaseManagers } = useCaseManagers();

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
            icon: (
                <IconLoader
                    className="text-orange-500 animate-spin"
                    size={16}
                />
            ),
        },
        {
            value: "Resolved",
            label: "Resolved",
            icon: (
                <IconCircleCheckFilled className="text-green-500" size={16} />
            ),
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

    const { data, setSectionField } = useIntakeFormStore();

    const [priority, setPriority] = useState(
        data[sectionKey]?.caseDetails?.priority || undefined
    );

    useEffect(() => {
        // keep local priority in sync if store changes externally
        const currentPriority = data[sectionKey]?.caseDetails?.priority;
        setPriority(currentPriority || undefined);
    }, [data, sectionKey]);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            ...data[sectionKey],
            birthday: data[sectionKey]?.birthday || "",
        },
    });

    function onSubmit(values) {
        console.log("✅ Submitted values:", values);
        Object.keys(values).forEach((key) => {
            setSectionField(sectionKey, key, values[key]);
        });
        goNext();
    }

    // helpers to update nested caseDetails in the intake section
    function updateCaseDetailField(key, value) {
        setSectionField(sectionKey, {
            caseDetails: { ...(data[sectionKey]?.caseDetails || {}), [key]: value },
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Grid layout: 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                    {/* LEFT SIDE */}
                    <div className="space-y-4">
                        {/* //* REGION & PROVINCE */}
                        <div className="flex gap-2">
                            {/* REGION */}
                            <FormField
                                control={form.control}
                                name="region"
                                render={({ field }) => (
                                    <FormItem className="flex-[1]">
                                        <FormLabel>Region</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setSectionField(
                                                        sectionKey,
                                                        "region",
                                                        e.target.value
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* PROVINCE */}
                            <FormField
                                control={form.control}
                                name="province"
                                render={({ field }) => (
                                    <FormItem className="flex-[1]">
                                        <FormLabel>Province</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setSectionField(
                                                        sectionKey,
                                                        "province",
                                                        e.target.value
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        {/* //* CITY & BARANGAY */}
                        <div className="flex gap-2">
                            {/* CITY */}
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem className="flex-[1]">
                                        <FormLabel>City</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setSectionField(
                                                        sectionKey,
                                                        "city",
                                                        e.target.value
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* BARANGAY */}
                            <FormField
                                control={form.control}
                                name="barangay"
                                render={({ field }) => (
                                    <FormItem className="flex-[1]">
                                        <FormLabel>Barangay</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setSectionField(
                                                        sectionKey,
                                                        "barangay",
                                                        e.target.value
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        {/* //* REFERRED TTO & DATE REFFERED */}
                        <div className="flex gap-2">
                            {/* REFERRED TO */}
                            <FormField
                                control={form.control}
                                name="referredTo"
                                render={({ field }) => (
                                    <FormItem className="flex-[1]">
                                        <FormLabel>Referred To</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setSectionField(
                                                        sectionKey,
                                                        "referredTo",
                                                        e.target.value
                                                    );
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* DATE REFERRED (Date Picker) */}
                            <div className="flex-1">
                                <FormField
                                    control={form.control}
                                    name="dateReferred"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date Referred</FormLabel>
                                            <FormControl>
                                                <input
                                                    type="date"
                                                    className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 justify-start text-left font-normal py-1 px-2  rounded-md"
                                                    value={field.value || ""}
                                                    onChange={(e) => {
                                                        const val =
                                                            e.target.value;
                                                        field.onChange(val);
                                                        setSectionField(
                                                            sectionKey,
                                                            "dateReferred",
                                                            val
                                                        );
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        {/*//* CASE MANAGER & STATUS */}
                        <div className="flex gap-2">
                            {/* Case Manager */}
                            <div className="flex-1 space-y-1 mb-1">
                                <Label htmlFor="caseManager">
                                    Case Manager
                                </Label>
                                <Select
                                    defaultValue={data[sectionKey]?.caseDetails?.caseManager}
                                    onValueChange={(val) =>
                                        updateCaseDetailField("caseManager", val)
                                    }
                                    disabled={loadingCaseManagers}
                                >
                                    <SelectTrigger
                                        className="w-full"
                                        id="caseManager"
                                    >
                                        <SelectValue placeholder={loadingCaseManagers ? "Loading..." : "Select case manager"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {caseManagers.length === 0 ? (
                                            <SelectItem value="no-managers" disabled>
                                                No case managers available
                                            </SelectItem>
                                        ) : (
                                            caseManagers.map((manager) => (
                                                <SelectItem
                                                    key={manager.id}
                                                    value={manager.full_name}
                                                >
                                                    {manager.full_name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status */}
                            <div className="flex-1 space-y-1 mb-1">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    defaultValue={data[sectionKey]?.caseDetails?.status}
                                    onValueChange={(val) =>
                                        updateCaseDetailField("status", val)
                                    }
                                >
                                    <SelectTrigger
                                        className="w-full"
                                        id="status"
                                    >
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem
                                                key={status.value}
                                                value={status.value}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {status.icon}
                                                    {status.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/*//* PRIORITY */}
                        <div className="flex gap-2">
                            {/* Priority */}
                            <div className="space-y-1 mb-1">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    defaultValue={data[sectionKey]?.caseDetails?.priority}
                                    onValueChange={(val) => {
                                        setPriority(val);
                                        updateCaseDetailField("priority", val);
                                    }}
                                >
                                    <SelectTrigger
                                        id="priority"
                                        className={`w-[225px] ${
                                            priorities.find((p) => p.value === priority)
                                                ?.className || ""
                                        }`}
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
                    </div>
                    {/* RIGHT SIDE */}
                    <div className="space-y-4">
                        {/* Textarea Field */}
                        <FormField
                            control={form.control}
                            name="referralReason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter reasons for referral..."
                                            className="min-h-52 resize"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={goBack} className="cursor-pointer">
                        Back
                    </Button>
                    <Button type="submit" disabled={isSaving} className="cursor-pointer">
                        {isSaving ? (
                            <>
                                <IconLoader className="animate-spin mr-2" size={16} />
                                {isEditing ? "Updating..." : "Saving..."}
                            </>
                        ) : (
                            isEditing ? "Update" : "Next"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
