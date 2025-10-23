"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";

const schema = z
    .object({
        date: z.string({ required_error: "Date required" }),
        receivingMember: z.string().min(2, "Receiving member name required"),
        emergency: z.string().min(1, "Emergency type required"),
        emergencyOther: z.string().optional(),
        assistance: z.string().min(1, "Assistance type required"),
        assistanceOther: z.string().optional(),
        unit: z.string().min(1, "Unit required"),
        quantity: z.string().min(1, "Quantity required"),
        cost: z.string().min(1, "Cost required"),
        provider: z.string().min(2, "Provider name required"),
        // Case management fields
        caseManager: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        visibility: z.string().optional(),
    })
    .refine(
        (data) => data.emergency !== "other" || (data.emergencyOther && data.emergencyOther.length >= 2),
        {
            path: ["emergencyOther"],
            message: "Please specify other emergency type",
        }
    )
    .refine(
        (data) => data.assistance !== "other" || (data.assistanceOther && data.assistanceOther.length >= 2),
        {
            path: ["assistanceOther"],
            message: "Please specify other assistance type",
        }
    );

export function FamilyAssistanceForm({ sectionKey, goNext, goBack, isSaving }) {
  const { data, setSectionField } = useIntakeFormStore();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
            ...data[sectionKey],
            date: data[sectionKey]?.date || "",
            emergencyOther: data[sectionKey]?.emergencyOther || "",
            assistanceOther: data[sectionKey]?.assistanceOther || "",
            caseManager: data[sectionKey]?.caseManager || "",
            status: data[sectionKey]?.status || "",
            priority: data[sectionKey]?.priority || "",
            visibility: data[sectionKey]?.visibility || "",
    },
  });

  function onSubmit(values) {
        // If user selected "other", prefer the custom field value
        const final = { ...values };
        if (values.emergency === "other") {
            final.emergency = values.emergencyOther || "other";
        }
        if (values.assistance === "other") {
            final.assistance = values.assistanceOther || "other";
        }

        // Store case details in a nested object for submission utility
        const caseDetails = {
            caseManager: values.caseManager,
            status: values.status,
            priority: values.priority,
            visibility: values.visibility,
        };
        final.caseDetails = caseDetails;

        console.log("✅ Submitted FAR values:", final);
        Object.keys(final).forEach((key) => {
            setSectionField(sectionKey, key, final[key]);
        });
        goNext();
  }

return (
    <Form {...form}>
        {/* Outer column that fills the dialog */}
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col max-h-[68vh]"
        >
            {/* Scrollable body if content grows larger than available space */}
            <div className="overflow-auto pr-2 p-3">
                <div className="grid grid-cols-2 gap-4">
                    {/* LEFT */}
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date</FormLabel>
                                    <FormControl>
                                        <input
                                            type="date"
                                            className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 w-full text-left font-normal py-1 px-2 rounded-md"
                                            value={field.value || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                field.onChange(val);
                                                setSectionField(sectionKey, "date", val);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="receivingMember"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Receiving Member</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                setSectionField(
                                                    sectionKey,
                                                    "receivingMember",
                                                    e.target.value
                                                );
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                                    <FormField
                                        control={form.control}
                                        name="emergency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Emergency Type</FormLabel>
                                                <Select
                                                    onValueChange={(val) => {
                                                        field.onChange(val);
                                                        setSectionField(sectionKey, "emergency", val);
                                                    }}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select emergency type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="medical">Medical Emergency</SelectItem>
                                                        <SelectItem value="food">Food Emergency</SelectItem>
                                                        <SelectItem value="shelter">Shelter Emergency</SelectItem>
                                                        <SelectItem value="financial">Financial Emergency</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* show "other" input when emergency === 'other' */}
                                    {form.watch("emergency") === "other" && (
                                        <FormField
                                            control={form.control}
                                            name="emergencyOther"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Other Emergency</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="Describe other emergency"
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                setSectionField(sectionKey, "emergencyOther", e.target.value);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="assistance"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Assistance Type</FormLabel>
                                                <Select
                                                    onValueChange={(val) => {
                                                        field.onChange(val);
                                                        setSectionField(sectionKey, "assistance", val);
                                                    }}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select assistance type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="cash">Cash Assistance</SelectItem>
                                                        <SelectItem value="food">Food Assistance</SelectItem>
                                                        <SelectItem value="medical">Medical Assistance</SelectItem>
                                                        <SelectItem value="educational">Educational Assistance</SelectItem>
                                                        <SelectItem value="livelihood">Livelihood Assistance</SelectItem>
                                                        <SelectItem value="burial">Burial Assistance</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {form.watch("assistance") === "other" && (
                                        <FormField
                                            control={form.control}
                                            name="assistanceOther"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Other Assistance</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="Describe other assistance"
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                setSectionField(sectionKey, "assistanceOther", e.target.value);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                    </div>

                    {/* RIGHT */}
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="unit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unit</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="e.g., pcs, kg, liters"
                                            onChange={(e) => {
                                                field.onChange(e);
                                                setSectionField(sectionKey, "unit", e.target.value);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            min="0"
                                            onChange={(e) => {
                                                field.onChange(e);
                                                setSectionField(sectionKey, "quantity", e.target.value);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="cost"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cost (₱)</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            onChange={(e) => {
                                                field.onChange(e);
                                                setSectionField(sectionKey, "cost", e.target.value);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="provider"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Provider</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Organization or individual providing assistance"
                                            onChange={(e) => {
                                                field.onChange(e);
                                                setSectionField(sectionKey, "provider", e.target.value);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Case Management Section */}
                <div className="mt-6 pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4">Case Management Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="caseManager"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Case Manager</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Assigned case manager"
                                            onChange={(e) => {
                                                field.onChange(e);
                                                setSectionField(sectionKey, "caseManager", e.target.value);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
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
                                            <SelectItem value="Filed">Filed</SelectItem>
                                            <SelectItem value="Assessed">Assessed</SelectItem>
                                            <SelectItem value="In Process">In Process</SelectItem>
                                            <SelectItem value="Resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Priority</FormLabel>
                                    <Select
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            setSectionField(sectionKey, "priority", val);
                                        }}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select priority" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Low">Low</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="visibility"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Visibility</FormLabel>
                                    <Select
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            setSectionField(sectionKey, "visibility", val);
                                        }}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select visibility" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Only Me">Only Me</SelectItem>
                                            <SelectItem value="Everyone">Everyone</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Footer (always visible, sits right below inputs when content is short) */}
            <div className="mt-2 py-2 bg-background flex justify-between items-center">
                <Button type="button" variant="outline" onClick={goBack} disabled={isSaving}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Submitting..." : "Submit"}
                </Button>
            </div>
        </form>
    </Form>
);
}