import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type VerifyStatus = "idle" | "loading" | "verified" | "tampered" | "error";

interface VerifyBadgeProps {
  status:    VerifyStatus;
  message?:  string;
  className?: string;
}

const CONFIGS: Record<
  Exclude<VerifyStatus, "idle">,
  { icon: React.ReactNode; text: string; classes: string }
> = {
  loading: {
    icon:    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />,
    text:    "Verifying…",
    classes: "bg-muted text-muted-foreground border-muted",
  },
  verified: {
    icon:    <CheckCircle className="h-5 w-5" aria-hidden="true" />,
    text:    "VERIFIED",
    classes: "bg-green-50 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200 dark:border-green-700",
  },
  tampered: {
    icon:    <XCircle className="h-5 w-5" aria-hidden="true" />,
    text:    "TAMPERED",
    classes: "bg-red-50 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-700",
  },
  error: {
    icon:    <XCircle className="h-5 w-5" aria-hidden="true" />,
    text:    "ERROR",
    classes: "bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-700",
  },
};

export function VerifyBadge({ status, message, className }: VerifyBadgeProps) {
  if (status === "idle") return null;

  const cfg = CONFIGS[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all",
        cfg.classes,
        className
      )}
    >
      <div className="flex items-center gap-2 text-xl font-bold">
        {cfg.icon}
        <span>{cfg.text}</span>
      </div>
      {message != null && message.length > 0 && (
        <p className="text-center text-sm opacity-80">{message}</p>
      )}
    </div>
  );
}
