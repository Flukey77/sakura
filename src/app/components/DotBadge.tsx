"use client";

import clsx from "clsx";

export default function DotBadge({
  title = "มีการแจ้งเตือน",
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <span
      className={clsx("notif-dot", className)}
      role="status"
      aria-label={title}
      title={title}
    />
  );
}
