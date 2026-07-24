import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = "md",
  showText = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const box =
    size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon =
    size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const text =
    size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "grid place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
          box,
        )}
      >
        <GraduationCap className={icon} strokeWidth={2.25} />
      </div>
      {showText && (
        <span className={cn("font-semibold tracking-tight", text)}>
          CSIT <span className="text-primary">AI Tutor</span>
        </span>
      )}
    </div>
  );
}
