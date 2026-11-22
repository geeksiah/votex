import { cx } from "@/lib/cx";
import { Icon } from "./icon";

// Figma "Toast": success / error / info. Errors are announced assertively, the rest politely.
export type ToastType = "success" | "error" | "info";

const style: Record<ToastType, string> = {
  success: "bg-success-bg text-success-fg",
  error: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
};

export function Toast({ type = "info", message, className }: { type?: ToastType; message: string; className?: string }) {
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={cx("flex min-h-[52px] items-center gap-2.5 rounded-md px-4 py-3 vx-body-md-medium", style[type], className)}
    >
      <Icon name={type === "success" ? "check" : "alert"} size={20} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}
