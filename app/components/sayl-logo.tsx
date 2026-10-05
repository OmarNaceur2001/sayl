import Image from "next/image";

export function SaylLogo({ size = 28 }: { size?: number }) {
  return (
    <span className="sayl-logo">
      <Image
        className="sayl-logo-mark"
        src="/sayl-mark.svg"
        alt=""
        width={size}
        height={size}
      />
      <span className="sayl-logo-wordmark">SAYL</span>
    </span>
  );
}
