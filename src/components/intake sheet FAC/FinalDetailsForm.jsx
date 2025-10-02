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
import { toast } from "sonner";

const schema = z.object({
  houseOwnership: z.string().min(1, "Required"),
  shelterDamage: z.string().min(1, "Required"),
  barangayCaptain: z.string().min(2, "Required"),
  dateRegistered: z.string({ required_error: "Date required" }),
  lswdoName: z.string().min(2, "Required"),
});

export function FinalDetailsForm({ sectionKey, goNext, goBack }) {
  const { data, setSectionField } = useIntakeFormStore();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data[sectionKey],
      dateRegistered: data[sectionKey]?.dateRegistered || "",
    },
  });

  function handleFinalSubmit(finalData) {
    console.log("Final FAC Data:", JSON.stringify(finalData, null, 2));
    toast("Family Assistance Card submitted!", {
      description: (
        <pre className="mt-2 w-[320px] rounded-md bg-neutral-950 p-4">
          <code className="text-white">
            {JSON.stringify(finalData, null, 2)}
          </code>
        </pre>
      ),
    });
  }

  function onSubmit(values) {
    console.log("✅ Submitted values:", values);
    Object.keys(values).forEach((key) => {
      setSectionField(sectionKey, key, values[key]);
    });

    // Collect all form data for final submission
    const finalData = {
      ...data,
      [sectionKey]: { ...(data[sectionKey] || {}), ...values },
    };
    handleFinalSubmit(finalData);
    goNext(); // This will close the dialog
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Grid layout: 2 columns with maximum 5 rows each */}
        <div className="grid grid-cols-2 gap-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* ROW 1: HOUSE OWNERSHIP & SHELTER DAMAGE */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="houseOwnership"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>House Ownership</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSectionField(sectionKey, "houseOwnership", val);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ownership" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="renter">Renter</SelectItem>
                        <SelectItem value="sharer">Sharer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shelterDamage"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Shelter Damage Classification</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSectionField(sectionKey, "shelterDamage", val);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select damage level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="partially-damaged">Partially Damaged</SelectItem>
                        <SelectItem value="totally-damaged">Totally Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 2: BARANGAY CAPTAIN */}
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
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* ROW 1: DATE REGISTERED */}
            <FormField
              control={form.control}
              name="dateRegistered"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Registered</FormLabel>
                  <FormControl>
                    <input
                      type="date"
                      className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 w-full text-left font-normal py-1 px-2 rounded-md"
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

            {/* ROW 2: LSWDO NAME */}
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
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goBack}>
            Back
          </Button>
          <Button type="submit">Submit Family Assistance Card</Button>
        </div>
      </form>
    </Form>
  );
}