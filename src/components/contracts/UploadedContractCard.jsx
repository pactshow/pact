import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function UploadedContractCard({ contract }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contract.uploaded_file_path) return;
    let cancelled = false;
    (async () => {
      const { data, error: signError } = await supabase.storage
        .from('contract-uploads')
        .createSignedUrl(contract.uploaded_file_path, 3600);
      if (cancelled) return;
      if (signError || !data?.signedUrl) {
        setError(signError?.message || 'Could not load contract file');
      } else {
        setSignedUrl(data.signedUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [contract.uploaded_file_path]);

  if (!contract.uploaded_file_path) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-violet-500/10 shrink-0">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">
              {contract.uploaded_file_name || 'Contract'}
            </h3>
            <p className="text-xs text-zinc-500">Uploaded contract — biometric signatures attach to this document</p>
          </div>
        </div>
        {signedUrl && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 shrink-0"
          >
            <a href={signedUrl} download={contract.uploaded_file_name} target="_blank" rel="noreferrer">
              <Download className="w-4 h-4" />
              Download
            </a>
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!signedUrl && !error && (
        <div className="flex items-center justify-center py-12 rounded-xl bg-zinc-950/50 border border-zinc-800">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      )}

      {signedUrl && (
        <iframe
          src={signedUrl}
          title={contract.uploaded_file_name || 'Contract'}
          // sandbox neuters scripts/forms/popups/top-level nav inside the
          // PDF viewer. Empty value = everything off. The browser's built-in
          // PDF viewer still renders fine; a malicious PDF that tries to
          // run JS, redirect the parent, or pop windows is silently no-op'd.
          sandbox=""
          referrerPolicy="no-referrer"
          className="w-full h-[600px] rounded-xl bg-zinc-950 border border-zinc-800"
        />
      )}
    </motion.div>
  );
}
