import { cn } from "./utils";

describe("cn", () => {
  it("複数のクラスをマージする", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("競合するTailwindクラスは後のものが優先される", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("falseを渡した場合は無視される", () => {
    expect(cn("text-red-500", false)).toBe("text-red-500");
  });

  it("文字列を渡した場合は適用される", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("undefinedやnullを無視する", () => {
    expect(cn("px-2", undefined, null, "py-1")).toBe("px-2 py-1");
  });

  it("配列形式のクラスをサポートする", () => {
    expect(cn(["px-2", "py-1"])).toBe("px-2 py-1");
  });

  it("オブジェクト形式のクラスをサポートする", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe("text-red-500");
  });
});
