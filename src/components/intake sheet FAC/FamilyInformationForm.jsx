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
import { useState } from "react";

export function FamilyInformationForm({ sectionKey, goNext, goBack }) {
  const { data, setSectionField } = useIntakeFormStore();
  const [open, setOpen] = useState(false);

  // Load members from store, default to empty array
  const [members, setMembers] = useState(
    Array.isArray(data[sectionKey]?.members) ? data[sectionKey].members : []
  );

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
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="familyMember"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family Member Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="relationToHead"
                  render={({ field }) => (
                    <FormItem>
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

                <FormField
                  control={form.control}
                  name="birthdate"
                  render={({ field }) => (
                    <FormItem>
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
              </div>

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" />
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