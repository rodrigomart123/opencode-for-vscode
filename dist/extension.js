"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/isexe/windows.js
var require_windows = __commonJS({
  "node_modules/isexe/windows.js"(exports2, module2) {
    module2.exports = isexe;
    isexe.sync = sync;
    var fs2 = require("fs");
    function checkPathExt(path3, options) {
      var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
      if (!pathext) {
        return true;
      }
      pathext = pathext.split(";");
      if (pathext.indexOf("") !== -1) {
        return true;
      }
      for (var i = 0; i < pathext.length; i++) {
        var p = pathext[i].toLowerCase();
        if (p && path3.substr(-p.length).toLowerCase() === p) {
          return true;
        }
      }
      return false;
    }
    function checkStat(stat, path3, options) {
      if (!stat.isSymbolicLink() && !stat.isFile()) {
        return false;
      }
      return checkPathExt(path3, options);
    }
    function isexe(path3, options, cb) {
      fs2.stat(path3, function(er, stat) {
        cb(er, er ? false : checkStat(stat, path3, options));
      });
    }
    function sync(path3, options) {
      return checkStat(fs2.statSync(path3), path3, options);
    }
  }
});

// node_modules/isexe/mode.js
var require_mode = __commonJS({
  "node_modules/isexe/mode.js"(exports2, module2) {
    module2.exports = isexe;
    isexe.sync = sync;
    var fs2 = require("fs");
    function isexe(path3, options, cb) {
      fs2.stat(path3, function(er, stat) {
        cb(er, er ? false : checkStat(stat, options));
      });
    }
    function sync(path3, options) {
      return checkStat(fs2.statSync(path3), options);
    }
    function checkStat(stat, options) {
      return stat.isFile() && checkMode(stat, options);
    }
    function checkMode(stat, options) {
      var mod = stat.mode;
      var uid = stat.uid;
      var gid = stat.gid;
      var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
      var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
      var u = parseInt("100", 8);
      var g = parseInt("010", 8);
      var o = parseInt("001", 8);
      var ug = u | g;
      var ret = mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
      return ret;
    }
  }
});

// node_modules/isexe/index.js
var require_isexe = __commonJS({
  "node_modules/isexe/index.js"(exports2, module2) {
    var fs2 = require("fs");
    var core;
    if (process.platform === "win32" || global.TESTING_WINDOWS) {
      core = require_windows();
    } else {
      core = require_mode();
    }
    module2.exports = isexe;
    isexe.sync = sync;
    function isexe(path3, options, cb) {
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (!cb) {
        if (typeof Promise !== "function") {
          throw new TypeError("callback not provided");
        }
        return new Promise(function(resolve2, reject) {
          isexe(path3, options || {}, function(er, is) {
            if (er) {
              reject(er);
            } else {
              resolve2(is);
            }
          });
        });
      }
      core(path3, options || {}, function(er, is) {
        if (er) {
          if (er.code === "EACCES" || options && options.ignoreErrors) {
            er = null;
            is = false;
          }
        }
        cb(er, is);
      });
    }
    function sync(path3, options) {
      try {
        return core.sync(path3, options || {});
      } catch (er) {
        if (options && options.ignoreErrors || er.code === "EACCES") {
          return false;
        } else {
          throw er;
        }
      }
    }
  }
});

// node_modules/which/which.js
var require_which = __commonJS({
  "node_modules/which/which.js"(exports2, module2) {
    var isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
    var path3 = require("path");
    var COLON = isWindows ? ";" : ":";
    var isexe = require_isexe();
    var getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
    var getPathInfo = (cmd, opt) => {
      const colon = opt.colon || COLON;
      const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? [""] : [
        // windows always checks the cwd first
        ...isWindows ? [process.cwd()] : [],
        ...(opt.path || process.env.PATH || /* istanbul ignore next: very unusual */
        "").split(colon)
      ];
      const pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
      const pathExt = isWindows ? pathExtExe.split(colon) : [""];
      if (isWindows) {
        if (cmd.indexOf(".") !== -1 && pathExt[0] !== "")
          pathExt.unshift("");
      }
      return {
        pathEnv,
        pathExt,
        pathExtExe
      };
    };
    var which = (cmd, opt, cb) => {
      if (typeof opt === "function") {
        cb = opt;
        opt = {};
      }
      if (!opt)
        opt = {};
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      const step = (i) => new Promise((resolve2, reject) => {
        if (i === pathEnv.length)
          return opt.all && found.length ? resolve2(found) : reject(getNotFoundError(cmd));
        const ppRaw = pathEnv[i];
        const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
        const pCmd = path3.join(pathPart, cmd);
        const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
        resolve2(subStep(p, i, 0));
      });
      const subStep = (p, i, ii) => new Promise((resolve2, reject) => {
        if (ii === pathExt.length)
          return resolve2(step(i + 1));
        const ext = pathExt[ii];
        isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
          if (!er && is) {
            if (opt.all)
              found.push(p + ext);
            else
              return resolve2(p + ext);
          }
          return resolve2(subStep(p, i, ii + 1));
        });
      });
      return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
    };
    var whichSync = (cmd, opt) => {
      opt = opt || {};
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      for (let i = 0; i < pathEnv.length; i++) {
        const ppRaw = pathEnv[i];
        const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
        const pCmd = path3.join(pathPart, cmd);
        const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
        for (let j = 0; j < pathExt.length; j++) {
          const cur = p + pathExt[j];
          try {
            const is = isexe.sync(cur, { pathExt: pathExtExe });
            if (is) {
              if (opt.all)
                found.push(cur);
              else
                return cur;
            }
          } catch (ex) {
          }
        }
      }
      if (opt.all && found.length)
        return found;
      if (opt.nothrow)
        return null;
      throw getNotFoundError(cmd);
    };
    module2.exports = which;
    which.sync = whichSync;
  }
});

// node_modules/path-key/index.js
var require_path_key = __commonJS({
  "node_modules/path-key/index.js"(exports2, module2) {
    "use strict";
    var pathKey = (options = {}) => {
      const environment = options.env || process.env;
      const platform = options.platform || process.platform;
      if (platform !== "win32") {
        return "PATH";
      }
      return Object.keys(environment).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
    };
    module2.exports = pathKey;
    module2.exports.default = pathKey;
  }
});

// node_modules/cross-spawn/lib/util/resolveCommand.js
var require_resolveCommand = __commonJS({
  "node_modules/cross-spawn/lib/util/resolveCommand.js"(exports2, module2) {
    "use strict";
    var path3 = require("path");
    var which = require_which();
    var getPathKey = require_path_key();
    function resolveCommandAttempt(parsed, withoutPathExt) {
      const env3 = parsed.options.env || process.env;
      const cwd = process.cwd();
      const hasCustomCwd = parsed.options.cwd != null;
      const shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
      if (shouldSwitchCwd) {
        try {
          process.chdir(parsed.options.cwd);
        } catch (err) {
        }
      }
      let resolved;
      try {
        resolved = which.sync(parsed.command, {
          path: env3[getPathKey({ env: env3 })],
          pathExt: withoutPathExt ? path3.delimiter : void 0
        });
      } catch (e) {
      } finally {
        if (shouldSwitchCwd) {
          process.chdir(cwd);
        }
      }
      if (resolved) {
        resolved = path3.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
      }
      return resolved;
    }
    function resolveCommand(parsed) {
      return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
    }
    module2.exports = resolveCommand;
  }
});

// node_modules/cross-spawn/lib/util/escape.js
var require_escape = __commonJS({
  "node_modules/cross-spawn/lib/util/escape.js"(exports2, module2) {
    "use strict";
    var metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
    function escapeCommand(arg) {
      arg = arg.replace(metaCharsRegExp, "^$1");
      return arg;
    }
    function escapeArgument(arg, doubleEscapeMetaChars) {
      arg = `${arg}`;
      arg = arg.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
      arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
      arg = `"${arg}"`;
      arg = arg.replace(metaCharsRegExp, "^$1");
      if (doubleEscapeMetaChars) {
        arg = arg.replace(metaCharsRegExp, "^$1");
      }
      return arg;
    }
    module2.exports.command = escapeCommand;
    module2.exports.argument = escapeArgument;
  }
});

// node_modules/shebang-regex/index.js
var require_shebang_regex = __commonJS({
  "node_modules/shebang-regex/index.js"(exports2, module2) {
    "use strict";
    module2.exports = /^#!(.*)/;
  }
});

// node_modules/shebang-command/index.js
var require_shebang_command = __commonJS({
  "node_modules/shebang-command/index.js"(exports2, module2) {
    "use strict";
    var shebangRegex = require_shebang_regex();
    module2.exports = (string = "") => {
      const match = string.match(shebangRegex);
      if (!match) {
        return null;
      }
      const [path3, argument] = match[0].replace(/#! ?/, "").split(" ");
      const binary = path3.split("/").pop();
      if (binary === "env") {
        return argument;
      }
      return argument ? `${binary} ${argument}` : binary;
    };
  }
});

// node_modules/cross-spawn/lib/util/readShebang.js
var require_readShebang = __commonJS({
  "node_modules/cross-spawn/lib/util/readShebang.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs");
    var shebangCommand = require_shebang_command();
    function readShebang(command) {
      const size = 150;
      const buffer = Buffer.alloc(size);
      let fd;
      try {
        fd = fs2.openSync(command, "r");
        fs2.readSync(fd, buffer, 0, size, 0);
        fs2.closeSync(fd);
      } catch (e) {
      }
      return shebangCommand(buffer.toString());
    }
    module2.exports = readShebang;
  }
});

// node_modules/cross-spawn/lib/parse.js
var require_parse = __commonJS({
  "node_modules/cross-spawn/lib/parse.js"(exports2, module2) {
    "use strict";
    var path3 = require("path");
    var resolveCommand = require_resolveCommand();
    var escape = require_escape();
    var readShebang = require_readShebang();
    var isWin = process.platform === "win32";
    var isExecutableRegExp = /\.(?:com|exe)$/i;
    var isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
    function detectShebang(parsed) {
      parsed.file = resolveCommand(parsed);
      const shebang = parsed.file && readShebang(parsed.file);
      if (shebang) {
        parsed.args.unshift(parsed.file);
        parsed.command = shebang;
        return resolveCommand(parsed);
      }
      return parsed.file;
    }
    function parseNonShell(parsed) {
      if (!isWin) {
        return parsed;
      }
      const commandFile = detectShebang(parsed);
      const needsShell = !isExecutableRegExp.test(commandFile);
      if (parsed.options.forceShell || needsShell) {
        const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);
        parsed.command = path3.normalize(parsed.command);
        parsed.command = escape.command(parsed.command);
        parsed.args = parsed.args.map((arg) => escape.argument(arg, needsDoubleEscapeMetaChars));
        const shellCommand = [parsed.command].concat(parsed.args).join(" ");
        parsed.args = ["/d", "/s", "/c", `"${shellCommand}"`];
        parsed.command = process.env.comspec || "cmd.exe";
        parsed.options.windowsVerbatimArguments = true;
      }
      return parsed;
    }
    function parse(command, args, options) {
      if (args && !Array.isArray(args)) {
        options = args;
        args = null;
      }
      args = args ? args.slice(0) : [];
      options = Object.assign({}, options);
      const parsed = {
        command,
        args,
        options,
        file: void 0,
        original: {
          command,
          args
        }
      };
      return options.shell ? parsed : parseNonShell(parsed);
    }
    module2.exports = parse;
  }
});

// node_modules/cross-spawn/lib/enoent.js
var require_enoent = __commonJS({
  "node_modules/cross-spawn/lib/enoent.js"(exports2, module2) {
    "use strict";
    var isWin = process.platform === "win32";
    function notFoundError(original, syscall) {
      return Object.assign(new Error(`${syscall} ${original.command} ENOENT`), {
        code: "ENOENT",
        errno: "ENOENT",
        syscall: `${syscall} ${original.command}`,
        path: original.command,
        spawnargs: original.args
      });
    }
    function hookChildProcess(cp, parsed) {
      if (!isWin) {
        return;
      }
      const originalEmit = cp.emit;
      cp.emit = function(name, arg1) {
        if (name === "exit") {
          const err = verifyENOENT(arg1, parsed);
          if (err) {
            return originalEmit.call(cp, "error", err);
          }
        }
        return originalEmit.apply(cp, arguments);
      };
    }
    function verifyENOENT(status, parsed) {
      if (isWin && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawn");
      }
      return null;
    }
    function verifyENOENTSync(status, parsed) {
      if (isWin && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawnSync");
      }
      return null;
    }
    module2.exports = {
      hookChildProcess,
      verifyENOENT,
      verifyENOENTSync,
      notFoundError
    };
  }
});

// node_modules/cross-spawn/index.js
var require_cross_spawn = __commonJS({
  "node_modules/cross-spawn/index.js"(exports2, module2) {
    "use strict";
    var cp = require("child_process");
    var parse = require_parse();
    var enoent = require_enoent();
    function spawn2(command, args, options) {
      const parsed = parse(command, args, options);
      const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
      enoent.hookChildProcess(spawned, parsed);
      return spawned;
    }
    function spawnSync(command, args, options) {
      const parsed = parse(command, args, options);
      const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
      result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);
      return result;
    }
    module2.exports = spawn2;
    module2.exports.spawn = spawn2;
    module2.exports.sync = spawnSync;
    module2.exports._parse = parse;
    module2.exports._enoent = enoent;
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode5 = __toESM(require("vscode"));

// src/opencodeService.ts
var import_node_child_process = require("node:child_process");
var fs = __toESM(require("node:fs"));
var net = __toESM(require("node:net"));
var os = __toESM(require("node:os"));
var path = __toESM(require("node:path"));
var vscode = __toESM(require("vscode"));

// node_modules/@opencode-ai/sdk/dist/gen/core/serverSentEvents.gen.js
var createSseClient = ({ onSseError, onSseEvent, responseTransformer, responseValidator, sseDefaultRetryDelay, sseMaxRetryAttempts, sseMaxRetryDelay, sseSleepFn, url, ...options }) => {
  let lastEventId;
  const sleep = sseSleepFn ?? ((ms) => new Promise((resolve2) => setTimeout(resolve2, ms)));
  const createStream = async function* () {
    let retryDelay = sseDefaultRetryDelay ?? 3e3;
    let attempt = 0;
    const signal = options.signal ?? new AbortController().signal;
    while (true) {
      if (signal.aborted)
        break;
      attempt++;
      const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
      if (lastEventId !== void 0) {
        headers.set("Last-Event-ID", lastEventId);
      }
      try {
        const response = await fetch(url, { ...options, headers, signal });
        if (!response.ok)
          throw new Error(`SSE failed: ${response.status} ${response.statusText}`);
        if (!response.body)
          throw new Error("No body in SSE response");
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        const abortHandler = () => {
          try {
            reader.cancel();
          } catch {
          }
        };
        signal.addEventListener("abort", abortHandler);
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            buffer += value;
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() ?? "";
            for (const chunk of chunks) {
              const lines = chunk.split("\n");
              const dataLines = [];
              let eventName;
              for (const line of lines) {
                if (line.startsWith("data:")) {
                  dataLines.push(line.replace(/^data:\s*/, ""));
                } else if (line.startsWith("event:")) {
                  eventName = line.replace(/^event:\s*/, "");
                } else if (line.startsWith("id:")) {
                  lastEventId = line.replace(/^id:\s*/, "");
                } else if (line.startsWith("retry:")) {
                  const parsed = Number.parseInt(line.replace(/^retry:\s*/, ""), 10);
                  if (!Number.isNaN(parsed)) {
                    retryDelay = parsed;
                  }
                }
              }
              let data;
              let parsedJson = false;
              if (dataLines.length) {
                const rawData = dataLines.join("\n");
                try {
                  data = JSON.parse(rawData);
                  parsedJson = true;
                } catch {
                  data = rawData;
                }
              }
              if (parsedJson) {
                if (responseValidator) {
                  await responseValidator(data);
                }
                if (responseTransformer) {
                  data = await responseTransformer(data);
                }
              }
              onSseEvent?.({
                data,
                event: eventName,
                id: lastEventId,
                retry: retryDelay
              });
              if (dataLines.length) {
                yield data;
              }
            }
          }
        } finally {
          signal.removeEventListener("abort", abortHandler);
          reader.releaseLock();
        }
        break;
      } catch (error) {
        onSseError?.(error);
        if (sseMaxRetryAttempts !== void 0 && attempt >= sseMaxRetryAttempts) {
          break;
        }
        const backoff = Math.min(retryDelay * 2 ** (attempt - 1), sseMaxRetryDelay ?? 3e4);
        await sleep(backoff);
      }
    }
  };
  const stream = createStream();
  return { stream };
};

// node_modules/@opencode-ai/sdk/dist/gen/core/auth.gen.js
var getAuthToken = async (auth, callback) => {
  const token = typeof callback === "function" ? await callback(auth) : callback;
  if (!token) {
    return;
  }
  if (auth.scheme === "bearer") {
    return `Bearer ${token}`;
  }
  if (auth.scheme === "basic") {
    return `Basic ${btoa(token)}`;
  }
  return token;
};

// node_modules/@opencode-ai/sdk/dist/gen/core/bodySerializer.gen.js
var jsonBodySerializer = {
  bodySerializer: (body) => JSON.stringify(body, (_key, value) => typeof value === "bigint" ? value.toString() : value)
};

// node_modules/@opencode-ai/sdk/dist/gen/core/pathSerializer.gen.js
var separatorArrayExplode = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var separatorArrayNoExplode = (style) => {
  switch (style) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
};
var separatorObjectExplode = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var serializeArrayParam = ({ allowReserved, explode, name, style, value }) => {
  if (!explode) {
    const joinedValues2 = (allowReserved ? value : value.map((v) => encodeURIComponent(v))).join(separatorArrayNoExplode(style));
    switch (style) {
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      case "simple":
        return joinedValues2;
      default:
        return `${name}=${joinedValues2}`;
    }
  }
  const separator = separatorArrayExplode(style);
  const joinedValues = value.map((v) => {
    if (style === "label" || style === "simple") {
      return allowReserved ? v : encodeURIComponent(v);
    }
    return serializePrimitiveParam({
      allowReserved,
      name,
      value: v
    });
  }).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};
var serializePrimitiveParam = ({ allowReserved, name, value }) => {
  if (value === void 0 || value === null) {
    return "";
  }
  if (typeof value === "object") {
    throw new Error("Deeply-nested arrays/objects aren\u2019t supported. Provide your own `querySerializer()` to handle these.");
  }
  return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
};
var serializeObjectParam = ({ allowReserved, explode, name, style, value, valueOnly }) => {
  if (value instanceof Date) {
    return valueOnly ? value.toISOString() : `${name}=${value.toISOString()}`;
  }
  if (style !== "deepObject" && !explode) {
    let values = [];
    Object.entries(value).forEach(([key, v]) => {
      values = [...values, key, allowReserved ? v : encodeURIComponent(v)];
    });
    const joinedValues2 = values.join(",");
    switch (style) {
      case "form":
        return `${name}=${joinedValues2}`;
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      default:
        return joinedValues2;
    }
  }
  const separator = separatorObjectExplode(style);
  const joinedValues = Object.entries(value).map(([key, v]) => serializePrimitiveParam({
    allowReserved,
    name: style === "deepObject" ? `${name}[${key}]` : key,
    value: v
  })).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};

// node_modules/@opencode-ai/sdk/dist/gen/core/utils.gen.js
var PATH_PARAM_RE = /\{[^{}]+\}/g;
var defaultPathSerializer = ({ path: path3, url: _url }) => {
  let url = _url;
  const matches = _url.match(PATH_PARAM_RE);
  if (matches) {
    for (const match of matches) {
      let explode = false;
      let name = match.substring(1, match.length - 1);
      let style = "simple";
      if (name.endsWith("*")) {
        explode = true;
        name = name.substring(0, name.length - 1);
      }
      if (name.startsWith(".")) {
        name = name.substring(1);
        style = "label";
      } else if (name.startsWith(";")) {
        name = name.substring(1);
        style = "matrix";
      }
      const value = path3[name];
      if (value === void 0 || value === null) {
        continue;
      }
      if (Array.isArray(value)) {
        url = url.replace(match, serializeArrayParam({ explode, name, style, value }));
        continue;
      }
      if (typeof value === "object") {
        url = url.replace(match, serializeObjectParam({
          explode,
          name,
          style,
          value,
          valueOnly: true
        }));
        continue;
      }
      if (style === "matrix") {
        url = url.replace(match, `;${serializePrimitiveParam({
          name,
          value
        })}`);
        continue;
      }
      const replaceValue = encodeURIComponent(style === "label" ? `.${value}` : value);
      url = url.replace(match, replaceValue);
    }
  }
  return url;
};
var getUrl = ({ baseUrl, path: path3, query, querySerializer, url: _url }) => {
  const pathUrl = _url.startsWith("/") ? _url : `/${_url}`;
  let url = (baseUrl ?? "") + pathUrl;
  if (path3) {
    url = defaultPathSerializer({ path: path3, url });
  }
  let search = query ? querySerializer(query) : "";
  if (search.startsWith("?")) {
    search = search.substring(1);
  }
  if (search) {
    url += `?${search}`;
  }
  return url;
};

