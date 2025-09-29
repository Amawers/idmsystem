"use client";
import { useForm } from "react-hook-form";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FamilyBackgroundForm({ sectionKey, goNext, goBack }) {
  const { data, setSectionField } = useIntakeFormStore();
  const [open, setOpen] = useState(false);

  // Load members from store, default to empty array
  const [members, setMembers] = useState(
    Array.isArray(data[sectionKey]?.members) ? data[sectionKey].members : []
  );

  const form = useForm({
    defaultValues: {
      name: "",
      relationship: "",
      age: "",
      sex: "",
      status: "",
      contactNumber: "",
      educationalAttainment: "",
      employment: "",
    },
  });

  function onSubmit(values) {
    const updated = [...members, values];
    setMembers(updated);
    // Save array under "members" field
    setSectionField(sectionKey, "members", updated);
    setOpen(false);
    form.reset();
  }

  function removeMember(index) {
    const updated = members.filter((_, i) => i !== index);
    setMembers(updated);
    setSectionField(sectionKey, "members", updated);
  }

  return (
    <div className="space-y-4">
      {/* Members Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-9 bg-muted font-medium text-sm px-3 py-2">
          <div>Name</div>
          <div>Relationship</div>
          <div>Age</div>
          <div>Sex</div>
          <div>Status</div>
          <div>Contact No</div>
          <div>Education</div>
          <div>Employment</div>
          <div className="text-center">Action</div>
        </div>

        <div className="divide-y max-h-64 overflow-y-auto">
          {members.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              No family members added yet.
            </p>
          ) : (
            members.map((m, i) => (
              <div
                key={i}
                className="grid grid-cols-9 items-center px-3 py-2 text-sm"
              >
                <div>{m.name}</div>
                <div>{m.relationship}</div>
                <div>{m.age}</div>
                <div>{m.sex}</div>
                <div>{m.status}</div>
                <div>{m.contactNumber}</div>
                <div>{m.educationalAttainment}</div>
                <div>
                  {m.employment?.toLowerCase() === "n/a"
                    ? m.employment
                    : `${m.employment}`}
                </div>
                <div className="flex justify-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMember(i)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Member Button */}
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>Add Family Member</Button>
      </div>

      {/* Add Member Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {/* //* NAME */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {/*//* RELATION, AGE, & SEX */}
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val)}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="son">Son</SelectItem>
                          <SelectItem value="daughter">Daughter</SelectItem>
                          <SelectItem value="brother">Brother</SelectItem>
                          <SelectItem value="sister">Sister</SelectItem>
                          <SelectItem value="grandfather">
                            Grandfather
                          </SelectItem>
                          <SelectItem value="grandmother">
                            Grandmother
                          </SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sex</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val)}
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
              {/*//* STATUS AND CONTACT NUMBER */}
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val)}
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
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              {/* //* EDUCATIONAL ATTAINMENT */}
              <FormField
                control={form.control}
                name="educationalAttainment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Education Attainment</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {/* //* EMPLOYMENT */}
              <FormField
                control={form.control}
                name="employment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {/*//* ADD FAMILY MEMBER  */}
              <div className="flex justify-end pt-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-4">
        <Button type="button" variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button type="button" onClick={goNext} disabled={members.length === 0}>
          Next
        </Button>
      </div>
    </div>
  );
}
