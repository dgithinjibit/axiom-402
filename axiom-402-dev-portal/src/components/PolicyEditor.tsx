"use client";

/**
 * PolicyEditor
 *
 * A syntax-highlighted code editor for MeTTa policy source.
 * Uses CodeMirror via @uiw/react-codemirror.
 */

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { cn } from "@/lib/utils";

interface PolicyEditorProps {
  value:       string;
  onChange:    (value: string) => void;
  className?:  string;
  readOnly?:   boolean;
  minHeight?:  string;
}

// MeTTa uses Lisp-like syntax — closest available is `javascript` for bracket
// matching.  A proper MeTTa CodeMirror language extension will be added later.
const EXTENSIONS = [javascript({ jsx: false })];

export function PolicyEditor({
  value,
  onChange,
  className,
  readOnly = false,
  minHeight = "240px",
}: PolicyEditorProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input font-mono text-sm",
        className
      )}
    >
      <CodeMirror
        value={value}
        extensions={EXTENSIONS}
        onChange={onChange}
        readOnly={readOnly}
        minHeight={minHeight}
        theme="light"
        basicSetup={{
          lineNumbers:      true,
          foldGutter:       true,
          highlightActiveLine: !readOnly,
          autocompletion:   false,
        }}
        aria-label="MeTTa policy editor"
      />
    </div>
  );
}
