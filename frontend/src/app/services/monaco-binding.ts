import type * as monaco from "monaco-editor";
import * as Y from "yjs";

export class MonacoBinding {
  private ytext: Y.Text;
  private monacoModel: monaco.editor.ITextModel;
  private isApplyingRemote = false;

  constructor(ytext: Y.Text, monacoModel: monaco.editor.ITextModel) {
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    if (this.ytext.length > 0 && this.monacoModel.getValue() !== this.ytext.toString()) {
      this.monacoModel.setValue(this.ytext.toString());
    }

    this.ytext.observe(this.handleYTextChange);
    this.monacoModel.onDidChangeContent(this.handleMonacoChange);
  }

  private handleYTextChange = (event: Y.YTextEvent) => {
    if (event.transaction.origin === this) return;
    this.isApplyingRemote = true;
    try {
      let index = 0;
      event.delta.forEach((op) => {
        if (op.retain !== undefined) {
          index += op.retain;
        } else if (op.delete !== undefined) {
          const pos = this.monacoModel.getPositionAt(index);
          const endPos = this.monacoModel.getPositionAt(index + op.delete);
          this.monacoModel.applyEdits([{
            range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: endPos.lineNumber, endColumn: endPos.column },
            text: ""
          }]);
        } else if (op.insert !== undefined) {
          const pos = this.monacoModel.getPositionAt(index);
          const text = typeof op.insert === "string" ? op.insert : "";
          this.monacoModel.applyEdits([{
            range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
            text
          }]);
          index += text.length;
        }
      });
    } finally {
      this.isApplyingRemote = false;
    }
  };

  private handleMonacoChange = (e: monaco.editor.IModelContentChangedEvent) => {
    if (this.isApplyingRemote) return;
    const doc = this.ytext.doc;
    if (!doc) return;
    doc.transact(() => {
      for (const change of e.changes) {
        this.ytext.delete(change.rangeOffset, change.rangeLength);
        if (change.text) {
          this.ytext.insert(change.rangeOffset, change.text);
        }
      }
    }, this);
  };

  destroy(): void {
    this.ytext.unobserve(this.handleYTextChange);
  }
}
