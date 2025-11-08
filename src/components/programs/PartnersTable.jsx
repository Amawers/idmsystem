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

import { useState, useEffect } from "react";
import { usePartners } from "@/hooks/usePartners";
import { useCases } from "@/hooks/useCases";
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
import { Search, MoreHorizontal, Plus, Building2, Phone, Mail, AlertCircle, Loader2, FileText, RefreshCw } from "lucide-react";

/**
 * Partners Table Component
 * @returns {JSX.Element} Partners table
 */
export default function PartnersTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReferralsDialogOpen, setIsReferralsDialogOpen] = useState(false);
  const [isNewReferralDialogOpen, setIsNewReferralDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [referralFormData, setReferralFormData] = useState({
    case_number: "",
    case_type: "",
    beneficiary_name: "",
    referral_date: new Date().toISOString().split('T')[0],
    service_needed: "",
    urgency_level: "normal",
    reason: "",
    notes: "",
  });
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

  const { partners, loading, statistics = {}, createPartner, updatePartner, deletePartner, getMOUStatus, fetchPartners } = usePartners();
  const { cases } = useCases();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredPartners = (partners || []).filter((partner) =>
    partner.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // When a case is selected, auto-fill beneficiary name and case type
  useEffect(() => {
    if (referralFormData.case_number && cases) {
      const selectedCase = cases.find(c => c.id === referralFormData.case_number);
      if (selectedCase) {
        setReferralFormData(prev => ({
          ...prev,
          beneficiary_name: selectedCase.header || selectedCase.identifying_name || "",
          case_type: selectedCase.identifying_case_type || "",
        }));
      }
    }
  }, [referralFormData.case_number, cases]);

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

  // Handle form submission (Create)
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

  // Handle edit submission
  const handleEditSubmit = async (e) => {
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

      // Prepare updates
      const updates = {
        ...formData,
        services_offered: selectedServices,
        budget_allocation: formData.budget_allocation
          ? parseFloat(formData.budget_allocation)
          : 0,
        mou_signed_date: formData.mou_signed_date || null,
        mou_expiry_date: formData.mou_expiry_date || null,
      };

      // Update partner
      await updatePartner(selectedPartner.id, updates);

      // Success - close dialog and reset
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedPartner(null);
    } catch (error) {
      console.error("Error updating partner:", error);
      setFormError(
        error.validationErrors?.join(", ") ||
          error.message ||
          "Failed to update partner. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle view details
  const handleViewDetails = (partner) => {
    setSelectedPartner(partner);
    setIsDetailsDialogOpen(true);
  };

  // Handle edit partner
  const handleEditPartner = (partner) => {
    setSelectedPartner(partner);
    setFormData({
      organization_name: partner.organization_name || "",
      organization_type: partner.organization_type || "",
      contact_person: partner.contact_person || "",
      contact_email: partner.contact_email || "",
      contact_phone: partner.contact_phone || "",
      address: partner.address || "",
      partnership_status: partner.partnership_status || "pending",
      mou_signed_date: partner.mou_signed_date || "",
      mou_expiry_date: partner.mou_expiry_date || "",
      budget_allocation: partner.budget_allocation || "",
      notes: partner.notes || "",
    });
    setSelectedServices(partner.services_offered || []);
    setIsEditDialogOpen(true);
  };

  // Handle view referrals
  const handleViewReferrals = (partner) => {
    setSelectedPartner(partner);
    setIsReferralsDialogOpen(true);
  };

  // Handle new referral
  const handleNewReferral = () => {
    setIsNewReferralDialogOpen(true);
  };

  // Handle referral form input changes
  const handleReferralInputChange = (e) => {
    const { name, value } = e.target;
    setReferralFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Reset referral form
  const resetReferralForm = () => {
    setReferralFormData({
      case_number: "",
      case_type: "",
      beneficiary_name: "",
      referral_date: new Date().toISOString().split('T')[0],
      service_needed: "",
      urgency_level: "normal",
      reason: "",
      notes: "",
    });
  };

  // Submit new referral
  const handleReferralSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!referralFormData.case_number || !referralFormData.beneficiary_name || !referralFormData.service_needed) {
        setFormError("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // TODO: When referrals table is created, save to database
      console.log("New Referral Data:", {
        partner_id: selectedPartner.id,
        partner_name: selectedPartner.organization_name,
        ...referralFormData,
        status: "pending",
        direction: "sent",
      });

      // For now, just show success message
      alert(`Referral Created!\n\nCase: ${referralFormData.case_number}\nBeneficiary: ${referralFormData.beneficiary_name}\nPartner: ${selectedPartner.organization_name}\nService: ${referralFormData.service_needed}\n\nNote: This will be saved to the database once the referrals table is implemented.`);

      setIsNewReferralDialogOpen(false);
      resetReferralForm();
    } catch (error) {
      console.error("Error creating referral:", error);
      setFormError("Failed to create referral. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open delete confirmation dialog
  const handleDeletePartner = (partner) => {
    setSelectedPartner(partner);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (!selectedPartner) return;

    setIsDeleting(true);
    try {
      await deletePartner(selectedPartner.id);
      setIsDeleteDialogOpen(false);
      setSelectedPartner(null);
    } catch (error) {
      console.error("Error deleting partner:", error);
      alert("Failed to delete partner. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPartners();
    } catch (error) {
      console.error("Error refreshing partners:", error);
    } finally {
      setIsRefreshing(false);
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
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="cursor-pointer"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => {
                resetForm();
                setIsAddDialogOpen(true);
              }}
              className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Partner
              </Button>
            </div>
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
                            <DropdownMenuItem onClick={() => handleViewDetails(partner)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditPartner(partner)}>
                              Edit Partner
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewReferrals(partner)}>
                              View Referrals
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeletePartner(partner)}
                            >
                              Delete Partner
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
        <DialogContent className="min-w-[65vw] min-h-[70vh] overflow-y-auto">
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

            {/* Four Column Layout */}
            <div className="grid grid-cols-4 gap-8">
              {/* COLUMN 1: Organization Information */}
              <div className="space-y-4">
                {/* Organization Name */}
                <div>
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

                {/* Organization Type */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-2">Organization Type</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="organization_type">
                        Type <span className="text-red-500">*</span>
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
              </div>

              {/* COLUMN 2: Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">Contact Information</h3>
                
                <div className="space-y-3">
                  <div>
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

                  <div>
                    <Label htmlFor="address">
                      Address <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Street, City, Province"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* COLUMN 3: Services Offered */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">
                  Services Offered <span className="text-red-500">*</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_TYPES.map((service) => (
                    <div
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`
                        px-3 py-2 rounded-md border cursor-pointer text-xs text-center
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

              {/* COLUMN 4: MOU Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">MOU Information</h3>
                
                <div className="space-y-3">
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

                  <div>
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
            </div>

            {/* Notes - Full Width */}
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
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
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

      {/* Edit Partner Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="min-w-[65vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Partner Organization</DialogTitle>
            <DialogDescription>
              Update partner organization information and services.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Error Message */}
            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Four Column Layout */}
            <div className="grid grid-cols-4 gap-4">
              {/* COLUMN 1: Organization Information */}
              <div className="space-y-4">
                {/* Organization Name */}
                <div>
                  <Label htmlFor="edit_organization_name">
                    Organization Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_organization_name"
                    name="organization_name"
                    value={formData.organization_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Hope Children's Foundation"
                    required
                  />
                </div>

                {/* Organization Type */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-2">Organization Type</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit_organization_type">
                        Type <span className="text-red-500">*</span>
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
                      <Label htmlFor="edit_partnership_status">Partnership Status</Label>
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
              </div>

              {/* COLUMN 2: Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">Contact Information</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit_contact_person">
                      Contact Person <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit_contact_person"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      placeholder="e.g., Dr. Maria Santos"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_contact_email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit_contact_email"
                      name="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_contact_phone">
                      Phone <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit_contact_phone"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      placeholder="+63-2-8123-4567"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_address">
                      Address <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="edit_address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Street, City, Province"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* COLUMN 3: Services Offered */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">
                  Services Offered <span className="text-red-500">*</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_TYPES.map((service) => (
                    <div
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`
                        px-3 py-2 rounded-md border cursor-pointer text-xs text-center
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

              {/* COLUMN 4: MOU Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">MOU Information</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit_mou_signed_date">MOU Signed Date</Label>
                    <Input
                      id="edit_mou_signed_date"
                      name="mou_signed_date"
                      type="date"
                      value={formData.mou_signed_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_mou_expiry_date">MOU Expiry Date</Label>
                    <Input
                      id="edit_mou_expiry_date"
                      name="mou_expiry_date"
                      type="date"
                      value={formData.mou_expiry_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit_budget_allocation">Budget Allocation (₱)</Label>
                    <Input
                      id="edit_budget_allocation"
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
            </div>

            {/* Notes - Full Width */}
            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
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
                  setIsEditDialogOpen(false);
                  resetForm();
                  setSelectedPartner(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partner Details</DialogTitle>
            <DialogDescription>
              Complete information about this partner organization
            </DialogDescription>
          </DialogHeader>

          {selectedPartner && (
            <div className="grid grid-cols-2 gap-6">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* Organization Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-2">Organization Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Organization Name</Label>
                      <p className="font-medium">{selectedPartner.organization_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Organization Type</Label>
                      <p className="font-medium">{selectedPartner.organization_type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Partnership Status</Label>
                      <Badge className="mt-1">
                        {selectedPartner.partnership_status || "pending"}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">MOU Status</Label>
                      {selectedPartner.mou_expiry_date ? (
                        <Badge
                          className={`mt-1 bg-${getMOUStatus(selectedPartner.mou_expiry_date).color}-500`}
                        >
                          {getMOUStatus(selectedPartner.mou_expiry_date).label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mt-1">No MOU</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-2">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Contact Person</Label>
                      <p className="font-medium">{selectedPartner.contact_person}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Email</Label>
                      <p className="font-medium">{selectedPartner.contact_email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Phone</Label>
                      <p className="font-medium">{selectedPartner.contact_phone}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Address</Label>
                      <p className="font-medium">{selectedPartner.address}</p>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-2">Services Offered</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPartner.services_offered?.map((service, idx) => (
                      <Badge key={idx} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* MOU & Budget */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-2">Partnership Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">MOU Signed Date</Label>
                      <p className="font-medium">
                        {selectedPartner.mou_signed_date || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">MOU Expiry Date</Label>
                      <p className="font-medium">
                        {selectedPartner.mou_expiry_date || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Budget Allocation</Label>
                      <p className="font-medium">
                        ₱{selectedPartner.budget_allocation?.toLocaleString() || "0.00"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Success Rate</Label>
                      <p className="font-medium">{selectedPartner.success_rate || 0}%</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Referrals Sent</Label>
                      <p className="font-medium">{selectedPartner.total_referrals_sent || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Referrals Received</Label>
                      <p className="font-medium">{selectedPartner.total_referrals_received || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Record Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-2">Record Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Created</Label>
                      <p className="font-medium text-sm">{new Date(selectedPartner.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Last Updated</Label>
                      <p className="font-medium text-sm">{new Date(selectedPartner.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedPartner.notes && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm border-b pb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedPartner.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailsDialogOpen(false);
                setSelectedPartner(null);
              }}
            >
              Close
            </Button>
            <Button onClick={() => {
              setIsDetailsDialogOpen(false);
              handleEditPartner(selectedPartner);
            }}>
              Edit Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Partner Organization
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the partner organization and all associated data.
            </DialogDescription>
          </DialogHeader>

          {selectedPartner && (
            <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Organization</Label>
                  <p className="font-semibold text-red-900">{selectedPartner.organization_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <p className="text-sm text-red-800">{selectedPartner.organization_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Person</Label>
                  <p className="text-sm text-red-800">{selectedPartner.contact_person}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> Deleting this partner will remove all referral history and partnership data.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedPartner(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Referrals Dialog */}
      <Dialog open={isReferralsDialogOpen} onOpenChange={setIsReferralsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partner Referrals</DialogTitle>
            <DialogDescription>
              View all referrals sent to and received from this partner organization
            </DialogDescription>
          </DialogHeader>

          {selectedPartner && (
            <div className="space-y-6">
              {/* Partner Info Summary */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedPartner.organization_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedPartner.organization_type}</p>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{selectedPartner.total_referrals_sent || 0}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{selectedPartner.total_referrals_received || 0}</p>
                      <p className="text-xs text-muted-foreground">Received</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Referrals Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Referral History</h3>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleNewReferral}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Referral
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Case Number</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Placeholder - No referrals data yet */}
                      {(selectedPartner.total_referrals_sent === 0 && selectedPartner.total_referrals_received === 0) ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 text-muted-foreground/50" />
                              <p>No referrals recorded yet</p>
                              <p className="text-sm">Referral tracking will be available once the referrals system is configured</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <AlertCircle className="h-8 w-8 text-amber-500" />
                              <p className="font-medium">Referral Details Coming Soon</p>
                              <p className="text-sm">
                                This partner has {selectedPartner.total_referrals_sent} sent and {selectedPartner.total_referrals_received} received referrals
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Detailed referral tracking will be implemented in the next update
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedPartner.success_rate || 0}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(selectedPartner.total_referrals_sent || 0) + (selectedPartner.total_referrals_received || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Services Offered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedPartner.services_offered?.length || 0}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReferralsDialogOpen(false);
                setSelectedPartner(null);
              }}
            >
              Close
            </Button>
            <Button onClick={() => {
              setIsReferralsDialogOpen(false);
              handleEditPartner(selectedPartner);
            }}>
              Edit Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Referral Dialog */}
      <Dialog open={isNewReferralDialogOpen} onOpenChange={setIsNewReferralDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Referral</DialogTitle>
            <DialogDescription>
              Refer a case to {selectedPartner?.organization_name} for specialized services
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReferralSubmit} className="space-y-4">
            {/* Error Message */}
            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Partner Info Banner */}
            {selectedPartner && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">{selectedPartner.organization_name}</p>
                    <p className="text-sm text-blue-700">{selectedPartner.organization_type}</p>
                  </div>
                  <Badge variant="secondary">Referral To</Badge>
                </div>
              </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="case_number">
                    Select Case <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={referralFormData.case_number}
                    onValueChange={(value) =>
                      setReferralFormData((prev) => ({ ...prev, case_number: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases && cases.length > 0 ? (
                        cases.map((caseItem) => (
                          <SelectItem key={caseItem.id} value={caseItem.id}>
                            {caseItem.header || caseItem.identifying_name || `Case ${caseItem.id.slice(0, 8)}`} - {caseItem.identifying_case_type || 'N/A'}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-cases" disabled>No cases available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {referralFormData.case_number && cases && cases.find(c => c.id === referralFormData.case_number)?.id.slice(0, 13)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="beneficiary_name">
                    Beneficiary Name <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={referralFormData.beneficiary_name}
                    onValueChange={(value) =>
                      setReferralFormData((prev) => ({ ...prev, beneficiary_name: value }))
                    }
                    disabled={!referralFormData.case_number}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={referralFormData.case_number ? "Auto-filled from case" : "Select a case first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cases && cases.length > 0 ? (
                        cases
                          .filter(c => c.header || c.identifying_name)
                          .map((caseItem) => (
                            <SelectItem key={caseItem.id} value={caseItem.header || caseItem.identifying_name}>
                              {caseItem.header || caseItem.identifying_name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="no-names" disabled>No beneficiaries available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-filled when case is selected
                  </p>
                </div>

                <div>
                  <Label htmlFor="case_type">
                    Case Type
                  </Label>
                  <Input
                    id="case_type"
                    name="case_type"
                    value={referralFormData.case_type}
                    readOnly
                    disabled
                    placeholder="Auto-filled from case"
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="referral_date">
                    Referral Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="referral_date"
                    name="referral_date"
                    type="date"
                    value={referralFormData.referral_date}
                    onChange={handleReferralInputChange}
                    required
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="service_needed">
                    Service Needed <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={referralFormData.service_needed}
                    onValueChange={(value) =>
                      setReferralFormData((prev) => ({ ...prev, service_needed: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPartner?.services_offered?.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="urgency_level">Urgency Level</Label>
                  <Select
                    value={referralFormData.urgency_level}
                    onValueChange={(value) =>
                      setReferralFormData((prev) => ({ ...prev, urgency_level: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reason">
                    Reason for Referral <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    name="reason"
                    value={referralFormData.reason}
                    onChange={handleReferralInputChange}
                    placeholder="Describe why this case needs to be referred..."
                    rows={3}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Full Width Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={referralFormData.notes}
                onChange={handleReferralInputChange}
                placeholder="Any additional information or special instructions..."
                rows={2}
              />
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This referral will be sent to {selectedPartner?.organization_name}. 
                You can track its status in the referral history.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewReferralDialogOpen(false);
                  resetReferralForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Referral...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Referral
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
