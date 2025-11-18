'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [, setEditorState] = useState({});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write something...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      setEditorState({});
    },
    onSelectionUpdate: () => {
      setEditorState({});
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-3 py-2',
      },
    },
    immediatelyRender: false,
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-md bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 px-2 py-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('bold')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('italic')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Italic"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h7M7 20h7M14 4L8 20" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('strike')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Strikethrough"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M8 5c0 0 2-1 4-1s4 1 4 1M8 19c0 0 2 1 4 1s4-1 4-1" />
          </svg>
        </button>
        <div className="w-px h-8 bg-gray-300 mx-1"></div>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2.5 py-2 rounded text-sm font-bold transition-colors ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2.5 py-2 rounded text-sm font-bold transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2.5 py-2 rounded text-sm font-bold transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Heading 3"
        >
          H3
        </button>
        <div className="w-px h-8 bg-gray-300 mx-1"></div>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Bullet List"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Numbered List"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11M4 6v2M5 6H3M4 12v2M5 12H3M4 18v2M5 18H3" />
          </svg>
        </button>
        <div className="w-px h-8 bg-gray-300 mx-1"></div>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Quote"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21c0-4.8 3.8-7 8-7 0-2.9-2.5-5-5-5-3.9 0-6 3.8-6 8 0 1.7 1.3 3 3 3s3-1.3 3-3c0-1.1-.9-2-2-2M15 21c0-4.8 3.8-7 8-7 0-2.9-2.5-5-5-5-3.9 0-6 3.8-6 8 0 1.7 1.3 3 3 3s3-1.3 3-3c0-1.1-.9-2-2-2" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('codeBlock')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          type="button"
          title="Code Block"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
