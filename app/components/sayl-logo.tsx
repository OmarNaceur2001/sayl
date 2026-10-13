import Image from "next/image";

export function SaylLogo({
  size = 28,
  variant = "full",
}: {
  size?: number;
  variant?: "full" | "mark" | "dark";
}) {
  const src =
    variant === "mark"
      ? "/logoS.jpeg"
      : variant === "dark"
        ? "/logosaylSombre.jfif"
        : "/logoSayl.jpeg";
  const imageWidth = variant === "mark" ? size : Math.round(size * 4.2);
  const imageHeight = variant === "mark" ? size : Math.round(size * 0.8);

  return (
    <span className="sayl-logo">
      <Image
        className="sayl-logo-mark"
        src={src}
        alt="Sayl logo"
        width={imageWidth}
        height={imageHeight}
        priority
      />
    </span>
  );
}
