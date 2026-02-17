// src/pages/OPDSettings.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, FileText, Microscope, ListChecks, ClipboardList, Layers } from 'lucide-react';
import { BillingSettingsTab } from '@/components/opd-settings/BillingSettingsTab';
import { ProcedureSettingsTab } from '@/components/opd-settings/ProcedureSettingsTab';
import { TemplatesTab } from '@/components/opd-settings/TemplatesTab';
import { TemplateFieldsTab } from '@/components/opd-settings/TemplateFieldsTab';

type SettingsTab = 'billing' | 'procedures' | 'templates' | 'template-fields';

export const OPDSettings: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const activeTab = (tab as SettingsTab) || 'templates';

  const handleTabChange = (newTab: string) => {
    navigate(`/opd/settings/${newTab}`, { replace: true });
  };

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4" />
        <h1 className="text-lg font-bold leading-none">OPD Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger
            value="templates"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger
            value="template-fields"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Template Fields</span>
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger
            value="procedures"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            <Microscope className="h-4 w-4" />
            <span className="hidden sm:inline">Procedures</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="template-fields" className="space-y-4">
          <TemplateFieldsTab />
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <BillingSettingsTab />
        </TabsContent>

        <TabsContent value="procedures" className="space-y-4">
          <ProcedureSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
