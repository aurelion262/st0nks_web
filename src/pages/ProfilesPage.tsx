import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/api/profiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, MessagesSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Profile, ProfileStatus } from '@/types';
import { cn } from '@/lib/utils';

export default function ProfilesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    uniqueName: '',
    status: 'enabled' as ProfileStatus,
    telegramTokens: ''
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: profilesApi.getAll
  });

  const createMutation = useMutation({
    mutationFn: profilesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile created successfully');
      setIsDialogOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create profile')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Profile> }) => profilesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated successfully');
      setIsDialogOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update profile')
  });

  const deleteMutation = useMutation({
    mutationFn: profilesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile deleted successfully');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to delete profile')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert comma-separated tokens to array
    const tokens = formData.telegramTokens
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
      
    if (!formData.uniqueName) return toast.error('Name is required');

    if (editingProfile) {
      updateMutation.mutate({
        id: editingProfile.id,
        data: {
          uniqueName: formData.uniqueName,
          status: formData.status,
          telegramTokens: tokens
        }
      });
    } else {
      createMutation.mutate({
        uniqueName: formData.uniqueName,
        status: formData.status,
        telegramTokens: tokens
      });
    }
  };

  const openCreateDialog = () => {
    setEditingProfile(null);
    setFormData({ uniqueName: '', status: 'enabled', telegramTokens: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      uniqueName: profile.uniqueName,
      status: profile.status,
      telegramTokens: profile.telegramTokens.join(', ')
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Profiles</h2>
          <p className="text-muted-foreground mt-1 text-sm">Manage notification channels and alert collections.</p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-lg hover:shadow-xl transition-all">
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
            <Button variant="outline" onClick={openCreateDialog}>Get Started</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map(profile => (
            <Card key={profile.id} className="group relative overflow-hidden transition-all hover:shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full", 
                profile.status === 'enabled' ? "bg-green-500" : "bg-muted"
              )} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {profile.uniqueName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={profile.status === 'enabled' ? 'success' : 'secondary'} className="text-[10px] uppercase px-1.5">
                        {profile.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {profile.records?.length || 0} alerts
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(profile)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                      if(confirm('Delete this profile and all its records?')) deleteMutation.mutate(profile.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MessagesSquare className="h-3.5 w-3.5" /> Telegram Recipient IDs
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.telegramTokens.length > 0 ? profile.telegramTokens.map(token => (
                      <span key={token} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">
                        {token}
                      </span>
                    )) : (
                      <span className="text-xs text-muted-foreground italic">No tokens added</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Edit Profile' : 'Create Profile'}</DialogTitle>
            <DialogDescription>
              Configure the Telegram bot channels for your alerts.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="uniqueName">Profile Name</Label>
              <Input 
                id="uniqueName" 
                placeholder="e.g. personal-alerts" 
                value={formData.uniqueName}
                onChange={e => setFormData({...formData, uniqueName: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex bg-muted p-1 rounded-md">
                <button
                  type="button"
                  className={cn("flex-1 text-sm py-1.5 rounded-sm transition-all", formData.status === 'enabled' ? "bg-background shadow-sm font-medium" : "text-muted-foreground")}
                  onClick={() => setFormData({...formData, status: 'enabled'})}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  className={cn("flex-1 text-sm py-1.5 rounded-sm transition-all", formData.status === 'disabled' ? "bg-background shadow-sm font-medium" : "text-muted-foreground")}
                  onClick={() => setFormData({...formData, status: 'disabled'})}
                >
                  Disabled
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokens">Telegram Chat IDs</Label>
              <Input 
                id="tokens" 
                placeholder="Comma separated: 123456, 987654" 
                value={formData.telegramTokens}
                onChange={e => setFormData({...formData, telegramTokens: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">The bot will broadcast to all these chats.</p>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingProfile ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
