await Bun.build({
  entrypoints: ["src/app.ts"],
  outdir: "public",
  target: "browser",
  minify: false,
  sourcemap: "external"
});
