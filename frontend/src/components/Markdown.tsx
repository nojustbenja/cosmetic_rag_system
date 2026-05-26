import React, { memo } from "react";
import { PretextBlock } from "./PretextBlock";

type Props = {
  content: string;
};

export function Markdown({ content }: Props) {
  if (!content) return null;

  // Split content by double newlines to define block elements
  const blocks = content.split(/\n\n+/);

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, blockIdx) => {
        const isLast = blockIdx === blocks.length - 1;
        return (
          <MemoizedMarkdownBlock
            key={blockIdx}
            blockText={block}
            isLast={isLast}
          />
        );
      })}
    </div>
  );
}

type BlockProps = {
  blockText: string;
  isLast: boolean;
};

const MemoizedMarkdownBlock = memo(
  ({ blockText, isLast }: BlockProps) => {
    const trimmed = blockText.trim();
    if (!trimmed) return null;

    // 1. Horizontal rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      return <hr className="border-none border-t border-border/40 my-1" />;
    }

    // 2. H3 heading (### ...)
    if (trimmed.startsWith("### ")) {
      const rawText = trimmed.slice(4).trim();
      return (
        <PretextBlock text={rawText} type="heading" className="my-1">
          <h3 className="text-[13px] font-bold text-foreground">
            {parseInlineMarkdown(rawText)}
          </h3>
        </PretextBlock>
      );
    }

    // 3. Blockquote (lines starting with ">")
    if (trimmed.startsWith("> ") || trimmed.startsWith(">\n")) {
      const quoteText = trimmed
        .split("\n")
        .map((l) => (l.startsWith("> ") ? l.slice(2) : l.startsWith(">") ? l.slice(1) : l))
        .join(" ");
      return (
        <PretextBlock text={quoteText} type="blockquote" className="my-1.5">
          <blockquote className="border-l-2 border-foreground/20 pl-3 text-[13px] text-muted-foreground italic leading-relaxed text-justify">
            {parseInlineMarkdown(quoteText)}
          </blockquote>
        </PretextBlock>
      );
    }

    // 4. Bulleted list (lines starting with "-" or "*")
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items = trimmed
        .split(/\n/)
        .map((line) => line.replace(/^[-*]\s+/, "").trim())
        .filter(Boolean);

      return (
        <ul className="list-disc pl-5 flex flex-col gap-1.5 my-1.5 text-foreground/95">
          {items.map((item, itemIdx) => (
            <PretextBlock key={itemIdx} text={item} type="list-item">
              <li className="leading-relaxed text-justify">
                {parseInlineMarkdown(item)}
              </li>
            </PretextBlock>
          ))}
        </ul>
      );
    }

    // 5. Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = trimmed
        .split(/\n/)
        .map((line) => line.replace(/^\d+\.\s+/, "").trim())
        .filter(Boolean);

      return (
        <ol className="list-decimal pl-5 flex flex-col gap-1.5 my-1.5 text-foreground/95">
          {items.map((item, itemIdx) => (
            <PretextBlock key={itemIdx} text={item} type="list-item">
              <li className="leading-relaxed text-justify">
                {parseInlineMarkdown(item)}
              </li>
            </PretextBlock>
          ))}
        </ol>
      );
    }

    // 6. Standard text block, parse single line breaks as <br />
    const lines = trimmed.split(/\n/);
    return (
      <PretextBlock text={trimmed} type="paragraph" className="my-0.5">
        <p className="leading-relaxed text-foreground/90 text-justify">
          {lines.map((line, lineIdx) => (
            <React.Fragment key={lineIdx}>
              {lineIdx > 0 && <br />}
              {parseInlineMarkdown(line)}
            </React.Fragment>
          ))}
        </p>
      </PretextBlock>
    );
  },
  (prevProps, nextProps) => {
    // Only skip re-render if the block text hasn't changed AND the isLast state hasn't changed.
    // If a block stops being the last block, it may need to be updated to a static container.
    return prevProps.blockText === nextProps.blockText && prevProps.isLast === nextProps.isLast;
  }
);

// Helper to parse inline markdown tags like **bold**
function parseInlineMarkdown(text: string): React.ReactNode {
  const regex = /\*\*([^*]+)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-bold text-foreground">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
