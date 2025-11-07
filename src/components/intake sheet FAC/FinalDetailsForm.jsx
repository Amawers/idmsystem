"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";
import { Checkbox } from "@/components/ui/checkbox";

const schema = z.object({
  houseOwnership: z.string().min(1, "Required"),
  shelterDamage: z.string().min(1, "Required"),
  barangayCaptain: z.string().min(2, "Required"),
  dateRegistered: z.string({ required_error: "Date required" }),
  lswdoName: z.string().min(2, "Required"),
});

export function FinalDetailsForm({ sectionKey, goNext, goBack, isSubmitting = false, isEdit = false }) {
  const { data, setSectionField } = useIntakeFormStore();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data[sectionKey],
      dateRegistered: data[sectionKey]?.dateRegistered || "",
      houseOwnership: data[sectionKey]?.houseOwnership || "",
      shelterDamage: data[sectionKey]?.shelterDamage || "",
    },
  });

  // Reset form when store data changes (for edit mode)
  useEffect(() => {
    const formData = {
      ...data[sectionKey],
      dateRegistered: data[sectionKey]?.dateRegistered || "",
      houseOwnership: data[sectionKey]?.houseOwnership || "",
      shelterDamage: data[sectionKey]?.shelterDamage || "",
    };
    form.reset(formData);
  }, [data, sectionKey, form]);

  function onSubmit(values) {
    console.log("✅ Submitted values:", values);
    Object.keys(values).forEach((key) => {
      setSectionField(sectionKey, key, values[key]);
    });

    // Call goNext which will trigger the submission in the parent component
    // (IntakeSheetFACCreate or IntakeSheetFACEdit)
    goNext();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Grid layout: 2 columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* LEFT COLUMN: Barangay Captain + LSWDO Name (stacked) */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="barangayCaptain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name of Barangay Captain</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "barangayCaptain", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lswdoName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name of LSWDO</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "lswdoName", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* RIGHT COLUMN: stacked rows */}
          <div className="space-y-4">
            {/* ROW 1: Date Registered (half width) */}
            <FormField
              control={form.control}
              name="dateRegistered"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Registered</FormLabel>
                  <FormControl>
                    <input
                      type="date"
                      className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 w-1/2 text-left font-normal py-1 px-2 rounded-md"
                      value={field.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val);
                        setSectionField(sectionKey, "dateRegistered", val);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ROW 2: House Ownership as a set of checkboxes (one per option) */}
            <FormField
              control={form.control}
              name="houseOwnership"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>House Ownership</FormLabel>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={field.value === "owner"}
                        onCheckedChange={(checked) => {
                          const val = checked ? "owner" : "";
                          field.onChange(val);
                          setSectionField(sectionKey, "houseOwnership", val);
                        }}
                      />
                      <span>Owner</span>
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={field.value === "renter"}
                        onCheckedChange={(checked) => {
                          const val = checked ? "renter" : "";
                          field.onChange(val);
                          setSectionField(sectionKey, "houseOwnership", val);
                        }}
                      />
                      <span>Renter</span>
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={field.value === "sharer"}
                        onCheckedChange={(checked) => {
                          const val = checked ? "sharer" : "";
                          field.onChange(val);
                          setSectionField(sectionKey, "houseOwnership", val);
                        }}
                      />
                      <span>Sharer</span>
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ROW 3: Shelter Damage as checkboxes (partially / totally) */}
            <FormField
              control={form.control}
              name="shelterDamage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shelter Damage</FormLabel>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={field.value === "partially-damaged"}
                        onCheckedChange={(checked) => {
                          const val = checked ? "partially-damaged" : "";
                          field.onChange(val);
                          setSectionField(sectionKey, "shelterDamage", val);
                        }}
                      />
                      <span>Partially Damaged</span>
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={field.value === "totally-damaged"}
                        onCheckedChange={(checked) => {
                          const val = checked ? "totally-damaged" : "";
                          field.onChange(val);
                          setSectionField(sectionKey, "shelterDamage", val);
                        }}
                      />
                      <span>Totally Damaged</span>
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={isSubmitting} className="cursor-pointer">
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
            {isSubmitting ? (
              <>
                <span className="mr-2">⏳</span>
                {isEdit ? "Updating..." : "Submitting..."}
              </>
            ) : (
              <>{isEdit ? "Update" : "Submit"} Family Assistance Card</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}