// node_modules/@opencode-ai/sdk/dist/gen/client/utils.gen.js
var createQuerySerializer = ({ allowReserved, array, object } = {}) => {
  const querySerializer = (queryParams) => {
    const search = [];
    if (queryParams && typeof queryParams === "object") {
      for (const name in queryParams) {
        const value = queryParams[name];
        if (value === void 0 || value === null) {
          continue;
        }
        if (Array.isArray(value)) {
          const serializedArray = serializeArrayParam({
            allowReserved,
            explode: true,
            name,
            style: "form",
            value,
            ...array
          });
          if (serializedArray)
            search.push(serializedArray);
        } else if (typeof value === "object") {
          const serializedObject = serializeObjectParam({
            allowReserved,
            explode: true,
            name,
            style: "deepObject",
            value,
            ...object
          });
          if (serializedObject)
            search.push(serializedObject);
        } else {
          const serializedPrimitive = serializePrimitiveParam({
            allowReserved,
            name,
            value
          });
          if (serializedPrimitive)
            search.push(serializedPrimitive);
        }
      }
    }
    return search.join("&");
  };
  return querySerializer;
};
var getParseAs = (contentType) => {
  if (!contentType) {
    return "stream";
  }
  const cleanContent = contentType.split(";")[0]?.trim();
  if (!cleanContent) {
    return;
  }
  if (cleanContent.startsWith("application/json") || cleanContent.endsWith("+json")) {
    return "json";
  }
  if (cleanContent === "multipart/form-data") {
    return "formData";
  }
  if (["application/", "audio/", "image/", "video/"].some((type) => cleanContent.startsWith(type))) {
    return "blob";
  }
  if (cleanContent.startsWith("text/")) {
    return "text";
  }
  return;
};
var checkForExistence = (options, name) => {
  if (!name) {
    return false;
  }
  if (options.headers.has(name) || options.query?.[name] || options.headers.get("Cookie")?.includes(`${name}=`)) {
    return true;
  }
  return false;
};
var setAuthParams = async ({ security, ...options }) => {
  for (const auth of security) {
    if (checkForExistence(options, auth.name)) {
      continue;
    }
    const token = await getAuthToken(auth, options.auth);
    if (!token) {
      continue;
    }
    const name = auth.name ?? "Authorization";
    switch (auth.in) {
      case "query":
        if (!options.query) {
          options.query = {};
        }
        options.query[name] = token;
        break;
      case "cookie":
        options.headers.append("Cookie", `${name}=${token}`);
        break;
      case "header":
      default:
        options.headers.set(name, token);
        break;
    }
  }
};
var buildUrl = (options) => getUrl({
  baseUrl: options.baseUrl,
  path: options.path,
  query: options.query,
  querySerializer: typeof options.querySerializer === "function" ? options.querySerializer : createQuerySerializer(options.querySerializer),
  url: options.url
});
var mergeConfigs = (a, b) => {
  const config = { ...a, ...b };
  if (config.baseUrl?.endsWith("/")) {
    config.baseUrl = config.baseUrl.substring(0, config.baseUrl.length - 1);
  }
  config.headers = mergeHeaders(a.headers, b.headers);
  return config;
};
var mergeHeaders = (...headers) => {
  const mergedHeaders = new Headers();
  for (const header of headers) {
    if (!header || typeof header !== "object") {
      continue;
    }
    const iterator = header instanceof Headers ? header.entries() : Object.entries(header);
    for (const [key, value] of iterator) {
      if (value === null) {
        mergedHeaders.delete(key);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          mergedHeaders.append(key, v);
        }
      } else if (value !== void 0) {
        mergedHeaders.set(key, typeof value === "object" ? JSON.stringify(value) : value);
      }
    }
  }
  return mergedHeaders;
};
var Interceptors = class {
  _fns;
  constructor() {
    this._fns = [];
  }
  clear() {
    this._fns = [];
  }
  getInterceptorIndex(id) {
    if (typeof id === "number") {
      return this._fns[id] ? id : -1;
    } else {
      return this._fns.indexOf(id);
    }
  }
  exists(id) {
    const index = this.getInterceptorIndex(id);
    return !!this._fns[index];
  }
  eject(id) {
    const index = this.getInterceptorIndex(id);
    if (this._fns[index]) {
      this._fns[index] = null;
    }
  }
  update(id, fn) {
    const index = this.getInterceptorIndex(id);
    if (this._fns[index]) {
      this._fns[index] = fn;
      return id;
    } else {
      return false;
    }
  }
  use(fn) {
    this._fns = [...this._fns, fn];
    return this._fns.length - 1;
  }
};
var createInterceptors = () => ({
  error: new Interceptors(),
  request: new Interceptors(),
  response: new Interceptors()
});
var defaultQuerySerializer = createQuerySerializer({
  allowReserved: false,
  array: {
    explode: true,
    style: "form"
  },
  object: {
    explode: true,
    style: "deepObject"
  }
});
var defaultHeaders = {
  "Content-Type": "application/json"
};
var createConfig = (override = {}) => ({
  ...jsonBodySerializer,
  headers: defaultHeaders,
  parseAs: "auto",
  querySerializer: defaultQuerySerializer,
  ...override
});

// node_modules/@opencode-ai/sdk/dist/gen/client/client.gen.js
var createClient = (config = {}) => {
  let _config = mergeConfigs(createConfig(), config);
  const getConfig = () => ({ ..._config });
  const setConfig = (config2) => {
    _config = mergeConfigs(_config, config2);
    return getConfig();
  };
  const interceptors = createInterceptors();
  const beforeRequest = async (options) => {
    const opts = {
      ..._config,
      ...options,
      fetch: options.fetch ?? _config.fetch ?? globalThis.fetch,
      headers: mergeHeaders(_config.headers, options.headers),
      serializedBody: void 0
    };
    if (opts.security) {
      await setAuthParams({
        ...opts,
        security: opts.security
      });
    }
    if (opts.requestValidator) {
      await opts.requestValidator(opts);
    }
    if (opts.body && opts.bodySerializer) {
      opts.serializedBody = opts.bodySerializer(opts.body);
    }
    if (opts.serializedBody === void 0 || opts.serializedBody === "") {
      opts.headers.delete("Content-Type");
    }
    const url = buildUrl(opts);
    return { opts, url };
  };
  const request = async (options) => {
    const { opts, url } = await beforeRequest(options);
    const requestInit = {
      redirect: "follow",
      ...opts,
      body: opts.serializedBody
    };
    let request2 = new Request(url, requestInit);
    for (const fn of interceptors.request._fns) {
      if (fn) {
        request2 = await fn(request2, opts);
      }
    }
    const _fetch = opts.fetch;
    let response = await _fetch(request2);
    for (const fn of interceptors.response._fns) {
      if (fn) {
        response = await fn(response, request2, opts);
      }
    }
    const result = {
      request: request2,
      response
    };
    if (response.ok) {
      if (response.status === 204 || response.headers.get("Content-Length") === "0") {
        return opts.responseStyle === "data" ? {} : {
          data: {},
          ...result
        };
      }
      const parseAs = (opts.parseAs === "auto" ? getParseAs(response.headers.get("Content-Type")) : opts.parseAs) ?? "json";
      let data;
      switch (parseAs) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          data = await response[parseAs]();
          break;
        case "stream":
          return opts.responseStyle === "data" ? response.body : {
            data: response.body,
            ...result
          };
      }
      if (parseAs === "json") {
        if (opts.responseValidator) {
          await opts.responseValidator(data);
        }
        if (opts.responseTransformer) {
          data = await opts.responseTransformer(data);
        }
      }
      return opts.responseStyle === "data" ? data : {
        data,
        ...result
      };
    }
    const textError = await response.text();
    let jsonError;
    try {
      jsonError = JSON.parse(textError);
    } catch {
    }
    const error = jsonError ?? textError;
    let finalError = error;
    for (const fn of interceptors.error._fns) {
      if (fn) {
        finalError = await fn(error, response, request2, opts);
      }
    }
    finalError = finalError || {};
    if (opts.throwOnError) {
      throw finalError;
    }
    return opts.responseStyle === "data" ? void 0 : {
      error: finalError,
      ...result
    };
  };
  const makeMethod = (method) => {
    const fn = (options) => request({ ...options, method });
    fn.sse = async (options) => {
      const { opts, url } = await beforeRequest(options);
      return createSseClient({
        ...opts,
        body: opts.body,
        headers: opts.headers,
        method,
        url
      });
    };
    return fn;
  };
  return {
    buildUrl,
    connect: makeMethod("CONNECT"),
    delete: makeMethod("DELETE"),
    get: makeMethod("GET"),
    getConfig,
    head: makeMethod("HEAD"),
    interceptors,
    options: makeMethod("OPTIONS"),
    patch: makeMethod("PATCH"),
    post: makeMethod("POST"),
    put: makeMethod("PUT"),
    request,
    setConfig,
    trace: makeMethod("TRACE")
  };
};

// node_modules/@opencode-ai/sdk/dist/gen/core/params.gen.js
var extraPrefixesMap = {
  $body_: "body",
  $headers_: "headers",
  $path_: "path",
  $query_: "query"
};
var extraPrefixes = Object.entries(extraPrefixesMap);

// node_modules/@opencode-ai/sdk/dist/gen/client.gen.js
var client = createClient(createConfig({
  baseUrl: "http://localhost:4096"
}));

// node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.js
var _HeyApiClient = class {
  _client = client;
  constructor(args) {
    if (args?.client) {
      this._client = args.client;
    }
  }
};
var Global = class extends _HeyApiClient {
  /**
   * Get events
   */
  event(options) {
    return (options?.client ?? this._client).get.sse({
      url: "/global/event",
      ...options
    });
  }
};
var Project = class extends _HeyApiClient {
  /**
   * List all projects
   */
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/project",
      ...options
    });
  }
  /**
   * Get the current project
   */
  current(options) {
    return (options?.client ?? this._client).get({
      url: "/project/current",
      ...options
    });
  }
};
var Pty = class extends _HeyApiClient {
  /**
   * List all PTY sessions
   */
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/pty",
      ...options
    });
  }
  /**
   * Create a new PTY session
   */
  create(options) {
    return (options?.client ?? this._client).post({
      url: "/pty",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Remove a PTY session
   */
  remove(options) {
    return (options.client ?? this._client).delete({
      url: "/pty/{id}",
      ...options
    });
  }
  /**
   * Get PTY session info
   */
  get(options) {
    return (options.client ?? this._client).get({
      url: "/pty/{id}",
      ...options
    });
  }
  /**
   * Update PTY session
   */
  update(options) {
    return (options.client ?? this._client).put({
      url: "/pty/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Connect to a PTY session
   */
  connect(options) {
    return (options.client ?? this._client).get({
      url: "/pty/{id}/connect",
      ...options
    });
  }
};
var Config = class extends _HeyApiClient {
  /**
   * Get config info
   */
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/config",
      ...options
    });
  }
  /**
   * Update config
   */
  update(options) {
    return (options?.client ?? this._client).patch({
      url: "/config",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * List all providers
   */
  providers(options) {
    return (options?.client ?? this._client).get({
      url: "/config/providers",
      ...options
    });
  }
};
var Tool = class extends _HeyApiClient {
  /**
   * List all tool IDs (including built-in and dynamically registered)
   */
  ids(options) {
    return (options?.client ?? this._client).get({
      url: "/experimental/tool/ids",
      ...options
    });
  }
  /**
   * List tools with JSON schema parameters for a provider/model
   */
  list(options) {
    return (options.client ?? this._client).get({
      url: "/experimental/tool",
      ...options
    });
  }
};
var Instance = class extends _HeyApiClient {
  /**
   * Dispose the current instance
   */
  dispose(options) {
    return (options?.client ?? this._client).post({
      url: "/instance/dispose",
      ...options
    });
  }
};
var Path = class extends _HeyApiClient {
  /**
   * Get the current path
   */
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/path",
      ...options
    });
  }
};
var Vcs = class extends _HeyApiClient {
  /**
   * Get VCS info for the current instance
   */
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/vcs",
      ...options
    });
  }
};
var Session = class extends _HeyApiClient {
  /**
   * List all sessions
   */
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/session",
      ...options
    });
  }
  /**
   * Create a new session
   */
  create(options) {
    return (options?.client ?? this._client).post({
      url: "/session",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Get session status
   */
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/session/status",
      ...options
    });
  }
  /**
   * Delete a session and all its data
   */
  delete(options) {
    return (options.client ?? this._client).delete({
      url: "/session/{id}",
      ...options
    });
  }
  /**
   * Get session
   */
  get(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}",
      ...options
    });
  }
  /**
   * Update session properties
   */
  update(options) {
    return (options.client ?? this._client).patch({
      url: "/session/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Get a session's children
   */
  children(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/children",
      ...options
    });
  }
  /**
   * Get the todo list for a session
   */
  todo(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/todo",
      ...options
    });
  }
  /**
   * Analyze the app and create an AGENTS.md file
   */
  init(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/init",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Fork an existing session at a specific message
   */
  fork(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/fork",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Abort a session
   */
  abort(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/abort",
      ...options
    });
  }
  /**
   * Unshare the session
   */
  unshare(options) {
    return (options.client ?? this._client).delete({
      url: "/session/{id}/share",
      ...options
    });
  }
  /**
   * Share a session
   */
  share(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/share",
      ...options
    });
  }
  /**
   * Get the diff for this session
   */
  diff(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/diff",
      ...options
    });
  }
  /**
   * Summarize the session
   */
  summarize(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/summarize",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * List messages for a session
   */
  messages(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/message",
      ...options
    });
  }
  /**
   * Create and send a new message to a session
   */
  prompt(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/message",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Get a message from a session
   */
  message(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/message/{messageID}",
      ...options
    });
  }
  /**
   * Create and send a new message to a session, start if needed and return immediately
   */
  promptAsync(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/prompt_async",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Send a new command to a session
   */
  command(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/command",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Run a shell command
   */
  shell(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/shell",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Revert a message
   */
  revert(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/revert",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Restore all reverted messages
   */
  unrevert(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/unrevert",
      ...options
    });
  }
};
var Command = class extends _HeyApiClient {
  /**
   * List all commands
   */
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/command",
      ...options
    });
  }
};
var Oauth = class extends _HeyApiClient {
  /**
   * Authorize a provider using OAuth
   */
  authorize(options) {
    return (options.client ?? this._client).post({
      url: "/provider/{id}/oauth/authorize",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Handle OAuth callback for a provider
   */
  callback(options) {
    return (options.client ?? this._client).post({
      url: "/provider/{id}/oauth/callback",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
};
var Provider = class extends _HeyApiClient {
  /**
   * List all providers
   */
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/provider",
      ...options
    });
  }
  /**
   * Get provider authentication methods
   */
  auth(options) {
    return (options?.client ?? this._client).get({
      url: "/provider/auth",
      ...options
    });
  }
  oauth = new Oauth({ client: this._client });
};
var Find = class extends _HeyApiClient {
  /**
   * Find text in files
   */
  text(options) {
    return (options.client ?? this._client).get({
      url: "/find",
      ...options
    });
  }
  /**
   * Find files
   */
  files(options) {
    return (options.client ?? this._client).get({
      url: "/find/file",
      ...options
    });
  }
  /**
   * Find workspace symbols
   */
  symbols(options) {
    return (options.client ?? this._client).get({
      url: "/find/symbol",
      ...options
    });
  }
};
var File = class extends _HeyApiClient {
  /**
   * List files and directories
   */
  list(options) {
    return (options.client ?? this._client).get({
      url: "/file",
      ...options
    });
  }
  /**
   * Read a file
   */
  read(options) {
    return (options.client ?? this._client).get({
      url: "/file/content",
      ...options
    });
  }
  /**
   * Get file status
   */
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/file/status",
      ...options
    });
  }
};
var App = class extends _HeyApiClient {
  /**
   * Write a log entry to the server logs
   */
  log(options) {
    return (options?.client ?? this._client).post({
      url: "/log",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * List all agents
   */
  agents(options) {
    return (options?.client ?? this._client).get({
      url: "/agent",
      ...options
    });
  }
};
var Auth = class extends _HeyApiClient {
  /**
   * Remove OAuth credentials for an MCP server
   */
  remove(options) {
    return (options.client ?? this._client).delete({
      url: "/mcp/{name}/auth",
      ...options
    });
  }
  /**
   * Start OAuth authentication flow for an MCP server
   */
  start(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/auth",
      ...options
    });
  }
  /**
   * Complete OAuth authentication with authorization code
   */
  callback(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/auth/callback",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  /**
   * Start OAuth flow and wait for callback (opens browser)
   */
  authenticate(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/auth/authenticate",
      ...options
    });
  }
  /**
   * Set authentication credentials
   */
  set(options) {
    return (options.client ?? this._client).put({
      url: "/auth/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
};
var Mcp = class extends _HeyApiClient {
  /**
   * Get MCP server status
   */
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/mcp",
      ...options
    });
  }
  /**
   * Add MCP server dynamically
   */
  add(options) {
    return (options?.client ?? this._client).post({
      url: "/mcp",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Connect an MCP server
   */
  connect(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/connect",
      ...options
    });
  }
  /**
   * Disconnect an MCP server
   */
  disconnect(options) {
    return (options.client ?? this._client).post({
      url: "/mcp/{name}/disconnect",
      ...options
    });
  }
  auth = new Auth({ client: this._client });
};
var Lsp = class extends _HeyApiClient {
  /**
   * Get LSP server status
   */
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/lsp",
      ...options
    });
  }
};
var Formatter = class extends _HeyApiClient {
  /**
   * Get formatter status
   */
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/formatter",
      ...options
    });
  }
};
var Control = class extends _HeyApiClient {
  /**
   * Get the next TUI request from the queue
   */
  next(options) {
    return (options?.client ?? this._client).get({
      url: "/tui/control/next",
      ...options
    });
  }
  /**
   * Submit a response to the TUI request queue
   */
  response(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/control/response",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
};
var Tui = class extends _HeyApiClient {
  /**
   * Append prompt to the TUI
   */
  appendPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/append-prompt",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Open the help dialog
   */
  openHelp(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-help",
      ...options
    });
  }
  /**
   * Open the session dialog
   */
  openSessions(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-sessions",
      ...options
    });
  }
  /**
   * Open the theme dialog
   */
  openThemes(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-themes",
      ...options
    });
  }
  /**
   * Open the model dialog
   */
  openModels(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-models",
      ...options
    });
  }
  /**
   * Submit the prompt
   */
  submitPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/submit-prompt",
      ...options
    });
  }
  /**
   * Clear the prompt
   */
  clearPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/clear-prompt",
      ...options
    });
  }
  /**
   * Execute a TUI command (e.g. agent_cycle)
   */
  executeCommand(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/execute-command",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Show a toast notification in the TUI
   */
  showToast(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/show-toast",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Publish a TUI event
   */
  publish(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/publish",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  control = new Control({ client: this._client });
};
var Event = class extends _HeyApiClient {
  /**
   * Get events
   */
  subscribe(options) {
    return (options?.client ?? this._client).get.sse({
      url: "/event",
      ...options
    });
  }
};
var OpencodeClient = class extends _HeyApiClient {
  /**
   * Respond to a permission request
   */
  postSessionIdPermissionsPermissionId(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/permissions/{permissionID}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  global = new Global({ client: this._client });
  project = new Project({ client: this._client });
  pty = new Pty({ client: this._client });
  config = new Config({ client: this._client });
  tool = new Tool({ client: this._client });
  instance = new Instance({ client: this._client });
  path = new Path({ client: this._client });
  vcs = new Vcs({ client: this._client });
  session = new Session({ client: this._client });
  command = new Command({ client: this._client });
  provider = new Provider({ client: this._client });
  find = new Find({ client: this._client });
  file = new File({ client: this._client });
  app = new App({ client: this._client });
  mcp = new Mcp({ client: this._client });
  lsp = new Lsp({ client: this._client });
  formatter = new Formatter({ client: this._client });
  tui = new Tui({ client: this._client });
  auth = new Auth({ client: this._client });
  event = new Event({ client: this._client });
};

// node_modules/@opencode-ai/sdk/dist/client.js
function pick(value, fallback) {
  if (!value)
    return;
  if (!fallback)
    return value;
  if (value === fallback)
    return fallback;
  if (value === encodeURIComponent(fallback))
    return fallback;
  return value;
}
function rewrite(request, directory) {
  if (request.method !== "GET" && request.method !== "HEAD")
    return request;
  const value = pick(request.headers.get("x-opencode-directory"), directory);
  if (!value)
    return request;
  const url = new URL(request.url);
  if (!url.searchParams.has("directory")) {
    url.searchParams.set("directory", value);
  }
  const next = new Request(url, request);
  next.headers.delete("x-opencode-directory");
  return next;
}
function createOpencodeClient(config) {
  if (!config?.fetch) {
    const customFetch = (req) => {
      req.timeout = false;
      return fetch(req);
    };
    config = {
      ...config,
      fetch: customFetch
    };
  }
  if (config?.directory) {
    config.headers = {
      ...config.headers,
      "x-opencode-directory": encodeURIComponent(config.directory)
    };
  }
  const client3 = createClient(config);
  client3.interceptors.request.use((request) => rewrite(request, config?.directory));
  return new OpencodeClient({ client: client3 });
}

// node_modules/@opencode-ai/sdk/dist/server.js
var import_cross_spawn = __toESM(require_cross_spawn(), 1);

// node_modules/@opencode-ai/sdk/dist/v2/gen/core/serverSentEvents.gen.js
var createSseClient2 = ({ onRequest, onSseError, onSseEvent, responseTransformer, responseValidator, sseDefaultRetryDelay, sseMaxRetryAttempts, sseMaxRetryDelay, sseSleepFn, url, ...options }) => {
  let lastEventId;
  const sleep = sseSleepFn ?? ((ms) => new Promise((resolve2) => setTimeout(resolve2, ms)));
  const createStream = async function* () {
    let retryDelay = sseDefaultRetryDelay ?? 3e3;
    let attempt = 0;
    const signal = options.signal ?? new AbortController().signal;
    while (true) {
      if (signal.aborted)
        break;
      attempt++;
      const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
      if (lastEventId !== void 0) {
        headers.set("Last-Event-ID", lastEventId);
      }
      try {
        const requestInit = {
          redirect: "follow",
          ...options,
          body: options.serializedBody,
          headers,
          signal
        };
        let request = new Request(url, requestInit);
        if (onRequest) {
          request = await onRequest(url, requestInit);
        }
        const _fetch = options.fetch ?? globalThis.fetch;
        const response = await _fetch(request);
        if (!response.ok)
          throw new Error(`SSE failed: ${response.status} ${response.statusText}`);
        if (!response.body)
          throw new Error("No body in SSE response");
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        const abortHandler = () => {
          try {
            reader.cancel();
          } catch {
          }
        };
        signal.addEventListener("abort", abortHandler);
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            buffer += value;
            buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() ?? "";
            for (const chunk of chunks) {
              const lines = chunk.split("\n");
              const dataLines = [];
              let eventName;
              for (const line of lines) {
                if (line.startsWith("data:")) {
                  dataLines.push(line.replace(/^data:\s*/, ""));
                } else if (line.startsWith("event:")) {
                  eventName = line.replace(/^event:\s*/, "");
                } else if (line.startsWith("id:")) {
                  lastEventId = line.replace(/^id:\s*/, "");
                } else if (line.startsWith("retry:")) {
                  const parsed = Number.parseInt(line.replace(/^retry:\s*/, ""), 10);
                  if (!Number.isNaN(parsed)) {
                    retryDelay = parsed;
                  }
                }
              }
              let data;
              let parsedJson = false;
              if (dataLines.length) {
                const rawData = dataLines.join("\n");
                try {
                  data = JSON.parse(rawData);
                  parsedJson = true;
                } catch {
                  data = rawData;
                }
              }
              if (parsedJson) {
                if (responseValidator) {
                  await responseValidator(data);
                }
                if (responseTransformer) {
                  data = await responseTransformer(data);
                }
              }
              onSseEvent?.({
                data,
                event: eventName,
                id: lastEventId,
                retry: retryDelay
              });
              if (dataLines.length) {
                yield data;
              }
            }
          }
        } finally {
          signal.removeEventListener("abort", abortHandler);
          reader.releaseLock();
        }
        break;
      } catch (error) {
        onSseError?.(error);
        if (sseMaxRetryAttempts !== void 0 && attempt >= sseMaxRetryAttempts) {
          break;
        }
        const backoff = Math.min(retryDelay * 2 ** (attempt - 1), sseMaxRetryDelay ?? 3e4);
        await sleep(backoff);
      }
    }
  };
  const stream = createStream();
  return { stream };
};

// node_modules/@opencode-ai/sdk/dist/v2/gen/core/pathSerializer.gen.js
var separatorArrayExplode2 = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var separatorArrayNoExplode2 = (style) => {
  switch (style) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
};
var separatorObjectExplode2 = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var serializeArrayParam2 = ({ allowReserved, explode, name, style, value }) => {
  if (!explode) {
    const joinedValues2 = (allowReserved ? value : value.map((v) => encodeURIComponent(v))).join(separatorArrayNoExplode2(style));
    switch (style) {
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      case "simple":
        return joinedValues2;
      default:
        return `${name}=${joinedValues2}`;
    }
  }
  const separator = separatorArrayExplode2(style);
  const joinedValues = value.map((v) => {
    if (style === "label" || style === "simple") {
      return allowReserved ? v : encodeURIComponent(v);
    }
    return serializePrimitiveParam2({
      allowReserved,
      name,
      value: v
    });
  }).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};
var serializePrimitiveParam2 = ({ allowReserved, name, value }) => {
  if (value === void 0 || value === null) {
    return "";
  }
  if (typeof value === "object") {
    throw new Error("Deeply-nested arrays/objects aren\u2019t supported. Provide your own `querySerializer()` to handle these.");
  }
  return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
};
var serializeObjectParam2 = ({ allowReserved, explode, name, style, value, valueOnly }) => {
  if (value instanceof Date) {
    return valueOnly ? value.toISOString() : `${name}=${value.toISOString()}`;
  }
  if (style !== "deepObject" && !explode) {
    let values = [];
    Object.entries(value).forEach(([key, v]) => {
      values = [...values, key, allowReserved ? v : encodeURIComponent(v)];
    });
    const joinedValues2 = values.join(",");
    switch (style) {
      case "form":
        return `${name}=${joinedValues2}`;
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      default:
        return joinedValues2;
    }
  }
  const separator = separatorObjectExplode2(style);
  const joinedValues = Object.entries(value).map(([key, v]) => serializePrimitiveParam2({
    allowReserved,
    name: style === "deepObject" ? `${name}[${key}]` : key,
    value: v
  })).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};

// node_modules/@opencode-ai/sdk/dist/v2/gen/core/utils.gen.js
var PATH_PARAM_RE2 = /\{[^{}]+\}/g;
var defaultPathSerializer2 = ({ path: path3, url: _url }) => {
  let url = _url;
  const matches = _url.match(PATH_PARAM_RE2);
  if (matches) {
    for (const match of matches) {
      let explode = false;
      let name = match.substring(1, match.length - 1);
      let style = "simple";
      if (name.endsWith("*")) {
        explode = true;
        name = name.substring(0, name.length - 1);
      }
      if (name.startsWith(".")) {
        name = name.substring(1);
        style = "label";
      } else if (name.startsWith(";")) {
        name = name.substring(1);
        style = "matrix";
      }
      const value = path3[name];
      if (value === void 0 || value === null) {
        continue;
      }
      if (Array.isArray(value)) {
        url = url.replace(match, serializeArrayParam2({ explode, name, style, value }));
        continue;
      }
      if (typeof value === "object") {
        url = url.replace(match, serializeObjectParam2({
          explode,
          name,
          style,
          value,
          valueOnly: true
        }));
        continue;
      }
      if (style === "matrix") {
        url = url.replace(match, `;${serializePrimitiveParam2({
          name,
          value
        })}`);
        continue;
      }
      const replaceValue = encodeURIComponent(style === "label" ? `.${value}` : value);
      url = url.replace(match, replaceValue);
    }
  }
  return url;
};
var getUrl2 = ({ baseUrl, path: path3, query, querySerializer, url: _url }) => {
  const pathUrl = _url.startsWith("/") ? _url : `/${_url}`;
  let url = (baseUrl ?? "") + pathUrl;
  if (path3) {
    url = defaultPathSerializer2({ path: path3, url });
  }
  let search = query ? querySerializer(query) : "";
  if (search.startsWith("?")) {
    search = search.substring(1);
  }
  if (search) {
    url += `?${search}`;
  }
  return url;
};
function getValidRequestBody(options) {
  const hasBody = options.body !== void 0;
  const isSerializedBody = hasBody && options.bodySerializer;
  if (isSerializedBody) {
    if ("serializedBody" in options) {
      const hasSerializedBody = options.serializedBody !== void 0 && options.serializedBody !== "";
      return hasSerializedBody ? options.serializedBody : null;
    }
    return options.body !== "" ? options.body : null;
  }
  if (hasBody) {
    return options.body;
  }
  return void 0;
}

// node_modules/@opencode-ai/sdk/dist/v2/gen/core/auth.gen.js
var getAuthToken2 = async (auth, callback) => {
  const token = typeof callback === "function" ? await callback(auth) : callback;
  if (!token) {
    return;
  }
  if (auth.scheme === "bearer") {
    return `Bearer ${token}`;
  }
  if (auth.scheme === "basic") {
    return `Basic ${btoa(token)}`;
  }
  return token;
};

// node_modules/@opencode-ai/sdk/dist/v2/gen/core/bodySerializer.gen.js
var jsonBodySerializer2 = {
  bodySerializer: (body) => JSON.stringify(body, (_key, value) => typeof value === "bigint" ? value.toString() : value)
};

// node_modules/@opencode-ai/sdk/dist/v2/gen/client/utils.gen.js
var createQuerySerializer2 = ({ parameters = {}, ...args } = {}) => {
  const querySerializer = (queryParams) => {
    const search = [];
    if (queryParams && typeof queryParams === "object") {
      for (const name in queryParams) {
        const value = queryParams[name];
        if (value === void 0 || value === null) {
          continue;
        }
        const options = parameters[name] || args;
        if (Array.isArray(value)) {
          const serializedArray = serializeArrayParam2({
            allowReserved: options.allowReserved,
            explode: true,
            name,
            style: "form",
            value,
            ...options.array
          });
          if (serializedArray)
            search.push(serializedArray);
        } else if (typeof value === "object") {
          const serializedObject = serializeObjectParam2({
            allowReserved: options.allowReserved,
            explode: true,
            name,
            style: "deepObject",
            value,
            ...options.object
          });
          if (serializedObject)
            search.push(serializedObject);
        } else {
          const serializedPrimitive = serializePrimitiveParam2({
            allowReserved: options.allowReserved,
            name,
            value
          });
          if (serializedPrimitive)
            search.push(serializedPrimitive);
        }
      }
    }
    return search.join("&");
  };
  return querySerializer;
};
var getParseAs2 = (contentType) => {
  if (!contentType) {
    return "stream";
  }
  const cleanContent = contentType.split(";")[0]?.trim();
  if (!cleanContent) {
    return;
  }
  if (cleanContent.startsWith("application/json") || cleanContent.endsWith("+json")) {
    return "json";
  }
  if (cleanContent === "multipart/form-data") {
    return "formData";
  }
  if (["application/", "audio/", "image/", "video/"].some((type) => cleanContent.startsWith(type))) {
    return "blob";
  }
  if (cleanContent.startsWith("text/")) {
    return "text";
  }
  return;
};
var checkForExistence2 = (options, name) => {
  if (!name) {
    return false;
  }
  if (options.headers.has(name) || options.query?.[name] || options.headers.get("Cookie")?.includes(`${name}=`)) {
    return true;
  }
  return false;
};
var setAuthParams2 = async ({ security, ...options }) => {
  for (const auth of security) {
    if (checkForExistence2(options, auth.name)) {
      continue;
    }
    const token = await getAuthToken2(auth, options.auth);
    if (!token) {
      continue;
    }
    const name = auth.name ?? "Authorization";
    switch (auth.in) {
      case "query":
        if (!options.query) {
          options.query = {};
        }
        options.query[name] = token;
        break;
      case "cookie":
        options.headers.append("Cookie", `${name}=${token}`);
        break;
      case "header":
      default:
        options.headers.set(name, token);
        break;
    }
  }
};
var buildUrl2 = (options) => getUrl2({
  baseUrl: options.baseUrl,
  path: options.path,
  query: options.query,
  querySerializer: typeof options.querySerializer === "function" ? options.querySerializer : createQuerySerializer2(options.querySerializer),
  url: options.url
});
var mergeConfigs2 = (a, b) => {
  const config = { ...a, ...b };
  if (config.baseUrl?.endsWith("/")) {
    config.baseUrl = config.baseUrl.substring(0, config.baseUrl.length - 1);
  }
  config.headers = mergeHeaders2(a.headers, b.headers);
  return config;
};
var headersEntries = (headers) => {
  const entries = [];
  headers.forEach((value, key) => {
    entries.push([key, value]);
  });
  return entries;
};
var mergeHeaders2 = (...headers) => {
  const mergedHeaders = new Headers();
  for (const header of headers) {
    if (!header) {
      continue;
    }
    const iterator = header instanceof Headers ? headersEntries(header) : Object.entries(header);
    for (const [key, value] of iterator) {
      if (value === null) {
        mergedHeaders.delete(key);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          mergedHeaders.append(key, v);
        }
      } else if (value !== void 0) {
        mergedHeaders.set(key, typeof value === "object" ? JSON.stringify(value) : value);
      }
    }
  }
  return mergedHeaders;
};
var Interceptors2 = class {
  fns = [];
  clear() {
    this.fns = [];
  }
  eject(id) {
    const index = this.getInterceptorIndex(id);
    if (this.fns[index]) {
      this.fns[index] = null;
    }
  }
  exists(id) {
    const index = this.getInterceptorIndex(id);
    return Boolean(this.fns[index]);
  }
  getInterceptorIndex(id) {
    if (typeof id === "number") {
      return this.fns[id] ? id : -1;
    }
    return this.fns.indexOf(id);
  }
  update(id, fn) {
    const index = this.getInterceptorIndex(id);
    if (this.fns[index]) {
      this.fns[index] = fn;
      return id;
    }
    return false;
  }
  use(fn) {
    this.fns.push(fn);
    return this.fns.length - 1;
  }
};
var createInterceptors2 = () => ({
  error: new Interceptors2(),
  request: new Interceptors2(),
  response: new Interceptors2()
});
var defaultQuerySerializer2 = createQuerySerializer2({
  allowReserved: false,
  array: {
    explode: true,
    style: "form"
  },
  object: {
    explode: true,
    style: "deepObject"
  }
});
var defaultHeaders2 = {
  "Content-Type": "application/json"
};
var createConfig2 = (override = {}) => ({
  ...jsonBodySerializer2,
  headers: defaultHeaders2,
  parseAs: "auto",
  querySerializer: defaultQuerySerializer2,
  ...override
});

