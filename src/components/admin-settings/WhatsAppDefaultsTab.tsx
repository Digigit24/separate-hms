// src/components/admin-settings/WhatsAppDefaultsTab.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { templatesService } from '@/services/whatsapp/templatesService';
import { Template, TemplateStatus } from '@/types/whatsappTypes';
import type { WhatsAppDefaults, TemplateVariableMapping } from '@/types/user.types';

interface WhatsAppDefaultsTabProps {
  whatsappDefaults: WhatsAppDefaults;
  onWhatsAppDefaultsChange: (defaults: WhatsAppDefaults) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

// Template purpose options
const TEMPLATE_PURPOSES = [
  { key: 'followup', label: 'Followup Reminder', description: 'Default template for CRM followup reminders' },
  { key: 'leadNotification', label: 'Lead Notification', description: 'Default template for new lead notifications' },
  { key: 'appointmentReminder', label: 'Appointment Reminder', description: 'Default template for appointment reminders' },
  { key: 'welcomeMessage', label: 'Welcome Message', description: 'Default template for welcoming new contacts' },
] as const;

// Field sources for variable mapping
const FIELD_SOURCES = [
  { value: 'patient_name', label: 'Patient Name' },
  { value: 'followup_date', label: 'Follow-up Date' },
  { value: 'followup_time', label: 'Follow-up Time' },
  { value: 'doctor_name', label: 'Doctor Name' },
  { value: 'hospital_name', label: 'Hospital Name' },
  { value: 'patient_phone', label: 'Patient Phone' },
] as const;

export const WhatsAppDefaultsTab: React.FC<WhatsAppDefaultsTabProps> = ({
  whatsappDefaults,
  onWhatsAppDefaultsChange,
  onSave,
  isSaving,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch approved templates
  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await templatesService.getTemplates({
        status: TemplateStatus.APPROVED,
        limit: 100,
        skip: 0,
      });
      setTemplates(response.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Handle template selection for a purpose
  const handleTemplateSelect = (purpose: keyof WhatsAppDefaults, templateId: string) => {
    const newDefaults = { ...whatsappDefaults };
    if (templateId === 'none') {
      delete newDefaults[purpose];
    } else {
      // Always store as string to preserve UUIDs like "858d35c1-..."
      // parseInt("858d35c1-...") incorrectly returns 858, not the full UUID
      newDefaults[purpose] = templateId;
    }
    onWhatsAppDefaultsChange(newDefaults);
  };

  // Get template preview text
  const getTemplatePreview = (templateId: number | string | undefined): string => {
    if (!templateId) return '';
    // Compare as strings to handle both number and string IDs
    const template = templates.find(t => String(t.id) === String(templateId));
    if (!template) return '';
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    return bodyComponent?.text || template.body || '';
  };

  // Get template name by ID
  const getTemplateName = (templateId: number | string | undefined): string => {
    if (!templateId) return 'None selected';
    // Compare as strings to handle both number and string IDs
    const template = templates.find(t => String(t.id) === String(templateId));
    return template?.name || 'Unknown template';
  };

  // Extract variables from template body
  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\d+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables.sort((a, b) => parseInt(a) - parseInt(b));
  };

  // Handle variable mapping change
  const handleVariableMappingChange = (variableNumber: string, fieldSource: string) => {
    const currentMapping = whatsappDefaults.followupVariableMapping || [];
    const existingIndex = currentMapping.findIndex(m => m.variableNumber === variableNumber);

    let newMapping: TemplateVariableMapping[];
    if (existingIndex >= 0) {
      newMapping = [...currentMapping];
      newMapping[existingIndex] = { variableNumber, fieldSource };
    } else {
      newMapping = [...currentMapping, { variableNumber, fieldSource }];
    }

    onWhatsAppDefaultsChange({
      ...whatsappDefaults,
      followupVariableMapping: newMapping,
    });
  };

  // Get current mapping for a variable
  const getVariableMapping = (variableNumber: string): string => {
    const mapping = whatsappDefaults.followupVariableMapping?.find(m => m.variableNumber === variableNumber);
    return mapping?.fieldSource || '';
  };

  // Get followup template variables
  const followupTemplateId = whatsappDefaults.followup;
  const followupTemplateBody = getTemplatePreview(followupTemplateId);
  const followupVariables = followupTemplateBody ? extractVariables(followupTemplateBody) : [];

  return (
    <div className="space-y-3">
      <Card className="border-border">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <MessageSquare className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">WhatsApp Default Templates</h3>
                <p className="text-[11px] text-muted-foreground">Pre-selected templates for different message types</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[12px]"
              onClick={fetchTemplates}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              Refresh
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 border border-destructive rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              <p className="text-[12px]">{error}</p>
            </div>
          )}

          {isLoading && templates.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-[12px] text-muted-foreground">Loading templates...</p>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-[12px]">No approved templates found</p>
              <p className="text-[11px] mt-0.5">Create and approve templates in WhatsApp settings first</p>
            </div>
          ) : (
            <div className="space-y-3">
              {TEMPLATE_PURPOSES.map((purpose) => {
                const selectedId = whatsappDefaults[purpose.key as keyof WhatsAppDefaults];
                const preview = getTemplatePreview(selectedId);

                return (
                  <div key={purpose.key} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[12px] font-medium text-foreground">{purpose.label}</p>
                        <p className="text-[11px] text-muted-foreground">{purpose.description}</p>
                      </div>
                      {selectedId && (
                        <Badge variant="secondary" className="text-[11px]">
                          ID: {selectedId}
                        </Badge>
                      )}
                    </div>

                    <Select
                      value={selectedId?.toString() || 'none'}
                      onValueChange={(value) => handleTemplateSelect(purpose.key as keyof WhatsAppDefaults, value)}
                    >
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-[12px]">
                          <span className="text-muted-foreground">None (no default)</span>
                        </SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()} className="text-[12px]">
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {template.language}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {template.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {preview && (
                      <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded-md">
                        <p className="text-[11px] text-muted-foreground mb-0.5">Preview:</p>
                        <p className="text-[12px] whitespace-pre-wrap">{preview}</p>
                      </div>
                    )}

                    {/* Variable Mapping UI for Followup Template */}
                    {purpose.key === 'followup' && selectedId && followupVariables.length > 0 && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                        <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                          Variable Mapping
                        </p>
                        <p className="text-[11px] text-muted-foreground mb-2">
                          Map data fields to template variables
                        </p>
                        <div className="space-y-1.5">
                          {followupVariables.map((varNum) => (
                            <div key={varNum} className="flex items-center gap-2">
                              <span className="text-[11px] font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border min-w-[50px] text-center">
                                {`{{${varNum}}}`}
                              </span>
                              <Select
                                value={getVariableMapping(varNum)}
                                onValueChange={(value) => handleVariableMappingChange(varNum, value)}
                              >
                                <SelectTrigger className="flex-1 h-7 text-[12px]">
                                  <SelectValue placeholder="Select field source" />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_SOURCES.map((source) => (
                                    <SelectItem key={source.value} value={source.value} className="text-[12px]">
                                      {source.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Current Defaults Summary */}
      {Object.keys(whatsappDefaults).length > 0 && (
        <Card className="border-border">
          <div className="p-4 space-y-2">
            <h3 className="text-[13px] font-semibold text-foreground">Current Defaults</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TEMPLATE_PURPOSES.map((purpose) => {
                const selectedId = whatsappDefaults[purpose.key as keyof WhatsAppDefaults];
                return (
                  <div key={purpose.key}>
                    <p className="text-[11px] text-muted-foreground">{purpose.label}</p>
                    <p className="text-[12px] font-medium">{getTemplateName(selectedId)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={onSave}
          size="sm"
          className="h-8 text-[12px]"
          disabled={isSaving || isLoading}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          Save WhatsApp Defaults
        </Button>
      </div>
    </div>
  );
};
