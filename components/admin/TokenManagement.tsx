'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Gift, 
  Calendar, 
  Users, 
  Trash2,
  Copy,
  RefreshCw,
  Filter,
  Download 
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface Token {
  id: string;
  code: string;
  value: number;
  expiry_date: string;
  used_by: string | null;
  used_date: string | null;
  created_at: string;
  created_by_profile?: {
    first_name: string;
    last_name: string;
  };
  used_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

interface TokenStatistics {
  total: number;
  available: number;
  used: number;
  expired: number;
  totalValueUsed: number;
}

export default function TokenManagement() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [statistics, setStatistics] = useState<TokenStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Create token form state
  const [createForm, setCreateForm] = useState({
    value: 1,
    expiryDate: '',
    quantity: 1,
    prefix: 'GET',
  });

  const { toast } = useToast();

  const fetchTokens = async () => {
    try {
      const response = await fetch(`/api/admin/tokens/list?status=${statusFilter}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tokens');
      }

      setTokens(data.tokens || []);
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Token fetch error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tokens',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTokens = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/tokens/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tokens');
      }

      toast({
        title: 'Success',
        description: data.message,
      });

      setShowCreateDialog(false);
      setCreateForm({
        value: 1,
        expiryDate: '',
        quantity: 1,
        prefix: 'GET',
      });
      fetchTokens();
    } catch (error) {
      console.error('Token creation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create tokens',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const revokeTokens = async () => {
    if (selectedTokens.length === 0) return;

    try {
      const response = await fetch('/api/admin/tokens/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenIds: selectedTokens }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke tokens');
      }

      toast({
        title: 'Success',
        description: data.message,
      });

      setSelectedTokens([]);
      fetchTokens();
    } catch (error) {
      console.error('Token revocation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke tokens',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Token code copied to clipboard',
    });
  };

  const exportTokens = () => {
    const csvContent = [
      ['Code', 'Value', 'Status', 'Expiry Date', 'Created Date', 'Used By', 'Used Date'],
      ...tokens.map(token => [
        token.code,
        token.value.toString(),
        getTokenStatus(token),
        token.expiry_date,
        format(new Date(token.created_at), 'yyyy-MM-dd'),
        token.used_by_profile ? `${token.used_by_profile.first_name} ${token.used_by_profile.last_name}` : '',
        token.used_date ? format(new Date(token.used_date), 'yyyy-MM-dd') : '',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokens-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTokenStatus = (token: Token) => {
    if (token.used_by) return 'used';
    if (new Date(token.expiry_date) < new Date()) return 'expired';
    return 'available';
  };

  const getStatusBadge = (token: Token) => {
    const status = getTokenStatus(token);
    const config = {
      available: { variant: 'default' as const, label: 'Available' },
      used: { variant: 'secondary' as const, label: 'Used' },
      expired: { variant: 'destructive' as const, label: 'Expired' },
    };
    
    const { variant, label } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  useEffect(() => {
    fetchTokens();
  }, [statusFilter]);

  // Set default expiry date to 30 days from now
  useEffect(() => {
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
    setCreateForm(prev => ({
      ...prev,
      expiryDate: defaultExpiry.toISOString().split('T')[0],
    }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.available}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Used</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.used}</div>
              <p className="text-xs text-muted-foreground">
                ${(statistics.totalValueUsed * 30).toFixed(0)} value redeemed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statistics.expired}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Token Management</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={exportTokens} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>

              <Button onClick={fetchTokens} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>

              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Create Tokens
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Tokens</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="value">Token Value</Label>
                        <Select 
                          value={createForm.value.toString()} 
                          onValueChange={(value) => setCreateForm(prev => ({ ...prev, value: parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(val => (
                              <SelectItem key={val} value={val.toString()}>
                                {val} free request{val > 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          max="100"
                          value={createForm.quantity}
                          onChange={(e) => setCreateForm(prev => ({ 
                            ...prev, 
                            quantity: parseInt(e.target.value) || 1 
                          }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={createForm.expiryDate}
                        onChange={(e) => setCreateForm(prev => ({ 
                          ...prev, 
                          expiryDate: e.target.value 
                        }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="prefix">Code Prefix</Label>
                      <Input
                        id="prefix"
                        value={createForm.prefix}
                        onChange={(e) => setCreateForm(prev => ({ 
                          ...prev, 
                          prefix: e.target.value.toUpperCase() 
                        }))}
                        maxLength={5}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setShowCreateDialog(false)} 
                        variant="outline" 
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={createTokens} 
                        disabled={isCreating}
                        className="flex-1"
                      >
                        {isCreating ? 'Creating...' : 'Create Tokens'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedTokens.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded">
              <span className="text-sm">{selectedTokens.length} token(s) selected</span>
              <Button 
                onClick={revokeTokens} 
                variant="destructive" 
                size="sm"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Revoke Selected
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTokens.length === tokens.length && tokens.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTokens(tokens.map(t => t.id));
                      } else {
                        setSelectedTokens([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Used By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTokens.includes(token.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTokens(prev => [...prev, token.id]);
                        } else {
                          setSelectedTokens(prev => prev.filter(id => id !== token.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{token.code}</TableCell>
                  <TableCell>{token.value} request{token.value > 1 ? 's' : ''}</TableCell>
                  <TableCell>{getStatusBadge(token)}</TableCell>
                  <TableCell>{format(new Date(token.expiry_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {token.used_by_profile ? (
                      <div>
                        <div className="font-medium">
                          {token.used_by_profile.first_name} {token.used_by_profile.last_name}
                        </div>
                        {token.used_date && (
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(token.used_date), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => copyToClipboard(token.code)}
                      variant="ghost"
                      size="sm"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {tokens.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tokens found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}