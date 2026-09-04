import React from 'react';
import katex from 'katex';

interface LatexProps {
  content: string;
  className?: string;
  block?: boolean;
}

/**
 * Parses text mixed with LaTeX formulas:
 * - Block equations: \[ ... \] or $$ ... $$
 * - Inline equations: \( ... \) or $ ... $
 */
export const MathText: React.FC<LatexProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split string into text and math parts
  const parts: { type: 'text' | 'math-inline' | 'math-block'; value: string }[] = [];
  
  // Regex matches:
  // 1) Block math: \[ ... \] or $$ ... $$
  // 2) Inline math: \( ... \) or $ ... $
  const regex = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\\(.*?\\\)|(?<!\\)\$.*?(?<!\\)\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }

    const rawMath = match[0];
    if (rawMath.startsWith('\\[') && rawMath.endsWith('\\]')) {
      parts.push({ type: 'math-block', value: rawMath.slice(2, -2).trim() });
    } else if (rawMath.startsWith('$$') && rawMath.endsWith('$$')) {
      parts.push({ type: 'math-block', value: rawMath.slice(2, -2).trim() });
    } else if (rawMath.startsWith('\\(') && rawMath.endsWith('\\)')) {
      parts.push({ type: 'math-inline', value: rawMath.slice(2, -2).trim() });
    } else if (rawMath.startsWith('$') && rawMath.endsWith('$')) {
      parts.push({ type: 'math-inline', value: rawMath.slice(1, -1).trim() });
    } else {
      parts.push({ type: 'text', value: rawMath });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.substring(lastIndex) });
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index} className="whitespace-pre-wrap">{part.value}</span>;
        }

        const isBlock = part.type === 'math-block';
        try {
          const html = katex.renderToString(part.value, {
            displayMode: isBlock,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className={isBlock ? "block my-2 text-center overflow-x-auto py-1" : "inline-block px-1"}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          return (
            <code key={index} className="bg-amber-50 text-amber-800 px-1 rounded text-sm">
              {part.value}
            </code>
          );
        }
      })}
    </div>
  );
};
