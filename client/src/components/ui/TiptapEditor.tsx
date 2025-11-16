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
import { useState } from "react";

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

  // Check if Tiptap is available
  let editor: ReturnType<typeof useEditor> | null = null;
  try {
    // @ts-ignore - Dynamic import check
    if (typeof require !== "undefined" || typeof window !== "undefined") {
      editor = useEditor({
        extensions: [
          StarterKit.configure({
            heading: {
              levels: [1, 2],
            },
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
        onUpdate: ({ editor }) => {
          if (onChange) {
            onChange(editor.getHTML());
          }
        },
        editorProps: {
          attributes: {
            class:
              "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4",
          },
        },
      });
    }
  } catch (error) {
    console.warn("Tiptap not available, using fallback:", error);
  }

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

  // Fallback to textarea if Tiptap is not available
  if (!editor) {
    return (
      <div className={className}>
        <textarea
          value={content}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 Để sử dụng Rich Text Editor, vui lòng cài đặt: npm install
          @tiptap/react @tiptap/starter-kit @tiptap/extension-image
          @tiptap/extension-link
        </p>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-md ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-blue-100" : ""}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-blue-100" : ""}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={
            editor.isActive("heading", { level: 1 }) ? "bg-blue-100" : ""
          }
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
          className={
            editor.isActive("heading", { level: 2 }) ? "bg-blue-100" : ""
          }
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-blue-100" : ""}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-blue-100" : ""}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300" />
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
      <EditorContent editor={editor} className="min-h-[200px] p-4" />

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 mt-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Nhập URL..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
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
        <div className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 mt-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Nhập URL ảnh..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
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
