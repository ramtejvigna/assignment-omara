import * as React from 'react';

interface FormattedMessageProps {
  content: string;
  className?: string;
}

export function FormattedMessage({ content, className = '' }: FormattedMessageProps) {
  const formatMessage = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];

    let currentList: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage = '';

    const flushList = () => {
      if (currentList.length > 0) {
        const ListTag = listType === 'ol' ? 'ol' : 'ul';
        elements.push(
          <ListTag
            key={elements.length}
            className={`mb-4 pl-6 ${
              listType === 'ol' ? 'list-decimal' : 'list-disc'
            } text-gray-800 space-y-1`}
          >
            {currentList.map((item, i) => (
              <li key={i}>{formatInlineText(item)}</li>
            ))}
          </ListTag>
        );
        currentList = [];
        listType = null;
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <div key={elements.length} className="bg-gray-900 text-green-400 text-sm font-mono p-4 rounded mb-4 overflow-auto">
            {codeBlockLanguage && (
              <div className="text-gray-400 mb-2 font-semibold">
                {codeBlockLanguage}
              </div>
            )}
            <pre>
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          </div>
        );
        codeBlockContent = [];
        codeBlockLanguage = '';
      }
    };

    const flushTable = (rows: string[][]) => {
      if (rows.length < 2) return null;
      const headers = rows[0];
      const bodyRows = rows.slice(2); // Skip separator row
      return (
        <table key={elements.length} className="w-full text-left border border-gray-300 mb-6">
          <thead className="bg-gray-100">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="border border-gray-300 p-2 font-semibold text-sm text-gray-800">
                  {h.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-gray-300 p-2 text-gray-700 text-sm">
                    {formatInlineText(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    };

    let tableBuffer: string[][] = [];

    lines.forEach((line) => {
      // Code block toggling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
          codeBlockLanguage = line.slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Table rows
      if (line.includes('|')) {
        const row = line.split('|').filter((cell) => cell !== '');
        if (row.length) tableBuffer.push(row);
        return;
      }

      if (tableBuffer.length) {
        elements.push(flushTable(tableBuffer)!);
        tableBuffer = [];
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const Tag = `h${Math.min(level, 6)}` as keyof React.JSX.IntrinsicElements;
        const styles = [
          'text-3xl font-bold my-6 text-gray-900',
          'text-2xl font-bold my-5 text-gray-800',
          'text-xl font-semibold my-4 text-gray-800',
          'text-lg font-medium my-3 text-gray-700',
          'text-base font-medium my-2 text-gray-700',
          'text-sm font-semibold text-gray-600 my-1',
        ];

        elements.push(
          <Tag key={elements.length} className={styles[level - 1]}>
            {formatInlineText(text)}
          </Tag>
        );
        return;
      }

      // Lists
      const ulMatch = line.match(/^[\s]*[-*+]\s+(.+)/);
      if (ulMatch) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        currentList.push(ulMatch[1]);
        return;
      }

      const olMatch = line.match(/^[\s]*\d+\.\s+(.+)/);
      if (olMatch) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        currentList.push(olMatch[1]);
        return;
      }

      // Blockquote
      if (line.startsWith('>')) {
        flushList();
        elements.push(
          <blockquote
            key={elements.length}
            className="border-l-4 border-blue-500 pl-4 italic text-gray-700 bg-blue-50 rounded-r-md py-2 my-4"
          >
            {formatInlineText(line.substring(1).trim())}
          </blockquote>
        );
        return;
      }

      // Horizontal rule
      if (/^([-_*]){3,}$/.test(line)) {
        flushList();
        elements.push(<hr key={elements.length} className="my-6 border-gray-300" />);
        return;
      }

      // Empty line
      if (line.trim() === '') {
        flushList();
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={elements.length} className="text-gray-700 leading-relaxed mb-3">
          {formatInlineText(line)}
        </p>
      );
    });

    flushList();
    flushCodeBlock();
    if (tableBuffer.length) {
      elements.push(flushTable(tableBuffer)!);
      tableBuffer = [];
    }

    return elements;
  };

  const formatInlineText = (text: string): (string | React.ReactElement)[] => {
    const parts: (string | React.ReactElement)[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Inline code
      const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);
      if (codeMatch) {
        if (codeMatch[1]) parts.push(codeMatch[1]);
        parts.push(
          <code
            key={key++}
            className="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-sm font-mono"
          >
            {codeMatch[2]}
          </code>
        );
        remaining = codeMatch[3];
        continue;
      }

      // Bold
      const boldMatch = remaining.match(/^(.*?)\*\*(.*?)\*\*(.*)$/);
      if (boldMatch) {
        if (boldMatch[1]) parts.push(boldMatch[1]);
        parts.push(
          <strong key={key++} className="font-semibold text-gray-900">
            {boldMatch[2]}
          </strong>
        );
        remaining = boldMatch[3];
        continue;
      }

      // Italic
      const italicMatch = remaining.match(/^(.*?)\*(.*?)\*(.*)$/);
      if (italicMatch) {
        if (italicMatch[1]) parts.push(italicMatch[1]);
        parts.push(
          <em key={key++} className="italic text-gray-700">
            {italicMatch[2]}
          </em>
        );
        remaining = italicMatch[3];
        continue;
      }

      // Strikethrough
      const strikeMatch = remaining.match(/^(.*?)~~(.*?)~~(.*)$/);
      if (strikeMatch) {
        if (strikeMatch[1]) parts.push(strikeMatch[1]);
        parts.push(
          <del key={key++} className="line-through text-gray-500">
            {strikeMatch[2]}
          </del>
        );
        remaining = strikeMatch[3];
        continue;
      }

      // Links
      const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/);
      if (linkMatch) {
        if (linkMatch[1]) parts.push(linkMatch[1]);
        parts.push(
          <a
            key={key++}
            href={linkMatch[3]}
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkMatch[2]}
          </a>
        );
        remaining = linkMatch[4];
        continue;
      }

      parts.push(remaining);
      break;
    }

    return parts;
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {formatMessage(content)}
    </div>
  );
}
