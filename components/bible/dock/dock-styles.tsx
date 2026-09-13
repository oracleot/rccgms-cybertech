/** The dock's look, in one place. Plain CSS so it reads as an OBS panel, not a web page. */
export function DockStyles() {
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
      input[type="text"] {
        flex: 1; min-width: 0;
        background: #1e1e2e; border: 1px solid #313244; border-radius: 6px;
        color: #cdd6f4; font-size: 13px; padding: 7px 10px; outline: none;
        transition: border-color 0.15s;
      }
      input[type="text"]:focus { border-color: #7c6af7; }
      input[type="text"]::placeholder { color: #585878; }
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

      /* Reference input */
      .ref-wrap { position: relative; display: flex; flex-direction: column; gap: 4px; }
      .hint-line { font-size: 11px; color: #6e6a92; min-height: 14px; padding-left: 2px; }
      .hint-line.high { color: #8f86c9; }
      .hint-line.medium { color: #d4a24c; }
      .hint-line.low { color: #f38ba8; }
      .hint-line b { color: #cdd6f4; font-weight: 600; }
      .suggest {
        position: absolute; top: 100%; left: 0; right: 0; z-index: 20;
        background: #1b1b28; border: 1px solid #313244; border-radius: 6px;
        box-shadow: 0 10px 28px rgba(0,0,0,0.45); overflow: hidden; margin-top: 2px;
      }
      .suggest button {
        display: block; width: 100%; text-align: left; border-radius: 0;
        font-size: 12.5px; font-weight: 500; padding: 7px 10px; color: #cdd6f4;
      }
      .suggest button:hover, .suggest button.active { background: #2a2040; }
      .chooser {
        background: #241c3a; border: 1px solid #7c6af7; border-radius: 6px; padding: 8px;
        display: flex; flex-direction: column; gap: 5px;
      }
      .chooser .title { font-size: 11px; color: #b4a8ff; font-weight: 600; }
      .chooser button { text-align: left; font-size: 12px; padding: 6px 8px; background: #1e1e2e; border: 1px solid #313244; color: #cdd6f4; }
      .chooser button:hover { border-color: #7c6af7; }
      .chooser .note { font-size: 10.5px; color: #8f86c9; }

      /* Verse navigator */
      .verse-section { display: flex; flex-direction: column; flex: 1; min-height: 0; }
      .verse-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 5px; }
      .verse-head .section-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .page-ind { color: #b4a8ff; font-family: monospace; font-size: 10.5px; font-weight: 700; margin-left: 6px; letter-spacing: 0; }
      .nav-group { display: flex; gap: 4px; flex-shrink: 0; }
      .nav-btn {
        background: #1e1e2e; border: 1px solid #313244; border-radius: 5px;
        color: #a6adc8; font-size: 13px; font-weight: 700; line-height: 1; padding: 4px 9px;
      }
      .nav-btn:hover:not(:disabled) { background: #2a2a3e; border-color: #7c6af7; color: #fff; }
      .verse-list {
        flex: 1; overflow-y: auto; min-height: 0;
        border: 1px solid #252535; border-radius: 6px; padding: 5px;
        display: flex; flex-direction: column; gap: 4px;
      }
      .verse-list::-webkit-scrollbar, .settings::-webkit-scrollbar, .scroll::-webkit-scrollbar { width: 8px; }
      .verse-list::-webkit-scrollbar-thumb, .settings::-webkit-scrollbar-thumb, .scroll::-webkit-scrollbar-thumb { background: #313244; border-radius: 4px; }
      .verse-item {
        background: #1a1a28; border: 1px solid transparent; border-radius: 5px;
        color: #a6adc8; display: flex; gap: 8px; width: 100%;
        font-size: 11.5px; font-weight: 400; line-height: 1.5;
        padding: 7px 8px; text-align: left;
        transition: background 0.1s, border-color 0.1s, color 0.1s;
      }
      .verse-item:hover { background: #232336; border-color: #3d3d55; color: #cdd6f4; }
      .verse-item.active { background: #2a2040; border-color: #7c6af7; color: #eae4ff; }
      .verse-num { color: #7c6af7; flex-shrink: 0; font-family: monospace; font-size: 10.5px; font-weight: 700; padding-top: 1px; min-width: 26px; }
      .verse-item.active .verse-num { color: #b4a8ff; }
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
      input[type="checkbox"] { accent-color: #7c6af7; cursor: pointer; height: 15px; width: 15px; }
      .val { color: #6e6a92; font-family: monospace; font-size: 10.5px; min-width: 32px; text-align: right; }
      .hint { color: #52526e; font-size: 10.5px; line-height: 1.45; }
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
      .tool-spacer { flex: 1; }

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
      .nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
      .nav-grid .btn-ghost { display: flex; align-items: center; justify-content: center; gap: 4px; }
      .nav-grid .btn-ghost svg { height: 13px; width: 13px; }
      .tabs { display: flex; gap: 4px; }
      .tabs button { flex: 1; font-size: 11.5px; padding: 5px; background: #1e1e2e; border: 1px solid #313244; color: #a6adc8; }
      .tabs button.active { background: #2a2040; border-color: #7c6af7; color: #eae4ff; }

      /* Simple / Advanced interface mode — a small inline segmented control */
      .mode-toggle { display: inline-flex; gap: 3px; flex-shrink: 0; }
      .mode-toggle button {
        background: #1e1e2e; border: 1px solid #313244; border-radius: 5px;
        color: #a6adc8; font-size: 11px; font-weight: 600; padding: 4px 11px;
      }
      .mode-toggle button.active { background: #2a2040; border-color: #7c6af7; color: #eae4ff; }
      .mode-toggle button:hover:not(.active) { border-color: #3d3d55; color: #cdd6f4; }

      /* Scripture browser */
      .browser { display: flex; flex-direction: column; gap: 7px; }
      .crumbs { display: flex; gap: 4px; flex-wrap: wrap; font-size: 11.5px; color: #8f86c9; }
      .crumbs button { padding: 2px 6px; font-size: 11.5px; font-weight: 600; color: #b4a8ff; background: #241c3a; border-radius: 4px; }
      .book-list { max-height: 240px; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
      .book-list button { text-align: left; font-size: 11.5px; font-weight: 500; padding: 5px 7px; background: #1a1a28; border: 1px solid transparent; color: #cdd6f4; border-radius: 4px; }
      .book-list button:hover { border-color: #7c6af7; }
      .book-list .ot-nt { grid-column: 1 / -1; font-size: 10px; color: #6e6a92; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 4px; }
      .num-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; max-height: 220px; overflow-y: auto; }
      .num-grid button {
        font-family: monospace; font-size: 11px; font-weight: 700; padding: 5px 0;
        background: #1a1a28; border: 1px solid transparent; color: #a6adc8; border-radius: 4px;
      }
      .num-grid button:hover { border-color: #7c6af7; color: #fff; }
      .num-grid button.sel { background: #7c6af7; color: #fff; }
      .num-grid button.range { background: #2a2040; border-color: #7c6af7; color: #eae4ff; }
      /* History, favourites, queue */
      .badge {
        position: absolute; top: -5px; right: -5px; min-width: 15px; height: 15px; padding: 0 4px;
        background: #7c6af7; color: #fff; border-radius: 8px; font-size: 9.5px; font-weight: 700;
        display: flex; align-items: center; justify-content: center; line-height: 1;
      }
      .tool-btn { position: relative; }
      .item-list { display: flex; flex-direction: column; gap: 3px; max-height: 260px; overflow-y: auto; }
      .item-row { display: flex; align-items: center; gap: 3px; }
      .item-main {
        flex: 1; min-width: 0; display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
        text-align: left; background: #1a1a28; border: 1px solid transparent; border-radius: 5px;
        color: #cdd6f4; font-size: 12px; font-weight: 500; padding: 6px 8px;
      }
      .item-main:hover:not(:disabled) { border-color: #7c6af7; }
      .item-ref { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .item-sub { color: #6e6a92; font-size: 10.5px; flex-shrink: 0; }
      .item-idx { color: #6e6a92; font-family: monospace; font-size: 10.5px; min-width: 14px; text-align: right; }
      .icon-btn {
        background: #1e1e2e; border: 1px solid #313244; border-radius: 5px; color: #8f86c9;
        padding: 0; height: 26px; width: 26px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .icon-btn svg { height: 13px; width: 13px; }
      .icon-btn:hover:not(:disabled) { border-color: #7c6af7; color: #fff; }

      /* Preview and lock */
      .preview { background: #1c1a2e; border: 1px solid #7c6af7; border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
      .preview-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
      .preview-ref { font-size: 12.5px; font-weight: 700; color: #b4a8ff; }
      .preview-text { font-size: 11.5px; color: #a6adc8; line-height: 1.45; }
      .pill-locked {
        display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 4px;
        background: #3d2d3a; color: #f38ba8; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; vertical-align: 1px;
      }
      .tool-btn.locked { background: #3d2d3a; border-color: #f38ba8; color: #f38ba8; }
      .dock.is-locked .verse-list { opacity: 0.7; }
      .nav-btn.star svg { height: 12px; width: 12px; display: block; }
      .nav-btn.star.on { color: #f9e2af; border-color: #b8a04a; }
      .nav-btn.star.on svg { fill: currentColor; }
      .nav-btn.star { padding: 5px 7px; }

      /* Audio */
      .tool-btn.listening { background: #1f3a2a; border-color: #4ade80; color: #4ade80; }
      .status-pill {
        display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 10px;
        font-size: 11px; font-weight: 600; background: #1e1e2e; border: 1px solid #313244; color: #a6adc8;
      }
      .status-pill.on { background: #1f3a2a; border-color: #2f6b45; color: #4ade80; }
      .status-pill.bad { background: #3d2d3a; border-color: #6b3a4a; color: #f38ba8; }
      .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; animation: pulse 1.2s infinite; }
      @keyframes pulse { 50% { opacity: 0.3; } }
      .level-bar { position: relative; height: 8px; border-radius: 4px; background: #1e1e2e; border: 1px solid #313244; overflow: hidden; }
      .level-fill { height: 100%; background: #4ade80; transition: width 80ms linear; }
      .level-fill.warm { background: #f9c74f; }
      .level-fill.hot { background: #f38ba8; }
      .level-peak { position: absolute; top: 0; height: 100%; width: 2px; background: rgba(255,255,255,0.6); }
      .search-results button { white-space: normal; line-height: 1.4; }

      .spinner {
        display: inline-block; width: 12px; height: 12px;
        border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
        border-radius: 50%; animation: spin 0.6s linear infinite;
        vertical-align: middle; margin-right: 4px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  )
}
