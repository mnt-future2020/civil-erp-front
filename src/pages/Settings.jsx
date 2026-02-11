import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Database, FileText, Loader2, CheckCircle2, XCircle, Wifi, WifiOff, Cloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { getInitials, roleLabels, formatDateTime } from '../lib/utils';
import { toast } from 'sonner';

export default function Settings() {
  const { user, api } = useAuth();
  const [gstCreds, setGstCreds] = useState(null);
  const [gstLoading, setGstLoading] = useState(true);
  const [gstSaving, setGstSaving] = useState(false);
  const [gstTesting, setGstTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [gstForm, setGstForm] = useState({
    gstin: '',
    username: '',
    password: '',
    client_id: '',
    client_secret: '',
    nic_url: 'https://einv-apisandbox.nic.in',
    is_sandbox: true
  });

  useEffect(() => { fetchGstCreds(); }, []);

  const fetchGstCreds = async () => {
    try {
      const res = await api.get('/settings/gst-credentials');
      setGstCreds(res.data);
      if (res.data.is_configured) {
        setGstForm(f => ({
          ...f,
          gstin: res.data.gstin || '',
          username: res.data.username || '',
          client_id: res.data.client_id || '',
          nic_url: res.data.nic_url || 'https://einv-apisandbox.nic.in',
          is_sandbox: res.data.is_sandbox ?? true,
          password: '',
          client_secret: ''
        }));
      }
    } catch { /* ignore */ } finally { setGstLoading(false); }
  };

  const handleGstSave = async (e) => {
    e.preventDefault();
    if (!gstForm.gstin || !gstForm.username || !gstForm.client_id) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!gstCreds?.is_configured && (!gstForm.password || !gstForm.client_secret)) {
      toast.error('Password and Client Secret are required for first setup');
      return;
    }
    setGstSaving(true);
    try {
      const payload = { ...gstForm };
      if (!payload.password) payload.password = '___unchanged___';
      if (!payload.client_secret) payload.client_secret = '___unchanged___';
      await api.post('/settings/gst-credentials', payload);
      toast.success('GST credentials saved');
      setTestResult(null);
      fetchGstCreds();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally { setGstSaving(false); }
  };

  const handleGstTest = async () => {
    setGstTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/gst-credentials/test');
      setTestResult(res.data);
      if (res.data.status === 'connected') toast.success('NIC Portal connected!');
      else toast.warning(res.data.message);
    } catch (error) {
      setTestResult({ status: 'error', message: error.response?.data?.detail || 'Test failed' });
      toast.error('Connection test failed');
    } finally { setGstTesting(false); }
  };

  const handleGstDelete = async () => {
    try {
      await api.delete('/settings/gst-credentials');
      toast.success('GST credentials removed');
      setGstCreds({ is_configured: false });
      setGstForm({ gstin: '', username: '', password: '', client_id: '', client_secret: '', nic_url: 'https://einv-apisandbox.nic.in', is_sandbox: true });
      setTestResult(null);
    } catch { toast.error('Failed to remove credentials'); }
  };

  // Cloudinary Settings
  const [cloudCreds, setCloudCreds] = useState(null);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudForm, setCloudForm] = useState({ cloud_name: '', api_key: '', api_secret: '' });

  useEffect(() => { fetchCloudCreds(); }, []);

  const fetchCloudCreds = async () => {
    try {
      const res = await api.get('/settings/cloudinary');
      setCloudCreds(res.data);
      if (res.data.is_configured) {
        setCloudForm(f => ({ ...f, cloud_name: res.data.cloud_name || '', api_key: res.data.api_key || '', api_secret: '' }));
      }
    } catch { /* ignore */ } finally { setCloudLoading(false); }
  };

  const handleCloudSave = async (e) => {
    e.preventDefault();
    if (!cloudForm.cloud_name || !cloudForm.api_key) { toast.error('Fill all required fields'); return; }
    if (!cloudCreds?.is_configured && !cloudForm.api_secret) { toast.error('API Secret required'); return; }
    setCloudSaving(true);
    try {
      const payload = { ...cloudForm };
      if (!payload.api_secret) payload.api_secret = '___unchanged___';
      await api.post('/settings/cloudinary', payload);
      toast.success('Cloudinary credentials saved');
      fetchCloudCreds();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setCloudSaving(false); }
  };

  const handleCloudDelete = async () => {
    try {
      await api.delete('/settings/cloudinary');
      toast.success('Cloudinary credentials removed');
      setCloudCreds({ is_configured: false });
      setCloudForm({ cloud_name: '', api_key: '', api_secret: '' });
    } catch { toast.error('Failed'); }
  };

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and application preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="rounded-sm">
          <TabsTrigger value="profile" className="rounded-sm gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-sm gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-sm gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-sm gap-2">
            <Database className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="gst" className="rounded-sm gap-2" data-testid="gst-integration-tab">
            <FileText className="w-4 h-4" />
            GST Integration
          </TabsTrigger>
          <TabsTrigger value="cloudinary" className="rounded-sm gap-2" data-testid="cloudinary-tab">
            <Cloud className="w-4 h-4" />
            Cloudinary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="text-2xl bg-accent text-accent-foreground">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{roleLabels[user?.role] || user?.role}</p>
                  <Button variant="outline" size="sm" className="mt-2 rounded-sm">
                    Change Photo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input defaultValue={user?.name} className="rounded-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={user?.email} type="email" className="rounded-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue={user?.phone || ''} placeholder="+91 98765 43210" className="rounded-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input defaultValue={user?.department || ''} placeholder="Engineering" className="rounded-sm" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} className="action-btn-accent rounded-sm">
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive alerts and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <p className="font-medium">Project Updates</p>
                    <p className="text-sm text-muted-foreground">Get notified about project milestones</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <p className="font-medium">PO Approvals</p>
                    <p className="text-sm text-muted-foreground">Alerts for pending purchase orders</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <p className="font-medium">Compliance Reminders</p>
                    <p className="text-sm text-muted-foreground">GST and RERA filing deadlines</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <p className="font-medium">Daily Reports</p>
                    <p className="text-sm text-muted-foreground">Receive daily summary reports</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} className="action-btn-accent rounded-sm">
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" placeholder="••••••••" className="rounded-sm max-w-md" />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" placeholder="••••••••" className="rounded-sm max-w-md" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" placeholder="••••••••" className="rounded-sm max-w-md" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} className="action-btn-accent rounded-sm">
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm mt-4">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground">Use an authenticator app for login</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Application configuration and data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Application Version</p>
                  <p className="font-mono">v1.0.0</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Environment</p>
                  <p className="font-mono">Production</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Database</p>
                  <p className="font-mono">MongoDB</p>
                </div>
                <div>
                  <p className="text-muted-foreground">AI Model</p>
                  <p className="font-mono">GPT-5.2</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Region</p>
                  <p className="font-mono">Tamil Nadu, India</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Time Zone</p>
                  <p className="font-mono">IST (UTC+5:30)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gst">
          <Card className="rounded-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>NIC E-Invoice Portal Credentials</CardTitle>
                  <CardDescription>Configure your GST E-Invoicing credentials for NIC portal integration</CardDescription>
                </div>
                {gstCreds?.is_configured ? (
                  <Badge className="bg-emerald-100 text-emerald-700 gap-1 rounded-sm" data-testid="gst-configured-badge">
                    <CheckCircle2 className="w-3 h-3" /> Configured
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 gap-1 rounded-sm" data-testid="gst-not-configured-badge">
                    <XCircle className="w-3 h-3" /> Not Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {gstLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={handleGstSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>GSTIN *</Label>
                      <Input
                        value={gstForm.gstin}
                        onChange={e => setGstForm(f => ({...f, gstin: e.target.value.toUpperCase()}))}
                        placeholder="33AABCT1332L1ZA"
                        required
                        className="rounded-sm font-mono"
                        data-testid="gst-gstin-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>NIC Portal URL *</Label>
                      <Input
                        value={gstForm.nic_url}
                        onChange={e => setGstForm(f => ({...f, nic_url: e.target.value}))}
                        placeholder="https://einv-apisandbox.nic.in"
                        required
                        className="rounded-sm font-mono text-sm"
                        data-testid="gst-url-input"
                      />
                      <p className="text-xs text-muted-foreground">Sandbox: einv-apisandbox.nic.in | Production: einv-api.nic.in</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username *</Label>
                      <Input
                        value={gstForm.username}
                        onChange={e => setGstForm(f => ({...f, username: e.target.value}))}
                        placeholder="NIC portal username"
                        required
                        className="rounded-sm"
                        data-testid="gst-username-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password {gstCreds?.is_configured ? '(leave blank to keep current)' : '*'}</Label>
                      <Input
                        type="password"
                        value={gstForm.password}
                        onChange={e => setGstForm(f => ({...f, password: e.target.value}))}
                        placeholder={gstCreds?.is_configured ? '••••••••' : 'Enter password'}
                        className="rounded-sm"
                        data-testid="gst-password-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client ID *</Label>
                      <Input
                        value={gstForm.client_id}
                        onChange={e => setGstForm(f => ({...f, client_id: e.target.value}))}
                        placeholder="NIC Client ID"
                        required
                        className="rounded-sm font-mono"
                        data-testid="gst-clientid-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret {gstCreds?.is_configured ? '(leave blank to keep current)' : '*'}</Label>
                      <Input
                        type="password"
                        value={gstForm.client_secret}
                        onChange={e => setGstForm(f => ({...f, client_secret: e.target.value}))}
                        placeholder={gstCreds?.is_configured ? '••••••••' : 'Enter client secret'}
                        className="rounded-sm"
                        data-testid="gst-clientsecret-input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={gstForm.is_sandbox}
                      onCheckedChange={v => setGstForm(f => ({...f, is_sandbox: v}))}
                      data-testid="gst-sandbox-toggle"
                    />
                    <Label>Sandbox Mode (testing environment)</Label>
                  </div>

                  {gstCreds?.last_updated && (
                    <p className="text-xs text-muted-foreground">Last updated: {formatDateTime(gstCreds.last_updated)}</p>
                  )}

                  {/* Test Result */}
                  {testResult && (
                    <Card className={`rounded-sm border-l-4 ${testResult.status === 'connected' ? 'border-l-emerald-500 bg-emerald-50' : 'border-l-red-500 bg-red-50'}`}>
                      <CardContent className="p-3 flex items-center gap-3">
                        {testResult.status === 'connected' ? (
                          <Wifi className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <WifiOff className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className={`font-semibold text-sm ${testResult.status === 'connected' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {testResult.status === 'connected' ? 'Connected' : 'Connection Failed'}
                          </p>
                          <p className={`text-xs ${testResult.status === 'connected' ? 'text-emerald-600' : 'text-red-600'}`}>{testResult.message}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      {gstCreds?.is_configured && (
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={handleGstTest} disabled={gstTesting} className="rounded-sm gap-1" data-testid="gst-test-btn">
                            {gstTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                            Test Connection
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="rounded-sm text-red-500 hover:text-red-700" onClick={handleGstDelete} data-testid="gst-delete-btn">
                            Remove Credentials
                          </Button>
                        </>
                      )}
                    </div>
                    <Button type="submit" className="action-btn-accent rounded-sm" disabled={gstSaving} data-testid="gst-save-btn">
                      {gstSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      {gstCreds?.is_configured ? 'Update Credentials' : 'Save Credentials'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cloudinary">
          <Card className="rounded-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cloudinary Storage</CardTitle>
                  <CardDescription>Configure Cloudinary for document and image storage</CardDescription>
                </div>
                {cloudCreds?.is_configured ? (
                  <Badge className="bg-emerald-100 text-emerald-700 gap-1 rounded-sm" data-testid="cloud-configured-badge"><CheckCircle2 className="w-3 h-3" /> Configured</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 gap-1 rounded-sm" data-testid="cloud-not-configured-badge"><XCircle className="w-3 h-3" /> Not Configured (Local Storage)</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {cloudLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <form onSubmit={handleCloudSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cloud Name *</Label>
                    <Input value={cloudForm.cloud_name} onChange={e => setCloudForm(f => ({...f, cloud_name: e.target.value}))} placeholder="your-cloud-name" required className="rounded-sm font-mono" data-testid="cloud-name-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>API Key *</Label>
                      <Input value={cloudForm.api_key} onChange={e => setCloudForm(f => ({...f, api_key: e.target.value}))} placeholder="123456789012345" required className="rounded-sm font-mono" data-testid="cloud-apikey-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>API Secret {cloudCreds?.is_configured ? '(leave blank to keep)' : '*'}</Label>
                      <Input type="password" value={cloudForm.api_secret} onChange={e => setCloudForm(f => ({...f, api_secret: e.target.value}))} placeholder={cloudCreds?.is_configured ? '••••••••' : 'Enter secret'} className="rounded-sm" data-testid="cloud-secret-input" />
                    </div>
                  </div>
                  {!cloudCreds?.is_configured && (
                    <p className="text-xs text-muted-foreground">Without Cloudinary, files are stored locally on the server. Get credentials at <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">cloudinary.com</a></p>
                  )}
                  {cloudCreds?.last_updated && <p className="text-xs text-muted-foreground">Last updated: {formatDateTime(cloudCreds.last_updated)}</p>}
                  <div className="flex items-center justify-between pt-2">
                    {cloudCreds?.is_configured && (
                      <Button type="button" variant="outline" size="sm" className="rounded-sm text-red-500 hover:text-red-700" onClick={handleCloudDelete} data-testid="cloud-delete-btn">Remove Credentials</Button>
                    )}
                    <div className="ml-auto">
                      <Button type="submit" className="action-btn-accent rounded-sm" disabled={cloudSaving} data-testid="cloud-save-btn">
                        {cloudSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        {cloudCreds?.is_configured ? 'Update' : 'Save Credentials'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