// node_modules/@opencode-ai/sdk/dist/v2/gen/client/client.gen.js
var createClient2 = (config = {}) => {
  let _config = mergeConfigs2(createConfig2(), config);
  const getConfig = () => ({ ..._config });
  const setConfig = (config2) => {
    _config = mergeConfigs2(_config, config2);
    return getConfig();
  };
  const interceptors = createInterceptors2();
  const beforeRequest = async (options) => {
    const opts = {
      ..._config,
      ...options,
      fetch: options.fetch ?? _config.fetch ?? globalThis.fetch,
      headers: mergeHeaders2(_config.headers, options.headers),
      serializedBody: void 0
    };
    if (opts.security) {
      await setAuthParams2({
        ...opts,
        security: opts.security
      });
    }
    if (opts.requestValidator) {
      await opts.requestValidator(opts);
    }
    if (opts.body !== void 0 && opts.bodySerializer) {
      opts.serializedBody = opts.bodySerializer(opts.body);
    }
    if (opts.body === void 0 || opts.serializedBody === "") {
      opts.headers.delete("Content-Type");
    }
    const url = buildUrl2(opts);
    return { opts, url };
  };
  const request = async (options) => {
    const { opts, url } = await beforeRequest(options);
    const requestInit = {
      redirect: "follow",
      ...opts,
      body: getValidRequestBody(opts)
    };
    let request2 = new Request(url, requestInit);
    for (const fn of interceptors.request.fns) {
      if (fn) {
        request2 = await fn(request2, opts);
      }
    }
    const _fetch = opts.fetch;
    let response;
    try {
      response = await _fetch(request2);
    } catch (error2) {
      let finalError2 = error2;
      for (const fn of interceptors.error.fns) {
        if (fn) {
          finalError2 = await fn(error2, void 0, request2, opts);
        }
      }
      finalError2 = finalError2 || {};
      if (opts.throwOnError) {
        throw finalError2;
      }
      return opts.responseStyle === "data" ? void 0 : {
        error: finalError2,
        request: request2,
        response: void 0
      };
    }
    for (const fn of interceptors.response.fns) {
      if (fn) {
        response = await fn(response, request2, opts);
      }
    }
    const result = {
      request: request2,
      response
    };
    if (response.ok) {
      const parseAs = (opts.parseAs === "auto" ? getParseAs2(response.headers.get("Content-Type")) : opts.parseAs) ?? "json";
      if (response.status === 204 || response.headers.get("Content-Length") === "0") {
        let emptyData;
        switch (parseAs) {
          case "arrayBuffer":
          case "blob":
          case "text":
            emptyData = await response[parseAs]();
            break;
          case "formData":
            emptyData = new FormData();
            break;
          case "stream":
            emptyData = response.body;
            break;
          case "json":
          default:
            emptyData = {};
            break;
        }
        return opts.responseStyle === "data" ? emptyData : {
          data: emptyData,
          ...result
        };
      }
      let data;
      switch (parseAs) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "text":
          data = await response[parseAs]();
          break;
        case "json": {
          const text = await response.text();
          data = text ? JSON.parse(text) : {};
          break;
        }
        case "stream":
          return opts.responseStyle === "data" ? response.body : {
            data: response.body,
            ...result
          };
      }
      if (parseAs === "json") {
        if (opts.responseValidator) {
          await opts.responseValidator(data);
        }
        if (opts.responseTransformer) {
          data = await opts.responseTransformer(data);
        }
      }
      return opts.responseStyle === "data" ? data : {
        data,
        ...result
      };
    }
    const textError = await response.text();
    let jsonError;
    try {
      jsonError = JSON.parse(textError);
    } catch {
    }
    const error = jsonError ?? textError;
    let finalError = error;
    for (const fn of interceptors.error.fns) {
      if (fn) {
        finalError = await fn(error, response, request2, opts);
      }
    }
    finalError = finalError || {};
    if (opts.throwOnError) {
      throw finalError;
    }
    return opts.responseStyle === "data" ? void 0 : {
      error: finalError,
      ...result
    };
  };
  const makeMethodFn = (method) => (options) => request({ ...options, method });
  const makeSseFn = (method) => async (options) => {
    const { opts, url } = await beforeRequest(options);
    return createSseClient2({
      ...opts,
      body: opts.body,
      headers: opts.headers,
      method,
      onRequest: async (url2, init) => {
        let request2 = new Request(url2, init);
        for (const fn of interceptors.request.fns) {
          if (fn) {
            request2 = await fn(request2, opts);
          }
        }
        return request2;
      },
      serializedBody: getValidRequestBody(opts),
      url
    });
  };
  return {
    buildUrl: buildUrl2,
    connect: makeMethodFn("CONNECT"),
    delete: makeMethodFn("DELETE"),
    get: makeMethodFn("GET"),
    getConfig,
    head: makeMethodFn("HEAD"),
    interceptors,
    options: makeMethodFn("OPTIONS"),
    patch: makeMethodFn("PATCH"),
    post: makeMethodFn("POST"),
    put: makeMethodFn("PUT"),
    request,
    setConfig,
    sse: {
      connect: makeSseFn("CONNECT"),
      delete: makeSseFn("DELETE"),
      get: makeSseFn("GET"),
      head: makeSseFn("HEAD"),
      options: makeSseFn("OPTIONS"),
      patch: makeSseFn("PATCH"),
      post: makeSseFn("POST"),
      put: makeSseFn("PUT"),
      trace: makeSseFn("TRACE")
    },
    trace: makeMethodFn("TRACE")
  };
};

// node_modules/@opencode-ai/sdk/dist/v2/gen/core/params.gen.js
var extraPrefixesMap2 = {
  $body_: "body",
  $headers_: "headers",
  $path_: "path",
  $query_: "query"
};
var extraPrefixes2 = Object.entries(extraPrefixesMap2);
var buildKeyMap = (fields, map) => {
  if (!map) {
    map = /* @__PURE__ */ new Map();
  }
  for (const config of fields) {
    if ("in" in config) {
      if (config.key) {
        map.set(config.key, {
          in: config.in,
          map: config.map
        });
      }
    } else if ("key" in config) {
      map.set(config.key, {
        map: config.map
      });
    } else if (config.args) {
      buildKeyMap(config.args, map);
    }
  }
  return map;
};
var stripEmptySlots = (params) => {
  for (const [slot, value] of Object.entries(params)) {
    if (value && typeof value === "object" && !Object.keys(value).length) {
      delete params[slot];
    }
  }
};
var buildClientParams2 = (args, fields) => {
  const params = {
    body: {},
    headers: {},
    path: {},
    query: {}
  };
  const map = buildKeyMap(fields);
  let config;
  for (const [index, arg] of args.entries()) {
    if (fields[index]) {
      config = fields[index];
    }
    if (!config) {
      continue;
    }
    if ("in" in config) {
      if (config.key) {
        const field = map.get(config.key);
        const name = field.map || config.key;
        if (field.in) {
          ;
          params[field.in][name] = arg;
        }
      } else {
        params.body = arg;
      }
    } else {
      for (const [key, value] of Object.entries(arg ?? {})) {
        const field = map.get(key);
        if (field) {
          if (field.in) {
            const name = field.map || key;
            params[field.in][name] = value;
          } else {
            params[field.map] = value;
          }
        } else {
          const extra = extraPrefixes2.find(([prefix]) => key.startsWith(prefix));
          if (extra) {
            const [prefix, slot] = extra;
            params[slot][key.slice(prefix.length)] = value;
          } else if ("allowExtra" in config && config.allowExtra) {
            for (const [slot, allowed] of Object.entries(config.allowExtra)) {
              if (allowed) {
                ;
                params[slot][key] = value;
                break;
              }
            }
          }
        }
      }
    }
  }
  stripEmptySlots(params);
  return params;
};

// node_modules/@opencode-ai/sdk/dist/v2/gen/client.gen.js
var client2 = createClient2(createConfig2({ baseUrl: "http://localhost:4096" }));

