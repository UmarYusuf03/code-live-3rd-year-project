import * as Y from "yjs";

class Mutex {
  private locked = false;
  run(fn: () => void) {
    if (this.locked) return;
    this.locked = true;
    try {
      fn();
    } finally {
      this.locked = false;
    }
  }
}

/**
 * Two-way binding between a Y.Text and a Monaco text model.
 * Enforces LF line endings to prevent Windows CRLF (\\r\\n) 2-byte offset drift,
 * applies edits using model.applyEdits to work cleanly in read-only and editable modes,
 * and includes a self-healing reconciliation guard to keep brackets and quotes 100% aligned.
 */
export class MonacoBinding {
  private readonly mux = new Mutex();
  private readonly modelSub: { dispose(): void };

  constructor(
    private readonly ytext: Y.Text,
    private readonly model: any,
    private readonly monaco: any,
  ) {
    // Strictly enforce LF line endings so Monaco character offsets match Yjs 1:1
    if (this.model.setEOL) {
      this.model.setEOL(this.monaco.editor.EndOfLineSequence.LF);
    }

    const initial = ytext.toString().replace(/\r\n/g, "\n");
    if (model.getValue() !== initial) {
      this.mux.run(() => model.setValue(initial));
    }

    ytext.observe(this.onYChange);

    this.modelSub = model.onDidChangeContent((e: any) => {
      this.mux.run(() => {
        ytext.doc!.transact(() => {
          // Offsets refer to the pre-change model: apply from the end backwards.
          [...e.changes]
            .sort((a: any, b: any) => b.rangeOffset - a.rangeOffset)
            .forEach((c: any) => {
              if (c.rangeLength > 0) ytext.delete(c.rangeOffset, c.rangeLength);
              if (c.text) {
                const clean = c.text.replace(/\r\n/g, "\n");
                ytext.insert(c.rangeOffset, clean);
              }
            });
        }, this);
      });
    });
  }

  private onYChange = (event: Y.YTextEvent, tr: Y.Transaction) => {
    if (tr.origin === this) return;
    this.mux.run(() => {
      let index = 0;
      event.delta.forEach((op) => {
        if (op.retain !== undefined) {
          index += op.retain;
        } else if (op.insert !== undefined) {
          const insert = (op.insert as string).replace(/\r\n/g, "\n");
          const pos = this.model.getPositionAt(index);
          const range = new this.monaco.Range(
            pos.lineNumber,
            pos.column,
            pos.lineNumber,
            pos.column,
          );
          this.model.applyEdits([{ range, text: insert, forceMoveMarkers: true }]);
          index += insert.length;
        } else if (op.delete !== undefined) {
          const startPos = this.model.getPositionAt(index);
          const endPos = this.model.getPositionAt(index + op.delete);
          const range = new this.monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column,
          );
          this.model.applyEdits([{ range, text: "", forceMoveMarkers: true }]);
        }
      });

      // Self-healing check: guarantee absolute parity with Y.Doc
      const expected = this.ytext.toString();
      if (this.model.getValue() !== expected) {
        this.model.setValue(expected);
      }
    });
  };

  destroy() {
    this.ytext.unobserve(this.onYChange);
    this.modelSub.dispose();
  }
}
