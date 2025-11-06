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

// ✅ Schema with mix of text, select, and date
const schema = z.object({
  name: z.string().min(2, "Required"),
  alias: z.string().min(2, "Required"),
  clientCategory: z.string().min(1, "Required"),
  ipGroup: z.string().min(1, "Required"),
  sex: z.string().min(1, "Required"),
  gender: z.string().min(1, "Required"),
  birthday: z.string({ required_error: "Birthday required" }),
  nationality: z.string().min(2, "Required"),
  disability: z.string().min(2, "Required"),
  age: z.string().min(2, "Required"),
  status: z.string().min(2, "Required"),
  religion: z.string().min(2, "Required"),
  contactNumber: z.string().min(2, "Required"),
  address: z.string().min(2, "Required"),
  educationalAttainment: z.string().min(2, "Required"),
  educationalStatus: z.string().min(2, "Required"),
});

export function ProfileCICLCARForm({ sectionKey, goNext, goBack }) {
  const { data, setSectionField } = useIntakeFormStore();

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Grid layout: 2 columns */}
        <div className="grid grid-cols-2 gap-4">
          {/*//* NAME & ALIAS */}
          <div className="flex gap-2">
            {/* NAME */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-[2]">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "name", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* ALIAS */}
            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem className="flex-[1]">
                  <FormLabel>Alias</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "alias", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/*//* CLIENT CATEGORY & IP GROUP */}
          <div className="flex gap-2">
            {/* CLIENT CATEGORY */}
            <FormField
              control={form.control}
              name="clientCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Category</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      setSectionField(sectionKey, "clientCategory", val);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="car">Child at Risk (CAR)</SelectItem>
                      <SelectItem value="cicl">
                        Child in Conflict with the Law (CICL)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* IP GROUP */}
            <FormField
              control={form.control}
              name="ipGroup"
              render={({ field }) => (
                <FormItem className="flex-[1]">
                  <FormLabel>IP Group</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "ipGroup", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/*//* SEX, GENDER, & BIRTHDAY */}
          <div className="flex gap-2 w-full">
            {/* SEX */}
            <div className="gap-0">
              <FormField
                className="w-2/3"
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
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
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* GENDER */}
            <div className="gap-0">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSectionField(sectionKey, "gender", val);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="transgender">Transgender</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="genderqueer">Genderqueer</SelectItem>
                        <SelectItem value="agender">Agender</SelectItem>
                        <SelectItem value="bigender">Bigender</SelectItem>
                        <SelectItem value="genderfluid">Genderfluid</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Birthdate (Date Picker) */}
            <div className="flex-1">
              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Day</FormLabel>
                    <FormControl>
                      <input
                        type="date"
                        className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 justify-start text-left font-normal py-1 px-2  rounded-md"
                        value={field.value || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val);
                          setSectionField(sectionKey, "birthday", val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/*//* NATIONALITY & DISABILITY */}
          <div className="flex gap-2 w-full">
            {/* NATIONALITY */}
            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Nationality</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(
                          sectionKey,
                          "nationality",
                          e.target.value
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DISABILITY */}
            <FormField
              control={form.control}
              name="disability"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Disability</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(
                          sectionKey,
                          "disability",
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

          {/*//* AGE, STATUS, & RELIGION */}
          <div className="gap-2 flex">
            {/* AGE */}
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
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
            {/* STATUS */}
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
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                      <SelectItem value="separated">Separated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* RELIGION */}
            <FormField
              control={form.control}
              name="religion"
              render={({ field }) => (
                <FormItem>
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
          </div>

          {/*//* CONTACT NUMBER*/}
          <div className="w-full">
            {/* CONTACT NUMBER */}
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(
                          sectionKey,
                          "contactNumber",
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

          {/*//* ADDRESS*/}
          <div className="w-full">
            {/* ADDRESS */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(sectionKey, "address", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/*//* EDUCATIONAL ATTAINMENT & STATUS */}
          <div className="flex gap-2">
            {/* EDUCATIONAL ATTAINMENT */}
            <FormField
              control={form.control}
              name="educationalAttainment"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Educational Attainment</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(
                          sectionKey,
                          "educationalAttainment",
                          e.target.value
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* EDUCATIONAL STATUS */}
            <FormField
              control={form.control}
              name="educationalStatus"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Educational Status</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setSectionField(
                          sectionKey,
                          "educationalStatus",
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
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="cursor-pointer">Next</Button>
        </div>
      </form>
    </Form>
  );
}
