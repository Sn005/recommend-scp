import { render } from "@testing-library/react";
import { ServiceWorkerRegistrar } from "../ServiceWorkerRegistrar";

describe("ServiceWorkerRegistrar", () => {
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister.mockResolvedValue({ scope: "/" });
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: mockRegister },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // プロパティを完全に削除して元の状態に戻す

    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  describe("AC-2: マウント時の SW 登録", () => {
    it("マウント時に navigator.serviceWorker.register が呼ばれる", () => {
      render(<ServiceWorkerRegistrar />);
      expect(mockRegister).toHaveBeenCalledTimes(1);
    });

    it('register の引数が "/sw.js" である', () => {
      render(<ServiceWorkerRegistrar />);
      expect(mockRegister).toHaveBeenCalledWith("/sw.js");
    });
  });

  describe("AC-2: 未サポート環境でのエラーなし", () => {
    beforeEach(() => {
      // プロパティを削除して未サポート環境をシミュレート

      delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    });

    it("navigator.serviceWorker が存在しなくてもエラーをスローしない", () => {
      expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
    });

    it("navigator.serviceWorker が存在しないとき register は呼ばれない", () => {
      render(<ServiceWorkerRegistrar />);
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe("AC-3: SW登録失敗時のアプリ通常機能への影響なし", () => {
    it("register が reject されてもエラーをスローしない", () => {
      mockRegister.mockRejectedValueOnce(new Error("SW registration failed"));

      expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
    });

    it("register が reject されてもコンポーネントは null をレンダリングする", () => {
      mockRegister.mockRejectedValueOnce(new Error("SW registration failed"));

      const { container } = render(<ServiceWorkerRegistrar />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("AC-4: UIを描画しない", () => {
    it("コンポーネントが何もレンダリングしない", () => {
      const { container } = render(<ServiceWorkerRegistrar />);
      expect(container.firstChild).toBeNull();
    });
  });
});
