import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Banner frame that adapts its height to the image's own aspect ratio, so the
 * complete image is always visible — never cropped left/right. A blurred copy
 * of the same image fills any residual space behind it.
 */
export function BannerImage({
  src,
  alt,
  fallbackRatio = 16 / 9,
  eager,
  className,
  children,
}: {
  src: string | null | undefined;
  alt: string;
  fallbackRatio?: number;
  eager?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [ratio, setRatio] = useState<number | null>(null);

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: String(ratio ?? fallbackRatio) }}
    >
      <img
        src={src ?? ""}
        alt=""
        aria-hidden
        loading={eager ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-50"
      />
      <img
        src={src ?? ""}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
        }}
        className="absolute inset-0 h-full w-full object-contain"
      />
      {children}
    </div>
  );
}