// node_modules/@opencode-ai/sdk/dist/v2/gen/sdk.gen.js
var HeyApiClient = class {
  client;
  constructor(args) {
    this.client = args?.client ?? client2;
  }
};
var HeyApiRegistry = class {
  defaultKey = "default";
  instances = /* @__PURE__ */ new Map();
  get(key) {
    const instance = this.instances.get(key ?? this.defaultKey);
    if (!instance) {
      throw new Error(`No SDK client found. Create one with "new OpencodeClient()" to fix this error.`);
    }
    return instance;
  }
  set(value, key) {
    this.instances.set(key ?? this.defaultKey, value);
  }
};
var SyncEvent = class extends HeyApiClient {
  /**
   * Subscribe to global sync events
   *
   * Get global sync events
   */
  subscribe(options) {
    return (options?.client ?? this.client).sse.get({
      url: "/global/sync-event",
      ...options
    });
  }
};
var Config2 = class extends HeyApiClient {
  /**
   * Get global configuration
   *
   * Retrieve the current global OpenCode configuration settings and preferences.
   */
  get(options) {
    return (options?.client ?? this.client).get({
      url: "/global/config",
      ...options
    });
  }
  /**
   * Update global configuration
   *
   * Update global OpenCode configuration settings and preferences.
   */
  update(parameters, options) {
    const params = buildClientParams2([parameters], [{ args: [{ key: "config", map: "body" }] }]);
    return (options?.client ?? this.client).patch({
      url: "/global/config",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
};
var Global2 = class extends HeyApiClient {
  /**
   * Get health
   *
   * Get health information about the OpenCode server.
   */
  health(options) {
    return (options?.client ?? this.client).get({
      url: "/global/health",
      ...options
    });
  }
  /**
   * Get global events
   *
   * Subscribe to global events from the OpenCode system using server-sent events.
   */
  event(options) {
    return (options?.client ?? this.client).sse.get({
      url: "/global/event",
      ...options
    });
  }
  /**
   * Dispose instance
   *
   * Clean up and dispose all OpenCode instances, releasing all resources.
   */
  dispose(options) {
    return (options?.client ?? this.client).post({
      url: "/global/dispose",
      ...options
    });
  }
  /**
   * Upgrade opencode
   *
   * Upgrade opencode to the specified version or latest if not specified.
   */
  upgrade(parameters, options) {
    const params = buildClientParams2([parameters], [{ args: [{ in: "body", key: "target" }] }]);
    return (options?.client ?? this.client).post({
      url: "/global/upgrade",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  _syncEvent;
  get syncEvent() {
    return this._syncEvent ??= new SyncEvent({ client: this.client });
  }
  _config;
  get config() {
    return this._config ??= new Config2({ client: this.client });
  }
};
var Auth2 = class extends HeyApiClient {
  /**
   * Remove auth credentials
   *
   * Remove authentication credentials
   */
  remove(parameters, options) {
    const params = buildClientParams2([parameters], [{ args: [{ in: "path", key: "providerID" }] }]);
    return (options?.client ?? this.client).delete({
      url: "/auth/{providerID}",
      ...options,
      ...params
    });
  }
  /**
   * Set auth credentials
   *
   * Set authentication credentials
   */
  set(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "providerID" },
          { key: "auth", map: "body" }
        ]
      }
    ]);
    return (options?.client ?? this.client).put({
      url: "/auth/{providerID}",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
};
var App2 = class extends HeyApiClient {
  /**
   * Write log
   *
   * Write a log entry to the server logs with specified level and metadata.
   */
  log(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "service" },
          { in: "body", key: "level" },
          { in: "body", key: "message" },
          { in: "body", key: "extra" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/log",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * List agents
   *
   * Get a list of all available AI agents in the OpenCode system.
   */
  agents(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/agent",
      ...options,
      ...params
    });
  }
  /**
   * List skills
   *
   * Get a list of all available skills in the OpenCode system.
   */
  skills(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/skill",
      ...options,
      ...params
    });
  }
};
var Project2 = class extends HeyApiClient {
  /**
   * List all projects
   *
   * Get a list of projects that have been opened with OpenCode.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/project",
      ...options,
      ...params
    });
  }
  /**
   * Get current project
   *
   * Retrieve the currently active project that OpenCode is working with.
   */
  current(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/project/current",
      ...options,
      ...params
    });
  }
  /**
   * Initialize git repository
   *
   * Create a git repository for the current project and return the refreshed project info.
   */
  initGit(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/project/git/init",
      ...options,
      ...params
    });
  }
  /**
   * Update project
   *
   * Update project properties such as name, icon, and commands.
   */
  update(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "projectID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "name" },
          { in: "body", key: "icon" },
          { in: "body", key: "commands" }
        ]
      }
    ]);
    return (options?.client ?? this.client).patch({
      url: "/project/{projectID}",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
};
var Pty2 = class extends HeyApiClient {
  /**
   * List PTY sessions
   *
   * Get a list of all active pseudo-terminal (PTY) sessions managed by OpenCode.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/pty",
      ...options,
      ...params
    });
  }
  /**
   * Create PTY session
   *
   * Create a new pseudo-terminal (PTY) session for running shell commands and processes.
   */
  create(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "command" },
          { in: "body", key: "args" },
          { in: "body", key: "cwd" },
          { in: "body", key: "title" },
          { in: "body", key: "env" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/pty",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Remove PTY session
   *
   * Remove and terminate a specific pseudo-terminal (PTY) session.
   */
  remove(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "ptyID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).delete({
      url: "/pty/{ptyID}",
      ...options,
      ...params
    });
  }
  /**
   * Get PTY session
   *
   * Retrieve detailed information about a specific pseudo-terminal (PTY) session.
   */
  get(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "ptyID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/pty/{ptyID}",
      ...options,
      ...params
    });
  }
  /**
   * Update PTY session
   *
   * Update properties of an existing pseudo-terminal (PTY) session.
   */
  update(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "ptyID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "title" },
          { in: "body", key: "size" }
        ]
      }
    ]);
    return (options?.client ?? this.client).put({
      url: "/pty/{ptyID}",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Connect to PTY session
   *
   * Establish a WebSocket connection to interact with a pseudo-terminal (PTY) session in real-time.
   */
  connect(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "ptyID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/pty/{ptyID}/connect",
      ...options,
      ...params
    });
  }
};
var Config22 = class extends HeyApiClient {
  /**
   * Get configuration
   *
   * Retrieve the current OpenCode configuration settings and preferences.
   */
  get(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/config",
      ...options,
      ...params
    });
  }
  /**
   * Update configuration
   *
   * Update OpenCode configuration settings and preferences.
   */
  update(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { key: "config", map: "body" }
        ]
      }
    ]);
    return (options?.client ?? this.client).patch({
      url: "/config",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * List config providers
   *
   * Get a list of all configured AI providers and their default models.
   */
  providers(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/config/providers",
      ...options,
      ...params
    });
  }
};
var Console = class extends HeyApiClient {
  /**
   * Get active Console provider metadata
   *
   * Get the active Console org name and the set of provider IDs managed by that Console org.
   */
  get(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/experimental/console",
      ...options,
      ...params
    });
  }
  /**
   * List switchable Console orgs
   *
   * Get the available Console orgs across logged-in accounts, including the current active org.
   */
  listOrgs(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/experimental/console/orgs",
      ...options,
      ...params
    });
  }
  /**
   * Switch active Console org
   *
   * Persist a new active Console account/org selection for the current local OpenCode state.
   */
  switchOrg(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "accountID" },
          { in: "body", key: "orgID" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/experimental/console/switch",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
};
var Workspace = class extends HeyApiClient {
  /**
   * List workspaces
   *
   * List all workspaces.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/experimental/workspace",
      ...options,
      ...params
    });
  }
  /**
   * Create workspace
   *
   * Create a workspace for the current project.
   */
  create(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "id" },
          { in: "body", key: "type" },
          { in: "body", key: "branch" },
          { in: "body", key: "extra" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/experimental/workspace",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Remove workspace
   *
   * Remove an existing workspace.
   */
  remove(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "id" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).delete({
      url: "/experimental/workspace/{id}",
      ...options,
      ...params
    });
  }
};
var Session2 = class extends HeyApiClient {
  /**
   * List sessions
   *
   * Get a list of all OpenCode sessions across projects, sorted by most recently updated. Archived sessions are excluded by default.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "roots" },
          { in: "query", key: "start" },
          { in: "query", key: "cursor" },
          { in: "query", key: "search" },
          { in: "query", key: "limit" },
          { in: "query", key: "archived" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/experimental/session",
      ...options,
      ...params
    });
  }
};
var Resource = class extends HeyApiClient {
  /**
   * Get MCP resources
   *
   * Get all available MCP resources from connected servers. Optionally filter by name.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/experimental/resource",
      ...options,
      ...params
    });
  }
};
var Experimental = class extends HeyApiClient {
  _console;
  get console() {
    return this._console ??= new Console({ client: this.client });
  }
  _workspace;
  get workspace() {
    return this._workspace ??= new Workspace({ client: this.client });
  }
  _session;
  get session() {
    return this._session ??= new Session2({ client: this.client });
  }
  _resource;
  get resource() {
    return this._resource ??= new Resource({ client: this.client });
  }
};
var Tool2 = class extends HeyApiClient {
  /**
   * List tool IDs
   *
   * Get a list of all available tool IDs, including both built-in tools and dynamically registered tools.
   */
  ids(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/experimental/tool/ids",
      ...options,
      ...params
    });
  }
  /**
   * List tools
   *
   * Get a list of available tools with their JSON schema parameters for a specific provider and model combination.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "provider" },
          { in: "query", key: "model" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/experimental/tool",
      ...options,
      ...params
    });
  }
};
var Worktree = class extends HeyApiClient {
  /**
   * Remove worktree
   *
   * Remove a git worktree and delete its branch.
   */
  remove(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { key: "worktreeRemoveInput", map: "body" }
        ]
      }
    ]);
    return (options?.client ?? this.client).delete({
      url: "/experimental/worktree",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * List worktrees
   *
   * List all sandbox worktrees for the current project.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/experimental/worktree",
      ...options,
      ...params
    });
  }
  /**
   * Create worktree
   *
   * Create a new git worktree for the current project and run any configured startup scripts.
   */
  create(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { key: "worktreeCreateInput", map: "body" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/experimental/worktree",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Reset worktree
   *
   * Reset a worktree branch to the primary default branch.
   */
  reset(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { key: "worktreeResetInput", map: "body" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/experimental/worktree/reset",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
};
var Session22 = class extends HeyApiClient {
  /**
   * List sessions
   *
   * Get a list of all OpenCode sessions, sorted by most recently updated.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "roots" },
          { in: "query", key: "start" },
          { in: "query", key: "search" },
          { in: "query", key: "limit" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/session",
      ...options,
      ...params
    });
  }
  /**
   * Create session
   *
   * Create a new OpenCode session for interacting with AI assistants and managing conversations.
   */
  create(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "parentID" },
          { in: "body", key: "title" },
          { in: "body", key: "permission" },
          { in: "body", key: "workspaceID" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Get session status
   *
   * Retrieve the current status of all sessions, including active, idle, and completed states.
   */
  status(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/session/status",
      ...options,
      ...params
    });
  }
  /**
   * Delete session
   *
   * Delete a session and permanently remove all associated data, including messages and history.
   */
  delete(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).delete({
      url: "/session/{sessionID}",
      ...options,
      ...params
    });
  }
  /**
   * Get session
   *
   * Retrieve detailed information about a specific OpenCode session.
   */
  get(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/session/{sessionID}",
      ...options,
      ...params
    });
  }
  /**
   * Update session
   *
   * Update properties of an existing session, such as title or other metadata.
   */
  update(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "title" },
          { in: "body", key: "time" }
        ]
      }
    ]);
    return (options?.client ?? this.client).patch({
      url: "/session/{sessionID}",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Get session children
   *
   * Retrieve all child sessions that were forked from the specified parent session.
   */
  children(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/session/{sessionID}/children",
      ...options,
      ...params
    });
  }
  /**
   * Get session todos
   *
   * Retrieve the todo list associated with a specific session, showing tasks and action items.
   */
  todo(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/session/{sessionID}/todo",
      ...options,
      ...params
    });
  }
  /**
   * Initialize session
   *
   * Analyze the current application and create an AGENTS.md file with project-specific agent configurations.
   */
  init(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "modelID" },
          { in: "body", key: "providerID" },
          { in: "body", key: "messageID" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/init",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Fork session
   *
   * Create a new session by forking an existing session at a specific message point.
   */
  fork(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "messageID" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/fork",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Abort session
   *
   * Abort an active session and stop any ongoing AI processing or command execution.
   */
  abort(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/abort",
      ...options,
      ...params
    });
  }
  /**
   * Unshare session
   *
   * Remove the shareable link for a session, making it private again.
   */
  unshare(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).delete({
      url: "/session/{sessionID}/share",
      ...options,
      ...params
    });
  }
  /**
   * Share session
   *
   * Create a shareable link for a session, allowing others to view the conversation.
   */
  share(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/share",
      ...options,
      ...params
    });
  }
  /**
   * Get message diff
   *
   * Get the file changes (diff) that resulted from a specific user message in the session.
   */
  diff(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "messageID" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/session/{sessionID}/diff",
      ...options,
      ...params
    });
  }
  /**
   * Summarize session
   *
   * Generate a concise summary of the session using AI compaction to preserve key information.
   */
  summarize(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "providerID" },
          { in: "body", key: "modelID" },
          { in: "body", key: "auto" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/summarize",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Get session messages
   *
   * Retrieve all messages in a session, including user prompts and AI responses.
   */
  messages(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "limit" },
          { in: "query", key: "before" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/session/{sessionID}/message",
      ...options,
      ...params
    });
  }
  /**
   * Send message
   *
   * Create and send a new message to a session, streaming the AI response.
   */
  prompt(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "messageID" },
          { in: "body", key: "model" },
          { in: "body", key: "agent" },
          { in: "body", key: "noReply" },
          { in: "body", key: "tools" },
          { in: "body", key: "format" },
          { in: "body", key: "system" },
          { in: "body", key: "variant" },
          { in: "body", key: "parts" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/message",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Delete message
   *
   * Permanently delete a specific message (and all of its parts) from a session. This does not revert any file changes that may have been made while processing the message.
   */
  deleteMessage(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "path", key: "messageID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).delete({
      url: "/session/{sessionID}/message/{messageID}",
      ...options,
      ...params
    });
  }
  /**
   * Get message
   *
   * Retrieve a specific message from a session by its message ID.
   */
  message(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "path", key: "messageID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/session/{sessionID}/message/{messageID}",
      ...options,
      ...params
    });
  }
  /**
   * Send async message
   *
   * Create and send a new message to a session asynchronously, starting the session if needed and returning immediately.
   */
  promptAsync(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "messageID" },
          { in: "body", key: "model" },
          { in: "body", key: "agent" },
          { in: "body", key: "noReply" },
          { in: "body", key: "tools" },
          { in: "body", key: "format" },
          { in: "body", key: "system" },
          { in: "body", key: "variant" },
          { in: "body", key: "parts" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/prompt_async",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Send command
   *
   * Send a new command to a session for execution by the AI assistant.
   */
  command(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "messageID" },
          { in: "body", key: "agent" },
          { in: "body", key: "model" },
          { in: "body", key: "arguments" },
          { in: "body", key: "command" },
          { in: "body", key: "variant" },
          { in: "body", key: "parts" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/command",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Run shell command
   *
   * Execute a shell command within the session context and return the AI's response.
   */
  shell(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "messageID" },
          { in: "body", key: "agent" },
          { in: "body", key: "model" },
          { in: "body", key: "command" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/shell",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Revert message
   *
   * Revert a specific message in a session, undoing its effects and restoring the previous state.
   */
  revert(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "messageID" },
          { in: "body", key: "partID" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/revert",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Restore reverted messages
   *
   * Restore all previously reverted messages in a session.
   */
  unrevert(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/unrevert",
      ...options,
      ...params
    });
  }
};
var Part = class extends HeyApiClient {
  /**
   * Delete a part from a message
   */
  delete(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "path", key: "messageID" },
          { in: "path", key: "partID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).delete({
      url: "/session/{sessionID}/message/{messageID}/part/{partID}",
      ...options,
      ...params
    });
  }
  /**
   * Update a part in a message
   */
  update(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "path", key: "messageID" },
          { in: "path", key: "partID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { key: "part", map: "body" }
        ]
      }
    ]);
    return (options?.client ?? this.client).patch({
      url: "/session/{sessionID}/message/{messageID}/part/{partID}",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
};
var Permission = class extends HeyApiClient {
  /**
   * Respond to permission
   *
   * Approve or deny a permission request from the AI assistant.
   *
   * @deprecated
   */
  respond(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "sessionID" },
          { in: "path", key: "permissionID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "response" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/session/{sessionID}/permissions/{permissionID}",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Respond to permission request
   *
   * Approve or deny a permission request from the AI assistant.
   */
  reply(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "requestID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "reply" },
          { in: "body", key: "message" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/permission/{requestID}/reply",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * List pending permissions
   *
   * Get all pending permission requests across all sessions.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/permission",
      ...options,
      ...params
    });
  }
};
var Question = class extends HeyApiClient {
  /**
   * List pending questions
   *
   * Get all pending question requests across all sessions.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/question",
      ...options,
      ...params
    });
  }
  /**
   * Reply to question request
   *
   * Provide answers to a question request from the AI assistant.
   */
  reply(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "requestID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "answers" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/question/{requestID}/reply",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Reject question request
   *
   * Reject a question request from the AI assistant.
   */
  reject(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "requestID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/question/{requestID}/reject",
      ...options,
      ...params
    });
  }
};
var Oauth2 = class extends HeyApiClient {
  /**
   * OAuth authorize
   *
   * Initiate OAuth authorization for a specific AI provider to get an authorization URL.
   */
  authorize(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "providerID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "method" },
          { in: "body", key: "inputs" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/provider/{providerID}/oauth/authorize",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * OAuth callback
   *
   * Handle the OAuth callback from a provider after user authorization.
   */
  callback(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "providerID" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "method" },
          { in: "body", key: "code" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/provider/{providerID}/oauth/callback",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
};
var Provider2 = class extends HeyApiClient {
  /**
   * List providers
   *
   * Get a list of all available AI providers, including both available and connected ones.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/provider",
      ...options,
      ...params
    });
  }
  /**
   * Get provider auth methods
   *
   * Retrieve available authentication methods for all AI providers.
   */
  auth(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/provider/auth",
      ...options,
      ...params
    });
  }
  _oauth;
  get oauth() {
    return this._oauth ??= new Oauth2({ client: this.client });
  }
};
var Find2 = class extends HeyApiClient {
  /**
   * Find text
   *
   * Search for text patterns across files in the project using ripgrep.
   */
  text(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "pattern" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/find",
      ...options,
      ...params
    });
  }
  /**
   * Find files
   *
   * Search for files or directories by name or pattern in the project directory.
   */
  files(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "query" },
          { in: "query", key: "dirs" },
          { in: "query", key: "type" },
          { in: "query", key: "limit" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/find/file",
      ...options,
      ...params
    });
  }
  /**
   * Find symbols
   *
   * Search for workspace symbols like functions, classes, and variables using LSP.
   */
  symbols(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "query" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/find/symbol",
      ...options,
      ...params
    });
  }
};
var File2 = class extends HeyApiClient {
  /**
   * List files
   *
   * List files and directories in a specified path.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "path" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/file",
      ...options,
      ...params
    });
  }
  /**
   * Read file
   *
   * Read the content of a specified file.
   */
  read(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "path" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/file/content",
      ...options,
      ...params
    });
  }
  /**
   * Get file status
   *
   * Get the git status of all files in the project.
   */
  status(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/file/status",
      ...options,
      ...params
    });
  }
};
var Event2 = class extends HeyApiClient {
  /**
   * Subscribe to events
   *
   * Get events
   */
  subscribe(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).sse.get({
      url: "/event",
      ...options,
      ...params
    });
  }
};
var Auth22 = class extends HeyApiClient {
  /**
   * Remove MCP OAuth
   *
   * Remove OAuth credentials for an MCP server
   */
  remove(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "name" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).delete({
      url: "/mcp/{name}/auth",
      ...options,
      ...params
    });
  }
  /**
   * Start MCP OAuth
   *
   * Start OAuth authentication flow for a Model Context Protocol (MCP) server.
   */
  start(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "name" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/mcp/{name}/auth",
      ...options,
      ...params
    });
  }
  /**
   * Complete MCP OAuth
   *
   * Complete OAuth authentication for a Model Context Protocol (MCP) server using the authorization code.
   */
  callback(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "name" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "code" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/mcp/{name}/auth/callback",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Authenticate MCP OAuth
   *
   * Start OAuth flow and wait for callback (opens browser)
   */
  authenticate(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "name" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/mcp/{name}/auth/authenticate",
      ...options,
      ...params
    });
  }
};
var Mcp2 = class extends HeyApiClient {
  /**
   * Get MCP status
   *
   * Get the status of all Model Context Protocol (MCP) servers.
   */
  status(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/mcp",
      ...options,
      ...params
    });
  }
  /**
   * Add MCP server
   *
   * Dynamically add a new Model Context Protocol (MCP) server to the system.
   */
  add(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "name" },
          { in: "body", key: "config" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/mcp",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Connect an MCP server
   */
  connect(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "name" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/mcp/{name}/connect",
      ...options,
      ...params
    });
  }
  /**
   * Disconnect an MCP server
   */
  disconnect(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "path", key: "name" },
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/mcp/{name}/disconnect",
      ...options,
      ...params
    });
  }
  _auth;
  get auth() {
    return this._auth ??= new Auth22({ client: this.client });
  }
};
var Control2 = class extends HeyApiClient {
  /**
   * Get next TUI request
   *
   * Retrieve the next TUI (Terminal User Interface) request from the queue for processing.
   */
  next(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/tui/control/next",
      ...options,
      ...params
    });
  }
  /**
   * Submit TUI response
   *
   * Submit a response to the TUI request queue to complete a pending request.
   */
  response(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { key: "body", map: "body" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/control/response",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
};
var Tui2 = class extends HeyApiClient {
  /**
   * Append TUI prompt
   *
   * Append prompt to the TUI
   */
  appendPrompt(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "text" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/append-prompt",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Open help dialog
   *
   * Open the help dialog in the TUI to display user assistance information.
   */
  openHelp(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/open-help",
      ...options,
      ...params
    });
  }
  /**
   * Open sessions dialog
   *
   * Open the session dialog
   */
  openSessions(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/open-sessions",
      ...options,
      ...params
    });
  }
  /**
   * Open themes dialog
   *
   * Open the theme dialog
   */
  openThemes(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/open-themes",
      ...options,
      ...params
    });
  }
  /**
   * Open models dialog
   *
   * Open the model dialog
   */
  openModels(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/open-models",
      ...options,
      ...params
    });
  }
  /**
   * Submit TUI prompt
   *
   * Submit the prompt
   */
  submitPrompt(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/submit-prompt",
      ...options,
      ...params
    });
  }
  /**
   * Clear TUI prompt
   *
   * Clear the prompt
   */
  clearPrompt(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/clear-prompt",
      ...options,
      ...params
    });
  }
  /**
   * Execute TUI command
   *
   * Execute a TUI command (e.g. agent_cycle)
   */
  executeCommand(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "command" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/execute-command",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Show TUI toast
   *
   * Show a toast notification in the TUI
   */
  showToast(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "title" },
          { in: "body", key: "message" },
          { in: "body", key: "variant" },
          { in: "body", key: "duration" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/show-toast",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Publish TUI event
   *
   * Publish a TUI event
   */
  publish(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { key: "body", map: "body" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/publish",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  /**
   * Select session
   *
   * Navigate the TUI to display the specified session.
   */
  selectSession(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "body", key: "sessionID" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/tui/select-session",
      ...options,
      ...params,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
        ...params.headers
      }
    });
  }
  _control;
  get control() {
    return this._control ??= new Control2({ client: this.client });
  }
};
var Instance2 = class extends HeyApiClient {
  /**
   * Dispose instance
   *
   * Clean up and dispose the current OpenCode instance, releasing all resources.
   */
  dispose(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).post({
      url: "/instance/dispose",
      ...options,
      ...params
    });
  }
};
var Path2 = class extends HeyApiClient {
  /**
   * Get paths
   *
   * Retrieve the current working directory and related path information for the OpenCode instance.
   */
  get(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/path",
      ...options,
      ...params
    });
  }
};
var Vcs2 = class extends HeyApiClient {
  /**
   * Get VCS info
   *
   * Retrieve version control system (VCS) information for the current project, such as git branch.
   */
  get(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/vcs",
      ...options,
      ...params
    });
  }
  /**
   * Get VCS diff
   *
   * Retrieve the current git diff for the working tree or against the default branch.
   */
  diff(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" },
          { in: "query", key: "mode" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/vcs/diff",
      ...options,
      ...params
    });
  }
};
var Command2 = class extends HeyApiClient {
  /**
   * List commands
   *
   * Get a list of all available commands in the OpenCode system.
   */
  list(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/command",
      ...options,
      ...params
    });
  }
};
var Lsp2 = class extends HeyApiClient {
  /**
   * Get LSP status
   *
   * Get LSP server status
   */
  status(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/lsp",
      ...options,
      ...params
    });
  }
};
var Formatter2 = class extends HeyApiClient {
  /**
   * Get formatter status
   *
   * Get formatter status
   */
  status(parameters, options) {
    const params = buildClientParams2([parameters], [
      {
        args: [
          { in: "query", key: "directory" },
          { in: "query", key: "workspace" }
        ]
      }
    ]);
    return (options?.client ?? this.client).get({
      url: "/formatter",
      ...options,
      ...params
    });
  }
};
var OpencodeClient2 = class _OpencodeClient extends HeyApiClient {
  static __registry = new HeyApiRegistry();
  constructor(args) {
    super(args);
    _OpencodeClient.__registry.set(this, args?.key);
  }
  _global;
  get global() {
    return this._global ??= new Global2({ client: this.client });
  }
  _auth;
  get auth() {
    return this._auth ??= new Auth2({ client: this.client });
  }
  _app;
  get app() {
    return this._app ??= new App2({ client: this.client });
  }
  _project;
  get project() {
    return this._project ??= new Project2({ client: this.client });
  }
  _pty;
  get pty() {
    return this._pty ??= new Pty2({ client: this.client });
  }
  _config;
  get config() {
    return this._config ??= new Config22({ client: this.client });
  }
  _experimental;
  get experimental() {
    return this._experimental ??= new Experimental({ client: this.client });
  }
  _tool;
  get tool() {
    return this._tool ??= new Tool2({ client: this.client });
  }
  _worktree;
  get worktree() {
    return this._worktree ??= new Worktree({ client: this.client });
  }
  _session;
  get session() {
    return this._session ??= new Session22({ client: this.client });
  }
  _part;
  get part() {
    return this._part ??= new Part({ client: this.client });
  }
  _permission;
  get permission() {
    return this._permission ??= new Permission({ client: this.client });
  }
  _question;
  get question() {
    return this._question ??= new Question({ client: this.client });
  }
  _provider;
  get provider() {
    return this._provider ??= new Provider2({ client: this.client });
  }
  _find;
  get find() {
    return this._find ??= new Find2({ client: this.client });
  }
  _file;
  get file() {
    return this._file ??= new File2({ client: this.client });
  }
  _event;
  get event() {
    return this._event ??= new Event2({ client: this.client });
  }
  _mcp;
  get mcp() {
    return this._mcp ??= new Mcp2({ client: this.client });
  }
  _tui;
  get tui() {
    return this._tui ??= new Tui2({ client: this.client });
  }
  _instance;
  get instance() {
    return this._instance ??= new Instance2({ client: this.client });
  }
  _path;
  get path() {
    return this._path ??= new Path2({ client: this.client });
  }
  _vcs;
  get vcs() {
    return this._vcs ??= new Vcs2({ client: this.client });
  }
  _command;
  get command() {
    return this._command ??= new Command2({ client: this.client });
  }
  _lsp;
  get lsp() {
    return this._lsp ??= new Lsp2({ client: this.client });
  }
  _formatter;
  get formatter() {
    return this._formatter ??= new Formatter2({ client: this.client });
  }
};

