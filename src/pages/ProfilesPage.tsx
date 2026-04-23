import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/api/profiles';
import { recordsApi } from '@/api/records';
import { quotesApi } from '@/api/quotes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, MessagesSquare, BellRing } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Profile, ProfileStatus, RecordModel, RecordStatus, AlertMode } from '@/types';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ProfilesPage() {
  const queryClient = useQueryClient();
  
  // Profile Dialog State
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileFormData, setProfileFormData] = useState({
    uniqueName: '',
    status: 'enabled' as ProfileStatus,
    telegramTokens: ''
  });

  // Record Dialog State
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordModel | null>(null);
  const [recordFormData, setRecordFormData] = useState({
    symbol: '',
    upperLimit: '',
    lowerLimit: '',
    status: 'enabled' as RecordStatus,
    alertMode: 'one-time' as AlertMode,
    checkInterval: 1,
    profileId: ''
  });

  // 1. Fetch Profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: profilesApi.getAll
  });

  // 2. Compute unique symbols across all records
  const uniqueSymbols = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach(p => p.records?.forEach(r => set.add(r.symbol)));
    return Array.from(set);
  }, [profiles]);

  // 3. Fetch Live Quotes (refetches every 10 seconds)
  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes', uniqueSymbols],
    queryFn: () => quotesApi.getQuotes(uniqueSymbols),
    enabled: uniqueSymbols.length > 0,
    refetchInterval: 10000,
  });

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    quotes.forEach(q => { map[q.symbol] = q.close_price; });
    return map;
  }, [quotes]);

  // --- Profile Mutations ---
  const createProfile = useMutation({
    mutationFn: profilesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile created successfully');
      setIsProfileDialogOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create profile')
  });

  const updateProfile = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Profile> }) => profilesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated successfully');
      setIsProfileDialogOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update profile')
  });

  const deleteProfile = useMutation({
    mutationFn: profilesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile deleted successfully');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to delete profile')
  });

  // --- Record Mutations ---
  const createRecord = useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Alert record added successfully');
      setIsRecordDialogOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create alert')
  });

  const updateRecord = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<RecordModel> }) => recordsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Alert record updated successfully');
      setIsRecordDialogOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update alert')
  });

  const deleteRecord = useMutation({
    mutationFn: recordsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Alert record deleted successfully');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to delete alert')
  });

  // --- Handlers ---
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tokens = profileFormData.telegramTokens.split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (!profileFormData.uniqueName) return toast.error('Name is required');

    if (editingProfile) {
      updateProfile.mutate({
        id: editingProfile.id,
        data: { uniqueName: profileFormData.uniqueName, status: profileFormData.status, telegramTokens: tokens }
      });
    } else {
      createProfile.mutate({ uniqueName: profileFormData.uniqueName, status: profileFormData.status, telegramTokens: tokens });
    }
  };

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordFormData.symbol) return toast.error('Symbol is required');

    const payload = {
      symbol: recordFormData.symbol.toUpperCase(),
      upperLimit: recordFormData.upperLimit ? Number(recordFormData.upperLimit) : null,
      lowerLimit: recordFormData.lowerLimit ? Number(recordFormData.lowerLimit) : null,
      status: recordFormData.status,
      alertMode: recordFormData.alertMode,
      checkInterval: Number(recordFormData.checkInterval),
      profileId: recordFormData.profileId
    };

    if (editingRecord) {
      updateRecord.mutate({ id: editingRecord.id, data: payload });
    } else {
      createRecord.mutate(payload);
    }
  };

  const openCreateProfile = () => {
    setEditingProfile(null);
    setProfileFormData({ uniqueName: '', status: 'enabled', telegramTokens: '' });
    setIsProfileDialogOpen(true);
  };

  const openEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setProfileFormData({ uniqueName: profile.uniqueName, status: profile.status, telegramTokens: profile.telegramTokens.join(', ') });
    setIsProfileDialogOpen(true);
  };

  const openCreateRecord = (profileId: string) => {
    setEditingRecord(null);
    setRecordFormData({ 
      symbol: '', upperLimit: '', lowerLimit: '', status: 'enabled', 
      alertMode: 'one-time', checkInterval: 1, profileId 
    });
    setIsRecordDialogOpen(true);
  };

  const openEditRecord = (record: RecordModel) => {
    setEditingRecord(record);
    setRecordFormData({
      symbol: record.symbol,
      upperLimit: record.upperLimit?.toString() || '',
      lowerLimit: record.lowerLimit?.toString() || '',
      status: record.status,
      alertMode: record.alertMode,
      checkInterval: record.checkInterval,
      profileId: record.profileId
    });
    setIsRecordDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Dashboard</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage your profiles and their associated stock alerts.</p>
        </div>
        <Button onClick={openCreateProfile} className="shadow-lg hover:shadow-xl transition-all">
          <Plus className="mr-2 h-4 w-4" /> New Profile
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : profiles.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <MessagesSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No profiles yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first profile to start receiving Telegram alerts.</p>
            <Button variant="outline" onClick={openCreateProfile}>Get Started</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {profiles.map(profile => (
            <Card key={profile.id} className="group overflow-hidden border-border/50 shadow-sm">
              <div className={cn("h-1 w-full", profile.status === 'enabled' ? "bg-green-500" : "bg-muted")} />
              
              {/* Profile Header */}
              <div className="p-6 bg-card flex items-start justify-between border-b">
                <div>
                  <h3 className="font-semibold text-xl flex items-center gap-2">
                    {profile.uniqueName}
                    <Badge variant={profile.status === 'enabled' ? 'success' : 'secondary'} className="text-[10px] uppercase ml-2">
                      {profile.status}
                    </Badge>
                  </h3>
                  <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <MessagesSquare className="h-4 w-4 text-primary/70" /> 
                      {profile.telegramTokens.length > 0 ? (
                        <span>{profile.telegramTokens.join(', ')}</span>
                      ) : (
                        <span className="italic opacity-50">No tokens</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditProfile(profile)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit Profile
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                    if(confirm('Delete this profile and all its records?')) deleteProfile.mutate(profile.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Records Section */}
              <div className="p-6 bg-muted/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-primary" /> Active Alerts
                  </h4>
                  <Button size="sm" variant="secondary" onClick={() => openCreateRecord(profile.id)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Alert
                  </Button>
                </div>
                
                {(!profile.records || profile.records.length === 0) ? (
                  <div className="text-center py-6 border rounded-lg border-dashed bg-background">
                    <p className="text-sm text-muted-foreground">No alerts set for this profile yet.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg bg-background overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Live Price</TableHead>
                          <TableHead>Boundaries (VND)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mode / Interval</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.records.map(record => {
                          const livePrice = priceMap[record.symbol];
                          return (
                            <TableRow key={record.id}>
                              <TableCell className="font-semibold">{record.symbol}</TableCell>
                              <TableCell>
                                {livePrice ? (
                                  <span className="font-mono text-sm px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                                    {livePrice.toLocaleString()} ₫
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground animate-pulse">Fetching...</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5 text-xs">
                                  {record.upperLimit && <span className="text-green-600">≥ {record.upperLimit.toLocaleString()}</span>}
                                  {record.lowerLimit && <span className="text-red-500">≤ {record.lowerLimit.toLocaleString()}</span>}
                                  {!record.upperLimit && !record.lowerLimit && <span className="text-muted-foreground italic">None</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={record.status === 'enabled' ? 'success' : 'secondary'} className="text-[10px] uppercase">
                                  {record.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-muted-foreground">
                                  <span className="capitalize">{record.alertMode}</span> • {record.checkInterval}m
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRecord(record)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                                  if (confirm('Delete this alert?')) deleteRecord.mutate(record.id);
                                }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* --- Profile Dialog --- */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Edit Profile' : 'Create Profile'}</DialogTitle>
            <DialogDescription>Configure Telegram channels for this group of alerts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Profile Name</Label>
              <Input value={profileFormData.uniqueName} onChange={e => setProfileFormData({...profileFormData, uniqueName: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex bg-muted p-1 rounded-md">
                <button type="button" className={cn("flex-1 text-sm py-1.5 rounded-sm", profileFormData.status === 'enabled' ? "bg-background shadow-sm font-medium" : "text-muted-foreground")} onClick={() => setProfileFormData({...profileFormData, status: 'enabled'})}>Enabled</button>
                <button type="button" className={cn("flex-1 text-sm py-1.5 rounded-sm", profileFormData.status === 'disabled' ? "bg-background shadow-sm font-medium" : "text-muted-foreground")} onClick={() => setProfileFormData({...profileFormData, status: 'disabled'})}>Disabled</button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telegram Chat IDs</Label>
              <Input placeholder="123456, 987654" value={profileFormData.telegramTokens} onChange={e => setProfileFormData({...profileFormData, telegramTokens: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createProfile.isPending || updateProfile.isPending}>{editingProfile ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Record Dialog --- */}
      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Alert' : 'Create Alert'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input placeholder="e.g. TCB" value={recordFormData.symbol} onChange={e => setRecordFormData({...recordFormData, symbol: e.target.value.toUpperCase()})} required/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Upper Limit (≥)</Label>
                <Input type="number" placeholder="Optional" value={recordFormData.upperLimit} onChange={e => setRecordFormData({...recordFormData, upperLimit: e.target.value})}/>
              </div>
              <div className="space-y-2">
                <Label>Lower Limit (≤)</Label>
                <Input type="number" placeholder="Optional" value={recordFormData.lowerLimit} onChange={e => setRecordFormData({...recordFormData, lowerLimit: e.target.value})}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex bg-muted p-1 rounded-md">
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", recordFormData.status === 'enabled' ? "bg-background shadow-sm" : "text-muted-foreground")} onClick={() => setRecordFormData({...recordFormData, status: 'enabled'})}>On</button>
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", recordFormData.status === 'disabled' ? "bg-background shadow-sm" : "text-muted-foreground")} onClick={() => setRecordFormData({...recordFormData, status: 'disabled'})}>Off</button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <div className="flex bg-muted p-1 rounded-md">
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", recordFormData.alertMode === 'one-time' ? "bg-background shadow-sm" : "text-muted-foreground")} onClick={() => setRecordFormData({...recordFormData, alertMode: 'one-time'})}>1-Time</button>
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", recordFormData.alertMode === 'continuous' ? "bg-background shadow-sm" : "text-muted-foreground")} onClick={() => setRecordFormData({...recordFormData, alertMode: 'continuous'})}>Repeat</button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Interval (minutes)</Label>
              <Input type="number" min="1" value={recordFormData.checkInterval} onChange={e => setRecordFormData({...recordFormData, checkInterval: Number(e.target.value)})} required/>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createRecord.isPending || updateRecord.isPending}>{editingRecord ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
