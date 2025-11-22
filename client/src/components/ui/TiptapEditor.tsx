"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "./Button";
import { useState, useEffect } from "react";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Tiptap Rich Text Editor Component
 *
 * NOTE: This component requires the following packages to be installed:
 * npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link
 *
 * If packages are not installed, this component will show a fallback textarea.
 */
export default function TiptapEditor({
  content = "",
  onChange,
  placeholder = "Nhập nội dung...",
  className = "",
}: TiptapEditorProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";
  const resolvedDarkMode = isMounted ? isDarkMode : false;

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
        link: false, // Disable default link extension to avoid duplicate
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4",
          resolvedDarkMode
            ? "prose-invert text-foreground"
            : "text-foreground"
        ),
        placeholder: placeholder,
      },
    },
  });

  // Update editor content when content prop changes (only after mount)
  useEffect(() => {
    if (editor && isMounted && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor, isMounted]);

  const addImage = () => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
    setShowImageDialog(false);
  };

  const addLink = () => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkUrl("");
    setShowLinkDialog(false);
  };

  // Show loading state during SSR or before mount
  if (!isMounted || !editor) {
    return (
      <div className={className}>
        <div
          className={cn(
            "border rounded-md min-h-[200px] p-4 flex items-center justify-center",
            resolvedDarkMode
              ? "border-border bg-card"
              : "border-gray-300 bg-white"
          )}
        >
          <p
            className={cn(
              "text-sm",
              resolvedDarkMode ? "text-muted-foreground" : "text-gray-500"
            )}
          >
            Đang tải editor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border rounded-md overflow-hidden",
        resolvedDarkMode
          ? "border-border bg-card"
          : "border-gray-300 bg-white",
        className
      )}
    >
      {/* Toolbar */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 p-2 border-b rounded-t-md",
          resolvedDarkMode
            ? "border-border bg-muted/50"
            : "border-gray-200 bg-gray-50"
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={cn(
            editor.isActive("bold")
              ? resolvedDarkMode
                ? "bg-primary/20 text-primary"
                : "bg-blue-100"
              : ""
          )}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={cn(
            editor.isActive("italic")
              ? resolvedDarkMode
                ? "bg-primary/20 text-primary"
                : "bg-blue-100"
              : ""
          )}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <div
          className={cn(
            "w-px h-6",
            resolvedDarkMode ? "bg-border" : "bg-gray-300"
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={cn(
            editor.isActive("heading", { level: 1 })
              ? resolvedDarkMode
                ? "bg-primary/20 text-primary"
                : "bg-blue-100"
              : ""
          )}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={cn(
            editor.isActive("heading", { level: 2 })
              ? resolvedDarkMode
                ? "bg-primary/20 text-primary"
                : "bg-blue-100"
              : ""
          )}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <div
          className={cn(
            "w-px h-6",
            resolvedDarkMode ? "bg-border" : "bg-gray-300"
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={cn(
            editor.isActive("bulletList")
              ? resolvedDarkMode
                ? "bg-primary/20 text-primary"
                : "bg-blue-100"
              : ""
          )}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={cn(
            editor.isActive("orderedList")
              ? resolvedDarkMode
                ? "bg-primary/20 text-primary"
                : "bg-blue-100"
              : ""
          )}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <div
          className={cn(
            "w-px h-6",
            resolvedDarkMode ? "bg-border" : "bg-gray-300"
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowLinkDialog(true)}
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowImageDialog(true)}
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div
        className={cn(
          "min-h-[200px]",
          resolvedDarkMode ? "bg-card text-foreground" : "bg-white"
        )}
      >
        <EditorContent
          editor={editor}
          className={cn(
            "p-4",
            resolvedDarkMode
              ? "prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-pre:text-foreground prose-blockquote:text-foreground prose-li:text-foreground"
              : "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-pre:text-foreground prose-blockquote:text-foreground prose-li:text-foreground"
          )}
        />
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div
          className={cn(
            "absolute z-50 border rounded-lg shadow-lg p-4 mt-2",
            resolvedDarkMode
              ? "bg-card border-border text-foreground"
              : "bg-white border-gray-300"
          )}
        >
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Nhập URL..."
            className={cn(
              "w-full px-3 py-2 border rounded-md mb-2 focus:outline-none focus:ring-2",
              resolvedDarkMode
                ? "bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-primary"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addLink();
              }
              if (e.key === "Escape") {
                setShowLinkDialog(false);
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addLink}>
              Thêm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowLinkDialog(false);
                setLinkUrl("");
              }}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <div
          className={cn(
            "absolute z-50 border rounded-lg shadow-lg p-4 mt-2",
            resolvedDarkMode
              ? "bg-card border-border text-foreground"
              : "bg-white border-gray-300"
          )}
        >
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Nhập URL ảnh..."
            className={cn(
              "w-full px-3 py-2 border rounded-md mb-2 focus:outline-none focus:ring-2",
              resolvedDarkMode
                ? "bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-primary"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addImage();
              }
              if (e.key === "Escape") {
                setShowImageDialog(false);
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addImage}>
              Thêm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowImageDialog(false);
                setImageUrl("");
              }}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
