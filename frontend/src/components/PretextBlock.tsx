import React, { useState, useEffect, useRef, useMemo } from "react";
import { prepare, layout } from "@chenglou/pretext";

export type BlockType = "paragraph" | "heading" | "blockquote" | "list-item";

type Props = {
  text: string;
  type: BlockType;
  className?: string;
  children: React.ReactNode;
};

// Strips inline markdown characters to ensure character measurement matches rendered text
function stripMarkdown(str: string): string {
  if (!str) return "";
  return str
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1")     // italic
    .replace(/_([^_]+)_/g, "$1")       // italic
    .replace(/`([^`]+)`/g, "$1")       // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // link
}

export function PretextBlock({ text, type, className, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  // ResizeObserver to detect exact container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const contentRect = entries[0].contentRect;
      setWidth(contentRect.width);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Determine font configuration and line-height based on block type
  let font = "500 14.5px 'Geist Sans', system-ui, sans-serif";
  let lineHeight = 24;
  let extraPaddingX = 0;

  switch (type) {
    case "heading":
      font = "700 13px 'Geist Sans', system-ui, sans-serif";
      lineHeight = 18;
      extraPaddingX = 0;
      break;
    case "blockquote":
      font = "italic 500 13px 'Geist Sans', system-ui, sans-serif";
      lineHeight = 21;
      extraPaddingX = 14; // pl-3 (12px) + border (2px)
      break;
    case "list-item":
      font = "500 14.5px 'Geist Sans', system-ui, sans-serif";
      lineHeight = 24;
      extraPaddingX = 20; // pl-5 (20px)
      break;
    case "paragraph":
    default:
      font = "500 14.5px 'Geist Sans', system-ui, sans-serif";
      lineHeight = 24;
      extraPaddingX = 0;
      break;
  }

  // Clean the text from inline markdown characters before measuring
  const cleanText = useMemo(() => stripMarkdown(text), [text]);

  // Pure arithmetic measurement using Pretext
  const computedHeight = useMemo(() => {
    if (width !== null && width > extraPaddingX && cleanText) {
      try {
        const usableWidth = width - extraPaddingX;
        // Pretext prepare & layout
        const prepared = prepare(cleanText, font);
        const { height } = layout(prepared, usableWidth, lineHeight);
        return height;
      } catch (err) {
        console.warn("Pretext layout measurement failed:", err);
      }
    }
    return undefined;
  }, [cleanText, font, width, extraPaddingX, lineHeight]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        minHeight: computedHeight !== undefined ? `${computedHeight}px` : "auto",
        height: "auto",
        transition: "min-height 0.05s linear",
      }}
    >
      {children}
    </div>
  );
}
