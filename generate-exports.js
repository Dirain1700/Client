const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { format } = require("prettier");
const runFormat = (string) => format(string, Object.assign({ parser: "typescript" }, require("./.prettierrc")));
const FileDir = "./types";
const regex = /export\s(type|interface)\s(\S)+\s({|=)/gi;
let FileInput = "";
let index = 0;
const AllNameSpaces = [];
const sort = (a, b) => {
    a = a.toLowerCase().toString();
    b = b.toLowerCase().toString();
    if (a > b) return 1;
    else if (a < b) return -1;
    else return 0;
};

for (const FilePath of readdirSync(FileDir)) {
    if (FilePath === "index.d.ts") continue;
    if (index !== 0) FileInput += "\n\n";
    const File = readFileSync(FileDir + "/" + FilePath, "utf-8");
    const namespaces = File.split("\n")
        .filter((l) => regex.test(l))
        .map((l) => l.split(" ")[2].split("<")[0]);
    namespaces.sort(sort);
    // prettier-ignore
    FileInput += "export type { " + namespaces.join(", ") + " } from \"./" + FilePath.replace(".d.ts", "") + "\";";
    index++;
    namespaces.forEach((T) => AllNameSpaces.push(T));
}

AllNameSpaces.sort(sort);

const IndexTS = readFileSync("./src/index.ts", "utf-8");
// prettier-ignore
const IndexTSInput =
    IndexTS.split("export type")[0] + "export type {\n" + AllNameSpaces.join(",\n") + "\n} from \"../types/index\";";

writeFileSync("./types/index.d.ts", runFormat(FileInput));
writeFileSync("./src/index.ts", runFormat(IndexTSInput));