// node_modules/@opencode-ai/sdk/dist/v2/client.js
function pick2(value, fallback, encode) {
  if (!value)
    return;
  if (!fallback)
    return value;
  if (value === fallback)
    return fallback;
  if (encode && value === encode(fallback))
    return fallback;
  return value;
}
function rewrite2(request, values) {
  if (request.method !== "GET" && request.method !== "HEAD")
    return request;
  const url = new URL(request.url);
  let changed = false;
  for (const [name, key] of [
    ["x-opencode-directory", "directory"],
    ["x-opencode-workspace", "workspace"]
  ]) {
    const value = pick2(request.headers.get(name), key === "directory" ? values.directory : values.workspace, key === "directory" ? encodeURIComponent : void 0);
    if (!value)
      continue;
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
    changed = true;
  }
  if (!changed)
    return request;
  const next = new Request(url, request);
  next.headers.delete("x-opencode-directory");
  next.headers.delete("x-opencode-workspace");
  return next;
}
function createOpencodeClient2(config) {
  if (!config?.fetch) {
    const customFetch = (req) => {
      req.timeout = false;
      return fetch(req);
    };
    config = {
      ...config,
      fetch: customFetch
    };
  }
  if (config?.directory) {
    config.headers = {
      ...config.headers,
      "x-opencode-directory": encodeURIComponent(config.directory)
    };
  }
  if (config?.experimental_workspaceID) {
    config.headers = {
      ...config.headers,
      "x-opencode-workspace": config.experimental_workspaceID
    };
  }
  const client3 = createClient2(config);
  client3.interceptors.request.use((request) => rewrite2(request, {
    directory: config?.directory,
    workspace: config?.experimental_workspaceID
  }));
  return new OpencodeClient2({ client: client3 });
}

