import { render, cleanup } from "@testing-library/react";
import { ServiceWorkerRegistrar } from "../ServiceWorkerRegistrar";

describe("ServiceWorkerRegistrar", () => {
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockRegister.mockResolvedValue({ scope: "/", update: mockUpdate });
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: mockRegister },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
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

  describe("SW更新の定期チェック", () => {
    it("登録成功後に60分間隔でregistration.update()が呼ばれる", async () => {
      render(<ServiceWorkerRegistrar />);

      // registerのPromiseを解決させる
      await vi.advanceTimersByTimeAsync(0);

      expect(mockUpdate).not.toHaveBeenCalled();

      // 60分経過
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      expect(mockUpdate).toHaveBeenCalledTimes(1);

      // さらに60分経過
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });

    it("登録失敗時はupdate()が呼ばれない", async () => {
      mockRegister.mockRejectedValueOnce(new Error("SW registration failed"));
      render(<ServiceWorkerRegistrar />);

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
