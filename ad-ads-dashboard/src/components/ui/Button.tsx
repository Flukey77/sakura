import { cn } from "@/lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };
export function Button({ className, variant = "primary", ...props }: Props) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium";
  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-gray-800"
      : "bg-transparent text-gray-700 hover:bg-gray-100";
  return <button className={cn(base, styles, className)} {...props} />;
}
