import assert from "node:assert/strict";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import postcss from "postcss";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({ configFile: false, root, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom" });
try {
  const { PageHeading } = await server.ssrLoadModule("/src/components/PageHeading.tsx");
  const { CoastalEmptyState, CoastalArtwork } = await server.ssrLoadModule("/src/components/CoastalEmptyState.tsx");
  const { BrandBeats } = await server.ssrLoadModule("/src/components/Brand.tsx");
  const { t, useLocaleStore } = await server.ssrLoadModule("/src/i18n/locale.ts");
  const css = postcss.parse(await readFile(path.join(root, "src/styles/coastal-workspace.css"), "utf8"));
  const urls = new Set();
  css.walkDecls((declaration) => {
    for (const match of declaration.value.matchAll(/url\(['"]([^'"]+)['"]\)/g)) urls.add(match[1]);
    if (declaration.prop === "font-size") assert.ok(!declaration.value.includes("vw"), "type size must not depend on viewport width");
  });
  for (const url of urls) await access(path.join(root, "public", url));
  const projectsSource = await readFile(path.join(root, "src/features/projects/pages/ProjectsPage.tsx"), "utf8");
  const projectsImage = "/images/heledone-assets/projects-coastal-v1.png";
  assert.ok(projectsSource.includes(`src="${projectsImage}"`) && urls.has(projectsImage), "project list and detail headings use the dedicated artwork");
  for (const motif of ["boat", "palm", "coast", "waves"]) {
    const markup = renderToStaticMarkup(h(CoastalArtwork, { motif }));
    assert.ok(markup.includes('alt=""') && markup.includes('aria-hidden="true"'), "decorations stay out of accessible names");
  }
  const heading = renderToStaticMarkup(h(PageHeading, { title: "API <v2> & team", description: "Project description", actions: h("button", { disabled: true }, "Action") }));
  assert.ok(heading.includes("API &lt;v2&gt; &amp; team"), "user titles must remain escaped");
  assert.ok(heading.includes("disabled=\"\""), "the heading must preserve action permissions and pending states");
  assert.ok(renderToStaticMarkup(h(CoastalEmptyState, { title: "No items", children: h("button", null, "Create") })).includes("Create"), "empty-state actions must be preserved");
  let hasMobile = false;
  let hasReducedMotion = false;
  let hasContrast = false;
  css.walkAtRules("media", (rule) => {
    hasMobile ||= rule.params.includes("max-width: 640px");
    hasReducedMotion ||= rule.params.includes("prefers-reduced-motion");
    hasContrast ||= rule.params.includes("prefers-contrast");
  });
  assert.ok(hasMobile && hasReducedMotion && hasContrast, "shared artwork must adapt to mobile and accessibility preferences");

  // Optional static visual fixtures: synthetic content, no auth state or API requests.
  if (process.argv.includes("--preview")) {
    const output = path.join(root, "dist/coastal-preview");
    await mkdir(output, { recursive: true });
    const styles = (await readdir(path.join(root, "dist/assets"))).filter((file) => file.endsWith(".css") && /^(index-|coastal-workspace-|ProjectsPage-)/.test(file));
    assert.ok(styles.length, "build the web app before generating visual fixtures");
    const sections = ["organizations", "teams", "users", "roles", "profile", "settings", "attendance", "finance", "notifications", "tickets", "ticket-types", "discounts", "automations", "projects", "admin", "manager", "team-lead", "standups"];
    for (const locale of ["fa", "en"]) {
      useLocaleStore.getState().setLocale(locale);
      for (const theme of ["light", "dark"]) {
        for (const section of sections) {
          const title = t(section === "teams" ? "تیم‌ها" : section === "finance" ? "Organization Finances" : section === "notifications" ? "Notifications" : "Settings & Administration");
          const actions = h("div", { className: "flex flex-wrap items-center gap-3" },
            h("button", { className: "btn btn-primary" }, t("New Team")),
            h("label", null, h("span", { className: "sr-only" }, t("Search projects")), h("input", { className: "input input-bordered", placeholder: t("جست‌وجوی پروژه‌ها…") })),
            h("select", { className: "select select-bordered", "aria-label": t("Project status") }, h("option", null, t("همه پروژه‌ها")), h("option", null, t("فعال"))));
          const content = h("div", { className: "heledone-workspace" }, h("main", { className: "heledone-page space-y-5 p-4 sm:p-6", "data-section": section, style: { minHeight: "100vh" } },
            section === "projects" ? h("header", { className: "projects-coastal-heading" },
              h("img", { src: projectsImage, alt: "", "aria-hidden": true, className: "projects-coastal-art" }),
              h("div", { className: "projects-heading-copy" }, h(BrandBeats, { className: "mb-3" }),
                h("h1", { className: "text-3xl font-bold text-base-content" }, t("پروژه‌ها")),
                h("p", { className: "mt-1 text-sm text-heledone-ink-muted" }, t("The work we move forward together.")),
                h("button", { className: "projects-create-button mt-4 inline-flex items-center gap-2 bg-primary px-4 font-bold text-primary-content" }, t("پروژه تازه")))) :
              h(PageHeading, { title, description: t("The work we move forward together."), actions }),
            h("div", { className: "grid gap-4 sm:grid-cols-2" }, [0, 1, 2].map((index) => h("article", { key: index, className: "coastal-item border border-heledone-border bg-base-100 p-5" },
              h("h2", { className: "text-lg font-bold break-words" }, locale === "fa" ? "پروژهٔ آزمایشی طراحی و همکاری تیم" : "Team collaboration and product design"),
              h("p", { className: "mt-2 text-sm text-heledone-ink-muted" }, t("The work we move forward together.")), h("button", { className: "btn btn-sm mt-4" }, t("Edit project"))))),
            h(CoastalEmptyState, { title: t("No projects found"), description: t("No projects matching your filters"), motif: section === "teams" ? "coast" : section === "notifications" ? "waves" : "boat" }),
            h("header", { className: "heledone-task-coast" }, h(BrandBeats), h("h1", null, t("درخواست‌های پشتیبانی")), h(CoastalArtwork, { motif: "waves" }))));
          const html = `<!doctype html><html lang="${locale}" dir="${locale === "fa" ? "rtl" : "ltr"}" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map((file) => `<link rel="stylesheet" href="../assets/${file}">`).join("")}<title>Coastal layout fixture</title></head><body>${renderToStaticMarkup(content)}</body></html>`;
          await writeFile(path.join(output, `${section}-${locale}-${theme}.html`), html);
        }
      }
    }
    console.log("Synthetic layout fixtures generated in dist/coastal-preview.");
  }
  console.log(`Coastal component checks passed: escaped titles, action state, decorative assets (${urls.size}), mobile, reduced motion and contrast.`);
} finally {
  await server.close();
}
