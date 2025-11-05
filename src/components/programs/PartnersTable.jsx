/**
 * @file PartnersTable.jsx
 * @description Partner organizations management table
 * @module components/programs/PartnersTable
 * 
 * Features:
 * - View partner organizations
 * - Track services offered
 * - Manage referrals
 * - Partnership agreements
 */

import { useState } from "react";
import { usePartners } from "@/hooks/usePartners";
import { ORGANIZATION_TYPES, SERVICE_TYPES } from "@/lib/partnerSubmission";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MoreHorizontal, Plus, Building2, Phone, Mail, AlertCircle, Loader2 } from "lucide-react";

/**
 * Partners Table Component
 * @returns {JSX.Element} Partners table
 */
export default function PartnersTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [formData, setFormData] = useState({
    organization_name: "",
    organization_type: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    partnership_status: "pending",
    mou_signed_date: "",
    mou_expiry_date: "",
    budget_allocation: "",
    notes: "",
  });

  const { partners, loading, statistics = {}, createPartner, getMOUStatus } = usePartners();

  const filteredPartners = (partners || []).filter((partner) =>
    partner.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(""); // Clear error on change
  };

  // Handle service selection toggle
  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      organization_name: "",
      organization_type: "",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      partnership_status: "pending",
      mou_signed_date: "",
      mou_expiry_date: "",
      budget_allocation: "",
      notes: "",
    });
    setSelectedServices([]);
    setFormError("");
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      // Validate services
      if (selectedServices.length === 0) {
        setFormError("Please select at least one service");
        setIsSubmitting(false);
        return;
      }

      // Prepare data
      const partnerData = {
        ...formData,
        services_offered: selectedServices,
        budget_allocation: formData.budget_allocation
          ? parseFloat(formData.budget_allocation)
          : 0,
        mou_signed_date: formData.mou_signed_date || null,
        mou_expiry_date: formData.mou_expiry_date || null,
      };

      // Submit to backend
      await createPartner(partnerData);

      // Success - close dialog and reset
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating partner:", error);
      setFormError(
        error.validationErrors?.join(", ") ||
          error.message ||
          "Failed to create partner. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Partnerships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.active || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalReferrals || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Services Offered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalServices || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Partner Organizations</CardTitle>
              <CardDescription>
                Manage partner organizations and service providers
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Partner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No partner organizations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPartners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{partner.organization_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {partner.organization_type}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{partner.contact_person}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Phone className="h-3 w-3" />
                            {partner.contact_phone}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {partner.contact_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {partner.services_offered.slice(0, 2).map((service, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                          {partner.services_offered.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{partner.services_offered.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{partner.referral_count}</div>
                      </TableCell>
                      <TableCell>
                        {partner.mou_expiry_date ? (
                          <Badge
                            className={`bg-${getMOUStatus(partner.mou_expiry_date).color}-500`}
                          >
                            {getMOUStatus(partner.mou_expiry_date).label}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No MOU</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit Partner</DropdownMenuItem>
                            <DropdownMenuItem>View Referrals</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredPartners.length} of {partners.length} partners
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Partner Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Partner Organization</DialogTitle>
            <DialogDescription>
              Create a new partner organization record with contact and service information.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Organization Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="organization_name">
                    Organization Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="organization_name"
                    name="organization_name"
                    value={formData.organization_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Hope Children's Foundation"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="organization_type">
                    Organization Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.organization_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, organization_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORGANIZATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="partnership_status">Partnership Status</Label>
                  <Select
                    value={formData.partnership_status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, partnership_status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Contact Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="contact_person">
                    Contact Person <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact_person"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    placeholder="e.g., Dr. Maria Santos"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contact_email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contact_phone">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact_phone"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleInputChange}
                    placeholder="+63-2-8123-4567"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Street, City, Province"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Services Offered */}
            <div className="space-y-2">
              <Label>
                Services Offered <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {SERVICE_TYPES.map((service) => (
                  <div
                    key={service}
                    onClick={() => toggleService(service)}
                    className={`
                      px-3 py-2 rounded-md border cursor-pointer text-sm text-center
                      transition-colors
                      ${
                        selectedServices.includes(service)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent"
                      }
                    `}
                  >
                    {service}
                  </div>
                ))}
              </div>
            </div>

            {/* MOU Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">MOU Information (Optional)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mou_signed_date">MOU Signed Date</Label>
                  <Input
                    id="mou_signed_date"
                    name="mou_signed_date"
                    type="date"
                    value={formData.mou_signed_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="mou_expiry_date">MOU Expiry Date</Label>
                  <Input
                    id="mou_expiry_date"
                    name="mou_expiry_date"
                    type="date"
                    value={formData.mou_expiry_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="budget_allocation">Budget Allocation (₱)</Label>
                  <Input
                    id="budget_allocation"
                    name="budget_allocation"
                    type="number"
                    step="0.01"
                    value={formData.budget_allocation}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional information about the partnership..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Partner
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
