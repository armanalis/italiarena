/** Shared icon artwork for PWA / favicon ImageResponse routes. */
export function PwaIconMarkup({ size }: { size: number }) {
  const radius = Math.round(size * 0.22);
  const glyphSize = Math.round(size * 0.72);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a2226",
        borderRadius: radius,
      }}
    >
      <svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#252d32" />
        <rect x="4.5" y="4.5" width="4.75" height="15" rx="1.25" fill="#009246" />
        <rect x="9.25" y="4.5" width="5.5" height="15" fill="#F4F5F0" />
        <rect
          x="14.75"
          y="4.5"
          width="4.75"
          height="15"
          rx="1.25"
          fill="#CE2B37"
        />
        {/* Small green dot on the white band — readable at favicon size */}
        <circle cx="12" cy="12" r="1.75" fill="#009246" />
      </svg>
    </div>
  );
}
