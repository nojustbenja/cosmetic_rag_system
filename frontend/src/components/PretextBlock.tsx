import React from "react";

export type BlockType = "paragraph" | "heading" | "blockquote" | "list-item";

type Props = {
  text: string;
  type: BlockType;
  className?: string;
  children: React.ReactNode;
};

export function PretextBlock({ className, children }: Props) {
  // Let the browser handle standard, fast native text layout rendering.
  // This avoids hundreds of ResizeObservers and expensive JS-based text measurements.
  return (
    <div className={className}>
      {children}
    </div>
  );
}
