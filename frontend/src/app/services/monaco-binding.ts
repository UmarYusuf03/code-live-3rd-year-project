import type * as monaco from "monaco-editor";
import * as Y from "yjs";

export class MonacoBinding {
  private ytext: Y.Text;
  private monacoModel: monaco.editor.ITextModel;
  private isApplyingRemote = false;

  constructor(ytext: Y.Text, monacoModel: monaco.editor.ITextModel) {
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    if (this.ytext.length > 0) {
      this.monacoModel.setValue(this.ytext.toString());
    }

    this.ytext.observe(this.handleYTextChange);
    this.monacoModel.onDidChangeContent(this.handleMonacoChange);
  }

  private handleYTextChange = (event: Y.YTextEvent) => {
    if (this.isApplyingRemote) return;
    this.isApplyingRemote = true;
    try {
      this.monacoModel.setValue(this.ytext.toString());
    } finally {
      this.isApplyingRemote = false;
    }
  };

  private handleMonacoChange = (e: monaco.editor.IModelContentChangedEvent) => {
    if (this.isApplyingRemote) return;
    const doc = this.ytext.doc;
    if (!doc) return;
    doc.transact(() => {
      this.ytext.delete(0, this.ytext.length);
      this.ytext.insert(0, this.monacoModel.getValue());
    }, this);
  };

  destroy(): void {
    this.ytext.unobserve(this.handleYTextChange);
  }
}
