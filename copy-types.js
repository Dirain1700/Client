const { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require("fs");
const runFormat = (string) =>
    require("prettier").format(string, Object.assign({ parser: "typescript" }, require("./.prettierrc")));
const regex = /"\.\.\/src\//g;
const ReadBasePath = "./types";
const WriteBasePath = "./dist/types";

if (!existsSync(WriteBasePath)) mkdirSync(WriteBasePath, { recursive: true });

for (const FileName of readdirSync(ReadBasePath)) {
    const ReadFilePath = ReadBasePath + "/" + FileName;
    const WriteFilePath = WriteBasePath + "/" + FileName;
    // prettier-ignore
    const Changes = readFileSync(ReadFilePath, "utf-8").replaceAll(regex, "\"../../src/").trim();
    runFormat(Changes).then((formatted) => writeFileSync(WriteFilePath, formatted));
}
