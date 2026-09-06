use tauri::{AppHandle, Manager, Url};
use tauri_plugin_deep_link::DeepLinkExt;

/// The real website this shell is a window onto. Kept in one place since
/// the deep-link handler needs to rewrite `fusion://auth-callback?...`
/// back into a normal page load on this origin.
const APP_ORIGIN: &str = "https://rccgms-cybertech.vercel.app";

/// Takes a `fusion://auth-callback?...` URL delivered by the OS (the user
/// clicked their magic-link email) and navigates the main window to the
/// same query string on the real site's existing `/auth/callback` route,
/// which does the actual sign-in (it reads the Supabase PKCE `code` and
/// sets session cookies). This is the same webview/origin that originally
/// requested the magic link, so the PKCE code_verifier cookie is already
/// there - no separate desktop-only auth page needed.
fn handle_deep_link(app: &AppHandle, url: &Url) {
    if url.scheme() != "fusion" {
        return;
    }

    let query = url.query().unwrap_or("");
    let target = format!("{APP_ORIGIN}/auth/callback?{query}");

    let Ok(target_url) = target.parse::<Url>() else {
        eprintln!("Fusion: could not build callback URL from deep link: {url}");
        return;
    };

    if let Some(window) = app.get_webview_window("main") {
        if let Err(err) = window.navigate(target_url) {
            eprintln!("Fusion: failed to navigate to auth callback: {err}");
        }
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // On Windows/Linux, a deep link opened while the app is already
    // running launches a *second* process instead of emitting an event in
    // the first one. The single-instance plugin intercepts that second
    // launch and forwards its arguments here instead, so we handle every
    // deep link in one place regardless of whether the app was already open.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(url) = argv
                .iter()
                .find_map(|arg| Url::parse(arg).ok().filter(|url| url.scheme() == "fusion"))
            {
                handle_deep_link(app, &url);
            } else if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Installed apps register the `fusion://` scheme automatically
            // via the platform installer. In dev mode (unbundled) that
            // never happens, so register it at runtime instead - this is
            // also required on Linux even for bundled AppImages.
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                app.deep_link().register_all()?;
            }

            // The app can also be *launched* via a deep link (cold start),
            // in which case there's no second-instance event to catch -
            // check for that explicitly.
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                if let Some(url) = urls.iter().find(|u| u.scheme() == "fusion") {
                    handle_deep_link(&app.handle().clone(), url);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
