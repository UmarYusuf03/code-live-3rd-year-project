let loader: Promise<any> | null = null;

/** Loads Monaco's AMD build (copied to /assets/monaco/vs by angular.json) once. */
export function loadMonaco(): Promise<any> {
  if (loader) return loader;
  const w = window as any;
  loader = new Promise((resolve, reject) => {
    if (w.monaco) return resolve(w.monaco);
    const base = "/assets/monaco/vs";
    const script = document.createElement("script");
    script.src = `${base}/loader.js`;
    script.onload = () => {
      w.require.config({ paths: { vs: base } });
      w.require(["vs/editor/editor.main"], () => resolve(w.monaco), reject);
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return loader;
}
