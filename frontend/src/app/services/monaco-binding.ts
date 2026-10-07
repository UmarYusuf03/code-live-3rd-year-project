import type * as monaco from "monaco-editor";
import * as Y from "yjs";

export class MonacoBinding {
  private ytext: Y.Text;
  private monacoModel: monaco.editor.ITextModel;

  constructor(ytext: Y.Text, monacoModel: monaco.editor.ITextModel) {
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    if (this.ytext.length > 0) {
      this.monacoModel.setValue(this.ytext.toString());
    }
  }

  destroy(): void {}
}
