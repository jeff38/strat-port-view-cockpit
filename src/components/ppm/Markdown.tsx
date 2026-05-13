import * as React from "react";

export function Markdown({ text }: { text: string }) {
  if (!text || typeof text !== "string") return null;
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const inline = (s: string) =>
    escape(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  const flushList = () => {
    if (listBuf.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="my-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
          {listBuf.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />)}
        </ul>,
      );
      listBuf = [];
    }
  };
  lines.forEach((raw, i) => {
    const l = raw.trim();
    if (l.startsWith("### ")) { flushList(); out.push(<h4 key={i} className="mt-3 text-sm font-semibold text-foreground">{l.slice(4)}</h4>); }
    else if (l.startsWith("## ")) { flushList(); out.push(<h3 key={i} className="mt-4 text-sm font-semibold uppercase tracking-wide text-primary">{l.slice(3)}</h3>); }
    else if (l.startsWith("# ")) { flushList(); out.push(<h2 key={i} className="mt-4 text-base font-semibold text-foreground">{l.slice(2)}</h2>); }
    else if (l.startsWith("- ") || l.startsWith("* ")) { listBuf.push(l.slice(2)); }
    else if (l === "") { flushList(); }
    else { flushList(); out.push(<p key={i} className="my-2 text-sm leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: inline(l) }} />); }
  });
  flushList();
  return <div>{out}</div>;
}
