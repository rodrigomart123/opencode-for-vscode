import * as fs from "node:fs"
import * as path from "node:path"
import { defineConfig, type Plugin } from "vite"
import solid from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"

const root = __dirname
const upstream = path.join(root, "opencode-original")
const app = path.join(upstream, "packages", "app", "src")
const ui = path.join(upstream, "packages", "ui", "src")
const util = path.join(upstream, "packages", "util", "src")
const sdk = path.join(upstream, "packages", "sdk", "js", "src")

function file(...parts: string[]) {
  return path.join(...parts).replace(/\\/g, "/")
}

function pick(candidates: string[]) {
  return candidates.find((item) => {
    if (!fs.existsSync(item)) return false
    return fs.statSync(item).isFile()
  })
}

function resolveApp(id: string) {
  if (!id.startsWith("@/")) return
  const rest = id.slice(2)
  return pick([
    file(app, rest),
    file(app, `${rest}.tsx`),
    file(app, `${rest}.ts`),
    file(app, `${rest}.css`),
    file(app, rest, "index.tsx"),
    file(app, rest, "index.ts"),
    file(app, rest, "index.css"),
  ])
}

function resolveUi(id: string) {
  if (id === "@opencode-ai/ui/context") return pick([file(ui, "context", "index.ts")])
  if (id === "@opencode-ai/ui/hooks") return pick([file(ui, "hooks", "index.ts")])
  if (id.startsWith("@opencode-ai/ui/i18n/")) {
    const rest = id.slice("@opencode-ai/ui/i18n/".length)
    return pick([file(ui, "i18n", `${rest}.ts`)])
  }
  if (id === "@opencode-ai/ui/pierre") return pick([file(ui, "pierre", "index.ts")])
  if (id === "@opencode-ai/ui/styles") return pick([file(ui, "styles", "index.css")])
  if (id === "@opencode-ai/ui/styles/tailwind") return pick([file(ui, "styles", "tailwind", "index.css")])
  if (id === "@opencode-ai/ui/theme") return pick([file(ui, "theme", "index.ts")])

  if (id.startsWith("@opencode-ai/ui/context/")) {
    const rest = id.slice("@opencode-ai/ui/context/".length)
    return pick([file(ui, "context", `${rest}.tsx`), file(ui, "context", `${rest}.ts`)])
  }

  if (id.startsWith("@opencode-ai/ui/theme/")) {
    const rest = id.slice("@opencode-ai/ui/theme/".length)
    return pick([file(ui, "theme", `${rest}.tsx`), file(ui, "theme", `${rest}.ts`)])
  }

  if (id.startsWith("@opencode-ai/ui/pierre/")) {
    const rest = id.slice("@opencode-ai/ui/pierre/".length)
    return pick([file(ui, "pierre", `${rest}.tsx`), file(ui, "pierre", `${rest}.ts`)])
  }

  if (id.startsWith("@opencode-ai/ui/icons/")) {
    const rest = id.slice("@opencode-ai/ui/icons/".length)
    return pick([
      file(ui, "components", `${rest}.ts`),
      file(ui, "components", `${rest}.tsx`),
      file(ui, "components", `${rest}`, "types.ts"),
      file(ui, "components", `${rest}`, "index.ts"),
    ])
  }

  if (id.startsWith("@opencode-ai/ui/")) {
    const rest = id.slice("@opencode-ai/ui/".length)
    return pick([file(ui, "components", `${rest}.tsx`), file(ui, "components", `${rest}.ts`)])
  }
}

function resolveSdk(id: string) {
  if (id === "@opencode-ai/sdk") return pick([file(sdk, "index.ts")])
  if (id === "@opencode-ai/sdk/client") return pick([file(sdk, "client.ts")])
  if (id === "@opencode-ai/sdk/server") return pick([file(sdk, "server.ts")])
  if (id === "@opencode-ai/sdk/v2") return pick([file(sdk, "v2", "index.ts")])
  if (id === "@opencode-ai/sdk/v2/client") return pick([file(sdk, "v2", "client.ts")])
  if (id === "@opencode-ai/sdk/v2/server") return pick([file(sdk, "v2", "server.ts")])
  if (id === "@opencode-ai/sdk/v2/gen/client") return pick([file(sdk, "v2", "gen", "client", "index.ts")])
}

function resolveUtil(id: string) {
  if (!id.startsWith("@opencode-ai/util/")) return
  const rest = id.slice("@opencode-ai/util/".length)
  return pick([file(util, `${rest}.ts`)])
}

function sourceAlias(): Plugin {
  return {
    name: "opencode-vscode:source-alias",
    resolveId(id) {
      return resolveApp(id) ?? resolveUi(id) ?? resolveSdk(id) ?? resolveUtil(id) ?? null
    },
  }
}

export default defineConfig({
  root: file(root, "webview"),
  publicDir: false,
  base: "./",
  plugins: [sourceAlias(), tailwindcss(), solid()],
  resolve: {
    alias: [
      { find: "@opencode-ai/ui/styles/tailwind", replacement: file(ui, "styles", "tailwind", "index.css") },
      { find: "@opencode-ai/ui/styles", replacement: file(ui, "styles", "index.css") },
    ],
    conditions: ["browser"],
  },
  worker: {
    format: "es",
  },
  build: {
    outDir: file(root, "media", "app"),
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    target: "esnext",
    rollupOptions: {
      input: file(root, "webview", "index.html"),
      output: {
        entryFileNames: "app.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (info) => {
          if (info.names.some((name) => name.endsWith(".css"))) {
            return "app.css"
          }
          return "assets/[name]-[hash][extname]"
        },
      },
    },
  },
})
