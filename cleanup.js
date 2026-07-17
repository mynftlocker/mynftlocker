const fs = require("fs");

const TO_DELETE = [
  "fix-endpoint.js",
  "token-test.js",
  "patch_api_pagesize_100.js",
  "patch_api_pagesize_50.js",
  "patch_api_pagesize_75.js",
  "patch_api_pagesize_final50.js",
  "patch_auth_panel.js",
  "patch_auth_panel_move.js",
  "patch_auth_panel_zindex_fix.js",
  "patch_badge_contrast.js",
  "patch_badge_no_glow.js",
  "patch_badge_pictos.js",
  "patch_badge_reposition.js",
  "patch_collection_badge.js",
  "patch_debug_teamlist.js",
  "patch_debug_teamlist2.js",
  "patch_debug_teamlist3.js",
  "patch_default_team_and_reset.js",
  "patch_filtermenu_click_outside.js",
  "patch_filters_tighten.js",
  "patch_gallery_cardback_scale.js",
  "patch_gallery_cols.js",
  "patch_gallery_cols_fix.js",
  "patch_gallery_default4.js",
  "patch_gallery_gap_scale.js",
  "patch_gallery_glow_scale.js",
  "patch_gallery_pinch_zoom.js",
  "patch_hof_init_scope.js",
  "patch_hof_load_slug_dep.js",
  "patch_intro_two_doors.js",
  "patch_mobile_filters_final_tighten.js",
  "patch_mobile_logo_account.js",
  "patch_pagesize_50.js",
  "patch_password_complexity.js",
  "patch_remove_all_debug.js",
  "patch_remove_wasted_cors.js",
  "patch_scroll_reset_mode.js",
  "patch_signup_require_slug.js",
  "probe.js",
  "probe10.js",
  "probe11.js",
  "probe12.js",
  "probe13.js",
  "probe14.js",
  "probe16.js",
  "probe17.js",
  "probe3.js",
  "probe4.js",
  "probe5.js",
  "probe7.js",
  "probe8.js",
  "probe9.js",
  "probe_sorare.js",
  "setup4.js",
  "setup8.js",
  "setup9.js",
  "setup_page_locker.js",
  "setup_route.js",
  "setup_three.js",
  "api_cards_broken.txt",
  "api_cards_route.txt",
  "page_broken.txt",
  "page_current.txt",
  "page_fetch.txt",
  "page_filtermenu.txt",
  "page_refresh_bug.txt",
  "page_restructure.txt",
  "statpanel_current.txt",
];

const KEEP_CHECK = ["getToken.js", "copy-token.js", "eslint.config.mjs", "postcss.config.mjs"];

let deleted = 0;
let missing = 0;

console.log("\n=== Menage repo : suppression des scories ===\n");

for (const f of TO_DELETE) {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    deleted++;
    console.log("[SUPPRIME] " + f);
  } else {
    missing++;
    console.log("[ABSENT]   " + f + " (deja supprime ou introuvable, ignore)");
  }
}

console.log("\n--- Verification des fichiers a garder ---");
for (const f of KEEP_CHECK) {
  console.log((fs.existsSync(f) ? "[OK present] " : "[ATTENTION absent] ") + f);
}

console.log("\n==================== RESUME ====================");
console.log("Supprimes : " + deleted);
console.log("Deja absents : " + missing);
console.log("==================================================");
console.log("\nProchaine etape : git add -A puis commit puis push (attends l'instruction de Claude).");
