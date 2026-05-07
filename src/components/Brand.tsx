import logo from "@/assets/hsi-logo.jpg";

export function Brand({ size = "md", variant = "auto" }: { size?: "sm" | "md" | "lg"; variant?: "auto" | "light" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  const icon = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const titleColor = variant === "light" ? "text-white" : "text-foreground";
  const subColor = variant === "light" ? "text-white/80" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-3">
      <img src={logo} alt="HSI Boarding School logo" className={`${icon} rounded-lg object-contain bg-white p-0.5 shadow-card`} />
      <div className="flex flex-col leading-tight">
        <span className={`${text} font-bold ${titleColor}`}>HSI Boarding School</span>
        <span className={`text-[10px] italic ${subColor}`}>Smart in Quran, Expert in IT</span>
      </div>
    </div>
  );
}
