import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/api/profiles';
import { recordsApi } from '@/api/records';
import { quotesApi } from '@/api/quotes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, MessagesSquare, BellRing, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Profile, ProfileStatus, RecordModel } from '@/types';
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
  const [recordFormData, setRecordFormData] = useState<any>({ symbol: '', condition: '>=', targetPrice: '', offsets: [0], status: 'enabled', alertMode: 'one-time', checkInterval: 1, profileId: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedProfiles, setCollapsedProfiles] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedProfiles(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    quotes.forEach(q => { map[q.symbol] = (q.close_price || q.reference_price || 0) / 1000; });
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

  const bulkUpdateRecords = useMutation({
    mutationFn: ({ profileId, data }: { profileId: string, data: Partial<RecordModel> & { toggleOffset?: number } }) => recordsApi.bulkUpdateByProfile(profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('All records updated successfully');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update records')
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
      condition: recordFormData.condition,
      targetPrice: Number(recordFormData.targetPrice),
      offsets: recordFormData.offsets,
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
      symbol: '', condition: '>=', targetPrice: '', offsets: [0], status: 'enabled', 
      alertMode: 'one-time', checkInterval: 1, profileId 
    });
    setIsRecordDialogOpen(true);
  };

  const openEditRecord = (record: RecordModel) => {
    setEditingRecord(record);
    setRecordFormData({
      symbol: record.symbol,
      condition: record.condition,
      targetPrice: record.targetPrice?.toString() || '',
      offsets: record.offsets || [0],
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search profiles by name..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-background/50 border-muted-foreground/20"
        />
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
          {profiles.filter(p => p.uniqueName.toLowerCase().includes(searchTerm.toLowerCase())).map(profile => {
            const sortedRecords = [...(profile.records || [])].sort((a, b) => {
              const sym = a.symbol.localeCompare(b.symbol);
              if (sym !== 0) return sym;
              return a.condition.localeCompare(b.condition);
            });
            const isCollapsed = collapsedProfiles[profile.id];

            return (
            <Card key={profile.id} className="group overflow-hidden border-border/50 shadow-sm">
              <div className={cn("h-1 w-full", profile.status === 'enabled' ? "bg-green-500" : "bg-muted")} />
              
              {/* Profile Header */}
              <div className="p-6 bg-card flex items-start justify-between border-b cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleCollapse(profile.id)}>
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronUp className="h-5 w-5 text-muted-foreground" />}
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
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
              {!isCollapsed && (
              <div className="p-6 bg-muted/10">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-4 gap-4">
                  <h4 className="font-medium flex items-center gap-2 shrink-0">
                    <BellRing className="h-4 w-4 text-primary" /> Active Alerts
                  </h4>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs w-full xl:w-auto">
                    <div className="flex bg-muted/80 p-0.5 rounded border border-border/50 items-center shadow-sm">
                      <span className="text-muted-foreground/70 px-2 font-medium text-[10px] uppercase">Set All</span>
                      <button disabled={bulkUpdateRecords.isPending} onClick={() => bulkUpdateRecords.mutate({ profileId: profile.id, data: { status: 'enabled' } })} className="px-2 py-1 rounded-sm hover:bg-background hover:text-green-600 transition-all font-medium">ON</button>
                      <button disabled={bulkUpdateRecords.isPending} onClick={() => bulkUpdateRecords.mutate({ profileId: profile.id, data: { status: 'disabled' } })} className="px-2 py-1 rounded-sm hover:bg-background hover:text-destructive transition-all font-medium">OFF</button>
                    </div>

                    <div className="flex bg-muted/80 p-0.5 rounded border border-border/50 items-center shadow-sm">
                      <span className="text-muted-foreground/70 px-2 font-medium text-[10px] uppercase">Mode</span>
                      <button disabled={bulkUpdateRecords.isPending} onClick={() => bulkUpdateRecords.mutate({ profileId: profile.id, data: { alertMode: 'one-time' } })} className="px-2 py-1 rounded-sm hover:bg-background transition-all font-medium">1-Time</button>
                      <button disabled={bulkUpdateRecords.isPending} onClick={() => bulkUpdateRecords.mutate({ profileId: profile.id, data: { alertMode: 'continuous' } })} className="px-2 py-1 rounded-sm hover:bg-background text-blue-600 transition-all font-medium">Cont.</button>
                    </div>

                    <div className="flex bg-muted/80 p-0.5 rounded border border-border/50 items-center shadow-sm">
                      <span className="text-muted-foreground/70 px-2 font-medium text-[10px] uppercase">Interval</span>
                      {[1, 5, 15, 30].map(m => (
                        <button key={m} disabled={bulkUpdateRecords.isPending} onClick={() => bulkUpdateRecords.mutate({ profileId: profile.id, data: { checkInterval: m, alertMode: 'continuous' } })} className="px-1.5 py-1 rounded-sm hover:bg-background transition-all font-medium">{m}m</button>
                      ))}
                    </div>

                    <div className="flex bg-muted/80 p-0.5 rounded border border-border/50 items-center shadow-sm">
                      <span className="text-muted-foreground/70 px-2 font-medium text-[10px] uppercase">Offsets</span>
                      {[-5, -3, -1, 0, 1, 3, 5].map(off => {
                        const allHaveIt = profile.records && profile.records.length > 0 && profile.records.every(r => r.offsets && r.offsets.includes(off));
                        return (
                          <button 
                            key={off} 
                            disabled={bulkUpdateRecords.isPending} 
                            onClick={() => bulkUpdateRecords.mutate({ profileId: profile.id, data: { toggleOffset: off } })} 
                            className={cn(
                              "px-1.5 py-1 rounded-sm transition-all font-medium",
                              allHaveIt ? "bg-primary text-primary-foreground" : "hover:bg-background"
                            )}
                          >
                            {off >= 0 ? `+${off}%` : `${off}%`}
                          </button>
                        );
                      })}
                    </div>

                    <Button size="sm" variant="secondary" onClick={() => openCreateRecord(profile.id)} className="ml-auto shadow-sm">
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Alert
                    </Button>
                  </div>
                </div>
                
                {(!profile.records || profile.records.length === 0) ? (
                  <div className="text-center py-6 border rounded-lg border-dashed bg-background">
                    <p className="text-sm text-muted-foreground">No alerts set for this profile yet.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg bg-background overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Live Price</TableHead>
                          <TableHead>Boundaries (VND)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Interval</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedRecords.map(record => {
                          const livePrice = priceMap[record.symbol];
                          return (
                            <TableRow key={record.id}>
                              <TableCell className="font-semibold">{record.symbol}</TableCell>
                              <TableCell>
                                {livePrice !== undefined ? (
                                  <span className="font-mono text-sm px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                                    {livePrice.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground animate-pulse">Fetching...</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1 text-xs">
                                  <div className="font-medium text-[13px]">
                                    {record.condition === '>=' ? '≥' : '≤'} {record.targetPrice.toLocaleString()}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {[-5, -3, -1, 0, 1, 3, 5].map(off => {
                                      const isPending = updateRecord.isPending && updateRecord.variables?.id === record.id;
                                      const isSelected = record.offsets.includes(off);
                                      return (
                                        <button
                                          key={off}
                                          disabled={isPending}
                                          onClick={() => {
                                            const newOffsets = isSelected 
                                              ? record.offsets.filter((o: number) => o !== off)
                                              : [...record.offsets, off];
                                            updateRecord.mutate({ id: record.id, data: { offsets: newOffsets } });
                                          }}
                                          className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors min-w-[32px] text-center",
                                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                                            isPending ? "opacity-50 cursor-wait" : "cursor-pointer"
                                          )}
                                        >
                                          {off >= 0 ? `+${off}%` : `${off}%`}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <button
                                  disabled={updateRecord.isPending && updateRecord.variables?.id === record.id}
                                  onClick={() => updateRecord.mutate({ id: record.id, data: { status: record.status === 'enabled' ? 'disabled' : 'enabled' } })}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-medium uppercase transition-colors",
                                    record.status === 'enabled' ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-muted text-muted-foreground hover:bg-muted/80",
                                    (updateRecord.isPending && updateRecord.variables?.id === record.id) ? "opacity-50 cursor-wait" : "cursor-pointer"
                                  )}
                                >
                                  {record.status}
                                </button>
                              </TableCell>
                              <TableCell>
                                <button
                                  disabled={updateRecord.isPending && updateRecord.variables?.id === record.id}
                                  onClick={() => updateRecord.mutate({ id: record.id, data: { alertMode: record.alertMode === 'one-time' ? 'continuous' : 'one-time' } })}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-medium uppercase transition-colors",
                                    record.alertMode === 'continuous' ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-muted text-muted-foreground hover:bg-muted/80",
                                    (updateRecord.isPending && updateRecord.variables?.id === record.id) ? "opacity-50 cursor-wait" : "cursor-pointer"
                                  )}
                                >
                                  {record.alertMode}
                                </button>
                              </TableCell>
                              <TableCell>
                                {record.alertMode === 'continuous' ? (
                                  <div className="flex flex-wrap gap-1">
                                    {[1, 5, 15, 30].map(min => {
                                      const isPending = updateRecord.isPending && updateRecord.variables?.id === record.id;
                                      const isSelected = record.checkInterval === min;
                                      return (
                                        <button
                                          key={min}
                                          disabled={isPending}
                                          onClick={() => updateRecord.mutate({ id: record.id, data: { checkInterval: min } })}
                                          className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
                                            isPending ? "opacity-50 cursor-wait" : "cursor-pointer"
                                          )}
                                        >
                                          {min}m
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic pl-1">N/A</span>
                                )}
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
              )}
            </Card>
            );
          })}
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
                <Label>Condition</Label>
                <div className="flex bg-muted p-1 rounded-md">
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", recordFormData.condition === '>=' ? "bg-background shadow-sm font-medium" : "text-muted-foreground")} onClick={() => setRecordFormData({...recordFormData, condition: '>='})}>≥</button>
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", recordFormData.condition === '<=' ? "bg-background shadow-sm font-medium" : "text-muted-foreground")} onClick={() => setRecordFormData({...recordFormData, condition: '<='})}>≤</button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Price</Label>
                <Input type="number" step="0.01" placeholder="e.g. 25.5" value={recordFormData.targetPrice} onChange={e => setRecordFormData({...recordFormData, targetPrice: e.target.value})} required/>
              </div>
            </div>
            <div className="space-y-2">
               <Label>Offsets (%)</Label>
               <div className="flex gap-2 flex-wrap">
                 {[-5, -3, -1, 0, 1, 3, 5].map(off => (
                   <button
                     key={off}
                     type="button"
                     onClick={() => {
                       const newOffsets = recordFormData.offsets.includes(off)
                         ? recordFormData.offsets.filter((o: number) => o !== off)
                         : [...recordFormData.offsets, off];
                       setRecordFormData({...recordFormData, offsets: newOffsets});
                     }}
                     className={cn("px-2 py-1 text-sm rounded border font-medium transition-colors", recordFormData.offsets.includes(off) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input text-muted-foreground hover:bg-muted")}
                   >
                     {off >= 0 ? `+${off}%` : `${off}%`}
                   </button>
                 ))}
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
            {recordFormData.alertMode === 'continuous' && (
              <div className="space-y-2">
                <Label>Interval (minutes)</Label>
                <Input type="number" min="1" value={recordFormData.checkInterval} onChange={e => setRecordFormData({...recordFormData, checkInterval: Number(e.target.value)})} required/>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createRecord.isPending || updateRecord.isPending}>{editingRecord ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
