"use client";
import { useForm } from "react-hook-form";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { useIntakeFormStore } from "../../store/useIntakeFormStore";
import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";

export function FamilyInformationForm({ sectionKey, goNext, goBack }) {
  const { data, setSectionField } = useIntakeFormStore();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Load members from store, default to empty array
  const [members, setMembers] = useState(
    Array.isArray(data[sectionKey]?.members) ? data[sectionKey].members : []
  );

  // Update members when store data changes (for edit mode)
  useEffect(() => {
    const storeMembers = Array.isArray(data[sectionKey]?.members) ? data[sectionKey].members : [];
    setMembers(storeMembers);
  }, [data, sectionKey]);

  const form = useForm({
    defaultValues: {
      familyMember: "",
      relationToHead: "",
      birthdate: "",
      age: "",
      sex: "",
      educationalAttainment: "",
      occupation: "",
      remarks: "",
    },
  });

  // Open modal for editing
  function handleEdit(member, index) {
    setEditingIndex(index);
    form.reset(member);
    setOpen(true);
  }

  // Open modal for adding new
  function handleAdd() {
    setEditingIndex(null);
    form.reset({
      familyMember: "",
      relationToHead: "",
      birthdate: "",
      age: "",
      sex: "",
      educationalAttainment: "",
      occupation: "",
      remarks: "",
    });
    setOpen(true);
  }

  function onSubmit(values) {
    let updated;
    if (editingIndex !== null) {
      // Update existing member
      updated = members.map((m, i) => (i === editingIndex ? values : m));
    } else {
      // Add new member
      updated = [...members, values];
    }
    setMembers(updated);
    setSectionField(sectionKey, "members", updated);
    setOpen(false);
    setEditingIndex(null);
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
        <div className="grid grid-cols-8 bg-muted font-medium text-sm px-3 py-2">
          <div>Family Member</div>
          <div>Relation to Head</div>
          <div>Birthdate</div>
          <div>Age</div>
          <div>Sex</div>
          <div>Education</div>
          <div>Occupation</div>
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
                className="grid grid-cols-8 items-center px-3 py-2 text-sm"
              >
                <div>{m.familyMember}</div>
                <div>{m.relationToHead}</div>
                <div>{m.birthdate}</div>
                <div>{m.age}</div>
                <div>{m.sex}</div>
                <div>{m.educationalAttainment}</div>
                <div>{m.occupation}</div>
                <div className="flex justify-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(m, i)}
                  >
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
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
        <Button onClick={handleAdd} className="cursor-pointer">Add Family Member</Button>
      </div>

      {/* Add/Edit Member Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit" : "Add"} Family Member</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
            >
              {/* Row 1: Name + Relation to Head */}
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="familyMember"
                  render={({ field }) => (
                    <FormItem className="w-2/3">
                      <FormLabel>Family Member Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relationToHead"
                  render={({ field }) => (
                    <FormItem className="w-1/3">
                      <FormLabel>Relation to Head</FormLabel>
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
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="son">Son</SelectItem>
                          <SelectItem value="daughter">Daughter</SelectItem>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="brother">Brother</SelectItem>
                          <SelectItem value="sister">Sister</SelectItem>
                          <SelectItem value="grandfather">Grandfather</SelectItem>
                          <SelectItem value="grandmother">Grandmother</SelectItem>
                          <SelectItem value="uncle">Uncle</SelectItem>
                          <SelectItem value="aunt">Aunt</SelectItem>
                          <SelectItem value="nephew">Nephew</SelectItem>
                          <SelectItem value="niece">Niece</SelectItem>
                          <SelectItem value="cousin">Cousin</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Age + Birthdate + Sex */}
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem className="w-28">
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" />
                      </FormControl>
                    </FormItem>
                  )}
                />

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
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem className="w-40">
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

              <FormField
                control={form.control}
                name="educationalAttainment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Highest Educational Attainment</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occupation</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-4">
        <Button type="button" variant="outline" onClick={goBack} className="cursor-pointer">
          Back
        </Button>
        <Button type="button" onClick={goNext} disabled={members.length === 0} className="cursor-pointer">
          Next
        </Button>
      </div>
    </div>
  );
}