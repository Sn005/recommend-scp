import { describe, it, expect, vi, beforeEach } from "vitest";

// モック: @anthropic-ai/sdk
vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn();
  return {
    default: class {
      messages = { create: mockCreate };
    },
    __mockCreate: mockCreate,
  };
});

// モック: node:fs
vi.mock("node:fs", () => {
  const mocks = {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
  return { ...mocks, default: mocks };
});

// モック: glob
vi.mock("glob", () => ({
  glob: vi.fn(),
}));

// テスト対象
import {
  parseArgs,
  findSpecFiles,
  buildPrompt,
  extractCsv,
  mergeCsv,
  saveCsv,
  run,
} from "../gen-testcases";

// モックへの参照を取得
import * as fs from "node:fs";
import { glob } from "glob";
import * as anthropicModule from "@anthropic-ai/sdk";

const mockReadFileSync = fs.readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = fs.writeFileSync as ReturnType<typeof vi.fn>;
const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = fs.mkdirSync as ReturnType<typeof vi.fn>;
const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;
const mockCreate = (anthropicModule as Record<string, unknown>).__mockCreate as ReturnType<
  typeof vi.fn
>;

describe("gen-testcases CLI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseArgs", () => {
    it("EPIC/Story IDを正しくパースする", () => {
      const result = parseArgs(["--epic", "006", "--story", "01"]);
      expect(result).toEqual({ epic: "006", story: "01", dryRun: false });
    });

    it("EPIC全体指定をパースする", () => {
      const result = parseArgs(["--epic", "006"]);
      expect(result).toEqual({ epic: "006", story: undefined, dryRun: false });
    });

    it("--dry-runフラグを認識する", () => {
      const result = parseArgs(["--epic", "006", "--dry-run"]);
      expect(result).toEqual({ epic: "006", story: undefined, dryRun: true });
    });

    it("引数が空の場合にエラーを投げる", () => {
      expect(() => parseArgs([])).toThrow();
    });

    it("--epicなしでエラーを投げる", () => {
      expect(() => parseArgs(["--story", "01"])).toThrow();
    });
  });

  describe("findSpecFiles", () => {
    it("Story指定時に対応する仕様書を返す", async () => {
      mockGlob.mockResolvedValue(["specs/006-frontend/006-01-onboarding/006-01.md"]);

      const files = await findSpecFiles("006", "01");
      expect(files).toHaveLength(1);
      expect(files[0]).toContain("006-01");
    });

    it("EPIC全体指定時に全Storyの仕様書を返す", async () => {
      mockGlob.mockResolvedValue([
        "specs/006-frontend/006-01-onboarding/006-01.md",
        "specs/006-frontend/006-02-article-reader/006-02.md",
      ]);

      const files = await findSpecFiles("006");
      expect(files).toHaveLength(2);
    });

    it("仕様書が0件の場合に空配列を返す", async () => {
      mockGlob.mockResolvedValue([]);

      const files = await findSpecFiles("999");
      expect(files).toHaveLength(0);
    });
  });

  describe("buildPrompt", () => {
    it("仕様書をプロンプトテンプレートに埋め込む", () => {
      const spec = "# Story 006-01\n## AC\n- [ ] WHEN ...";
      const prompt = buildPrompt(spec);

      expect(prompt).toContain(spec);
      expect(prompt).toContain("CSV形式で出力");
      expect(prompt).toContain("StepAction");
    });

    it("仕様書が空でもテンプレートを返す", () => {
      const prompt = buildPrompt("");
      expect(prompt).toContain("CSV形式で出力");
    });
  });

  describe("extractCsv", () => {
    it("レスポンスからCSVブロックを抽出する", () => {
      const responseText =
        '以下がテストケースです:\n```csv\nid,name,steps,expected,tags,result\nTC-006-01-001,テスト,"[]",期待結果,critical,\n```';

      const csv = extractCsv(responseText);
      expect(csv).toContain("id,name,steps,expected,tags,result");
      expect(csv).toContain("TC-006-01-001");
    });

    it("CSVブロックが存在しない場合にエラーを投げる", () => {
      expect(() => extractCsv("テストケースは生成できません")).toThrow();
    });

    it("複数のCSVブロック時は最初を抽出する", () => {
      const responseText =
        "```csv\nid,name\nTC-001,最初\n```\n\n```csv\nid,name\nTC-002,二番目\n```";

      const csv = extractCsv(responseText);
      expect(csv).toContain("TC-001");
      expect(csv).not.toContain("TC-002");
    });
  });

  describe("mergeCsv", () => {
    it("既存IDを保持し、新規IDを追加する", () => {
      const existing = 'id,name,steps,expected,tags,result\nTC-001,既存,"[]",期待,critical,';
      const newCsv =
        'id,name,steps,expected,tags,result\nTC-001,既存,"[]",期待,critical,\nTC-002,新規,"[]",期待,critical,';

      const merged = mergeCsv(existing, newCsv);
      expect(merged).toContain("TC-001");
      expect(merged).toContain("TC-002");
      const dataLines = merged.split("\n").filter((l) => l.trim() && !l.startsWith("id,"));
      expect(dataLines).toHaveLength(2);
    });

    it("IDが重複する場合は既存を優先する", () => {
      const existing = 'id,name,steps,expected,tags,result\nTC-001,既存版,"[]",期待,critical,pass';
      const newCsv = 'id,name,steps,expected,tags,result\nTC-001,新版,"[]",期待,critical,';

      const merged = mergeCsv(existing, newCsv);
      expect(merged).toContain("既存版");
      expect(merged).not.toContain("新版");
    });

    it("新規CSVが空の場合は既存をそのまま返す", () => {
      const existing = 'id,name,steps,expected,tags,result\nTC-001,既存,"[]",期待,critical,';
      const newCsv = "id,name,steps,expected,tags,result";

      const merged = mergeCsv(existing, newCsv);
      expect(merged).toContain("TC-001");
    });
  });

  describe("saveCsv", () => {
    it("新規CSVファイルを作成する", () => {
      mockExistsSync.mockReturnValue(false);

      saveCsv(
        "006",
        "01",
        'id,name,steps,expected,tags,result\nTC-001,テスト,"[]",期待,critical,',
        "/output"
      );

      expect(mockMkdirSync).toHaveBeenCalledWith("/output", {
        recursive: true,
      });
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        "/output/TC-006-01.csv",
        expect.stringContaining("TC-001"),
        "utf-8"
      );
    });

    it("既存ファイルがある場合にマージする", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        'id,name,steps,expected,tags,result\nTC-001,既存,"[]",期待,critical,pass'
      );

      saveCsv(
        "006",
        "01",
        'id,name,steps,expected,tags,result\nTC-001,既存,"[]",期待,critical,pass\nTC-002,新規,"[]",期待,critical,',
        "/output"
      );

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        "/output/TC-006-01.csv",
        expect.stringContaining("TC-002"),
        "utf-8"
      );
    });

    it("Story未指定の場合はEPIC名でファイルを保存する", () => {
      mockExistsSync.mockReturnValue(false);

      saveCsv(
        "006",
        undefined,
        'id,name,steps,expected,tags,result\nTC-001,テスト,"[]",期待,critical,',
        "/output"
      );

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        "/output/TC-006.csv",
        expect.stringContaining("TC-001"),
        "utf-8"
      );
    });
  });

  describe("run（統合テスト）", () => {
    it("EPIC/Story指定で仕様書を読み込みテストケースを生成する", async () => {
      mockGlob.mockResolvedValue(["/specs/006-frontend/006-01-onboarding/006-01.md"]);
      mockReadFileSync.mockReturnValue("# Story\n## AC\n- [ ] WHEN テスト");
      mockExistsSync.mockReturnValue(false);

      mockCreate.mockResolvedValue({
        content: [
          {
            type: "text",
            text: '```csv\nid,name,steps,expected,tags,result\nTC-006-01-001,テスト,"[]",期待結果,critical,\n```',
          },
        ],
      });

      const result = await run({
        epic: "006",
        story: "01",
        dryRun: false,
        outputDir: "/output",
      });

      expect(result.generatedCount).toBe(1);
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it("--dry-runでAPI呼び出しをスキップする", async () => {
      mockGlob.mockResolvedValue(["/specs/006-frontend/006-01-onboarding/006-01.md"]);
      mockReadFileSync.mockReturnValue("# Story\n## AC");

      const result = await run({
        epic: "006",
        story: "01",
        dryRun: true,
        outputDir: "/output",
      });

      expect(result.generatedCount).toBe(0);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("仕様書が見つからない場合にエラーを投げる", async () => {
      mockGlob.mockResolvedValue([]);

      await expect(
        run({
          epic: "999",
          story: "01",
          dryRun: false,
          outputDir: "/output",
        })
      ).rejects.toThrow();
    });

    it("正常終了時に生成されたテストケース数を返す", async () => {
      mockGlob.mockResolvedValue(["/specs/006-frontend/006-01.md"]);
      mockReadFileSync.mockReturnValue("# Story\n## AC");
      mockExistsSync.mockReturnValue(false);

      mockCreate.mockResolvedValue({
        content: [
          {
            type: "text",
            text: '```csv\nid,name,steps,expected,tags,result\nTC-006-01-001,テスト1,"[]",期待,critical,\nTC-006-01-002,テスト2,"[]",期待,edge,\n```',
          },
        ],
      });

      const result = await run({
        epic: "006",
        story: "01",
        dryRun: false,
        outputDir: "/output",
      });

      expect(result.generatedCount).toBe(2);
    });
  });
});
