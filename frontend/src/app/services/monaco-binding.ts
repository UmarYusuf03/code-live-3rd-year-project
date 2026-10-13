import * as Y from "yjs";

/**
 * Two-way binding between a Y.Text and a Monaco text model (equivalent to y-monaco's
 * MonacoBinding). Implemented locally because y-monaco hard-imports the ESM
 * `monaco-editor` package, which does not bundle cleanly with Angular's esbuild
 * builder; we load Monaco's AMD build at runtime instead and pass the namespace in.
 */
export class MonacoBinding {
  private muting = false;
  private readonly modelSub: { dispose(): void };

  constructor(
    private readonly ytext: Y.Text,
    private readonly model: any,
    private readonly monaco: any,
  ) {
    const initial = ytext.toString();
    if (model.getValue() !== initial) this.mute(() => model.setValue(initial));

    ytext.observe(this.onYChange);

    this.modelSub = model.onDidChangeContent((e: any) => {
      if (this.muting) return;
      this.mute(() => {
        ytext.doc!.transact(() => {
          // Offsets refer to the pre-change model: apply from the end backwards.
          [...e.changes]
            .sort((a: any, b: any) => b.rangeOffset - a.rangeOffset)
            .forEach((c: any) => {
              if (c.rangeLength > 0) ytext.delete(c.rangeOffset, c.rangeLength);
              if (c.text) ytext.insert(c.rangeOffset, c.text);
            });
        }, this);
      });
    });
  }

  private onYChange = (event: Y.YTextEvent, tr: Y.Transaction) => {
    if (tr.origin === this) return;
    this.mute(() => {
      let index = 0;
      for (const op of event.delta) {
        if (op.retain !== undefined) {
          index += op.retain;
        } else if (op.insert !== undefined) {
          const text = op.insert as string;
          const p = this.model.getPositionAt(index);
          this.apply(p, p, text);
          index += text.length;
        } else if (op.delete !== undefined) {
          const s = this.model.getPositionAt(index);
          const e = this.model.getPositionAt(index + op.delete);
          this.apply(s, e, "");
        }
      }
    });
  };

  private apply(start: any, end: any, text: string) {
    const range = new this.monaco.Range(
      start.lineNumber,
      start.column,
      end.lineNumber,
      end.column,
    );
    this.model.pushEditOperations(
      [],
      [{ range, text, forceMoveMarkers: true }],
      () => null,
    );
  }

  private mute(fn: () => void) {
    const prev = this.muting;
    this.muting = true;
    try {
      fn();
    } finally {
      this.muting = prev;
    }
  }

  destroy() {
    this.ytext.unobserve(this.onYChange);
    this.modelSub.dispose();
  }
}