// src/opencodeService.ts
var REQUEST_OPTIONS = {
  responseStyle: "data",
  throwOnError: true
};
var ACTIVE_SESSION_STORAGE_PREFIX = "opencodeVisual.activeSession";
var LAST_SESSION_STORAGE_PREFIX = "opencodeVisual.lastSession";
var COMMAND_LOOKUP_TIMEOUT_MS = 2500;
var windowsPath = (input) => /^[A-Za-z]:/.test(input) || input.startsWith("//");
var workspaceKey = (directory) => {
  const value = directory.replaceAll("\\", "/");
  const drive = value.match(/^([A-Za-z]:)\/+$/);
  if (drive) return `${drive[1]}/`;
  if (/^\/+$/i.test(value)) return "/";
  return value.replace(/\/+$/, "");
};
var sameWorkspace = (left, right) => {
  const a = workspaceKey(left);
  const b = workspaceKey(right);
  if (windowsPath(a) || windowsPath(b)) return a.toLowerCase() === b.toLowerCase();
  return a === b;
};
var OpenCodeService = class {
  constructor(context) {
    this.context = context;
    this.connectionState = {
      status: "connecting",
      baseUrl: this.getSettings().serverBaseUrl,
      managed: false
    };
  }
  stateEmitter = new vscode.EventEmitter();
  output = vscode.window.createOutputChannel("OpenCode VS Code");
  client;
  server;
  streamAbort;
  busyPollTimer;
  busyPollSessionId;
  busyPollPending = false;
  networkNoticeUntil = 0;
  currentDirectory;
  bootstrapPromise;
  sessions = [];
  thread = [];
  permissions = /* @__PURE__ */ new Map();
  todos = [];
  diffs = [];
  commands = [];
  agents = [];
  providers = [];
  models = [];
  vcs;
  project = null;
  sessionStatuses = /* @__PURE__ */ new Map();
  lastError;
  resolvedConfig = {};
  activeSessionId;
  composer = {};
  connectionState;
  onDidChangeState = this.stateEmitter.event;
  dispose() {
    this.stopStream();
    this.stopBusyPolling();
    this.stopServer();
    this.stateEmitter.dispose();
    this.output.dispose();
  }
  async bootstrap() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.ensureReady().then(() => void 0).finally(() => {
        this.bootstrapPromise = void 0;
      });
    }
    await this.bootstrapPromise;
  }
  async ensureServerReady(forceRestart = false) {
    if (forceRestart) {
      this.stopServer();
    }
    if (this.server) {
      return this.server.url;
    }
    const settings = this.getSettings();
    const baseUrl = settings.serverBaseUrl;
    this.connectionState = {
      status: "connecting",
      baseUrl,
      managed: false
    };
    this.emitState();
    try {
      await this.pingServer(baseUrl);
      this.connectionState = {
        status: "connected",
        baseUrl,
        managed: false
      };
      this.emitState();
      return baseUrl;
    } catch (error) {
      if (!settings.autoStartServer) {
        this.connectionState = {
          status: "error",
          baseUrl,
          managed: false,
          error: this.formatError(error)
        };
        this.emitState();
        throw error;
      }
    }
    const server = await this.startManagedServer();
    this.connectionState = {
      status: "connected",
      baseUrl: server.url,
      managed: true
    };
    this.emitState();
    return server.url;
  }
  getResolvedServerBaseUrl() {
    return this.server?.url ?? this.getSettings().serverBaseUrl;
  }
  async refresh() {
    await this.ensureReady(true);
  }
  async restartServer() {
    this.stopServer();
    await this.ensureReady(true, true);
  }
  reportNetworkIssue(detail) {
    this.output.appendLine(`[network] ${detail}`);
    const now = Date.now();
    if (now < this.networkNoticeUntil) {
      return;
    }
    this.networkNoticeUntil = now + 15e3;
    const hint = this.getNetworkHint(detail);
    void vscode.window.showWarningMessage(
      hint,
      "Open Settings",
      "Restart Local Server",
      "Show Output"
    ).then((action) => {
      if (action === "Open Settings") {
        void vscode.commands.executeCommand("opencodeVisual.openSettings");
        return;
      }
      if (action === "Restart Local Server") {
        void vscode.commands.executeCommand("opencodeVisual.restartServer");
        return;
      }
      if (action === "Show Output") {
        this.output.show(true);
      }
    });
  }
  async syncWorkspaceContext() {
    const nextDirectory = this.getWorkspaceContext().directory;
    if (!this.sameDirectory(nextDirectory, this.currentDirectory)) {
      await this.ensureReady(true);
      return true;
    }
    this.emitState();
    return false;
  }
  getState() {
    const workspace5 = this.getWorkspaceContext();
    return {
      connection: this.connectionState,
      lastError: this.lastError,
      workspace: workspace5,
      sessions: this.sessions,
      sessionStatuses: Object.fromEntries(this.sessionStatuses.entries()),
      activeSessionId: this.activeSessionId,
      thread: this.thread,
      permissions: this.getActivePermissions(),
      todos: this.todos,
      diffs: this.diffs,
      commands: this.commands,
      agents: this.agents,
      providers: this.providers,
      models: this.models,
      composer: this.composer,
      vcs: this.vcs,
      project: this.project,
      config: {
        model: this.resolvedConfig.model,
        smallModel: this.resolvedConfig.small_model
      }
    };
  }
  async setComposerSelection(composer) {
    const providerID = composer.providerID || void 0;
    const providerModels = providerID ? this.models.filter((item) => item.providerID === providerID) : [];
    const providerDefaultModelID = providerID ? this.providers.find((item) => item.id === providerID)?.defaultModelID : void 0;
    const fallbackModel = providerModels.find((item) => item.modelID === providerDefaultModelID) ?? providerModels[0];
    const selectedModel = composer.modelID && providerModels.some((item) => item.modelID === composer.modelID) ? composer.modelID : fallbackModel?.modelID;
    const selectedModelOption = providerModels.find((item) => item.modelID === selectedModel) ?? fallbackModel;
    this.composer = {
      providerID: providerID ?? fallbackModel?.providerID,
      modelID: selectedModel,
      agent: this.normalizeComposerAgent(composer.agent),
      variant: this.normalizeComposerVariant(selectedModelOption, composer.variant)
    };
    this.emitState();
  }
  async createSession() {
    this.lastError = void 0;
    const client3 = await this.ensureReady();
    const session = this.unwrap(await client3.session.create(REQUEST_OPTIONS));
    this.upsertSession(session);
    this.activeSessionId = session.id;
    this.persistActiveSessionId();
    this.updateBusyPolling();
    await this.loadActiveSession(session.id);
    this.emitState();
    return session;
  }
  async selectSession(sessionId) {
    this.lastError = void 0;
    this.activeSessionId = sessionId;
    this.persistActiveSessionId();
    this.updateBusyPolling();
    await this.loadActiveSession(sessionId);
    this.emitState();
  }
  async deleteSession(sessionId) {
    this.lastError = void 0;
    const confirmed = await vscode.window.showWarningMessage(
      "Delete this OpenCode session?",
      { modal: false },
      "Delete"
    );
    if (confirmed !== "Delete") {
      return;
    }
    const client3 = await this.ensureReady();
    await client3.session.delete({
      ...REQUEST_OPTIONS,
      path: { id: sessionId }
    });
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = void 0;
      this.updateBusyPolling();
    }
    await this.refreshState();
  }
  async renameSession(sessionId, title) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }
    this.lastError = void 0;
    const client3 = await this.ensureReady();
    await client3.session.update({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
      body: { title: trimmedTitle }
    });
    await this.refreshState();
  }
  async archiveSession(sessionId) {
    this.lastError = void 0;
    const directory = this.sessions.find((item) => item.id === sessionId)?.directory ?? this.currentDirectory;
    if (!directory) {
      throw new Error("Open a workspace folder before archiving a session.");
    }
    const client3 = this.createV2Client(this.server?.url ?? this.getSettings().serverBaseUrl, directory);
    await client3.session.update({
      sessionID: sessionId,
      directory,
      time: {
        archived: Date.now()
      }
    }, REQUEST_OPTIONS);
    await this.refreshState();
  }
  async sendPrompt(text, attachments) {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) {
      return;
    }
    this.lastError = void 0;
    await this.ensureReady();
    const session = await this.ensureSessionForPrompt(trimmed || "OpenCode session");
    const sessionId = session.id;
    const directory = session.directory ?? this.currentDirectory;
    if (!directory) {
      throw new Error("Open a workspace folder before sending prompts.");
    }
    const client3 = this.createV2Client(this.server?.url ?? this.getSettings().serverBaseUrl, directory);
    const variant = this.composer.variant ?? void 0;
    if (trimmed.startsWith("/")) {
      const commandText = trimmed.slice(1).trim();
      const spaceIndex = commandText.indexOf(" ");
      const command = spaceIndex === -1 ? commandText : commandText.slice(0, spaceIndex);
      const args = spaceIndex === -1 ? "" : commandText.slice(spaceIndex + 1);
      if (!command) {
        return;
      }
      this.sessionStatuses.set(sessionId, { type: "busy" });
      this.updateBusyPolling();
      this.emitState();
      await client3.session.command({
        sessionID: sessionId,
        directory,
        command,
        arguments: args || void 0,
        agent: this.composer.agent || "build",
        model: this.getCommandModel(),
        variant
      }, REQUEST_OPTIONS);
      await this.loadActiveSession(sessionId);
      return;
    }
    const parts = [];
    if (trimmed) {
      parts.push({
        type: "text",
        text: trimmed
      });
    }
    parts.push(...attachments);
    this.sessionStatuses.set(sessionId, { type: "busy" });
    this.updateBusyPolling();
    this.emitState();
    await client3.session.promptAsync({
      sessionID: sessionId,
      directory,
      parts,
      agent: this.composer.agent || "build",
      model: this.getPromptModel(),
      variant
    }, REQUEST_OPTIONS);
    await this.loadActiveSession(sessionId);
  }
  async replyToPermission(sessionId, permissionId, response) {
    const client3 = await this.ensureReady();
    await client3.postSessionIdPermissionsPermissionId({
      ...REQUEST_OPTIONS,
      path: { id: sessionId, permissionID: permissionId },
      body: { response }
    });
    this.permissions.delete(permissionId);
    this.emitState();
  }
  async abortSession(sessionId) {
    const client3 = await this.ensureReady();
    await client3.session.abort({
      ...REQUEST_OPTIONS,
      path: { id: sessionId }
    });
  }
  async shareSession(sessionId) {
    const client3 = await this.ensureReady();
    const session = this.unwrap(await client3.session.share({
      ...REQUEST_OPTIONS,
      path: { id: sessionId }
    }));
    this.upsertSession(session);
    this.emitState();
    return session.share?.url;
  }
  async unshareSession(sessionId) {
    const client3 = await this.ensureReady();
    const session = this.unwrap(await client3.session.unshare({
      ...REQUEST_OPTIONS,
      path: { id: sessionId }
    }));
    this.upsertSession(session);
    this.emitState();
  }
  async revertSession(sessionId) {
    this.lastError = void 0;
    const client3 = await this.ensureReady();
    const target = this.getLatestMessage();
    if (!target) {
      vscode.window.showInformationMessage("No message available to revert.");
      return;
    }
    const session = this.unwrap(await client3.session.revert({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
      body: {
        messageID: target.info.id
      }
    }));
    this.upsertSession(session);
    await this.loadActiveSession(sessionId);
  }
  async unrevertSession(sessionId) {
    this.lastError = void 0;
    const client3 = await this.ensureReady();
    const session = this.unwrap(await client3.session.unrevert({
      ...REQUEST_OPTIONS,
      path: { id: sessionId }
    }));
    this.upsertSession(session);
    await this.loadActiveSession(sessionId);
  }
  async runInit(sessionId) {
    this.lastError = void 0;
    const client3 = await this.ensureReady();
    const sessionMessages = this.unwrap(await client3.session.messages({
      ...REQUEST_OPTIONS,
      path: { id: sessionId }
    }));
    const userMessage = [...sessionMessages].reverse().find((entry) => entry.info.role === "user");
    const model = this.getPromptModel();
    if (!userMessage || !model) {
      vscode.window.showInformationMessage("Select a model and send at least one user prompt before running init.");
      return;
    }
    await client3.session.init({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
      body: {
        messageID: userMessage.info.id,
        providerID: model.providerID,
        modelID: model.modelID
      }
    });
    vscode.window.showInformationMessage("OpenCode init started for the active session.");
  }
  async summarizeSession(sessionId) {
    this.lastError = void 0;
    const client3 = await this.ensureReady();
    const model = this.getPromptModel();
    if (!model) {
      vscode.window.showInformationMessage("Select a model before compacting this session.");
      return;
    }
    await client3.session.summarize({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
      body: model
    });
    vscode.window.showInformationMessage("OpenCode compacted the active session.");
  }
  async captureEditorAttachment(selectionOnly) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage("Open a file in the editor first.");
      return void 0;
    }
    const document = editor.document;
    if (selectionOnly && editor.selection.isEmpty) {
      vscode.window.showInformationMessage("Select some text in the active editor first.");
      return void 0;
    }
    const range = selectionOnly && !editor.selection.isEmpty ? editor.selection : new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    const text = document.getText(range);
    if (!text.trim()) {
      vscode.window.showInformationMessage("The current file or selection is empty.");
      return void 0;
    }
    const relativePath = vscode.workspace.asRelativePath(document.uri, false);
    const attachment = {
      type: "file",
      mime: "text/plain",
      filename: path.basename(document.fileName || relativePath || "context.txt"),
      url: document.uri.toString(),
      source: {
        type: "file",
        path: relativePath,
        text: {
          value: text,
          start: document.offsetAt(range.start),
          end: document.offsetAt(range.end)
        }
      }
    };
    return {
      label: selectionOnly ? `${relativePath} (selection)` : relativePath,
      attachment
    };
  }
  async captureImageAttachment() {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      openLabel: "Insert image",
      filters: {
        Images: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]
      }
    });
    const imageUri = selected?.[0];
    if (!imageUri) {
      return void 0;
    }
    const relativePath = vscode.workspace.asRelativePath(imageUri, false);
    return {
      label: relativePath || path.basename(imageUri.fsPath),
      attachment: {
        type: "file",
        mime: this.getImageMimeType(imageUri.fsPath),
        filename: path.basename(imageUri.fsPath),
        url: imageUri.toString()
      }
    };
  }
  getActiveSessionDirectory() {
    const session = this.sessions.find((item) => item.id === this.activeSessionId);
    return session?.directory ?? this.currentDirectory;
  }
  async ensureSessionForPrompt(titleSeed) {
    if (this.activeSessionId) {
      const existing = this.sessions.find((item) => item.id === this.activeSessionId);
      if (existing) {
        return existing;
      }
    }
    const session = await this.createSessionWithTitle(titleSeed);
    this.activeSessionId = session.id;
    this.persistActiveSessionId();
    this.updateBusyPolling();
    return session;
  }
  async createSessionWithTitle(titleSeed) {
    const client3 = await this.ensureReady();
    const session = this.unwrap(await client3.session.create({
      ...REQUEST_OPTIONS,
      body: {
        title: this.createSessionTitle(titleSeed)
      }
    }));
    this.upsertSession(session);
    return session;
  }
  createSessionTitle(value) {
    return value.replace(/^\//, "").trim().slice(0, 80) || "OpenCode session";
  }
  getImageMimeType(filePath) {
    switch (path.extname(filePath).toLowerCase()) {
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".gif":
        return "image/gif";
      case ".webp":
        return "image/webp";
      case ".bmp":
        return "image/bmp";
      case ".svg":
        return "image/svg+xml";
      case ".png":
      default:
        return "image/png";
    }
  }
  getPromptModel() {
    if (this.composer.providerID && this.composer.modelID) {
      return {
        providerID: this.composer.providerID,
        modelID: this.composer.modelID
      };
    }
    const fallback = this.models[0];
    if (!fallback) {
      return void 0;
    }
    return {
      providerID: fallback.providerID,
      modelID: fallback.modelID
    };
  }
  getCommandModel() {
    const model = this.getPromptModel();
    return model ? `${model.providerID}/${model.modelID}` : void 0;
  }
  normalizeComposerVariant(model, variant) {
    if (variant === null) {
      return null;
    }
    if (!variant || !model?.variants?.includes(variant)) {
      return void 0;
    }
    return variant;
  }
  getAgentNames() {
    return this.agents.filter((item) => item.mode !== "primary" && !item.hidden).map((item) => item.name);
  }
  normalizeComposerAgent(agent) {
    const names = this.getAgentNames();
    if (agent && names.includes(agent)) {
      return agent;
    }
    if (this.composer.agent && names.includes(this.composer.agent)) {
      return this.composer.agent;
    }
    if (names.includes("build")) {
      return "build";
    }
    return names[0] ?? "build";
  }
  getLatestMessage() {
    return this.thread.at(-1);
  }
  async ensureReady(forceRefresh = false, forceRestartServer = false) {
    const workspace5 = this.getWorkspaceContext();
    const directory = workspace5.directory;
    this.connectionState = {
      ...this.connectionState,
      baseUrl: this.getSettings().serverBaseUrl
    };
    if (!directory) {
      this.currentDirectory = void 0;
      this.client = void 0;
      this.sessions = [];
      this.thread = [];
      this.todos = [];
      this.diffs = [];
      this.commands = [];
      this.agents = [];
      this.providers = [];
      this.models = [];
      this.vcs = void 0;
      this.project = null;
      this.lastError = void 0;
      this.resolvedConfig = {};
      this.connectionState = {
        status: "error",
        baseUrl: this.getSettings().serverBaseUrl,
        managed: false,
        error: "Open a workspace folder to use OpenCode."
      };
      this.emitState();
      throw new Error("No workspace folder is open.");
    }
    if (forceRestartServer) {
      this.stopServer();
    }
    const needsReconnect = !this.client || !this.sameDirectory(this.currentDirectory, directory) || forceRefresh;
    if (needsReconnect) {
      await this.connect(directory);
      await this.refreshState();
    }
    return this.client;
  }
  async connect(directory) {
    this.connectionState = {
      status: "connecting",
      baseUrl: this.getSettings().serverBaseUrl,
      managed: Boolean(this.server)
    };
    this.emitState();
    this.stopStream();
    this.currentDirectory = directory;
    const baseUrl = this.getSettings().serverBaseUrl;
    try {
      this.client = this.createClient(baseUrl, directory);
      await this.client.path.get(REQUEST_OPTIONS);
    } catch (error) {
      const settings = this.getSettings();
      if (!settings.autoStartServer) {
        this.connectionState = {
          status: "error",
          baseUrl,
          managed: false,
          error: this.formatError(error)
        };
        this.emitState();
        throw error;
      }
      const server = await this.startManagedServer();
      this.client = this.createClient(server.url, directory);
      await this.client.path.get(REQUEST_OPTIONS);
    }
    this.connectionState = {
      status: "connected",
      baseUrl: this.server?.url ?? baseUrl,
      managed: Boolean(this.server)
    };
    this.emitState();
    await this.startStream();
  }
  createClient(baseUrl, directory) {
    return createOpencodeClient({
      baseUrl,
      directory,
      ...REQUEST_OPTIONS
    });
  }
  createV2Client(baseUrl, directory) {
    return createOpencodeClient2({
      baseUrl,
      directory,
      ...REQUEST_OPTIONS
    });
  }
  async pingServer(baseUrl) {
    const client3 = createOpencodeClient({
      baseUrl,
      ...REQUEST_OPTIONS
    });
    await client3.path.get(REQUEST_OPTIONS);
  }
  async refreshState() {
    const client3 = this.client;
    const directory = this.currentDirectory;
    if (!client3 || !directory) {
      return;
    }
    const v2Client = this.createV2Client(this.server?.url ?? this.getSettings().serverBaseUrl, directory);
    const [sessionsResult, statusesResult, providersResult, agentsResult, commandsResult, configResult, vcsResult, projectResult] = await Promise.all([
      client3.session.list(REQUEST_OPTIONS),
      client3.session.status(REQUEST_OPTIONS),
      v2Client.provider.list({ directory }, REQUEST_OPTIONS),
      v2Client.app.agents({ directory }, REQUEST_OPTIONS),
      client3.command.list(REQUEST_OPTIONS),
      client3.config.get(REQUEST_OPTIONS),
      v2Client.vcs.get({ directory }, REQUEST_OPTIONS).catch(() => void 0),
      v2Client.project.current({ directory }, REQUEST_OPTIONS).catch(() => void 0)
    ]);
    const sessions = this.unwrap(sessionsResult);
    const statuses = this.unwrap(statusesResult);
    const providers = this.unwrap(providersResult);
    const agents = this.unwrap(agentsResult);
    const commands5 = this.unwrap(commandsResult);
    const config = this.unwrap(configResult);
    const vcs = vcsResult ? this.unwrap(vcsResult) : void 0;
    const project = projectResult ? this.unwrap(projectResult) : null;
    this.sessions = [...sessions].sort((left, right) => right.time.updated - left.time.updated);
    this.sessionStatuses = new Map(Object.entries(statuses));
    this.commands = commands5;
    this.agents = agents;
    this.providers = this.buildProviders(providers);
    this.models = this.flattenModels(providers);
    this.vcs = vcs;
    this.project = project;
    this.resolvedConfig = {
      model: config.model,
      small_model: config.small_model
    };
    this.normalizeComposer(config.model, providers);
    this.lastError = void 0;
    if (!this.activeSessionId) {
      this.activeSessionId = this.getStoredActiveSessionId(this.currentDirectory) ?? this.getStoredLastSessionId(this.currentDirectory) ?? this.sessions[0]?.id;
    }
    if (this.activeSessionId && !this.sessions.some((item) => item.id === this.activeSessionId)) {
      this.activeSessionId = this.getStoredLastSessionId(this.currentDirectory) ?? this.sessions[0]?.id;
    }
    this.persistActiveSessionId();
    if (this.activeSessionId) {
      await this.loadActiveSession(this.activeSessionId);
    } else {
      this.thread = [];
      this.todos = [];
      this.diffs = [];
    }
    this.updateBusyPolling();
    this.emitState();
  }
  normalizeComposer(configuredModel, providers) {
    const configured = this.parseConfiguredModel(configuredModel);
    const provider = this.resolveProviderChoice(configured, providers);
    if (!provider) {
      this.composer.providerID = void 0;
      this.composer.modelID = void 0;
      this.composer.agent = this.normalizeComposerAgent(this.composer.agent);
      this.composer.variant = void 0;
      return;
    }
    const model = this.resolveModelChoice(provider.id, configured, providers);
    this.composer.providerID = provider.id;
    this.composer.modelID = model?.modelID;
    this.composer.agent = this.normalizeComposerAgent(this.composer.agent);
    this.composer.variant = this.normalizeComposerVariant(model, this.composer.variant);
  }
  parseConfiguredModel(modelRef) {
    if (!modelRef) {
      return void 0;
    }
    const separator = modelRef.indexOf("/");
    if (separator === -1) {
      return void 0;
    }
    const providerID = modelRef.slice(0, separator).trim();
    const modelID = modelRef.slice(separator + 1).trim();
    if (!providerID || !modelID) {
      return void 0;
    }
    return { providerID, modelID };
  }
  flattenModels(providers) {
    const connected = new Set(providers.connected);
    const output = [];
    for (const provider of providers.all) {
      if (!connected.has(provider.id)) {
        continue;
      }
      for (const model of Object.values(provider.models)) {
        output.push(this.mapModel(provider.id, provider.name, model));
      }
    }
    return output.sort((left, right) => {
      const providerOrder = this.compareProviderIDs(left.providerID, right.providerID);
      if (providerOrder !== 0) {
        return providerOrder;
      }
      return left.label.localeCompare(right.label);
    });
  }
  mapModel(providerID, providerName, model) {
    return {
      providerID,
      providerName,
      modelID: model.id,
      label: `${providerName} / ${model.name}`,
      status: model.status,
      variants: this.getModelVariants(model)
    };
  }
  buildProviders(providers) {
    const connected = new Set(providers.connected);
    return providers.all.filter((provider) => connected.has(provider.id)).map((provider) => ({
      id: provider.id,
      name: provider.name,
      modelCount: Object.keys(provider.models).length,
      defaultModelID: this.resolveProviderDefaultModelID(provider.id, providers)
    })).sort((left, right) => this.compareProviderIDs(left.id, right.id) || left.name.localeCompare(right.name));
  }
  getModelVariants(model) {
    return Object.entries(model.variants ?? {}).filter(([, value]) => !this.isDisabledVariant(value)).map(([name]) => name).sort((left, right) => this.compareVariantNames(left, right));
  }
  isDisabledVariant(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    return "disabled" in value && Boolean(value.disabled);
  }
  compareVariantNames(left, right) {
    const order = ["low", "medium", "high", "xhigh", "max"];
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) {
        return 1;
      }
      if (rightIndex === -1) {
        return -1;
      }
      return leftIndex - rightIndex;
    }
    return left.localeCompare(right);
  }
  resolveProviderChoice(configured, providers) {
    const connected = new Set(providers.connected);
    const currentProviderID = this.composer.providerID;
    if (currentProviderID && connected.has(currentProviderID)) {
      return this.providers.find((provider) => provider.id === currentProviderID);
    }
    if (configured && connected.has(configured.providerID)) {
      return this.providers.find((provider) => provider.id === configured.providerID);
    }
    return this.providers[0];
  }
  resolveModelChoice(providerID, configured, providers) {
    const providerModels = this.models.filter((item) => item.providerID === providerID);
    if (!providerModels.length) {
      return void 0;
    }
    const currentModel = this.composer.providerID === providerID ? providerModels.find((item) => item.modelID === this.composer.modelID) : void 0;
    if (currentModel) {
      return currentModel;
    }
    if (configured?.providerID === providerID) {
      const configuredModel = providerModels.find((item) => item.modelID === configured.modelID);
      if (configuredModel) {
        return configuredModel;
      }
    }
    const providerDefaultModelID = this.resolveProviderDefaultModelID(providerID, providers);
    if (providerDefaultModelID) {
      const providerDefaultModel = providerModels.find((item) => item.modelID === providerDefaultModelID);
      if (providerDefaultModel) {
        return providerDefaultModel;
      }
    }
    return providerModels[0];
  }
  resolveProviderDefaultModelID(providerID, providers) {
    const modelID = providers.default?.[providerID];
    if (!modelID) {
      return void 0;
    }
    const provider = providers.all.find((item) => item.id === providerID);
    if (!provider || !(modelID in provider.models)) {
      return void 0;
    }
    return modelID;
  }
  compareProviderIDs(left, right) {
    const leftRank = left === "opencode" ? 0 : 1;
    const rightRank = right === "opencode" ? 0 : 1;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.localeCompare(right);
  }
  async loadActiveSession(sessionId) {
    const client3 = this.client;
    if (!client3) {
      return;
    }
    const [messagesResult, todosResult, diffsResult] = await Promise.all([
      client3.session.messages({
        ...REQUEST_OPTIONS,
        path: { id: sessionId }
      }),
      client3.session.todo({
        ...REQUEST_OPTIONS,
        path: { id: sessionId }
      }).catch(() => []),
      client3.session.diff({
        ...REQUEST_OPTIONS,
        path: { id: sessionId }
      }).catch(() => [])
    ]);
    this.thread = this.unwrap(messagesResult);
    this.todos = this.unwrap(todosResult);
    this.diffs = this.unwrap(diffsResult);
    this.emitState();
  }
  unwrap(result) {
    if (result && typeof result === "object" && "data" in result) {
      return result.data;
    }
    return result;
  }
  async startStream() {
    const client3 = this.client;
    if (!client3) {
      return;
    }
    this.stopStream();
    const abort = new AbortController();
    this.streamAbort = abort;
    void (async () => {
      while (!abort.signal.aborted) {
        if (this.client !== client3) {
          return;
        }
        try {
          const streamResult = await client3.event.subscribe({
            ...REQUEST_OPTIONS,
            signal: abort.signal,
            onSseError: (error) => {
              if (abort.signal.aborted) {
                return;
              }
              const detail = `event stream transport error: ${this.formatError(error)}`;
              this.output.appendLine(`[event] ${detail}`);
              this.reportNetworkIssue(detail);
            }
          });
          if (abort.signal.aborted || this.client !== client3) {
            return;
          }
          if (this.connectionState.status !== "connected") {
            this.connectionState = {
              status: "connected",
              baseUrl: this.connectionState.baseUrl,
              managed: this.connectionState.managed
            };
            this.emitState();
          }
          for await (const event of streamResult.stream) {
            if (abort.signal.aborted || this.client !== client3) {
              return;
            }
            await this.handleEvent(event);
          }
        } catch (error) {
          if (abort.signal.aborted || this.client !== client3) {
            return;
          }
          const detail = `event stream failed: ${this.formatError(error)}`;
          this.output.appendLine(`[event-loop] ${detail}`);
          this.reportNetworkIssue(detail);
        }
        if (abort.signal.aborted || this.client !== client3) {
          return;
        }
        this.connectionState = {
          status: "connecting",
          baseUrl: this.connectionState.baseUrl,
          managed: this.connectionState.managed,
          error: "Reconnecting OpenCode event stream..."
        };
        this.emitState();
        await this.sleep(400, abort.signal);
      }
    })();
  }
  stopStream() {
    this.streamAbort?.abort();
    this.streamAbort = void 0;
    this.stopBusyPolling();
  }
  updateBusyPolling() {
    const sessionId = this.activeSessionId;
    if (!sessionId) {
      this.stopBusyPolling();
      return;
    }
    const status = this.sessionStatuses.get(sessionId);
    if (status?.type !== "busy") {
      this.stopBusyPolling();
      return;
    }
    if (this.busyPollTimer && this.busyPollSessionId === sessionId) {
      return;
    }
    this.stopBusyPolling();
    this.busyPollSessionId = sessionId;
    this.busyPollTimer = setInterval(() => {
      if (!this.busyPollSessionId) {
        return;
      }
      void this.pollBusySession(this.busyPollSessionId);
    }, 1200);
    void this.pollBusySession(sessionId);
  }
  stopBusyPolling() {
    if (this.busyPollTimer) {
      clearInterval(this.busyPollTimer);
      this.busyPollTimer = void 0;
    }
    this.busyPollSessionId = void 0;
    this.busyPollPending = false;
  }
  async pollBusySession(sessionId) {
    if (this.busyPollPending) {
      return;
    }
    if (sessionId !== this.activeSessionId) {
      this.stopBusyPolling();
      return;
    }
    if (sessionId !== this.busyPollSessionId) {
      return;
    }
    const status = this.sessionStatuses.get(sessionId);
    if (status?.type !== "busy") {
      this.stopBusyPolling();
      return;
    }
    this.busyPollPending = true;
    try {
      await this.loadActiveSession(sessionId);
    } catch (error) {
      this.output.appendLine(`[busy-poll] ${this.formatError(error)}`);
    } finally {
      this.busyPollPending = false;
    }
  }
  async sleep(ms, signal) {
    await new Promise((resolve2) => {
      if (signal.aborted) {
        resolve2();
        return;
      }
      const timeout = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve2();
      }, ms);
      const onAbort = () => {
        clearTimeout(timeout);
        resolve2();
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
  async handleEvent(event) {
    switch (event.type) {
      case "server.connected": {
        this.connectionState = {
          status: "connected",
          baseUrl: this.connectionState.baseUrl,
          managed: this.connectionState.managed
        };
        break;
      }
      case "session.created":
      case "session.updated": {
        this.upsertSession(event.properties.info);
        break;
      }
      case "session.deleted": {
        this.sessions = this.sessions.filter((item) => item.id !== event.properties.info.id);
        if (this.activeSessionId === event.properties.info.id) {
          this.activeSessionId = this.sessions[0]?.id;
          this.updateBusyPolling();
          if (this.activeSessionId) {
            await this.loadActiveSession(this.activeSessionId);
          } else {
            this.thread = [];
            this.todos = [];
            this.diffs = [];
          }
        }
        break;
      }
      case "session.status": {
        this.sessionStatuses.set(event.properties.sessionID, event.properties.status);
        this.updateBusyPolling();
        break;
      }
      case "session.idle": {
        this.sessionStatuses.set(event.properties.sessionID, { type: "idle" });
        this.updateBusyPolling();
        if (event.properties.sessionID === this.activeSessionId) {
          await this.loadActiveSession(event.properties.sessionID);
        }
        break;
      }
      case "message.updated": {
        this.upsertMessage(event.properties.info);
        break;
      }
      case "message.removed": {
        if (event.properties.sessionID === this.activeSessionId) {
          this.thread = this.thread.filter((item) => item.info.id !== event.properties.messageID);
        }
        break;
      }
      case "message.part.updated": {
        this.upsertPart(event.properties.part, event.properties.delta);
        break;
      }
      case "message.part.removed": {
        if (event.properties.sessionID === this.activeSessionId) {
          this.thread = this.thread.map((entry) => {
            if (entry.info.id !== event.properties.messageID) {
              return entry;
            }
            return {
              ...entry,
              parts: entry.parts.filter((part) => part.id !== event.properties.partID)
            };
          });
        }
        break;
      }
      case "permission.updated": {
        this.permissions.set(event.properties.id, event.properties);
        break;
      }
      case "permission.replied": {
        this.permissions.delete(event.properties.permissionID);
        break;
      }
      case "todo.updated": {
        if (event.properties.sessionID === this.activeSessionId) {
          this.todos = event.properties.todos;
        }
        break;
      }
      case "session.diff": {
        if (event.properties.sessionID === this.activeSessionId) {
          this.diffs = event.properties.diff;
        }
        break;
      }
      case "session.error": {
        this.lastError = this.formatSessionError(event.properties.error);
        if (event.properties.sessionID) {
          this.sessionStatuses.set(event.properties.sessionID, { type: "idle" });
        }
        this.updateBusyPolling();
        break;
      }
      case "session.compacted": {
        if (event.properties.sessionID === this.activeSessionId) {
          await this.loadActiveSession(event.properties.sessionID);
        }
        break;
      }
      default:
        break;
    }
    this.emitState();
  }
  formatSessionError(error) {
    if (!error || typeof error !== "object") {
      return void 0;
    }
    if ("data" in error && error.data && typeof error.data === "object" && "message" in error.data) {
      return String(error.data.message);
    }
    if ("name" in error) {
      return String(error.name);
    }
    return "OpenCode reported an error.";
  }
  upsertSession(session) {
    const index = this.sessions.findIndex((item) => item.id === session.id);
    if (index === -1) {
      this.sessions = [session, ...this.sessions];
    } else {
      this.sessions = [
        ...this.sessions.slice(0, index),
        session,
        ...this.sessions.slice(index + 1)
      ];
    }
    this.sessions = [...this.sessions].sort((left, right) => right.time.updated - left.time.updated);
  }
  upsertMessage(message) {
    if (message.sessionID !== this.activeSessionId) {
      return;
    }
    const index = this.thread.findIndex((entry) => entry.info.id === message.id);
    if (index === -1) {
      this.thread = [...this.thread, { info: message, parts: [] }];
      return;
    }
    const current = this.thread[index];
    this.thread = [
      ...this.thread.slice(0, index),
      { ...current, info: message },
      ...this.thread.slice(index + 1)
    ];
  }
  upsertPart(part, delta) {
    if (part.sessionID !== this.activeSessionId) {
      return;
    }
    const messageIndex = this.thread.findIndex((entry) => entry.info.id === part.messageID);
    if (messageIndex === -1) {
      return;
    }
    const message = this.thread[messageIndex];
    const partIndex = message.parts.findIndex((item) => item.id === part.id);
    if (typeof delta === "string" && delta && (part.type === "text" || part.type === "reasoning")) {
      const nextText = typeof part.text === "string" ? part.text : "";
      if (partIndex === -1) {
        if (!nextText) {
          part = {
            ...part,
            text: delta
          };
        }
      } else {
        const currentPart = message.parts[partIndex];
        if (currentPart?.type === "text" || currentPart?.type === "reasoning") {
          const currentText = typeof currentPart.text === "string" ? currentPart.text : "";
          if (nextText === currentText) {
            part = {
              ...part,
              text: currentText + delta
            };
          }
        }
      }
    }
    const nextParts = partIndex === -1 ? [...message.parts, part] : [
      ...message.parts.slice(0, partIndex),
      part,
      ...message.parts.slice(partIndex + 1)
    ];
    this.thread = [
      ...this.thread.slice(0, messageIndex),
      { ...message, parts: nextParts },
      ...this.thread.slice(messageIndex + 1)
    ];
  }
  getActivePermissions() {
    if (!this.activeSessionId) {
      return [];
    }
    return [...this.permissions.values()].filter((item) => item.sessionID === this.activeSessionId);
  }
  getWorkspaceContext() {
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    const activeFolder = activeUri ? vscode.workspace.getWorkspaceFolder(activeUri) : void 0;
    const folder = activeFolder ?? vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return {
        hasWorkspace: false,
        name: "No workspace"
      };
    }
    return {
      hasWorkspace: true,
      name: folder.name,
      directory: folder.uri.fsPath
    };
  }
  getSettings() {
    const config = vscode.workspace.getConfiguration("opencodeVisual");
    return {
      opencodePath: config.get("opencodePath", "opencode"),
      serverBaseUrl: config.get("serverBaseUrl", "http://127.0.0.1:4096"),
      autoStartServer: config.get("autoStartServer", true),
      debugServerLogs: config.get("debugServerLogs", false)
    };
  }
  async startManagedServer() {
    this.stopServer();
    const settings = this.getSettings();
    const targetUrl = new URL(settings.serverBaseUrl);
    const preferredPort = Number(targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80));
    try {
      return await this.spawnManagedServer(targetUrl.hostname, preferredPort, settings);
    } catch (error) {
      const fallbackPort = await this.findAvailablePort(targetUrl.hostname);
      if (!fallbackPort || fallbackPort === preferredPort) {
        throw error;
      }
      this.output.appendLine(
        `[server] Failed to start on ${preferredPort}. Retrying on free port ${fallbackPort}.`
      );
      return await this.spawnManagedServer(targetUrl.hostname, fallbackPort, settings);
    }
  }
  async spawnManagedServer(hostname, port, settings) {
    const args = [
      "serve",
      `--hostname=${hostname}`,
      `--port=${String(port)}`
    ];
    const env3 = this.buildManagedServerEnv();
    const command = await this.resolveOpencodeCommand(settings.opencodePath, env3.PATH);
    const proc = (0, import_node_child_process.spawn)(command, args, {
      cwd: this.currentDirectory,
      env: env3,
      shell: process.platform === "win32" && (!this.looksLikeFilePath(command) || this.requiresWindowsShell(command)),
      stdio: "pipe"
    });
    const url = await new Promise((resolve2, reject) => {
      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error("Timed out while starting the OpenCode server."));
      }, 1e4);
      let output = "";
      let resolved = false;
      const onData = (chunk) => {
        const text = chunk.toString();
        output += text;
        if (settings.debugServerLogs) {
          this.output.append(text);
        }
        if (resolved) {
          return;
        }
        const lines = output.split(/\r?\n/);
        for (const line of lines) {
          const match = line.match(/opencode server listening on\s+(https?:\/\/[^\s]+)/i);
          if (match) {
            resolved = true;
            clearTimeout(timeout);
            resolve2(match[1]);
            return;
          }
        }
      };
      proc.stdout.on("data", onData);
      proc.stderr.on("data", onData);
      proc.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      proc.on("exit", (code) => {
        if (resolved) {
          return;
        }
        clearTimeout(timeout);
        reject(new Error(`OpenCode server exited early with code ${code}. ${output}`.trim()));
      });
    });
    this.server = {
      process: proc,
      url
    };
    return this.server;
  }
  async findAvailablePort(hostname) {
    return await new Promise((resolve2, reject) => {
      const server = net.createServer();
      server.unref();
      server.on("error", reject);
      server.listen(0, hostname, () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          server.close(() => reject(new Error("Failed to determine an available local port.")));
          return;
        }
        const { port } = address;
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve2(port);
        });
      });
    });
  }
  stopServer() {
    if (!this.server) {
      return;
    }
    this.server.process.kill();
    this.server = void 0;
  }
  buildManagedServerEnv() {
    const env3 = {
      ...process.env
    };
    if (process.platform === "win32") {
      return env3;
    }
    const current = this.splitPathEntries(env3.PATH);
    const extras = this.getCommonBinaryDirectories();
    for (const entry of extras) {
      if (!current.includes(entry)) {
        current.push(entry);
      }
    }
    env3.PATH = current.join(path.delimiter);
    return env3;
  }
  getCommonBinaryDirectories() {
    if (process.platform === "win32") {
      return [];
    }
    const home = os.homedir();
    const candidates = [
      "/opt/homebrew/sbin",
      "/opt/homebrew/bin",
      "/usr/local/sbin",
      "/usr/local/bin",
      "/usr/sbin",
      "/usr/bin",
      "/snap/bin",
      "/var/lib/snapd/snap/bin",
      home ? path.join(home, ".local", "bin") : "",
      home ? path.join(home, ".bun", "bin") : "",
      home ? path.join(home, ".cargo", "bin") : "",
      home ? path.join(home, "bin") : ""
    ];
    return candidates.filter((entry) => Boolean(entry) && fs.existsSync(entry));
  }
  splitPathEntries(value) {
    return (value ?? "").split(path.delimiter).map((item) => item.trim()).filter(Boolean);
  }
  looksLikeFilePath(value) {
    return value.startsWith("~") || path.isAbsolute(value) || value.includes("/") || value.includes("\\");
  }
  requiresWindowsShell(value) {
    if (process.platform !== "win32") {
      return false;
    }
    const ext = path.extname(value).toLowerCase();
    return ext === ".cmd" || ext === ".bat";
  }
  expandHomeDirectory(value) {
    if (!value.startsWith("~")) {
      return value;
    }
    const home = os.homedir();
    if (!home) {
      return value;
    }
    if (value === "~") {
      return home;
    }
    if (value.startsWith("~/") || value.startsWith("~\\")) {
      return path.join(home, value.slice(2));
    }
    return value;
  }
  async resolveOpencodeCommand(configuredPath, envPath) {
    const configured = (configuredPath || "opencode").trim() || "opencode";
    const expanded = this.expandHomeDirectory(configured);
    if (this.looksLikeFilePath(expanded)) {
      if (await this.fileCanExecute(expanded)) {
        return expanded;
      }
      throw new Error(`OpenCode executable not found at configured path: ${expanded}`);
    }
    const fromPath = await this.resolveCommandFromPath(expanded, envPath);
    if (fromPath) {
      return fromPath;
    }
    if (expanded === "opencode") {
      const fromWellKnown = await this.resolveFromWellKnownLocations();
      if (fromWellKnown) {
        return fromWellKnown;
      }
    }
    const fromShell = await this.resolveCommandFromLoginShell(expanded);
    if (fromShell) {
      return fromShell;
    }
    return expanded;
  }
  async resolveCommandFromPath(command, pathValue) {
    const directories = this.splitPathEntries(pathValue);
    if (directories.length === 0) {
      return void 0;
    }
    const hasExt = path.extname(command).length > 0;
    const pathExtensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";").map((item) => item.trim()).filter(Boolean) : [];
    for (const directory of directories) {
      const base = path.join(directory, command);
      const candidates = process.platform === "win32" && !hasExt ? pathExtensions.map((ext) => `${base}${ext}`) : [base];
      for (const candidate of candidates) {
        if (await this.fileCanExecute(candidate)) {
          return candidate;
        }
      }
    }
    return void 0;
  }
  async fileCanExecute(filePath) {
    const mode = process.platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK;
    try {
      await fs.promises.access(filePath, mode);
      return true;
    } catch {
      return false;
    }
  }
  async resolveFromWellKnownLocations() {
    const candidates = [];
    const home = os.homedir();
    if (process.platform === "win32") {
      if (process.env.LOCALAPPDATA) {
        candidates.push(path.join(process.env.LOCALAPPDATA, "Programs", "opencode", "opencode.exe"));
      }
      if (home) {
        candidates.push(path.join(home, "scoop", "shims", "opencode.exe"));
      }
    } else {
      candidates.push(
        "/opt/homebrew/bin/opencode",
        "/usr/local/bin/opencode",
        "/usr/bin/opencode",
        "/snap/bin/opencode",
        "/var/lib/snapd/snap/bin/opencode"
      );
      if (home) {
        candidates.push(
          path.join(home, ".local", "bin", "opencode"),
          path.join(home, "bin", "opencode")
        );
      }
    }
    for (const candidate of candidates) {
      if (await this.fileCanExecute(candidate)) {
        return candidate;
      }
    }
    return void 0;
  }
  async resolveCommandFromLoginShell(command) {
    if (process.platform === "win32") {
      return void 0;
    }
    if (!/^[A-Za-z0-9._-]+$/.test(command)) {
      return void 0;
    }
    const shell = process.env.SHELL;
    if (!shell) {
      return void 0;
    }
    const located = await new Promise((resolve2) => {
      const proc = (0, import_node_child_process.spawn)(shell, ["-ilc", `command -v ${command}`], {
        env: {
          ...process.env
        },
        stdio: ["ignore", "pipe", "ignore"]
      });
      const timeout = setTimeout(() => {
        proc.kill();
        resolve2(void 0);
      }, COMMAND_LOOKUP_TIMEOUT_MS);
      let stdout = "";
      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      proc.on("error", () => {
        clearTimeout(timeout);
        resolve2(void 0);
      });
      proc.on("exit", () => {
        clearTimeout(timeout);
        const candidate = stdout.split(/\r?\n/).map((line) => line.trim()).find((line) => line.startsWith("/") || /^[A-Za-z]:[\\/]/.test(line));
        resolve2(candidate ? this.expandHomeDirectory(candidate) : void 0);
      });
    });
    if (!located) {
      return void 0;
    }
    if (await this.fileCanExecute(located)) {
      return located;
    }
    return void 0;
  }
  formatError(error) {
    const text = error instanceof Error ? error.message : String(error);
    if (/executable not found at configured path:/i.test(text)) {
      return `${text}. Update opencodeVisual.opencodePath to a valid executable path.`;
    }
    if (/enoent|not recognized as an internal or external command|spawn\s+.*\s+enoent/i.test(text)) {
      return "OpenCode CLI was not found. Install OpenCode or set opencodeVisual.opencodePath to the full executable path.";
    }
    if (/timed out while starting the opencode server/i.test(text)) {
      return "Timed out while starting OpenCode server. Verify `opencode serve` works in a terminal and that localhost is reachable.";
    }
    return text;
  }
  getNetworkHint(detail) {
    if (/executable not found at configured path:/i.test(detail)) {
      return "Configured OpenCode path is invalid. Update `opencodeVisual.opencodePath` to a valid executable path.";
    }
    if (/enoent|not found|not recognized as an internal or external command|spawn\s+.*\s+enoent/i.test(detail)) {
      return "OpenCode CLI is not available to VS Code. Set `opencodeVisual.opencodePath` to the full path (for example `/opt/homebrew/bin/opencode` or `~/.local/bin/opencode`).";
    }
    if (/econnrefused|econnreset|econnaborted|fetch failed|timed out|enotfound|eai_again|socket|network error/i.test(detail.toLowerCase())) {
      return "OpenCode server is unreachable. Check `opencodeVisual.serverBaseUrl`, then restart the local server from the command palette.";
    }
    return "OpenCode request failed. Open extension output for diagnostics.";
  }
  emitState() {
    this.stateEmitter.fire(this.getState());
  }
  persistActiveSessionId() {
    const key = this.getActiveSessionStorageKey(this.currentDirectory);
    if (!key) {
      return;
    }
    void this.context.workspaceState.update(key, this.activeSessionId ?? null);
    const last = this.getLastSessionStorageKey(this.currentDirectory);
    if (last) {
      void this.context.workspaceState.update(last, this.activeSessionId ?? null);
    }
  }
  getStoredActiveSessionId(directory) {
    const key = this.getActiveSessionStorageKey(directory);
    if (!key) {
      return void 0;
    }
    return this.context.workspaceState.get(key);
  }
  getStoredLastSessionId(directory) {
    const key = this.getLastSessionStorageKey(directory);
    if (!key) {
      return void 0;
    }
    return this.context.workspaceState.get(key);
  }
  getActiveSessionStorageKey(directory) {
    const normalized = this.normalizeDirectoryForKey(directory);
    if (!normalized) {
      return void 0;
    }
    return `${ACTIVE_SESSION_STORAGE_PREFIX}:${normalized}`;
  }
  getLastSessionStorageKey(directory) {
    if (!directory) {
      return void 0;
    }
    const root = this.projectRoot(directory);
    if (!root) {
      return void 0;
    }
    return `${LAST_SESSION_STORAGE_PREFIX}:${root}`;
  }
  projectRoot(directory) {
    if (!directory) return void 0;
    const project = this.project;
    if (!project?.worktree) {
      return this.normalizeDirectoryForKey(directory);
    }
    const roots = [project.worktree, ...project.sandboxes ?? []];
    const root = roots.find((item) => sameWorkspace(item, directory));
    return this.normalizeDirectoryForKey(root ?? directory);
  }
  normalizeDirectoryForKey(directory) {
    if (!directory) {
      return void 0;
    }
    const resolved = path.resolve(directory);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  }
  sameDirectory(left, right) {
    return this.normalizeDirectoryForKey(left) === this.normalizeDirectoryForKey(right);
  }
};

