/**
 * @file EligibilityMatcher.jsx
 * @description Auto-match eligible resources based on client profile and case type
 * @module components/resources/EligibilityMatcher
 * 
 * Features:
 * - Suggest eligible resources based on case type
 * - Match resources to client profile
 * - Display eligibility criteria
 * - Quick allocation from suggestions
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, AlertCircle, ArrowRight, Search } from "lucide-react";

const ELIGIBILITY_RULES = {
  'CICL/CAR': {
    title: 'Children in Conflict with Law / Children at Risk',
    eligible_resources: [
      { type: 'educational', category: 'training', description: 'Skills training programs', max_amount: 15000 },
      { type: 'counseling', category: 'service', description: 'Psychological counseling sessions', max_amount: 10000 },
      { type: 'legal', category: 'service', description: 'Legal assistance and representation', max_amount: 20000 },
      { type: 'recreational', category: 'activity', description: 'Sports and recreational activities', max_amount: 5000 },
    ]
  },
  'VAC': {
    title: 'Violence Against Children',
    eligible_resources: [
      { type: 'medical', category: 'assistance', description: 'Medical treatment and therapy', max_amount: 25000 },
      { type: 'counseling', category: 'service', description: 'Trauma counseling', max_amount: 15000 },
      { type: 'legal', category: 'service', description: 'Legal protection and case management', max_amount: 20000 },
      { type: 'shelter', category: 'assistance', description: 'Temporary shelter and care', max_amount: 30000 },
    ]
  },
  'FAC': {
    title: 'Families Affected by Crisis',
    eligible_resources: [
      { type: 'food', category: 'relief', description: 'Food packs and groceries', max_amount: 5000 },
      { type: 'financial', category: 'cash_assistance', description: 'Emergency cash assistance', max_amount: 10000 },
      { type: 'shelter', category: 'material', description: 'Housing repair materials', max_amount: 20000 },
      { type: 'livelihood', category: 'assistance', description: 'Livelihood startup kits', max_amount: 15000 },
    ]
  },
  'FAR': {
    title: 'Financial Assistance Request',
    eligible_resources: [
      { type: 'financial', category: 'cash_assistance', description: 'Direct cash assistance', max_amount: 15000 },
      { type: 'medical', category: 'assistance', description: 'Medical bills payment', max_amount: 30000 },
      { type: 'burial', category: 'assistance', description: 'Burial assistance', max_amount: 20000 },
      { type: 'transportation', category: 'assistance', description: 'Transportation aid', max_amount: 3000 },
    ]
  },
};

const SPECIAL_CONDITIONS = {
  'solo_parent': {
    label: 'Solo Parent',
    additional_resources: [
      { type: 'educational', description: 'Educational assistance for children', max_amount: 10000 },
      { type: 'food', description: 'Monthly grocery assistance', max_amount: 3000 },
    ]
  },
  'pwd': {
    label: 'Person with Disability',
    additional_resources: [
      { type: 'medical', description: 'Medical equipment and assistive devices', max_amount: 15000 },
      { type: 'transportation', description: 'Transportation allowance', max_amount: 2000 },
    ]
  },
  'senior_citizen': {
    label: 'Senior Citizen',
    additional_resources: [
      { type: 'medical', description: 'Medical assistance', max_amount: 20000 },
      { type: 'food', description: 'Food assistance', max_amount: 3000 },
    ]
  },
  '4ps_beneficiary': {
    label: '4Ps Beneficiary',
    additional_resources: [
      { type: 'educational', description: 'School supplies assistance', max_amount: 5000 },
      { type: 'health', description: 'Health and nutrition programs', max_amount: 5000 },
    ]
  },
};

export default function EligibilityMatcher() {
  const [caseType, setCaseType] = useState("");
  const [specialConditions, setSpecialConditions] = useState([]);
  const [results, setResults] = useState(null);

  const handleCheckEligibility = () => {
    if (!caseType) return;

    const baseEligibility = ELIGIBILITY_RULES[caseType];
    const additionalResources = specialConditions.flatMap(
      condition => SPECIAL_CONDITIONS[condition]?.additional_resources || []
    );

    setResults({
      case_type_resources: baseEligibility,
      special_condition_resources: additionalResources,
      special_conditions_applied: specialConditions.map(c => SPECIAL_CONDITIONS[c]?.label),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resource Eligibility Matcher</CardTitle>
          <CardDescription>
            Check what resources a client is eligible for based on case type and profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Case Type</Label>
              <Select value={caseType} onValueChange={setCaseType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ELIGIBILITY_RULES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {key} - {value.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Special Conditions (Optional)</Label>
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (!specialConditions.includes(value)) {
                    setSpecialConditions([...specialConditions, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add special condition" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SPECIAL_CONDITIONS).map(([key, value]) => (
                    <SelectItem key={key} value={key} disabled={specialConditions.includes(key)}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {specialConditions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {specialConditions.map(condition => (
                <Badge key={condition} variant="secondary" className="px-3 py-1">
                  {SPECIAL_CONDITIONS[condition]?.label}
                  <button
                    className="ml-2 hover:text-destructive"
                    onClick={() => setSpecialConditions(specialConditions.filter(c => c !== condition))}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Button onClick={handleCheckEligibility} disabled={!caseType} className="w-full">
            <Search className="h-4 w-4 mr-2" />
            Check Eligibility
          </Button>
        </CardContent>
      </Card>

      {results && (
        <>
          {/* Base Eligibility */}
          <Card>
            <CardHeader>
              <CardTitle>Eligible Resources for {caseType}</CardTitle>
              <CardDescription>{results.case_type_resources.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.case_type_resources.eligible_resources.map((resource, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-start gap-3 flex-1">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{resource.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Type: {resource.type} • Category: {resource.category}
                        </p>
                        <p className="text-sm font-medium text-green-600 mt-1">
                          Max: ₱{resource.max_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Request
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Resources from Special Conditions */}
          {results.special_condition_resources.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-blue-900">Additional Eligible Resources</CardTitle>
                <CardDescription className="text-blue-700">
                  Based on: {results.special_conditions_applied.join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.special_condition_resources.map((resource, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-start gap-3 flex-1">
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{resource.description}</p>
                          <p className="text-sm text-muted-foreground">
                            Type: {resource.type}
                          </p>
                          <p className="text-sm font-medium text-blue-600 mt-1">
                            Max: ₱{resource.max_amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Request
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
