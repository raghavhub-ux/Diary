import { build } from "esbuild";
import { readdir, readFile, mkdir } from "node:fs/promises";
const assets = {};
for (const path of [
  "index.html",
  ...(await readdir("dist/assets")).map((f) => "assets/" + f),
]) {
  const type = path.endsWith(".js")
    ? "application/javascript"
    : path.endsWith(".css")
      ? "text/css"
      : "text/html";
  assets["/" + path] = {
    type: type + "; charset=utf-8",
    body: await readFile("dist/" + path, "utf8"),
  };
}
await mkdir("dist/server", { recursive: true });
await build({
  entryPoints: ["hosted/worker.js"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  minify: true,
  plugins: [
    {
      name: "embed-client",
      setup(b) {
        b.onResolve({ filter: /^mindspace-assets$/ }, () => ({
          path: "assets",
          namespace: "embed",
        }));
        b.onLoad({ filter: /.*/, namespace: "embed" }, () => ({
          contents: JSON.stringify(assets),
          loader: "json",
        }));
      },
    },
  ],
});