// src/sidebarProvider.ts
var path2 = __toESM(require("node:path"));
var vscode3 = __toESM(require("vscode"));

// src/webviewHtml.ts
var vscode2 = __toESM(require("vscode"));
function createNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let index = 0; index < 32; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}
var themePreload = `;(function () {
  function setItem(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {}
  }

  function getItem(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  function removeItem(key) {
    try {
      localStorage.removeItem(key)
    } catch {}
  }

  function ensureObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value
    }
    return {}
  }

  function readJson(key, fallback) {
    try {
      var raw = getItem(key)
      if (!raw) return fallback
      var parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed
      }
      return fallback
    } catch {
      return fallback
    }
  }

  function writeJson(key, value) {
    try {
      setItem(key, JSON.stringify(value))
    } catch {}
  }

  function base64UrlEncode(value) {
    try {
      var bytes = new TextEncoder().encode(value)
      var binary = ""
      for (var index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index])
      }
      return btoa(binary).replace(/+/g, "-").replace(///g, "_").replace(/=/g, "")
    } catch {
      return ""
    }
  }

  var cfg = window.__OPENCODE_VSCODE_CONFIG__ || {}
  var nativeSettings = cfg.nativeSettings && typeof cfg.nativeSettings === "object" ? cfg.nativeSettings : null
  var hasNativeScheme = false

  if (nativeSettings) {
    if (typeof nativeSettings.themeId === "string" && nativeSettings.themeId) {
      setItem("opencode-theme-id", nativeSettings.themeId)
    }

    if (
      nativeSettings.uiColorScheme === "system" ||
      nativeSettings.uiColorScheme === "light" ||
      nativeSettings.uiColorScheme === "dark"
    ) {
      setItem("opencode-color-scheme", nativeSettings.uiColorScheme)
      hasNativeScheme = true
    }

    if (nativeSettings.language === "auto") {
      removeItem("opencode.global.dat:language")
    } else if (typeof nativeSettings.language === "string" && nativeSettings.language) {
      writeJson("opencode.global.dat:language", { locale: nativeSettings.language })
    }

    var settings = ensureObject(readJson("settings.v3", {}))
    settings.general = ensureObject(settings.general)
    settings.updates = ensureObject(settings.updates)
    settings.appearance = ensureObject(settings.appearance)
    settings.notifications = ensureObject(settings.notifications)
    settings.sounds = ensureObject(settings.sounds)

    settings.general.showReasoningSummaries = !!nativeSettings.showReasoningSummaries
    settings.general.shellToolPartsExpanded = !!nativeSettings.shellToolPartsExpanded
    settings.general.editToolPartsExpanded = !!nativeSettings.editToolPartsExpanded
    settings.general.autoSave = nativeSettings.autoSave !== false
    settings.general.releaseNotes = nativeSettings.releaseNotes !== false
    settings.updates.startup = nativeSettings.checkUpdatesOnStartup !== false
    settings.appearance.sans = typeof nativeSettings.uiFont === "string" ? nativeSettings.uiFont : ""
    settings.appearance.mono = typeof nativeSettings.codeFont === "string" ? nativeSettings.codeFont : ""
    settings.appearance.fontSize =
      typeof nativeSettings.fontSize === "number" && Number.isFinite(nativeSettings.fontSize)
        ? Math.max(10, Math.min(28, nativeSettings.fontSize))
        : 14

    settings.notifications.agent = nativeSettings.notifyAgent !== false
    settings.notifications.permissions = nativeSettings.notifyPermissions !== false
    settings.notifications.errors = !!nativeSettings.notifyErrors

    settings.sounds.agentEnabled = nativeSettings.soundAgentEnabled !== false
    settings.sounds.agent =
      typeof nativeSettings.soundAgent === "string" && nativeSettings.soundAgent
        ? nativeSettings.soundAgent
        : "staplebops-01"
    settings.sounds.permissionsEnabled = nativeSettings.soundPermissionsEnabled !== false
    settings.sounds.permissions =
      typeof nativeSettings.soundPermissions === "string" && nativeSettings.soundPermissions
        ? nativeSettings.soundPermissions
        : "staplebops-02"
    settings.sounds.errorsEnabled = nativeSettings.soundErrorsEnabled !== false
    settings.sounds.errors =
      typeof nativeSettings.soundErrors === "string" && nativeSettings.soundErrors
        ? nativeSettings.soundErrors
        : "nope-03"

    if (
      nativeSettings.customKeybinds &&
      typeof nativeSettings.customKeybinds === "object" &&
      !Array.isArray(nativeSettings.customKeybinds)
    ) {
      var keybinds = {}
      for (var keybindId in nativeSettings.customKeybinds) {
        if (!Object.prototype.hasOwnProperty.call(nativeSettings.customKeybinds, keybindId)) continue
        var keybindValue = nativeSettings.customKeybinds[keybindId]
        if (typeof keybindValue !== "string") continue
        keybinds[keybindId] = keybindValue
      }
      settings.keybinds = keybinds
    }

    writeJson("settings.v3", settings)

    if (
      nativeSettings.modelVisibility &&
      typeof nativeSettings.modelVisibility === "object" &&
      !Array.isArray(nativeSettings.modelVisibility)
    ) {
      var modelStore = ensureObject(readJson("opencode.global.dat:model", {}))
      var recent = Array.isArray(modelStore.recent) ? modelStore.recent : []
      var variant = ensureObject(modelStore.variant)
      var user = []
      for (var modelKey in nativeSettings.modelVisibility) {
        if (!Object.prototype.hasOwnProperty.call(nativeSettings.modelVisibility, modelKey)) continue
        var visibility = nativeSettings.modelVisibility[modelKey]
        if (visibility !== "show" && visibility !== "hide") continue
        var slash = modelKey.indexOf("/")
        if (slash <= 0 || slash >= modelKey.length - 1) continue
        user.push({
          providerID: modelKey.slice(0, slash),
          modelID: modelKey.slice(slash + 1),
          visibility: visibility,
        })
      }
      modelStore.user = user
      modelStore.recent = recent
      modelStore.variant = variant
      writeJson("opencode.global.dat:model", modelStore)
    }

    if (
      typeof nativeSettings.autoAcceptWorkspacePermissions === "boolean" &&
      typeof cfg.workspaceDirectory === "string" &&
      cfg.workspaceDirectory
    ) {
      var permissionStore = ensureObject(readJson("opencode.global.dat:permission", {}))
      permissionStore.autoAccept = ensureObject(permissionStore.autoAccept)
      var key = base64UrlEncode(cfg.workspaceDirectory) + "/*"
      if (key) {
        permissionStore.autoAccept[key] = nativeSettings.autoAcceptWorkspacePermissions
        writeJson("opencode.global.dat:permission", permissionStore)
      }
    }
  }

  var key = "opencode-theme-id"
  var themeId = getItem(key) || "oc-2"

  var hostScheme = cfg && (cfg.colorScheme === "dark" || cfg.colorScheme === "light") ? cfg.colorScheme : null
  if (hostScheme && !hasNativeScheme) {
    setItem("opencode-color-scheme", hostScheme)
  }

  if (themeId === "oc-1") {
    themeId = "oc-2"
    setItem(key, themeId)
    removeItem("opencode-theme-css-light")
    removeItem("opencode-theme-css-dark")
  }

  var scheme = getItem("opencode-color-scheme") || hostScheme || "system"
  var isDark = scheme === "dark" || (scheme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  var mode = isDark ? "dark" : "light"

  document.documentElement.dataset.theme = themeId
  document.documentElement.dataset.colorScheme = mode

  if (themeId === "oc-2") return

  var css = getItem("opencode-theme-css-" + mode)
  if (css) {
    var style = document.createElement("style")
    style.id = "oc-theme-preload"
    style.textContent =
      ":root{color-scheme:" +
      mode +
      ";--text-mix-blend-mode:" +
      (isDark ? "plus-lighter" : "multiply") +
      ";" +
      css +
      "}"
    document.head.appendChild(style)
  }
})()`;
function getWebviewHtml(webview, extensionUri, config) {
  const nonce = createNonce();
  const scriptUri = webview.asWebviewUri(vscode2.Uri.joinPath(extensionUri, "media", "app", "app.js"));
  const styleUri = webview.asWebviewUri(vscode2.Uri.joinPath(extensionUri, "media", "app", "app.css"));
  const settingsBootStyle = config.settingsMode ? `<style nonce="${nonce}">
    #root[data-settings-ready="false"] {
      opacity: 0;
    }

    #root[data-settings-ready="true"] {
      opacity: 1;
    }

    [data-tauri-drag-region],
    [data-component="sidebar-nav-desktop"],
    [data-component="sidebar-nav-mobile"],
    [data-component="sidebar-rail"] {
      display: none !important;
    }

    [data-component="dialog-overlay"] {
      display: none !important;
      pointer-events: none !important;
    }

    [data-component="dialog"][data-transition] [data-slot="dialog-content"] {
      animation: none !important;
      transition: none !important;
    }
  </style>` : "";
  return `<!DOCTYPE html>
<html lang="en" style="background-color: var(--background-base)">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https: data: blob:; font-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; connect-src ${webview.cspSource} http: https: ws: wss:; worker-src ${webview.cspSource} blob:;"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    ${settingsBootStyle}
    <script nonce="${nonce}">window.__OPENCODE_VSCODE_CONFIG__ = ${JSON.stringify(config)};</script>
    <script nonce="${nonce}">${themePreload}</script>
    <title>OpenCode</title>
  </head>
  <body class="antialiased overscroll-none text-12-regular overflow-hidden">
    <div id="root" class="flex flex-col h-dvh p-px"></div>
    <script type="module" src="${scriptUri}"></script>
  </body>
</html>`;
}

