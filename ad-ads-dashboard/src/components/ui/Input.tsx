import { cn } from "@/lib/cn";
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300",
        className
      )}
      {...props}
    />
  );
}
