import { GraduationCap } from "lucide-react";

export function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  const icon = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <div className="flex items-center gap-3">
      <div className={`${icon} rounded-xl bg-gradient-primary flex items-center justify-center shadow-elegant`}>
        <GraduationCap className="h-1/2 w-1/2 text-primary-foreground" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className={`${text} font-bold gradient-text`}>HSI Boarding School</span>
        <span className="text-[10px] text-muted-foreground italic">Smart in Quran, Expert in IT</span>
      </div>
    </div>
  );
}