// src/sidebarProvider.ts
var OpenCodeSidebarProvider = class _OpenCodeSidebarProvider {
  constructor(context, service) {
    this.context = context;
    this.service = service;
    this.disposables.push(
      vscode3.workspace.registerTextDocumentContentProvider(_OpenCodeSidebarProvider.diffScheme, {
        provideTextDocumentContent: (uri) => this.diffContent.get(uri.toString()) ?? ""
      }),
      vscode3.workspace.onDidCloseTextDocument((document) => {
        if (document.uri.scheme !== _OpenCodeSidebarProvider.diffScheme) {
          return;
        }
        this.diffContent.delete(document.uri.toString());
      })
    );
  }
  static viewId = "opencodeVisual.sidebar";
  static diffScheme = "opencode-diff";
  static maxDiffEntries = 200;
  disposables = [];
  fetches = /* @__PURE__ */ new Map();
  diffContent = /* @__PURE__ */ new Map();
  view;
  ready = false;
  pendingMessages = [];
  dispose() {
    vscode3.Disposable.from(...this.disposables).dispose();
  }
  async reveal() {
    await vscode3.commands.executeCommand("workbench.view.extension.opencodeVisual");
    this.view?.show?.(true);
  }
  async reload() {
    await this.render();
  }
  async openSettings() {
    await vscode3.commands.executeCommand("opencodeVisual.openSettings");
  }
  getExtensionSettings() {
    const config = vscode3.workspace.getConfiguration("opencodeVisual");
    return {
      opencodePath: config.get("opencodePath", "opencode"),
      serverBaseUrl: config.get("serverBaseUrl", "http://127.0.0.1:4096"),
      autoStartServer: config.get("autoStartServer", true),
      debugServerLogs: config.get("debugServerLogs", false)
    };
  }
  async setExtensionSetting(key, value) {
    const config = vscode3.workspace.getConfiguration("opencodeVisual");
    if ((key === "opencodePath" || key === "serverBaseUrl") && typeof value !== "string") {
      throw new Error(`Invalid value for ${key}`);
    }
    if ((key === "autoStartServer" || key === "debugServerLogs") && typeof value !== "boolean") {
      throw new Error(`Invalid value for ${key}`);
    }
    await config.update(key, value, vscode3.ConfigurationTarget.Global);
    return this.getExtensionSettings();
  }
  dispatchAction(action) {
    this.postMessage({ type: "hostAction", action });
  }
  notifyTheme() {
    this.postMessage({
      type: "hostTheme",
      colorScheme: this.getColorScheme()
    });
  }
  async resolveWebviewView(webviewView) {
    this.view = webviewView;
    this.ready = false;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode3.Uri.joinPath(this.context.extensionUri, "media")]
    };
    const receiveDisposable = webviewView.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });
    const disposeDisposable = webviewView.onDidDispose(() => {
      this.view = void 0;
      receiveDisposable.dispose();
    });
    this.disposables.push(receiveDisposable, disposeDisposable);
    await this.render();
  }
  async handleMessage(message) {
    try {
      if (message.type === "webviewReady") {
        this.ready = true;
        this.flushMessages();
        this.notifyTheme();
        return;
      }
      if (message.type === "openLink") {
        await vscode3.env.openExternal(vscode3.Uri.parse(message.url));
        return;
      }
      if (message.type === "openDiff") {
        await this.openDiff(message.filePath, message.before, message.after);
        return;
      }
      if (message.type === "openSettings") {
        await this.openSettings();
        return;
      }
      if (message.type === "pickDirectory") {
        this.postMessage({
          type: "pickDirectoryResult",
          requestId: message.requestId,
          value: null
        });
        return;
      }
      if (message.type === "fetchAbort") {
        this.fetches.get(message.requestId)?.abort();
        this.fetches.delete(message.requestId);
        return;
      }
      if (message.type === "fetchRequest") {
        await this.handleFetch(message);
        return;
      }
      if (message.type === "getExtensionSettings") {
        this.postMessage({
          type: "extensionSettingsResult",
          requestId: message.requestId,
          value: this.getExtensionSettings()
        });
        return;
      }
      if (message.type === "setExtensionSetting") {
        try {
          const value = await this.setExtensionSetting(message.key, message.value);
          this.postMessage({
            type: "extensionSettingResult",
            requestId: message.requestId,
            value
          });
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          this.postMessage({
            type: "extensionSettingResult",
            requestId: message.requestId,
            value: null,
            error: text
          });
        }
        return;
      }
      if (message.type === "restartServer") {
        try {
          await vscode3.commands.executeCommand("opencodeVisual.restartServer");
          this.postMessage({
            type: "restartServerResult",
            requestId: message.requestId
          });
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          this.postMessage({
            type: "restartServerResult",
            requestId: message.requestId,
            error: text
          });
        }
        return;
      }
      return;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      vscode3.window.showErrorMessage(messageText);
    }
  }
  async render() {
    if (!this.view) {
      return;
    }
    this.ready = false;
    let disableHealthCheck = false;
    let serverUrl = this.service.getResolvedServerBaseUrl();
    try {
      serverUrl = await this.service.ensureServerReady();
      disableHealthCheck = await this.shouldDisableHealthCheck(serverUrl);
    } catch {
      disableHealthCheck = true;
      serverUrl = this.service.getResolvedServerBaseUrl();
    }
    const workspaceDirectory = this.service.getWorkspaceContext().directory ?? null;
    this.view.webview.html = getWebviewHtml(this.view.webview, this.context.extensionUri, {
      serverUrl,
      version: String(this.context.extension.packageJSON.version ?? "0.0.0"),
      workspaceDirectory,
      colorScheme: this.getColorScheme(),
      disableHealthCheck,
      nativeSettings: this.getNativeSettings()
    });
  }
  getNativeSettings() {
    const config = vscode3.workspace.getConfiguration("opencodeVisual");
    return {
      language: config.get("language", "auto"),
      uiColorScheme: config.get("uiColorScheme", "system"),
      themeId: config.get("themeId", "oc-2"),
      uiFont: config.get("uiFont", ""),
      codeFont: config.get("codeFont", ""),
      autoSave: config.get("autoSave", true),
      fontSize: config.get("fontSize", 14),
      showReasoningSummaries: config.get("showReasoningSummaries", false),
      shellToolPartsExpanded: config.get("shellToolPartsExpanded", false),
      editToolPartsExpanded: config.get("editToolPartsExpanded", false),
      releaseNotes: config.get("releaseNotes", true),
      checkUpdatesOnStartup: config.get("checkUpdatesOnStartup", true),
      notifyAgent: config.get("notifyAgent", true),
      notifyPermissions: config.get("notifyPermissions", true),
      notifyErrors: config.get("notifyErrors", false),
      soundAgentEnabled: config.get("soundAgentEnabled", true),
      soundAgent: config.get("soundAgent", "staplebops-01"),
      soundPermissionsEnabled: config.get("soundPermissionsEnabled", true),
      soundPermissions: config.get("soundPermissions", "staplebops-02"),
      soundErrorsEnabled: config.get("soundErrorsEnabled", true),
      soundErrors: config.get("soundErrors", "nope-03"),
      autoAcceptWorkspacePermissions: config.get("autoAcceptWorkspacePermissions", false),
      customKeybinds: config.get("customKeybinds", null),
      modelVisibility: config.get("modelVisibility", null)
    };
  }
  async shouldDisableHealthCheck(serverUrl) {
    let target;
    try {
      target = new URL("/global/health", serverUrl).toString();
    } catch {
      return true;
    }
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 2500);
    try {
      const response = await fetch(target, {
        method: "GET",
        signal: abort.signal
      });
      if (response.status === 404 || response.status === 405 || response.status === 501) {
        return true;
      }
      if (response.ok) {
        return false;
      }
      const text = await response.text().catch(() => "");
      if (/not found|unknown route|cannot\s+\w+\s+\/global\/health/i.test(text)) {
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
  getColorScheme() {
    const kind = vscode3.window.activeColorTheme.kind;
    if (kind === vscode3.ColorThemeKind.Light || kind === vscode3.ColorThemeKind.HighContrastLight) {
      return "light";
    }
    return "dark";
  }
  async openFile(filePath, range) {
    const baseDirectory = this.service.getActiveSessionDirectory();
    const targetPath = path2.isAbsolute(filePath) ? filePath : path2.join(baseDirectory ?? "", filePath);
    const uri = vscode3.Uri.file(targetPath);
    const document = await vscode3.workspace.openTextDocument(uri);
    const editor = await vscode3.window.showTextDocument(document, { preview: false });
    if (range) {
      const selection = new vscode3.Selection(
        new vscode3.Position(range.startLine, range.startCharacter),
        new vscode3.Position(range.endLine, range.endCharacter)
      );
      editor.selection = selection;
      editor.revealRange(selection, vscode3.TextEditorRevealType.InCenter);
    }
  }
  async openDiff(filePath, before, after) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const left = this.createDiffUri(filePath, "before", before, id);
    const right = this.createDiffUri(filePath, "after", after, id);
    const title = `OpenCode Diff: ${filePath}`;
    await vscode3.commands.executeCommand("vscode.diff", left, right, title, { preview: false });
  }
  createDiffUri(filePath, side, content, id) {
    const normalized = filePath.replaceAll("\\", "/").replace(/^\/+/, "") || "untitled";
    const uri = vscode3.Uri.from({
      scheme: _OpenCodeSidebarProvider.diffScheme,
      path: `/${side}/${id}/${normalized}`
    });
    this.diffContent.set(uri.toString(), content);
    this.trimDiffContent();
    return uri;
  }
  trimDiffContent() {
    while (this.diffContent.size > _OpenCodeSidebarProvider.maxDiffEntries) {
      const key = this.diffContent.keys().next().value;
      if (!key) {
        return;
      }
      this.diffContent.delete(key);
    }
  }
  flushMessages() {
    while (this.ready && this.view && this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (!message) {
        return;
      }
      void this.view.webview.postMessage(message);
    }
  }
  postMessage(message) {
    if (!this.ready || !this.view) {
      this.pendingMessages.push(message);
      return;
    }
    void this.view.webview.postMessage(message);
  }
  resolveFetchUrl(input) {
    try {
      const url = new URL(input);
      if (url.hostname === "opencode.localhost") {
        const base = this.service.getResolvedServerBaseUrl();
        try {
          const target = new URL(base);
          url.protocol = target.protocol;
          url.hostname = target.hostname;
          url.port = target.port;
        } catch {
          url.hostname = "127.0.0.1";
        }
      }
      return url.toString();
    } catch {
      return input;
    }
  }
  isLocalHostname(hostname) {
    const normalized = hostname.toLowerCase();
    return normalized === "opencode.localhost" || normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "[::1]";
  }
  buildFetchCandidates(input) {
    const primary = this.resolveFetchUrl(input);
    try {
      const url = new URL(primary);
      if (!this.isLocalHostname(url.hostname)) {
        return [primary];
      }
      const candidates = [url.toString()];
      for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
        const candidate = new URL(url.toString());
        candidate.hostname = host;
        const value = candidate.toString();
        if (!candidates.includes(value)) {
          candidates.push(value);
        }
      }
      return candidates;
    } catch {
      return [primary];
    }
  }
  isNetworkFailure(error) {
    const text = error instanceof Error ? error.message : String(error);
    return /econnrefused|econnreset|econnaborted|fetch failed|timed out|enotfound|eai_again|socket|network error/i.test(text);
  }
  async handleFetch(message) {
    const abort = new AbortController();
    this.fetches.set(message.requestId, abort);
    try {
      let response;
      let finalUrl = this.resolveFetchUrl(message.url);
      let lastError;
      for (const candidateUrl of this.buildFetchCandidates(message.url)) {
        finalUrl = candidateUrl;
        try {
          response = await fetch(candidateUrl, {
            method: message.method,
            headers: message.headers,
            body: message.body ? Buffer.from(message.body, "base64") : void 0,
            signal: abort.signal
          });
          break;
        } catch (error) {
          lastError = error;
          if (abort.signal.aborted || !this.isNetworkFailure(error)) {
            throw error;
          }
        }
      }
      if (!response) {
        throw lastError ?? new Error(`Failed to fetch ${finalUrl}`);
      }
      this.postMessage({
        type: "fetchResponse",
        requestId: message.requestId,
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()]
      });
      const reader = response.body?.getReader();
      if (!reader) {
        this.postMessage({ type: "fetchEnd", requestId: message.requestId });
        return;
      }
      while (true) {
        const result = await reader.read();
        if (result.done) {
          break;
        }
        this.postMessage({
          type: "fetchChunk",
          requestId: message.requestId,
          chunk: Buffer.from(result.value).toString("base64")
        });
      }
      this.postMessage({ type: "fetchEnd", requestId: message.requestId });
    } catch (error) {
      if (!abort.signal.aborted) {
        const messageText = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : void 0;
        this.postMessage({
          type: "fetchError",
          requestId: message.requestId,
          message: messageText,
          name: errorName
        });
        const urls = this.buildFetchCandidates(message.url);
        const detail = `method=${message.method} urls=${urls.join(",")} error=${errorName ?? "Error"}: ${messageText}`;
        this.service.reportNetworkIssue(detail);
      }
    } finally {
      this.fetches.delete(message.requestId);
    }
  }
};

// src/settingsPanel.ts
var vscode4 = __toESM(require("vscode"));
var OpenCodeSettingsPanel = class {
  constructor(context, service) {
    this.context = context;
    this.service = service;
  }
  panel;
  ready = false;
  pendingMessages = [];
  fetches = /* @__PURE__ */ new Map();
  panelDisposables = [];
  dispose() {
    for (const abort of this.fetches.values()) {
      abort.abort();
    }
    this.fetches.clear();
    this.disposePanel();
  }
  async open() {
    if (!this.panel) {
      await this.createPanel();
      this.dispatchAction("openSettings");
      return;
    }
    try {
      this.panel.reveal(vscode4.ViewColumn.Active, false);
      await this.render();
    } catch {
      this.panel = void 0;
      this.clearPanelState();
      await this.createPanel();
    }
    this.dispatchAction("openSettings");
  }
  async reload() {
    if (!this.panel) {
      return;
    }
    try {
      await this.render();
    } catch (error) {
      if (this.isDisposedError(error)) {
        this.resetDisposedPanel();
        return;
      }
      throw error;
    }
  }
  notifyTheme() {
    if (!this.panel) {
      return;
    }
    this.postMessage({
      type: "hostTheme",
      colorScheme: this.getColorScheme()
    });
  }
  async createPanel() {
    const panel = vscode4.window.createWebviewPanel(
      "opencodeVisual.settings",
      "OpenCode Settings",
      {
        viewColumn: vscode4.ViewColumn.Active,
        preserveFocus: false
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode4.Uri.joinPath(this.context.extensionUri, "media")]
      }
    );
    this.panel = panel;
    this.ready = false;
    const receiveDisposable = panel.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });
    const disposeDisposable = panel.onDidDispose(() => {
      if (this.panel !== panel) {
        return;
      }
      this.panel = void 0;
      this.clearPanelState();
    });
    this.panelDisposables.push(receiveDisposable, disposeDisposable);
    await this.render();
  }
  disposePanel() {
    const panel = this.panel;
    this.panel = void 0;
    this.clearPanelState();
    if (panel) {
      panel.dispose();
    }
  }
  clearPanelState() {
    this.ready = false;
    this.pendingMessages.length = 0;
    for (const abort of this.fetches.values()) {
      abort.abort();
    }
    this.fetches.clear();
    vscode4.Disposable.from(...this.panelDisposables).dispose();
    this.panelDisposables = [];
  }
  isDisposedError(error) {
    const text = error instanceof Error ? error.message : String(error ?? "");
    return /webview is disposed|disposed/i.test(text);
  }
  resetDisposedPanel() {
    this.panel = void 0;
    this.clearPanelState();
  }
  async handleMessage(message) {
    try {
      if (message.type === "webviewReady") {
        this.ready = true;
        this.flushMessages();
        return;
      }
      if (message.type === "openLink") {
        await vscode4.env.openExternal(vscode4.Uri.parse(message.url));
        return;
      }
      if (message.type === "openDiff") {
        await this.openDiff(message.filePath, message.before, message.after);
        return;
      }
      if (message.type === "openSettings") {
        this.dispatchAction("openSettings");
        return;
      }
      if (message.type === "pickDirectory") {
        this.postMessage({
          type: "pickDirectoryResult",
          requestId: message.requestId,
          value: null
        });
        return;
      }
      if (message.type === "fetchAbort") {
        this.fetches.get(message.requestId)?.abort();
        this.fetches.delete(message.requestId);
        return;
      }
      if (message.type === "fetchRequest") {
        await this.handleFetch(message);
        return;
      }
      if (message.type === "getExtensionSettings") {
        this.postMessage({
          type: "extensionSettingsResult",
          requestId: message.requestId,
          value: this.getExtensionSettings()
        });
        return;
      }
      if (message.type === "setExtensionSetting") {
        try {
          const value = await this.setExtensionSetting(message.key, message.value);
          this.postMessage({
            type: "extensionSettingResult",
            requestId: message.requestId,
            value
          });
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          this.postMessage({
            type: "extensionSettingResult",
            requestId: message.requestId,
            value: null,
            error: text
          });
        }
        return;
      }
      if (message.type === "restartServer") {
        try {
          await vscode4.commands.executeCommand("opencodeVisual.restartServer");
          this.postMessage({
            type: "restartServerResult",
            requestId: message.requestId
          });
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          this.postMessage({
            type: "restartServerResult",
            requestId: message.requestId,
            error: text
          });
        }
        return;
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      void vscode4.window.showErrorMessage(messageText);
    }
  }
  async render() {
    const panel = this.panel;
    if (!panel) {
      return;
    }
    this.ready = false;
    let disableHealthCheck = false;
    let serverUrl = this.service.getResolvedServerBaseUrl();
    try {
      serverUrl = await this.service.ensureServerReady();
      disableHealthCheck = await this.shouldDisableHealthCheck(serverUrl);
    } catch {
      disableHealthCheck = true;
      serverUrl = this.service.getResolvedServerBaseUrl();
    }
    const workspaceDirectory = this.service.getWorkspaceContext().directory ?? null;
    if (this.panel !== panel) {
      return;
    }
    try {
      panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionUri, {
        serverUrl,
        version: String(this.context.extension.packageJSON.version ?? "0.0.0"),
        workspaceDirectory,
        colorScheme: this.getColorScheme(),
        disableHealthCheck,
        settingsMode: true,
        nativeSettings: this.getNativeSettings()
      });
    } catch (error) {
      if (this.isDisposedError(error)) {
        this.resetDisposedPanel();
        return;
      }
      throw error;
    }
  }
  getNativeSettings() {
    const config = vscode4.workspace.getConfiguration("opencodeVisual");
    return {
      language: config.get("language", "auto"),
      uiColorScheme: config.get("uiColorScheme", "system"),
      themeId: config.get("themeId", "oc-2"),
      uiFont: config.get("uiFont", ""),
      codeFont: config.get("codeFont", ""),
      autoSave: config.get("autoSave", true),
      fontSize: config.get("fontSize", 14),
      showReasoningSummaries: config.get("showReasoningSummaries", false),
      shellToolPartsExpanded: config.get("shellToolPartsExpanded", false),
      editToolPartsExpanded: config.get("editToolPartsExpanded", false),
      releaseNotes: config.get("releaseNotes", true),
      checkUpdatesOnStartup: config.get("checkUpdatesOnStartup", true),
      notifyAgent: config.get("notifyAgent", true),
      notifyPermissions: config.get("notifyPermissions", true),
      notifyErrors: config.get("notifyErrors", false),
      soundAgentEnabled: config.get("soundAgentEnabled", true),
      soundAgent: config.get("soundAgent", "staplebops-01"),
      soundPermissionsEnabled: config.get("soundPermissionsEnabled", true),
      soundPermissions: config.get("soundPermissions", "staplebops-02"),
      soundErrorsEnabled: config.get("soundErrorsEnabled", true),
      soundErrors: config.get("soundErrors", "nope-03"),
      autoAcceptWorkspacePermissions: config.get("autoAcceptWorkspacePermissions", false),
      customKeybinds: config.get("customKeybinds", null),
      modelVisibility: config.get("modelVisibility", null)
    };
  }
  getExtensionSettings() {
    const config = vscode4.workspace.getConfiguration("opencodeVisual");
    return {
      opencodePath: config.get("opencodePath", "opencode"),
      serverBaseUrl: config.get("serverBaseUrl", "http://127.0.0.1:4096"),
      autoStartServer: config.get("autoStartServer", true),
      debugServerLogs: config.get("debugServerLogs", false)
    };
  }
  async setExtensionSetting(key, value) {
    const config = vscode4.workspace.getConfiguration("opencodeVisual");
    if ((key === "opencodePath" || key === "serverBaseUrl") && typeof value !== "string") {
      throw new Error(`Invalid value for ${key}`);
    }
    if ((key === "autoStartServer" || key === "debugServerLogs") && typeof value !== "boolean") {
      throw new Error(`Invalid value for ${key}`);
    }
    await config.update(key, value, vscode4.ConfigurationTarget.Global);
    return this.getExtensionSettings();
  }
  async shouldDisableHealthCheck(serverUrl) {
    let target;
    try {
      target = new URL("/global/health", serverUrl).toString();
    } catch {
      return true;
    }
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 2500);
    try {
      const response = await fetch(target, {
        method: "GET",
        signal: abort.signal
      });
      if (response.status === 404 || response.status === 405 || response.status === 501) {
        return true;
      }
      if (response.ok) {
        return false;
      }
      const text = await response.text().catch(() => "");
      if (/not found|unknown route|cannot\s+\w+\s+\/global\/health/i.test(text)) {
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
  getColorScheme() {
    const kind = vscode4.window.activeColorTheme.kind;
    if (kind === vscode4.ColorThemeKind.Light || kind === vscode4.ColorThemeKind.HighContrastLight) {
      return "light";
    }
    return "dark";
  }
  async openDiff(filePath, before, after) {
    const left = await vscode4.workspace.openTextDocument({ content: before });
    const right = await vscode4.workspace.openTextDocument({ content: after });
    const title = `OpenCode Diff: ${filePath}`;
    await vscode4.commands.executeCommand("vscode.diff", left.uri, right.uri, title, { preview: false });
  }
  dispatchAction(action) {
    this.postMessage({
      type: "hostAction",
      action
    });
  }
  postMessage(message) {
    const panel = this.panel;
    if (!this.ready || !panel) {
      this.pendingMessages.push(message);
      return;
    }
    this.sendMessage(panel, message);
  }
  flushMessages() {
    while (this.ready && this.panel && this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (!message) {
        return;
      }
      const panel = this.panel;
      if (!panel) {
        return;
      }
      this.sendMessage(panel, message);
    }
  }
  sendMessage(panel, message) {
    try {
      void panel.webview.postMessage(message).then(void 0, (error) => {
        if (this.isDisposedError(error)) {
          this.resetDisposedPanel();
          return;
        }
        const text = error instanceof Error ? error.message : String(error);
        void vscode4.window.showErrorMessage(text);
      });
    } catch (error) {
      if (this.isDisposedError(error)) {
        this.resetDisposedPanel();
      }
    }
  }
  resolveFetchUrl(input) {
    try {
      const url = new URL(input);
      if (url.hostname === "opencode.localhost") {
        const base = this.service.getResolvedServerBaseUrl();
        try {
          const target = new URL(base);
          url.protocol = target.protocol;
          url.hostname = target.hostname;
          url.port = target.port;
        } catch {
          url.hostname = "127.0.0.1";
        }
      }
      return url.toString();
    } catch {
      return input;
    }
  }
  isLocalHostname(hostname) {
    const normalized = hostname.toLowerCase();
    return normalized === "opencode.localhost" || normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "[::1]";
  }
  buildFetchCandidates(input) {
    const primary = this.resolveFetchUrl(input);
    try {
      const url = new URL(primary);
      if (!this.isLocalHostname(url.hostname)) {
        return [primary];
      }
      const candidates = [url.toString()];
      for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
        const candidate = new URL(url.toString());
        candidate.hostname = host;
        const value = candidate.toString();
        if (!candidates.includes(value)) {
          candidates.push(value);
        }
      }
      return candidates;
    } catch {
      return [primary];
    }
  }
  isNetworkFailure(error) {
    const text = error instanceof Error ? error.message : String(error);
    return /econnrefused|econnreset|econnaborted|fetch failed|timed out|enotfound|eai_again|socket|network error/i.test(text);
  }
  async handleFetch(message) {
    const abort = new AbortController();
    this.fetches.set(message.requestId, abort);
    try {
      let response;
      let finalUrl = this.resolveFetchUrl(message.url);
      let lastError;
      for (const candidateUrl of this.buildFetchCandidates(message.url)) {
        finalUrl = candidateUrl;
        try {
          response = await fetch(candidateUrl, {
            method: message.method,
            headers: message.headers,
            body: message.body ? Buffer.from(message.body, "base64") : void 0,
            signal: abort.signal
          });
          break;
        } catch (error) {
          lastError = error;
          if (abort.signal.aborted || !this.isNetworkFailure(error)) {
            throw error;
          }
        }
      }
      if (!response) {
        throw lastError ?? new Error(`Failed to fetch ${finalUrl}`);
      }
      this.postMessage({
        type: "fetchResponse",
        requestId: message.requestId,
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()]
      });
      const reader = response.body?.getReader();
      if (!reader) {
        this.postMessage({ type: "fetchEnd", requestId: message.requestId });
        return;
      }
      while (true) {
        const result = await reader.read();
        if (result.done) {
          break;
        }
        this.postMessage({
          type: "fetchChunk",
          requestId: message.requestId,
          chunk: Buffer.from(result.value).toString("base64")
        });
      }
      this.postMessage({ type: "fetchEnd", requestId: message.requestId });
    } catch (error) {
      if (!abort.signal.aborted) {
        const messageText = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : void 0;
        this.postMessage({
          type: "fetchError",
          requestId: message.requestId,
          message: messageText,
          name: errorName
        });
        const urls = this.buildFetchCandidates(message.url);
        const detail = `method=${message.method} urls=${urls.join(",")} error=${errorName ?? "Error"}: ${messageText}`;
        this.service.reportNetworkIssue(detail);
      }
    } finally {
      this.fetches.delete(message.requestId);
    }
  }
};

// src/extension.ts
async function activate(context) {
  const service = new OpenCodeService(context);
  const provider = new OpenCodeSidebarProvider(context, service);
  const settingsPanel = new OpenCodeSettingsPanel(context, service);
  const syncWorkspace = (reloadOnChange) => {
    void service.syncWorkspaceContext().then(async (changed) => {
      if (!reloadOnChange || !changed) {
        return;
      }
      await provider.reload();
    }).catch(() => {
    });
  };
  context.subscriptions.push(service, provider, settingsPanel);
  context.subscriptions.push(
    vscode5.window.registerWebviewViewProvider(OpenCodeSidebarProvider.viewId, provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );
  context.subscriptions.push(
    vscode5.window.onDidChangeActiveTextEditor(() => {
      syncWorkspace(false);
    }),
    vscode5.workspace.onDidChangeWorkspaceFolders(() => {
      syncWorkspace(true);
    }),
    vscode5.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("opencodeVisual")) {
        return;
      }
      void provider.reload();
      void settingsPanel.reload();
    }),
    vscode5.window.onDidChangeVisibleTextEditors(() => {
      syncWorkspace(false);
    }),
    vscode5.window.onDidChangeActiveColorTheme(() => {
      provider.notifyTheme();
      settingsPanel.notifyTheme();
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("opencodeVisual.focus", async () => {
      await provider.reveal();
    }),
    vscode5.commands.registerCommand("opencodeVisual.newSession", async () => {
      await provider.reveal();
      provider.dispatchAction("newSession");
    }),
    vscode5.commands.registerCommand("opencodeVisual.refresh", async () => {
      await provider.reload();
      await provider.reveal();
    }),
    vscode5.commands.registerCommand("opencodeVisual.openSettings", async () => {
      await settingsPanel.open();
    }),
    vscode5.commands.registerCommand("opencodeVisual.restartServer", async () => {
      await service.ensureServerReady(true);
      await provider.reload();
      await settingsPanel.reload();
    })
  );
  void service.ensureServerReady().catch(() => {
  });
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
