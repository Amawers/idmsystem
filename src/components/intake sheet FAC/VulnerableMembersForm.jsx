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

const schema = z.object({
  noOfOlderPersons: z.string().min(1, "Required"),
  noOfPregnantWomen: z.string().min(1, "Required"),
  noOfLactatingWomen: z.string().min(1, "Required"),
  noOfPWDs: z.string().min(1, "Required"),
});

export function VulnerableMembersForm({ sectionKey, goNext, goBack }) {
  const { data, setSectionField } = useIntakeFormStore();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data[sectionKey],
    },
  });

  // Reset form when store data changes (for edit mode)
  useEffect(() => {
    form.reset(data[sectionKey] || {});
  }, [data, sectionKey, form]);

  function onSubmit(values) {
    console.log("✅ Submitted values:", values);
    Object.keys(values).forEach((key) => {
      setSectionField(sectionKey, key, values[key]);
    });
    goNext();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Grid layout: 2 columns with maximum 5 rows each */}
        <div className="grid grid-cols-2 gap-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* ROW 1: NUMBER OF OLDER PERSONS & PREGNANT WOMEN */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="noOfOlderPersons"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Number of Older Persons</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "noOfOlderPersons", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="noOfPregnantWomen"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Number of Pregnant Women</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "noOfPregnantWomen", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* ROW 1: NUMBER OF LACTATING WOMEN & PWDs */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="noOfLactatingWomen"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Number of Lactating Women</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "noOfLactatingWomen", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="noOfPWDs"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Number of PWDs due to Medical Condition/s</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "noOfPWDs", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goBack} className="cursor-pointer">
            Back
          </Button>
          <Button type="submit" className="cursor-pointer">Next</Button>
        </div>
      </form>
    </Form>
  );
}