import { FileText } from "lucide-react";

export function TextOnlyCreative() {
  return (
    <div className="w-full py-8 border border-dashed border-zinc-300 rounded-md bg-zinc-50 flex flex-col items-center justify-center gap-2">
      <FileText className="h-7 w-7 text-zinc-400" />
      <p className="text-sm text-zinc-400 italic">This ad has no media — text only</p>
    </div>
  );
}
