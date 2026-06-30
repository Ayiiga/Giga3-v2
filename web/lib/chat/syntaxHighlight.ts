const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "class", "import", "export", "from", "async", "await", "try", "catch",
  "def", "elif", "lambda", "print", "true", "false", "null", "undefined",
  "interface", "type", "enum", "switch", "case", "break", "continue",
]);

export function highlightCode(code: string, language?: string): string {
  const lang = (language ?? "").toLowerCase();
  if (lang === "json") return highlightJson(code);
  return highlightGeneric(code);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightJson(code: string): string {
  return escapeHtml(code).replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match, str, colon) => {
      if (str && colon) return `<span class="hl-key">${str}</span>${colon}`;
      if (str) return `<span class="hl-string">${str}</span>`;
      if (/^true|false|null$/.test(match)) return `<span class="hl-keyword">${match}</span>`;
      return `<span class="hl-number">${match}</span>`;
    }
  );
}

function highlightGeneric(code: string): string {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const rest = code.slice(i);
    if (rest.startsWith("//") || rest.startsWith("#")) {
      const end = rest.indexOf("\n");
      const chunk = end === -1 ? rest : rest.slice(0, end);
      out += `<span class="hl-comment">${escapeHtml(chunk)}</span>`;
      i += chunk.length;
      continue;
    }
    const str = rest.match(/^(['"`])((?:\\.|(?!\1)[^\\])*)\1/);
    if (str) {
      out += `<span class="hl-string">${escapeHtml(str[0])}</span>`;
      i += str[0].length;
      continue;
    }
    const word = rest.match(/^[A-Za-z_$][\w$]*/);
    if (word) {
      const w = word[0];
      if (KEYWORDS.has(w)) {
        out += `<span class="hl-keyword">${escapeHtml(w)}</span>`;
      } else {
        out += escapeHtml(w);
      }
      i += w.length;
      continue;
    }
    const num = rest.match(/^-?\d+(?:\.\d+)?/);
    if (num) {
      out += `<span class="hl-number">${num[0]}</span>`;
      i += num[0].length;
      continue;
    }
    out += escapeHtml(code[i]);
    i += 1;
  }
  return out;
}
