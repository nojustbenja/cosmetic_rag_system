import React from "react";

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
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Check if block is a bulleted list (lines starting with "-" or "*")
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed
            .split(/\n/)
            .map((line) => line.replace(/^[-*]\s+/, "").trim())
            .filter(Boolean);

          return (
            <ul key={blockIdx} className="list-disc pl-5 flex flex-col gap-1.5 my-1.5 text-foreground/95">
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {parseInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        // Check if block is a numbered list
        if (/^\d+\.\s+/.test(trimmed)) {
          const items = trimmed
            .split(/\n/)
            .map((line) => line.replace(/^\d+\.\s+/, "").trim())
            .filter(Boolean);

          return (
            <ol key={blockIdx} className="list-decimal pl-5 flex flex-col gap-1.5 my-1.5 text-foreground/95">
              {items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {parseInlineMarkdown(item)}
                </li>
              ))}
            </ol>
          );
        }

        // Standard text block, parse single line breaks as <br />
        const lines = trimmed.split(/\n/);
        return (
          <p key={blockIdx} className="leading-relaxed text-foreground/90">
            {lines.map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {lineIdx > 0 && <br />}
                {parseInlineMarkdown(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// Helper to parse inline markdown tags like **bold**
function parseInlineMarkdown(text: string): React.ReactNode {
  const regex = /\*\*([^*]+)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add bold text
    parts.push(
      <strong key={match.index} className="font-bold text-foreground">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
