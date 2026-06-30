/** Shared icon artwork for PWA / favicon ImageResponse routes. */
export function PwaIconMarkup({ size }: { size: number }) {
  const radius = Math.round(size * 0.12);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        borderRadius: radius,
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, background: "#009246" }} />
      <div style={{ flex: 1, background: "#FFFFFF" }} />
      <div style={{ flex: 1, background: "#CE2B37" }} />
    </div>
  );
}
