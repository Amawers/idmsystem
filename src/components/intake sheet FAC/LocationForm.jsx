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
  region: z.string().min(2, "Required"),
  province: z.string().min(2, "Required"),
  district: z.string().min(2, "Required"),
  cityMunicipality: z.string().min(2, "Required"),
  barangay: z.string().min(2, "Required"),
  evacuationCenter: z.string().min(2, "Required"),
});

export function LocationForm({ sectionKey, goNext }) {
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
        {/* Two columns: left has Barangay/CityMunicipality/District, right has Region/Province/Evacuation */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="barangay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barangay</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "barangay", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cityMunicipality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City/Municipality</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "cityMunicipality", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "district", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "province", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "region", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="evacuationCenter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evacuation Center/Site</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "evacuationCenter", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="cursor-pointer">
            Next
          </Button>
        </div>
      </form>
    </Form>
  );
}