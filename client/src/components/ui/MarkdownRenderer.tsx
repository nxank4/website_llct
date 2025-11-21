"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Tối ưu bằng React.memo để tránh render lại khi không cần thiết
export const MemoizedMarkdown = React.memo(
  ReactMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <MemoizedMarkdown
        components={{
          // Paragraphs
          p({ children }) {
            return (
              <p className="mb-4 last:mb-0 text-gray-700 leading-relaxed">
                {children}
              </p>
            );
          },
          // Headings
          h1({ children }) {
            return (
              <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-gray-900 border-b border-gray-200 pb-2">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 text-gray-900">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0 text-gray-900">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-gray-800">
                {children}
              </h4>
            );
          },
          // Unordered lists - sử dụng list-outside để tránh xuống hàng
          ul({ children }) {
            return (
              <ul className="list-disc list-outside mb-4 ml-6 space-y-2">
                {children}
              </ul>
            );
          },
          // Ordered lists - sử dụng list-outside để tránh xuống hàng
          ol({ children }) {
            return (
              <ol className="list-decimal list-outside mb-4 ml-6 space-y-2">
                {children}
              </ol>
            );
          },
          // List items - đảm bảo nội dung không bị xuống hàng
          li({ children }) {
            return (
              <li className="pl-2 leading-relaxed text-gray-700">{children}</li>
            );
          },
          // Inline code
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-lg my-4"
                customStyle={{
                  margin: 0,
                  borderRadius: "0.5rem",
                }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-gray-100 text-[hsl(var(--primary))] px-1.5 py-0.5 rounded text-sm font-mono font-semibold">
                {children}
              </code>
            );
          },
          // Code blocks
          pre({ children }) {
            return (
              <pre className="bg-gray-900 rounded-lg p-4 my-4 overflow-x-auto">
                {children}
              </pre>
            );
          },
          // Links
          a({ children, href }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.85)] underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            );
          },
          // Strong/Bold
          strong({ children }) {
            return (
              <strong className="font-bold text-gray-900">{children}</strong>
            );
          },
          // Emphasis/Italic
          em({ children }) {
            return <em className="italic text-gray-800">{children}</em>;
          },
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-[hsl(var(--primary))] pl-4 py-2 my-4 bg-gray-50 rounded-r-lg italic text-gray-700">
                {children}
              </blockquote>
            );
          },
          // Horizontal rule
          hr() {
            return <hr className="my-6 border-gray-200" />;
          },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-gray-300 dark:border-gray-700">
                <Table className="min-w-full">
                  {children}
                </Table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <TableHeader className="bg-gray-100 dark:bg-gray-800/40">
                {children}
              </TableHeader>
            );
          },
          tbody({ children }) {
            return <TableBody className="bg-white dark:bg-gray-900/40">{children}</TableBody>;
          },
          tr({ children }) {
            return (
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                {children}
              </TableRow>
            );
          },
          th({ children }) {
            return (
              <TableHead className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">
                {children}
              </TableHead>
            );
          },
          td({ children }) {
            return (
              <TableCell className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-200">
                {children}
              </TableCell>
            );
          },
        }}
      >
        {content}
      </MemoizedMarkdown>
    </div>
  );
}
