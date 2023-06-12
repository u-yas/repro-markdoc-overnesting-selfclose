import Markdoc from "@markdoc/markdoc";
import { readFileSync, writeFileSync } from "fs";
import { Parser } from "htmlparser2";
import packageJson from "./package.json";

// https://gist.github.com/rpaul-stripe/941eb22c4779ea87b1adf7715d76ca08
const config = {
  tags: {
    foo: { render: "foo" },
    bar: { render: "bar" },
    "html-tag": {
      attributes: {
        name: { type: String, required: true },
        attrs: { type: Object },
      },
      transform(node, config) {
        const { name, attrs } = node.attributes;
        const children = node.transformChildren(config);
        return new Markdoc.Tag(name, attrs, children);
      },
    },
  },
};

function processTokens(tokens) {
  const output: any[] = [];

  const parser = new Parser({
    onopentag(name, attrs) {
      output.push({
        type: "tag_open",
        nesting: 1,
        meta: {
          tag: "html-tag",
          attributes: [
            { type: "attribute", name: "name", value: name },
            { type: "attribute", name: "attrs", value: attrs },
          ],
        },
      });
    },

    ontext(content) {
      if (typeof content === "string" && content.trim().length > 0)
        output.push({ type: "text", content });
    },

    onclosetag(name) {
      output.push({
        type: "tag_close",
        nesting: -1,
        meta: { tag: "html_close" },
      });
    },
  });

  for (const token of tokens) {
    if (token.type.startsWith("html")) {
      parser.write(token.content);
      continue;
    }

    if (token.type === "inline") token.children = processTokens(token.children);

    output.push(token);
  }

  return output;
}

const outputPath = (fileName: string) =>
  `./output-v${packageJson.devDependencies["@markdoc/markdoc"]}/${fileName}`;
const mdFile = readFileSync("./example.md", "utf-8");

const tokenizer = new Markdoc.Tokenizer({ html: true });
writeFileSync(outputPath("tokenizer.json"), JSON.stringify(tokenizer, null, 2));

const tokens = tokenizer.tokenize(mdFile);
writeFileSync(outputPath("tokens.json"), JSON.stringify(tokens, null, 2));

const processed = processTokens(tokens);
writeFileSync(outputPath("processed.json"), JSON.stringify(processed, null, 2));

const doc = Markdoc.parse(processed);
writeFileSync(outputPath("doc.json"), JSON.stringify(doc, null, 2));

const transformed = Markdoc.transform(doc, config);
writeFileSync(
  outputPath("transformed.json"),
  JSON.stringify(transformed, null, 2)
);

const output = Markdoc.renderers.html(transformed);

// v0.2.2
writeFileSync(outputPath("output.html"), output);
// writeFileSync("./output-v0.3/output.html", output);
