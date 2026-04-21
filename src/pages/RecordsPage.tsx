import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsApi } from '@/api/records';
import { profilesApi } from '@/api/profiles';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, Search, ActivitySquare, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { RecordModel, RecordStatus, AlertMode } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export default function RecordsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordModel | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    symbol: '',
    upperLimit: '',
    lowerLimit: '',
    status: 'enabled' as RecordStatus,
    alertMode: 'one-time' as AlertMode,
    checkInterval: 1,
    profileId: ''
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['records'],
    queryFn: recordsApi.getAll
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: profilesApi.getAll
  });

  const createMutation = useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      toast.success('Record created successfully');
      setIsDialogOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create record')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<RecordModel> }) => recordsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      toast.success('Record updated successfully');
      setIsDialogOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update record')
  });

  const deleteMutation = useMutation({
    mutationFn: recordsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      toast.success('Record deleted successfully');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to delete record')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symbol) return toast.error('Symbol is required');
    if (!formData.profileId) return toast.error('Profile is required');

    const payload = {
      symbol: formData.symbol.toUpperCase(),
      upperLimit: formData.upperLimit ? Number(formData.upperLimit) : null,
      lowerLimit: formData.lowerLimit ? Number(formData.lowerLimit) : null,
      status: formData.status,
      alertMode: formData.alertMode,
      checkInterval: Number(formData.checkInterval),
      profileId: formData.profileId
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openCreateDialog = () => {
    setEditingRecord(null);
    setFormData({ 
      symbol: '', upperLimit: '', lowerLimit: '', 
      status: 'enabled', alertMode: 'one-time', checkInterval: 1, 
      profileId: profiles.length > 0 ? profiles[0].id : ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (record: RecordModel) => {
    setEditingRecord(record);
    setFormData({
      symbol: record.symbol,
      upperLimit: record.upperLimit?.toString() || '',
      lowerLimit: record.lowerLimit?.toString() || '',
      status: record.status,
      alertMode: record.alertMode,
      checkInterval: record.checkInterval,
      profileId: record.profileId
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Alert Records</h2>
          <p className="text-muted-foreground mt-1 text-sm">Configure stock price boundaries and intervals.</p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-lg hover:shadow-xl transition-all" disabled={profiles.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> New Alert
        </Button>
      </div>

      {profiles.length === 0 && !isLoading && (
         <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg p-4 flex items-center gap-3">
           <AlertTriangle className="h-5 w-5" />
           <p className="text-sm">You need to create a Profile first before adding alert records.</p>
         </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : records.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <ActivitySquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No alerts tracked</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Set up upper and lower limits to monitor stock prices.</p>
            <Button variant="outline" onClick={openCreateDialog} disabled={profiles.length === 0}>Create Alert</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden border-border/50">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Boundaries (VND)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mode / Interval</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Last Alerted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const profileName = profiles.find(p => p.id === record.profileId)?.uniqueName || 'Unknown';
                
                return (
                  <TableRow key={record.id} className="group">
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold ring-1 ring-primary/20">
                          {record.symbol.slice(0, 3)}
                        </span>
                        {record.symbol}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        {record.upperLimit !== null && (
                          <span className="text-green-600 font-medium">≥ {record.upperLimit.toLocaleString()}</span>
                        )}
                        {record.lowerLimit !== null && (
                          <span className="text-red-500 font-medium">≤ {record.lowerLimit.toLocaleString()}</span>
                        )}
                        {record.upperLimit === null && record.lowerLimit === null && (
                          <span className="text-muted-foreground italic">No limits set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'enabled' ? 'success' : 'secondary'} className="text-[10px] uppercase">
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="capitalize">{record.alertMode}</span>
                        <span className="opacity-50">•</span>
                        <span>{record.checkInterval}m</span>
                      </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className="text-[10px] truncate max-w-[120px] bg-background">
                            {profileName}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {record.lastAlertedAt ? new Date(record.lastAlertedAt).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(record)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                          if (confirm('Are you sure you want to delete this alert?')) deleteMutation.mutate(record.id);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Alert' : 'Create Alert'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input id="symbol" placeholder="e.g. TCB" value={formData.symbol} onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})} required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileId">Profile</Label>
                <select 
                  id="profileId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.profileId}
                  onChange={e => setFormData({...formData, profileId: e.target.value})}
                  required
                >
                  <option value="" disabled>Select Profile</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.uniqueName}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upperLimit">Upper Limit (≥)</Label>
                <Input id="upperLimit" type="number" placeholder="Optional" value={formData.upperLimit} onChange={e => setFormData({...formData, upperLimit: e.target.value})}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowerLimit">Lower Limit (≤)</Label>
                <Input id="lowerLimit" type="number" placeholder="Optional" value={formData.lowerLimit} onChange={e => setFormData({...formData, lowerLimit: e.target.value})}/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex bg-muted p-1 rounded-md">
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", formData.status === 'enabled' ? "bg-background shadow-sm" : "text-muted-foreground")} onClick={() => setFormData({...formData, status: 'enabled'})}>On</button>
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", formData.status === 'disabled' ? "bg-background shadow-sm" : "text-muted-foreground")} onClick={() => setFormData({...formData, status: 'disabled'})}>Off</button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <div className="flex bg-muted p-1 rounded-md">
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", formData.alertMode === 'one-time' ? "bg-background shadow-sm" : "text-muted-foreground")} onClick={() => setFormData({...formData, alertMode: 'one-time'})}>1-Time</button>
                  <button type="button" className={cn("flex-1 text-sm py-1 rounded-sm", formData.alertMode === 'continuous' ? "bg-background shadow-sm" : "text-muted-foreground")} onClick={() => setFormData({...formData, alertMode: 'continuous'})}>Repeat</button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkInterval">Interval (minutes)</Label>
              <Input id="checkInterval" type="number" min="1" value={formData.checkInterval} onChange={e => setFormData({...formData, checkInterval: Number(e.target.value)})} required/>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
