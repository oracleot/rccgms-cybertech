/** The Lyrics dock's look, in one place. Same visual language as the Bible dock, its own stylesheet. */
export function LyricsDockStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        background: #16161e;
        color: #e0dff5;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        height: 100%;
        overflow: hidden;
      }
      .dock { display: flex; flex-direction: column; height: 100vh; padding: 10px; gap: 9px; }
      .pane { display: flex; flex-direction: column; flex: 1; gap: 9px; min-height: 0; }
      .section-label {
        font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
        text-transform: uppercase; color: #6e6a92;
      }
      .row { display: flex; gap: 6px; align-items: center; }
      input[type="text"], textarea {
        background: #1e1e2e; border: 1px solid #313244; border-radius: 6px;
        color: #cdd6f4; font-size: 13px; padding: 7px 10px; outline: none;
        transition: border-color 0.15s; font-family: inherit;
      }
      input[type="text"] { flex: 1; min-width: 0; }
      input[type="text"]:focus, textarea:focus { border-color: #7c6af7; }
      input[type="text"]::placeholder, textarea::placeholder { color: #585878; }
      textarea { width: 100%; resize: vertical; min-height: 90px; line-height: 1.45; }
      select {
        background: #1e1e2e; border: 1px solid #313244; border-radius: 6px;
        color: #cdd6f4; font-size: 12px; padding: 6px 8px; outline: none;
        cursor: pointer; width: 100%;
      }
      select:focus { border-color: #7c6af7; }
      select.compact { width: auto; font-size: 11.5px; padding: 4px 6px; }
      button {
        border: none; border-radius: 6px; cursor: pointer;
        font-size: 13px; font-weight: 600; padding: 7px 14px;
        color: inherit; background: none;
        transition: opacity 0.15s, background 0.15s;
      }
      button:disabled { opacity: 0.45; cursor: not-allowed; }
      .btn-primary { background: #7c6af7; color: #fff; white-space: nowrap; }
      .btn-primary:hover:not(:disabled) { background: #6d5ce6; }
      .btn-clear {
        background: #2d2d3f; color: #f38ba8; border: 1px solid #3d3d55;
        width: 100%; padding: 6px; font-size: 12px;
      }
      .btn-clear:hover:not(:disabled) { background: #3d2d3a; }
      .btn-ghost {
        background: #1e1e2e; border: 1px solid #313244; color: #a6adc8;
        font-size: 11.5px; font-weight: 500; padding: 6px 9px;
      }
      .btn-ghost:hover:not(:disabled) { background: #2a2a3e; border-color: #7c6af7; color: #cdd6f4; }
      .btn-ghost.wide { width: 100%; }
      .btn-ghost.active { background: #2a2040; border-color: #7c6af7; color: #eae4ff; }

      /* Set picker + current item */
      .now-playing { background: #1c1a2e; border: 1px solid #313244; border-radius: 6px; padding: 8px; }
      .now-title { font-size: 12px; font-weight: 700; color: #b4a8ff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .now-primary { font-size: 13.5px; font-weight: 700; margin-top: 4px; line-height: 1.35; white-space: pre-line; }
      .now-secondary { font-size: 11.5px; color: #a6adc8; margin-top: 3px; }
      .now-idx { font-family: monospace; font-size: 10.5px; color: #6e6a92; margin-top: 4px; }

      .nav-row { display: flex; gap: 6px; }
      .nav-row button { flex: 1; }

      /* Item list */
      .item-section { display: flex; flex-direction: column; flex: 1; min-height: 0; }
      .item-list { flex: 1; overflow-y: auto; min-height: 0; border: 1px solid #252535; border-radius: 6px; padding: 5px; display: flex; flex-direction: column; gap: 4px; }
      .item-list::-webkit-scrollbar, .settings::-webkit-scrollbar { width: 8px; }
      .item-list::-webkit-scrollbar-thumb, .settings::-webkit-scrollbar-thumb { background: #313244; border-radius: 4px; }
      .group-row {
        background: #1a1a28; border: 1px solid transparent; border-radius: 5px;
        color: #a6adc8; display: flex; gap: 8px; width: 100%;
        font-size: 12px; font-weight: 500; line-height: 1.4;
        padding: 7px 8px; text-align: left;
        transition: background 0.1s, border-color 0.1s, color 0.1s;
      }
      .group-row:hover { background: #232336; border-color: #3d3d55; color: #cdd6f4; }
      .group-row.active { background: #2a2040; border-color: #7c6af7; color: #eae4ff; }
      .group-row.live { border-color: #4ade80; }
      .group-num { color: #7c6af7; flex-shrink: 0; font-family: monospace; font-size: 10.5px; font-weight: 700; padding-top: 1px; min-width: 20px; }
      .group-row.active .group-num { color: #b4a8ff; }
      .group-text { flex: 1; min-width: 0; }
      .group-secondary { color: #6e6a92; font-size: 10.5px; margin-top: 2px; }
      .group-repeat { color: #8f86c9; font-size: 10px; font-weight: 700; margin-left: 5px; }
      .empty { color: #444460; font-size: 12px; text-align: center; padding: 14px 0; border: 1px dashed #2d2d45; border-radius: 6px; }
      .error-msg { color: #f38ba8; font-size: 11px; }
      .divider { height: 1px; background: #252535; }

      /* Settings */
      .settings { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 9px; padding-right: 2px; }
      .srow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .srow > span { color: #a6adc8; font-size: 11.5px; }
      .ctl { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      input[type="color"] {
        -webkit-appearance: none; appearance: none;
        background: none; border: 1px solid #313244; border-radius: 4px;
        cursor: pointer; height: 24px; width: 34px; padding: 2px;
      }
      input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
      input[type="color"]::-webkit-color-swatch { border: none; border-radius: 2px; }
      input[type="range"] { accent-color: #7c6af7; cursor: pointer; width: 88px; }
      input[type="number"] {
        background: #1e1e2e; border: 1px solid #313244; border-radius: 6px;
        color: #cdd6f4; font-size: 12px; padding: 5px 7px; outline: none; width: 64px;
      }
      input[type="checkbox"] { accent-color: #7c6af7; cursor: pointer; height: 15px; width: 15px; }
      .val { color: #6e6a92; font-family: monospace; font-size: 10.5px; min-width: 32px; text-align: right; }
      .hint { color: #52526e; font-size: 10.5px; line-height: 1.45; }
      .dev-notice {
        background: #33301a; border: 1px solid #5a5320; color: #e0c257; border-radius: 6px;
        font-size: 10.5px; line-height: 1.4; margin-bottom: 8px; padding: 6px 8px;
      }
      .dev-notice code { background: #1e1e2e; border-radius: 3px; padding: 0 3px; }
      /* Background settings */
      .bg-preview {
        position: relative; height: 72px; border-radius: 8px; overflow: hidden;
        border: 1px solid #313244; margin: 8px 0; display: flex; align-items: center; justify-content: center;
      }
      .bg-preview-fill { position: absolute; inset: 0; }
      .bg-preview-text { position: relative; font-size: 15px; font-weight: 800; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
      .bg-preview-tag { position: absolute; top: 4px; right: 6px; font-size: 9px; color: #6e6a92; }
      .btn-primary.wide, .btn-ghost.wide { width: 100%; margin-top: 6px; }
      .preset-name { flex: 1; }
      .preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 4px; }
      .preset-chip { position: relative; display: flex; flex-direction: column; gap: 3px; align-items: center; }
      .preset-swatch { height: 30px; width: 100%; border-radius: 5px; border: 1px solid #313244; cursor: pointer; }
      .preset-swatch:hover { border-color: #7c6af7; }
      .preset-label { font-size: 9.5px; color: #a6adc8; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .preset-del {
        position: absolute; top: -4px; right: -4px; height: 15px; width: 15px; border-radius: 50%;
        background: #1e1e2e; border: 1px solid #45455e; color: #a6adc8; font-size: 11px; line-height: 1; cursor: pointer;
      }
      .preset-del:hover { background: #3a1e1e; color: #f38ba8; }
      /* The manage-page URL, shown so it can be selected by hand when the
         clipboard API isn't available (plain-http dock = insecure origin). */
      .url-field {
        background: #16161f; border: 1px solid #313244; border-radius: 5px; color: #a6adc8;
        font-family: monospace; font-size: 10.5px; margin: 5px 0 6px; padding: 5px 6px; width: 100%;
      }
      .margin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .margin-cell { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
      kbd {
        background: #1e1e2e; border: 1px solid #3d3d55; border-bottom-width: 2px; border-radius: 4px;
        color: #cdd6f4; font-family: monospace; font-size: 10px; padding: 1px 5px;
      }

      /* Bottom toolbar */
      .toolbar { display: flex; gap: 5px; align-items: center; border-top: 1px solid #252535; padding-top: 8px; }
      .tool-btn {
        background: #1e1e2e; border: 1px solid #313244; border-radius: 5px;
        color: #6e6a92; cursor: pointer; padding: 5px;
        display: flex; align-items: center; justify-content: center;
        height: 28px; width: 30px;
      }
      .tool-btn svg { height: 15px; width: 15px; }
      .tool-btn:hover { background: #2a2a3e; border-color: #3d3d55; color: #cdd6f4; }
      .tool-btn.active, .tool-btn[data-state="open"] { background: #2a2040; border-color: #7c6af7; color: #b4a8ff; }
      .tool-btn.locked { background: #3d2d3a; border-color: #f38ba8; color: #f38ba8; }
      .tool-spacer { flex: 1; }
      .dock.is-locked .item-list { opacity: 0.7; }

      /* Popovers and tooltips (Radix, portalled to body) */
      .pop {
        background: #1b1b28; border: 1px solid #313244; border-radius: 8px; padding: 10px;
        width: 296px; max-height: 70vh; overflow: auto;
        box-shadow: 0 14px 36px rgba(0,0,0,0.55); color: #e0dff5; font-size: 12.5px;
        display: flex; flex-direction: column; gap: 9px; z-index: 50;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .pop .section-label { margin-bottom: 2px; }
      .tip {
        background: #2a2a3e; border: 1px solid #3d3d55; border-radius: 5px; color: #cdd6f4;
        font-size: 11px; padding: 4px 8px; z-index: 60; box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      /* Simple / Advanced */
      .mode-toggle { display: inline-flex; gap: 3px; flex-shrink: 0; }
      .mode-toggle button {
        background: #1e1e2e; border: 1px solid #313244; border-radius: 5px;
        color: #a6adc8; font-size: 11px; font-weight: 600; padding: 4px 11px;
      }
      .mode-toggle button.active { background: #2a2040; border-color: #7c6af7; color: #eae4ff; }
      .mode-toggle button:hover:not(.active) { border-color: #3d3d55; color: #cdd6f4; }
      .type-toggle { display: inline-flex; gap: 3px; flex-shrink: 0; }
      .type-toggle button {
        background: #1e1e2e; border: 1px solid #313244; border-radius: 5px;
        color: #a6adc8; font-size: 11px; font-weight: 600; padding: 4px 10px;
      }
      .type-toggle button.active { background: #2a2040; border-color: #7c6af7; color: #eae4ff; }

      /* Preview / lock */
      .preview { background: #1c1a2e; border: 1px solid #7c6af7; border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
      .preview-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
      .preview-title { font-size: 12.5px; font-weight: 700; color: #b4a8ff; }
      .preview-text { font-size: 12px; color: #cdd6f4; line-height: 1.4; white-space: pre-line; }
      .pill-locked {
        display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 4px;
        background: #3d2d3a; color: #f38ba8; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; vertical-align: 1px;
      }

      /* Auto mode */
      .auto-row { display: flex; align-items: center; gap: 6px; }
      .auto-row input[type="number"] { flex-shrink: 0; }
      .status-pill {
        display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 10px;
        font-size: 11px; font-weight: 600; background: #1e1e2e; border: 1px solid #313244; color: #a6adc8;
      }
      .status-pill.on { background: #1f3a2a; border-color: #2f6b45; color: #4ade80; }
      .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; animation: pulse 1.2s infinite; }
      @keyframes pulse { 50% { opacity: 0.3; } }
    `}</style>
  )
}
