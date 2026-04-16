import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useShareLinks, ShareLink } from '@/hooks/useShareLinks';
import { Copy, ExternalLink, Loader2, Link2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  documents: { id: string; title: string; document_type: string; version: number }[];
}

export default function ShareLinkModal({ open, onClose, projectId, documents }: Props) {
  const { shareLinks, createShareLink, deactivateLink } = useShareLinks(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [includeDiagrams, setIncludeDiagrams] = useState(false);
  const [expiry, setExpiry] = useState('never');
  const [createdLink, setCreatedLink] = useState<ShareLink | null>(null);

  const nonInternalDocs = documents.filter(d => d.document_type !== 'gap_analysis_report' && d.document_type !== 'critique');

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const getExpiryDate = (): string | null => {
    if (expiry === 'never') return null;
    const d = new Date();
    if (expiry === '7') d.setDate(d.getDate() + 7);
    if (expiry === '30') d.setDate(d.getDate() + 30);
    if (expiry === '90') d.setDate(d.getDate() + 90);
    return d.toISOString();
  };

  const handleCreate = async () => {
    try {
      const result = await createShareLink.mutateAsync({
        title, description,
        included_document_ids: selectedDocs,
        include_diagrams: includeDiagrams,
        expires_at: getExpiryDate(),
      });
      setCreatedLink(result);
      toast.success('Share link created');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getPortalUrl = (token: string) => `${window.location.origin}/portal/${token}`;

  const copyUrl = (token: string) => {
    navigator.clipboard.writeText(getPortalUrl(token));
    toast.success('URL copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setCreatedLink(null); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Share with Customer</DialogTitle>
        </DialogHeader>

        {createdLink ? (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
              <p className="text-sm font-semibold text-green-700 mb-2">✅ Portal link created!</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={getPortalUrl(createdLink.token)} className="text-xs font-mono" />
                <Button size="sm" variant="outline" onClick={() => copyUrl(createdLink.token)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(getPortalUrl(createdLink.token), '_blank')}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={() => setCreatedLink(null)} className="w-full">Create Another</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Portal Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Acme Corp — Solution Proposal" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Intro message shown on portal" className="min-h-[60px]" />
            </div>

            <div className="space-y-2">
              <Label>Documents to Include</Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-md p-2">
                {nonInternalDocs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No documents available</p>
                ) : nonInternalDocs.map(doc => (
                  <label key={doc.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                    <Checkbox checked={selectedDocs.includes(doc.id)} onCheckedChange={() => toggleDoc(doc.id)} />
                    <span className="truncate">{doc.title}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">v{doc.version}</Badge>
                  </label>
                ))}
              </div>
              {documents.some(d => d.document_type === 'gap_analysis_report') && (
                <p className="text-xs text-amber-600">⚠️ Gap Analysis Reports are internal only and excluded</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={includeDiagrams} onCheckedChange={setIncludeDiagrams} />
              <Label>Include diagrams</Label>
            </div>

            <div className="space-y-2">
              <Label>Link Expiry</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreate} disabled={selectedDocs.length === 0 || !title || createShareLink.isPending} className="w-full">
              {createShareLink.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...</> : 'Create Share Link'}
            </Button>
          </div>
        )}

        {shareLinks.length > 0 && (
          <div className="border-t border-border pt-4 mt-2">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Existing Share Links</h4>
            <div className="space-y-2">
              {shareLinks.map(link => (
                <div key={link.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded-md p-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{link.title || 'Untitled'}</p>
                    <p className="text-muted-foreground">
                      <Eye className="h-3 w-3 inline mr-1" />{link.view_count} views ·
                      {link.is_active ? ' Active' : ' Inactive'}
                      {link.expires_at && ` · Expires ${new Date(link.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyUrl(link.token)}><Copy className="h-3 w-3" /></Button>
                  {link.is_active && (
                    <Button size="sm" variant="ghost" onClick={() => deactivateLink.mutate(link.id)} className="text-destructive">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
