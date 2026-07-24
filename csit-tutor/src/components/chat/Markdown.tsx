// Lightweight markdown renderer- no external deps.
// Supports headings, bold, italic, inline code, code blocks, lists,
// blockquotes, tables, links.
import { useMemo } from "react";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(text: string) {
  let s = escapeHtml(text);
  // code
  s = s.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">$1</code>');
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic
  s = s.replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1<em>$2</em>");
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-primary underline underline-offset-2">$1</a>');
  return s;
}

function renderTable(rows: string[]) {
  const parseRow = (r: string) =>
    r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const header = parseRow(rows[0]);
  const body = rows.slice(2).map(parseRow);
  return `<div class="my-3 overflow-x-auto rounded-xl border border-border"><table class="w-full text-sm"><thead class="bg-muted"><tr>${header
    .map((h) => `<th class="px-3 py-2 text-left font-semibold">${inline(h)}</th>`)
    .join("")}</tr></thead><tbody>${body
    .map(
      (r) =>
        `<tr class="border-t border-border">${r
          .map((c) => `<td class="px-3 py-2 align-top">${inline(c)}</td>`)
          .join("")}</tr>`,
    )
    .join("")}</tbody></table></div>`;
}

function mdToHtml(src: string) {
  const lines = src.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        `<pre class="my-3 overflow-x-auto rounded-xl bg-foreground/95 p-4 text-[13px] leading-relaxed"><code class="font-mono text-background">${escapeHtml(buf.join("\n"))}</code></pre>${lang ? "" : ""}`,
      );
      continue;
    }

    // Table
    if (/^\|.+\|$/.test(line) && /^\|?[\s:-]+\|/.test(lines[i + 1] ?? "")) {
      const tbl: string[] = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i])) {
        tbl.push(lines[i]);
        i++;
      }
      out.push(renderTable(tbl));
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const sizes = ["text-2xl", "text-xl", "text-lg", "text-base"];
      out.push(
        `<h${level} class="mt-4 mb-2 ${sizes[level - 1]} font-semibold tracking-tight">${inline(h[2])}</h${level}>`,
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        `<blockquote class="my-3 border-l-4 border-primary/40 bg-muted/40 px-4 py-2 text-muted-foreground">${inline(buf.join(" "))}</blockquote>`,
      );
      continue;
    }

    // Lists
    if (/^\s*[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        `<ul class="my-2 ml-5 list-disc space-y-1">${buf.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>`,
      );
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(
        `<ol class="my-2 ml-5 list-decimal space-y-1">${buf.map((b) => `<li>${inline(b)}</li>`).join("")}</ol>`,
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph (collect consecutive)
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*[-*]\s|\s*\d+\.\s|\|)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p class="my-2 leading-relaxed">${inline(buf.join(" "))}</p>`);
  }
  return out.join("");
}

export function Markdown({ children }: { children: string }) {
  const html = useMemo(() => mdToHtml(children), [children]);
  return (
    <div
      className="text-[15px] text-foreground [&_p:first-child]:mt-0 [&_h1:first-child]:mt-0 [&_h2:first-child]:mt-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
