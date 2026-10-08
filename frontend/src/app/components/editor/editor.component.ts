import { Component, ElementRef, inject, viewChild, effect, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MonacoLoaderService } from "../../services/monaco-loader";
import { WorkspaceService } from "../../services/workspace.service";
import { YjsCollaborationService } from "../../services/yjs-collaboration.service";
import { MonacoBinding } from "../../services/monaco-binding";
import type * as monaco from "monaco-editor";

@Component({
  selector: "app-editor",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-container" #editorContainer>
      @if (loading) {
        <div class="loading-overlay">Loading Monaco Editor...</div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    .editor-container { position: relative; width: 100%; height: 100%; }
    .loading-overlay { display: flex; align-items: center; justify-content: center; height: 100%; color: #8b949e; }
  `]
})
export class EditorComponent implements OnDestroy {
  readonly editorContainer = viewChild<ElementRef<HTMLDivElement>>("editorContainer");
  loading = true;
  private editor?: monaco.editor.IStandaloneCodeEditor;
  ngOnDestroy(): void { this.editor?.dispose(); }
}
