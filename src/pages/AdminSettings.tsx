// src/pages/AdminSettings.tsx
import React, { useState, useEffect } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Loader2, AlertCircle, Save, Building2, Database, Settings as SettingsIcon, Image as ImageIcon, X, User, Plus, Trash2, Moon, Sun, IndianRupee, MessageSquare } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { TenantUpdateData, TenantSettings } from '@/types/tenant.types';
import type { UserPreferences, WhatsAppDefaults } from '@/types/user.types';
import { authClient } from '@/lib/client';
import { API_CONFIG, buildUrl } from '@/lib/apiConfig';
import { CurrencySettingsTab } from '@/components/admin-settings/CurrencySettingsTab';
import { WhatsAppDefaultsTab } from '@/components/admin-settings/WhatsAppDefaultsTab';

export const AdminSettings: React.FC = () => {
  // Get tenant from current session
  const { getTenant, user } = useAuth();
  const tenant = getTenant();
  const tenantId = tenant?.id || null;
  const userId = user?.id || null;

  const {
    useTenantDetail,
    updateTenant,
    isLoading: isMutating
  } = useTenant();

  const { data: tenantData, error, isLoading, mutate } = useTenantDetail(tenantId);

  // User Preferences state
  const [userPreferencesData, setUserPreferencesData] = useState<any>(null);
  const [userPreferencesLoading, setUserPreferencesLoading] = useState<boolean>(false);
  const [userPreferencesError, setUserPreferencesError] = useState<string | null>(null);
  const [editedPreferences, setEditedPreferences] = useState<UserPreferences>({});
  const [isSavingPreferences, setIsSavingPreferences] = useState<boolean>(false);
  const [newPrefKey, setNewPrefKey] = useState<string>('');
  const [newPrefValue, setNewPrefValue] = useState<string>('');
  const [whatsappDefaults, setWhatsappDefaults] = useState<WhatsAppDefaults>({});

  // Basic tenant fields (direct fields, not in settings)
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [trialEndsAt, setTrialEndsAt] = useState('');

  // Database configuration (direct fields)
  const [databaseName, setDatabaseName] = useState('');
  const [databaseUrl, setDatabaseUrl] = useState('');

  // Enabled modules (direct field)
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [newModule, setNewModule] = useState('');

  // Settings fields (all go into settings JSON)
  const [domain, setDomain] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // WhatsApp API settings
  const [whatsappVendorUid, setWhatsappVendorUid] = useState('');
  const [whatsappApiToken, setWhatsappApiToken] = useState('');

  // Branding settings (all go into settings JSON)
  const [headerBgColor, setHeaderBgColor] = useState('#3b82f6');
  const [headerTextColor, setHeaderTextColor] = useState('#ffffff');
  const [footerBgColor, setFooterBgColor] = useState('#3b82f6');
  const [footerTextColor, setFooterTextColor] = useState('#ffffff');
  const [headerUseGradient, setHeaderUseGradient] = useState(false);
  const [footerUseGradient, setFooterUseGradient] = useState(false);

  // Currency settings (all go into settings JSON)
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [currencyName, setCurrencyName] = useState('Indian Rupee');
  const [currencyDecimals, setCurrencyDecimals] = useState(2);
  const [currencyThousandSeparator, setCurrencyThousandSeparator] = useState(',');
  const [currencyDecimalSeparator, setCurrencyDecimalSeparator] = useState('.');
  const [currencySymbolPosition, setCurrencySymbolPosition] = useState<'before' | 'after'>('before');
  const [currencyUseIndianNumbering, setCurrencyUseIndianNumbering] = useState(true);

  // Initialize form with tenant data
  useEffect(() => {
    if (tenantData) {
      // Direct fields
      setName(tenantData.name || '');
      setSlug(tenantData.slug || '');
      setIsActive(tenantData.is_active ?? true);
      setTrialEndsAt(tenantData.trial_ends_at ? formatLocalDate(new Date(tenantData.trial_ends_at)) : '');
      setDatabaseName(tenantData.database_name || '');
      setDatabaseUrl(tenantData.database_url || '');
      setEnabledModules(tenantData.enabled_modules || []);

      // Settings fields
      const settings = tenantData.settings || {};
      setDomain(settings.domain || tenantData.domain || '');
      setAddress(settings.address || '');
      setContactEmail(settings.contact_email || '');
      setContactPhone(settings.contact_phone || '');
      setWebsiteUrl(settings.website_url || '');
      const headerBg = settings.header_bg_color || '#3b82f6';
      const footerBg = settings.footer_bg_color || '#3b82f6';

      setHeaderBgColor(headerBg);
      setHeaderTextColor(settings.header_text_color || '#ffffff');
      setFooterBgColor(footerBg);
      setFooterTextColor(settings.footer_text_color || '#ffffff');

      // Detect if it's a gradient (contains 'gradient')
      setHeaderUseGradient(headerBg.includes('gradient'));
      setFooterUseGradient(footerBg.includes('gradient'));

      // Load existing logo from settings
      if (settings.logo) {
        setLogoPreview(settings.logo);
      }

      // WhatsApp API settings
      setWhatsappVendorUid(settings.whatsapp_vendor_uid || '');
      setWhatsappApiToken(settings.whatsapp_api_token || '');

      // Currency settings
      setCurrencyCode(settings.currency_code || 'INR');
      setCurrencySymbol(settings.currency_symbol || '₹');
      setCurrencyName(settings.currency_name || 'Indian Rupee');
      setCurrencyDecimals(settings.currency_decimals || 2);
      setCurrencyThousandSeparator(settings.currency_thousand_separator || ',');
      setCurrencyDecimalSeparator(settings.currency_decimal_separator || '.');
      setCurrencySymbolPosition(settings.currency_symbol_position || 'before');
      setCurrencyUseIndianNumbering(settings.currency_use_indian_numbering ?? true);
    }
  }, [tenantData]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddModule = () => {
    if (newModule.trim() && !enabledModules.includes(newModule.trim())) {
      setEnabledModules([...enabledModules, newModule.trim()]);
      setNewModule('');
    }
  };

  const handleRemoveModule = (module: string) => {
    setEnabledModules(enabledModules.filter(m => m !== module));
  };

  const handleSave = async () => {
    if (!tenantId) {
      toast.error('No tenant ID found');
      return;
    }

    try {
      // Build settings object with all form data
      const settings: TenantSettings = {
        domain,
        address,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        website_url: websiteUrl,
        header_bg_color: headerBgColor,
        header_text_color: headerTextColor,
        footer_bg_color: footerBgColor,
        footer_text_color: footerTextColor,
        logo: logoPreview, // Base64 or URL
        // WhatsApp API settings
        whatsapp_vendor_uid: whatsappVendorUid,
        whatsapp_api_token: whatsappApiToken,
        // Currency settings
        currency_code: currencyCode,
        currency_symbol: currencySymbol,
        currency_name: currencyName,
        currency_decimals: currencyDecimals,
        currency_thousand_separator: currencyThousandSeparator,
        currency_decimal_separator: currencyDecimalSeparator,
        currency_symbol_position: currencySymbolPosition,
        currency_use_indian_numbering: currencyUseIndianNumbering,
      };

      const updateData: TenantUpdateData = {
        name,
        slug,
        database_name: databaseName || null,
        database_url: databaseUrl || null,
        enabled_modules: enabledModules,
        settings, // All form data goes here
        is_active: isActive,
        trial_ends_at: trialEndsAt || null,
      };

      await updateTenant(tenantId, updateData);
      toast.success('Tenant settings saved successfully');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save tenant settings');
    }
  };

  // Fetch user preferences data
  const fetchUserPreferences = async () => {
    if (!userId) {
      setUserPreferencesError('No user ID found');
      return;
    }

    setUserPreferencesLoading(true);
    setUserPreferencesError(null);

    try {
      const url = buildUrl(API_CONFIG.AUTH.USERS.DETAIL, { id: userId }, 'auth');
      const response = await authClient.get(url);
      setUserPreferencesData(response.data);
      // Initialize editedPreferences with current preferences or empty object
      setEditedPreferences(response.data?.preferences || {});
      // Initialize whatsappDefaults from preferences
      setWhatsappDefaults(response.data?.preferences?.whatsappDefaults || {});
      console.log('User preferences data:', response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch user preferences';
      setUserPreferencesError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUserPreferencesLoading(false);
    }
  };

  // Save user preferences
  const saveUserPreferences = async () => {
    if (!userId) {
      toast.error('No user ID found');
      return;
    }

    setIsSavingPreferences(true);

    try {
      const url = buildUrl(API_CONFIG.AUTH.USERS.UPDATE, { id: userId }, 'auth');
      const response = await authClient.patch(url, { preferences: editedPreferences });
      setUserPreferencesData(response.data);
      setEditedPreferences(response.data?.preferences || {});

      // Update local storage and apply preferences immediately
      const { authService } = await import('@/services/authService');
      authService.updateUserPreferences(response.data?.preferences || {});

      toast.success('Preferences saved successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save preferences';
      toast.error(errorMessage);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Add custom preference
  const addCustomPreference = () => {
    if (!newPrefKey.trim()) {
      toast.error('Please enter a preference key');
      return;
    }

    setEditedPreferences(prev => ({
      ...prev,
      [newPrefKey]: newPrefValue
    }));
    setNewPrefKey('');
    setNewPrefValue('');
    toast.success('Preference added');
  };

  // Remove custom preference
  const removeCustomPreference = (key: string) => {
    setEditedPreferences(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
    toast.success('Preference removed');
  };

  // Save WhatsApp defaults
  const saveWhatsAppDefaults = async () => {
    if (!userId) {
      toast.error('No user ID found');
      return;
    }

    setIsSavingPreferences(true);

    try {
      const url = buildUrl(API_CONFIG.AUTH.USERS.UPDATE, { id: userId }, 'auth');
      const updatedPreferences = {
        ...editedPreferences,
        whatsappDefaults,
      };
      const response = await authClient.patch(url, { preferences: updatedPreferences });
      setUserPreferencesData(response.data);
      setEditedPreferences(response.data?.preferences || {});
      setWhatsappDefaults(response.data?.preferences?.whatsappDefaults || {});

      // Update local storage and apply preferences immediately
      const { authService } = await import('@/services/authService');
      authService.updateUserPreferences(response.data?.preferences || {});

      toast.success('WhatsApp defaults saved successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save WhatsApp defaults';
      toast.error(errorMessage);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Update preference value
  const updatePreferenceValue = (key: string, value: any) => {
    setEditedPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Show error if no tenant ID is found
  if (!tenantId) {
    return (
      <div className="p-4 md:p-5 w-full space-y-3">
        <h1 className="text-lg font-bold leading-none">Admin Settings</h1>

        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive font-semibold text-[12px] mb-1">
              <AlertCircle className="h-3.5 w-3.5" />
              No Tenant Found
            </div>
            <p className="text-[12px] text-muted-foreground">
              Unable to retrieve tenant information from your session. Please try logging in again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Admin Settings</h1>
          {tenantData && (
            <Badge variant={tenantData.is_active ? 'default' : 'destructive'} className="text-[11px]">
              {tenantData.is_active ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto h-7 text-[12px]"
          onClick={() => mutate()}
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

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-destructive font-semibold text-[12px] mb-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Error Loading Tenant Data
            </div>
            <p className="text-[12px]">{error.message || 'Failed to load tenant data'}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tenant ID: {tenantId}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !tenantData && (
        <Card className="border-border">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">Loading tenant data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant Settings Forms */}
      {tenantData && (
        <Tabs defaultValue="tenant" className="w-full">
          <TabsList className="h-8 p-0.5 bg-neutral-100 dark:bg-neutral-800 w-fit">
            <TabsTrigger value="tenant" className="text-[11px] h-7 px-3 data-[state=active]:bg-background">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Tenant
            </TabsTrigger>
            <TabsTrigger value="currency" className="text-[11px] h-7 px-3 data-[state=active]:bg-background">
              <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
              Currency
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-[11px] h-7 px-3 data-[state=active]:bg-background" onClick={() => fetchUserPreferences()}>
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="user" className="text-[11px] h-7 px-3 data-[state=active]:bg-background" onClick={() => fetchUserPreferences()}>
              <User className="h-3.5 w-3.5 mr-1.5" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Tenant Settings Tab */}
          <TabsContent value="tenant" className="mt-3">
            <div className="space-y-3">
          {/* Basic Information Card */}
          <Card className="border-border">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                </div>
                <h3 className="text-[13px] font-semibold text-foreground">Tenant Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-[12px]">Tenant Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter tenant name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="slug" className="text-[12px]">Slug</Label>
                  <Input
                    id="slug"
                    placeholder="tenant-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="logo" className="text-[12px]">Logo</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="cursor-pointer flex-1 h-8 text-[12px]"
                  />
                  {logoPreview && (
                    <div className="w-8 h-8 border rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="domain" className="text-[12px]">Domain</Label>
                  <Input
                    id="domain"
                    type="text"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="websiteUrl" className="text-[12px]">Website</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="address" className="text-[12px]">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter tenant address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="text-[12px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="contactEmail" className="text-[12px]">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="contact@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="contactPhone" className="text-[12px]">Phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>
              </div>

              {/* WhatsApp API Configuration */}
              <div className="pt-3 border-t border-border space-y-3">
                <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">WhatsApp API</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="whatsappVendorUid" className="text-[12px]">Vendor UID</Label>
                    <Input
                      id="whatsappVendorUid"
                      type="text"
                      placeholder="e.g., 90d99df2-4fc7-..."
                      value={whatsappVendorUid}
                      onChange={(e) => setWhatsappVendorUid(e.target.value)}
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="whatsappApiToken" className="text-[12px]">Access Token</Label>
                    <Input
                      id="whatsappApiToken"
                      type="password"
                      placeholder="Enter access token"
                      value={whatsappApiToken}
                      onChange={(e) => setWhatsappApiToken(e.target.value)}
                      className="h-8 text-[12px]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="trialEndsAt" className="text-[12px]">Trial Ends At</Label>
                  <Input
                    id="trialEndsAt"
                    type="date"
                    value={trialEndsAt}
                    onChange={(e) => setTrialEndsAt(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="isActive" className="text-[12px]">Status</Label>
                  <div className="flex items-center gap-2 h-8">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-3.5 h-3.5 rounded"
                    />
                    <Label htmlFor="isActive" className="text-[12px] font-normal cursor-pointer">
                      Active
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Branding & Colors Card */}
          <Card className="border-border">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <ImageIcon className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                </div>
                <h3 className="text-[13px] font-semibold text-foreground">Branding & Colors</h3>
              </div>

              {/* Header Colors */}
              <div className="space-y-2">
                <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Header</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12px]">Background</Label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="headerUseGradient"
                          checked={headerUseGradient}
                          onChange={(e) => {
                            setHeaderUseGradient(e.target.checked);
                            if (e.target.checked && !headerBgColor.includes('gradient')) {
                              setHeaderBgColor('linear-gradient(to right, #3b82f6, #8b5cf6)');
                            } else if (!e.target.checked && headerBgColor.includes('gradient')) {
                              setHeaderBgColor('#3b82f6');
                            }
                          }}
                          className="w-3 h-3 rounded"
                        />
                        <Label htmlFor="headerUseGradient" className="text-[11px] font-normal cursor-pointer">
                          Gradient
                        </Label>
                      </div>
                    </div>
                    {headerUseGradient ? (
                      <Textarea
                        value={headerBgColor}
                        onChange={(e) => setHeaderBgColor(e.target.value)}
                        placeholder="linear-gradient(to right, #3b82f6, #8b5cf6)"
                        rows={2}
                        className="font-mono text-[11px]"
                      />
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={headerBgColor}
                          onChange={(e) => setHeaderBgColor(e.target.value)}
                          className="w-10 h-8 cursor-pointer p-0.5"
                        />
                        <Input
                          type="text"
                          value={headerBgColor}
                          onChange={(e) => setHeaderBgColor(e.target.value)}
                          placeholder="#3b82f6"
                          className="flex-1 h-8 text-[12px] font-mono"
                        />
                      </div>
                    )}
                    <div
                      className="h-6 rounded border"
                      style={{ background: headerBgColor }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={headerTextColor}
                        onChange={(e) => setHeaderTextColor(e.target.value)}
                        className="w-10 h-8 cursor-pointer p-0.5"
                      />
                      <Input
                        type="text"
                        value={headerTextColor}
                        onChange={(e) => setHeaderTextColor(e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1 h-8 text-[12px] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Colors */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Footer</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12px]">Background</Label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="footerUseGradient"
                          checked={footerUseGradient}
                          onChange={(e) => {
                            setFooterUseGradient(e.target.checked);
                            if (e.target.checked && !footerBgColor.includes('gradient')) {
                              setFooterBgColor('linear-gradient(to right, #3b82f6, #8b5cf6)');
                            } else if (!e.target.checked && footerBgColor.includes('gradient')) {
                              setFooterBgColor('#3b82f6');
                            }
                          }}
                          className="w-3 h-3 rounded"
                        />
                        <Label htmlFor="footerUseGradient" className="text-[11px] font-normal cursor-pointer">
                          Gradient
                        </Label>
                      </div>
                    </div>
                    {footerUseGradient ? (
                      <Textarea
                        value={footerBgColor}
                        onChange={(e) => setFooterBgColor(e.target.value)}
                        placeholder="linear-gradient(to right, #3b82f6, #8b5cf6)"
                        rows={2}
                        className="font-mono text-[11px]"
                      />
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={footerBgColor}
                          onChange={(e) => setFooterBgColor(e.target.value)}
                          className="w-10 h-8 cursor-pointer p-0.5"
                        />
                        <Input
                          type="text"
                          value={footerBgColor}
                          onChange={(e) => setFooterBgColor(e.target.value)}
                          placeholder="#3b82f6"
                          className="flex-1 h-8 text-[12px] font-mono"
                        />
                      </div>
                    )}
                    <div
                      className="h-6 rounded border"
                      style={{ background: footerBgColor }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={footerTextColor}
                        onChange={(e) => setFooterTextColor(e.target.value)}
                        className="w-10 h-8 cursor-pointer p-0.5"
                      />
                      <Input
                        type="text"
                        value={footerTextColor}
                        onChange={(e) => setFooterTextColor(e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1 h-8 text-[12px] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Database Configuration Card */}
          <Card className="border-border">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Database className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                </div>
                <h3 className="text-[13px] font-semibold text-foreground">Database Configuration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="databaseName" className="text-[12px]">Database Name</Label>
                  <Input
                    id="databaseName"
                    placeholder="Neon database name"
                    value={databaseName}
                    onChange={(e) => setDatabaseName(e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="databaseUrl" className="text-[12px]">Database URL</Label>
                  <Input
                    id="databaseUrl"
                    placeholder="postgresql://..."
                    value={databaseUrl}
                    onChange={(e) => setDatabaseUrl(e.target.value)}
                    className="h-8 text-[12px] font-mono"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Enabled Modules Card */}
          <Card className="border-border">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <SettingsIcon className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                </div>
                <h3 className="text-[13px] font-semibold text-foreground">Enabled Modules</h3>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {enabledModules.map((module) => (
                  <Badge key={module} variant="secondary" className="text-[11px] px-2 py-0.5">
                    {module}
                    <button
                      onClick={() => handleRemoveModule(module)}
                      className="ml-1.5 hover:text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
                {enabledModules.length === 0 && (
                  <p className="text-[12px] text-muted-foreground">No modules enabled</p>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add module (e.g., crm, whatsapp, hms)"
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddModule()}
                  className="h-8 text-[12px]"
                />
                <Button onClick={handleAddModule} variant="outline" size="sm" className="h-8 text-[12px]">
                  Add
                </Button>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              size="sm"
              className="h-8 text-[12px]"
              disabled={isMutating}
            >
              {isMutating ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save Settings
            </Button>
          </div>
            </div>
          </TabsContent>

          {/* Currency Settings Tab */}
          <TabsContent value="currency" className="mt-3">
            <CurrencySettingsTab
              currencyCode={currencyCode}
              currencySymbol={currencySymbol}
              currencyName={currencyName}
              currencyDecimals={currencyDecimals}
              currencyThousandSeparator={currencyThousandSeparator}
              currencyDecimalSeparator={currencyDecimalSeparator}
              currencySymbolPosition={currencySymbolPosition}
              currencyUseIndianNumbering={currencyUseIndianNumbering}
              onCurrencyCodeChange={setCurrencyCode}
              onCurrencySymbolChange={setCurrencySymbol}
              onCurrencyNameChange={setCurrencyName}
              onCurrencyDecimalsChange={setCurrencyDecimals}
              onCurrencyThousandSeparatorChange={setCurrencyThousandSeparator}
              onCurrencyDecimalSeparatorChange={setCurrencyDecimalSeparator}
              onCurrencySymbolPositionChange={setCurrencySymbolPosition}
              onCurrencyUseIndianNumberingChange={setCurrencyUseIndianNumbering}
            />

            {/* Save Button */}
            <div className="flex justify-end mt-3">
              <Button
                onClick={handleSave}
                size="sm"
                className="h-8 text-[12px]"
                disabled={isMutating}
              >
                {isMutating ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save Currency Settings
              </Button>
            </div>
          </TabsContent>

          {/* WhatsApp Defaults Tab */}
          <TabsContent value="whatsapp" className="mt-3">
            <WhatsAppDefaultsTab
              whatsappDefaults={whatsappDefaults}
              onWhatsAppDefaultsChange={setWhatsappDefaults}
              onSave={saveWhatsAppDefaults}
              isSaving={isSavingPreferences}
            />
          </TabsContent>

          {/* User Preferences Tab */}
          <TabsContent value="user" className="mt-3">
            <div className="space-y-3">
              <Card className="border-border">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                      </div>
                      <h3 className="text-[13px] font-semibold text-foreground">User Preferences</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[12px]"
                        onClick={fetchUserPreferences}
                        disabled={userPreferencesLoading}
                      >
                        {userPreferencesLoading ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        )}
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-[12px]"
                        onClick={saveUserPreferences}
                        disabled={isSavingPreferences || userPreferencesLoading}
                      >
                        {isSavingPreferences ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>

                  {userPreferencesLoading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-[12px] text-muted-foreground">Loading user data...</p>
                      </div>
                    </div>
                  )}

                  {userPreferencesError && (
                    <div className="text-destructive py-3">
                      <p className="text-[12px] font-semibold">Error:</p>
                      <p className="text-[12px]">{userPreferencesError}</p>
                    </div>
                  )}

                  {userPreferencesData && !userPreferencesLoading && (
                    <div className="space-y-4">
                      {/* Theme Preference */}
                      <div className="space-y-1.5">
                        <Label className="text-[12px]">Theme</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant={editedPreferences.theme === 'light' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updatePreferenceValue('theme', 'light')}
                            className="h-7 text-[11px] px-3"
                          >
                            <Sun className="h-3 w-3 mr-1.5" />
                            Light
                          </Button>
                          <Button
                            type="button"
                            variant={editedPreferences.theme === 'dark' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updatePreferenceValue('theme', 'dark')}
                            className="h-7 text-[11px] px-3"
                          >
                            <Moon className="h-3 w-3 mr-1.5" />
                            Dark
                          </Button>
                          {editedPreferences.theme && (
                            <Badge variant="secondary" className="text-[11px]">
                              {editedPreferences.theme}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Custom Preferences */}
                      <div className="space-y-2">
                        <Label className="text-[12px]">Custom Preferences</Label>
                        <div className="space-y-2">
                          {Object.entries(editedPreferences)
                            .filter(([key]) => key !== 'theme')
                            .map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[11px] text-muted-foreground">Key</Label>
                                    <p className="text-[12px] font-medium">{key}</p>
                                  </div>
                                  <div>
                                    <Label className="text-[11px] text-muted-foreground">Value</Label>
                                    <Input
                                      value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      onChange={(e) => {
                                        try {
                                          const parsed = JSON.parse(e.target.value);
                                          updatePreferenceValue(key, parsed);
                                        } catch {
                                          updatePreferenceValue(key, e.target.value);
                                        }
                                      }}
                                      className="h-7 text-[12px]"
                                    />
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCustomPreference(key)}
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Add New Preference */}
                      <div className="space-y-2 pt-3 border-t border-border">
                        <Label className="text-[12px]">Add New Preference</Label>
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="newPrefKey" className="text-[11px] text-muted-foreground">Key</Label>
                            <Input
                              id="newPrefKey"
                              placeholder="e.g., language, timezone"
                              value={newPrefKey}
                              onChange={(e) => setNewPrefKey(e.target.value)}
                              className="h-8 text-[12px]"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="newPrefValue" className="text-[11px] text-muted-foreground">Value</Label>
                            <Input
                              id="newPrefValue"
                              placeholder="Enter value"
                              value={newPrefValue}
                              onChange={(e) => setNewPrefValue(e.target.value)}
                              className="h-8 text-[12px]"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={addCustomPreference}
                            size="sm"
                            className="h-8 text-[12px]"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!userPreferencesData && !userPreferencesLoading && !userPreferencesError && (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-[12px]">Click the tab to load user preferences data</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* User Info Card (Read-only) */}
              {userPreferencesData && (
                <Card className="border-border">
                  <div className="p-4 space-y-3">
                    <h3 className="text-[13px] font-semibold text-foreground">User Information</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Email</p>
                        <p className="text-[12px] font-medium">{userPreferencesData.email}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Name</p>
                        <p className="text-[12px] font-medium">{userPreferencesData.first_name} {userPreferencesData.last_name}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Timezone</p>
                        <p className="text-[12px] font-medium">{userPreferencesData.timezone || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Status</p>
                        <Badge variant={userPreferencesData.is_active ? 'default' : 'secondary'} className="text-[11px] mt-0.5">
                          {userPreferencesData.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
