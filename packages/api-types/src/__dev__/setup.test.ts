import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface PackageJson {
  name: string;
  version: string;
  type: string;
  main: string;
  types: string;
  private: boolean;
  exports: {
    ".": {
      types: string;
      import: string;
    };
  };
  scripts: {
    build: string;
    "type-check": string;
    lint?: string;
    test?: string;
    "test:watch"?: string;
  };
  dependencies?: {
    hono?: string;
  };
  peerDependencies?: {
    hono?: string;
  };
}

interface TsConfig {
  compilerOptions: {
    declaration: boolean;
    declarationMap: boolean;
    outDir: string;
    rootDir: string;
  };
  include: string[];
  exclude: string[];
}

const packageRoot = join(__dirname, "../..");
const workspaceRoot = join(__dirname, "../../../..");

describe("AC1: package.json設定", () => {
  const packagePath = join(packageRoot, "package.json");

  it("package.jsonが存在する", () => {
    expect(existsSync(packagePath)).toBe(true);
  });

  it("nameフィールドが@recommend-scp/api-typesである", () => {
    const content = readFileSync(packagePath, "utf-8");
    const pkg = JSON.parse(content) as PackageJson;
    expect(pkg.name).toBe("@recommend-scp/api-types");
  });

  it("必須フィールドが全て存在する", () => {
    const content = readFileSync(packagePath, "utf-8");
    const pkg = JSON.parse(content) as PackageJson;

    expect(pkg.version).toBeDefined();
    expect(pkg.type).toBe("module");
    expect(pkg.main).toBe("./dist/index.js");
    expect(pkg.types).toBe("./dist/index.d.ts");
    expect(pkg.private).toBe(true);
  });

  it("exportsフィールドが正しく設定されている", () => {
    const content = readFileSync(packagePath, "utf-8");
    const pkg = JSON.parse(content) as PackageJson;

    expect(pkg.exports).toBeDefined();
    expect(pkg.exports["."]).toBeDefined();
    expect(pkg.exports["."].types).toBe("./dist/index.d.ts");
    expect(pkg.exports["."].import).toBe("./dist/index.js");
  });

  it("scriptsにbuildとtype-checkが定義されている", () => {
    const content = readFileSync(packagePath, "utf-8");
    const pkg = JSON.parse(content) as PackageJson;

    expect(pkg.scripts.build).toBe("tsc");
    expect(pkg.scripts["type-check"]).toBe("tsc --noEmit");
  });

  it("honoが依存に含まれている", () => {
    const content = readFileSync(packagePath, "utf-8");
    const pkg = JSON.parse(content) as PackageJson;

    expect(pkg.dependencies?.hono ?? pkg.peerDependencies?.hono).toBeDefined();
  });
});

describe("AC2: tsconfig.json設定", () => {
  const tsconfigPath = join(packageRoot, "tsconfig.json");

  it("tsconfig.jsonが存在する", () => {
    expect(existsSync(tsconfigPath)).toBe(true);
  });

  it("declarationがtrueである", () => {
    const content = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(content) as TsConfig;
    expect(tsconfig.compilerOptions.declaration).toBe(true);
  });

  it("declarationMapがtrueである", () => {
    const content = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(content) as TsConfig;
    expect(tsconfig.compilerOptions.declarationMap).toBe(true);
  });

  it("outDirが./distである", () => {
    const content = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(content) as TsConfig;
    expect(tsconfig.compilerOptions.outDir).toBe("./dist");
  });

  it("rootDirが./srcである", () => {
    const content = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(content) as TsConfig;
    expect(tsconfig.compilerOptions.rootDir).toBe("./src");
  });

  it("includeにsrc/**/*が含まれる", () => {
    const content = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(content) as TsConfig;
    expect(tsconfig.include).toContain("src/**/*");
  });

  it("excludeにnode_modulesとdistが含まれる", () => {
    const content = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(content) as TsConfig;
    expect(tsconfig.exclude).toContain("node_modules");
    expect(tsconfig.exclude).toContain("dist");
  });
});

describe("AC3: pnpmワークスペース解決", () => {
  it("pnpm-workspace.yamlがpackages/*を含む", () => {
    const workspacePath = join(workspaceRoot, "pnpm-workspace.yaml");
    expect(existsSync(workspacePath)).toBe(true);

    const content = readFileSync(workspacePath, "utf-8");
    expect(content).toContain("packages/*");
  });

  it("src/index.tsが存在する", () => {
    const indexPath = join(packageRoot, "src/index.ts");
    expect(existsSync(indexPath)).toBe(true);
  });
});
