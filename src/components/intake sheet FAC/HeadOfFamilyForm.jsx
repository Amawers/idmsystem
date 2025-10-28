"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const schema = z.object({
  lastName: z.string().min(2, "Required"),
  firstName: z.string().min(2, "Required"),
  middleName: z.string().min(2, "Required"),
  nameExtension: z.string().optional(),
  birthdate: z.string({ required_error: "Birthdate required" }),
  age: z.string().min(1, "Required"),
  birthplace: z.string().min(2, "Required"),
  sex: z.string().min(1, "Required"),
  civilStatus: z.string().min(1, "Required"),
  mothersMaidenName: z.string().min(2, "Required"),
  religion: z.string().min(2, "Required"),
  occupation: z.string().min(2, "Required"),
  monthlyIncome: z.string().min(1, "Required"),
  idCardPresented: z.string().min(2, "Required"),
  idCardNumber: z.string().min(2, "Required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  permanentAddress: z.string().min(5, "Required"),
  alternateContactNumber: z.string().min(10, "Valid contact number required").optional(),
  fourPsBeneficiary: z.boolean().default(false),
  ipEthnicity: z.boolean().default(false),
  ipEthnicityType: z.string().optional(),
});

export function HeadOfFamilyForm({ sectionKey, goNext, goBack }) {
  const { data, setSectionField } = useIntakeFormStore();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data[sectionKey],
      birthdate: data[sectionKey]?.birthdate || "",
      fourPsBeneficiary: data[sectionKey]?.fourPsBeneficiary || false,
      ipEthnicity: data[sectionKey]?.ipEthnicity || false,
      alternateContactNumber: data[sectionKey]?.alternateContactNumber || "",
    },
  });

  // Reset form when store data changes (for edit mode)
  useEffect(() => {
    const formData = {
      ...data[sectionKey],
      birthdate: data[sectionKey]?.birthdate || "",
      fourPsBeneficiary: data[sectionKey]?.fourPsBeneficiary || false,
      ipEthnicity: data[sectionKey]?.ipEthnicity || false,
      alternateContactNumber: data[sectionKey]?.alternateContactNumber || "",
    };
    form.reset(formData);
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
            {/* ROW 1: LAST NAME, FIRST NAME, MIDDLE NAME */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "lastName", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "firstName", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "middleName", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 2: EXTENSION, AGE, SEX */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="nameExtension"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Extension</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "nameExtension", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "age", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Sex</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSectionField(sectionKey, "sex", val);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 3: BIRTHDATE, BIRTHPLACE, CIVIL STATUS */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="birthdate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Birthdate</FormLabel>
                    <FormControl>
                      <input
                        type="date"
                        className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 w-full text-left font-normal py-1 px-2 rounded-md"
                        value={field.value || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val);
                          setSectionField(sectionKey, "birthdate", val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthplace"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Birthplace</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "birthplace", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="civilStatus"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Civil Status</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSectionField(sectionKey, "civilStatus", val);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="separated">Separated</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 4: MOTHER'S MAIDEN NAME */}
            <FormField
              control={form.control}
              name="mothersMaidenName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother's Maiden Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "mothersMaidenName", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ROW 5: (moved) religion & occupation removed from left column - now in right column */}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* ROW 1: RELIGION, OCCUPATION (column 2 top) */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="religion"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Religion</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "religion", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Occupation</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "occupation", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 2: MONTHLY INCOME, PERMANENT ADDRESS */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="monthlyIncome"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Monthly Family Net Income</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="0.00"
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "monthlyIncome", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permanentAddress"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Permanent Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "permanentAddress", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 2: ID CARD PRESENTED, ID CARD NUMBER */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="idCardPresented"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>ID Card Presented</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "idCardPresented", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="idCardNumber"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>ID Card Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "idCardNumber", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 3: CONTACT NUMBER (PRIMARY), CONTACT NUMBER (ALTERNATE) */}
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Contact Number (Primary)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "contactNumber", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alternateContactNumber"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Contact Number (Alternate)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "alternateContactNumber", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 4: OTHERS - CHECKBOXES (side-by-side) */}
            <div className="flex items-center gap-6">
              <FormLabel>Others</FormLabel>

              <FormField
                control={form.control}
                name="fourPsBeneficiary"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          setSectionField(sectionKey, "fourPsBeneficiary", checked);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="font-normal m-0">
                      4Ps Beneficiary
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ipEthnicity"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          setSectionField(sectionKey, "ipEthnicity", checked);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="font-normal m-0">
                      IP Type of Ethnicity
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 5: IP ETHNICITY TYPE (conditional) */}
            {form.watch("ipEthnicity") && (
              <FormField
                control={form.control}
                name="ipEthnicityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specify IP Ethnicity Type</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter ethnicity type"
                        onChange={(e) => {
                          field.onChange(e);
                          setSectionField(sectionKey, "ipEthnicityType", e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goBack}>
            Back
          </Button>
          <Button type="submit">Next</Button>
        </div>
      </form>
    </Form>
  );
}