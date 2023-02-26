const { readdirSync, readFileSync, writeFileSync } = require("fs");
const regex = /"\.\.\/src\//g;
const ReadBasePath = "./types";
const WriteBasePath = "./dist/types";

for (const FileName of readdirSync(ReadBasePath)) {
    const ReadFilePath = ReadBasePath + "/" + FileName;
    const WriteFilePath = WriteBasePath + "/" + FileName;
    const Changes = readFileSync(ReadFilePath, "utf-8")
        .replaceAll(regex, "\"../../src/").trim();
    writeFileSync(WriteFilePath, Changes);
}