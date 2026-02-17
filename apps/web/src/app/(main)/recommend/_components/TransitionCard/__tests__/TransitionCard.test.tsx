import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransitionCard } from "../index";

const defaultProps = {
  scpNumber: "SCP-173",
  objectClass: "EUCLID" as string | null,
  rating: 4250 as number | null,
  isVisible: true,
  isContentReady: false,
  onDismissed: vi.fn(),
};

describe("TransitionCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================
  // AC-1: カード表示内容
  // ===========================================
  describe("AC-1: カード表示内容", () => {
    it("SCP番号が白色の大きなテキストで表示される", () => {
      render(<TransitionCard {...defaultProps} />);

      const scpText = screen.getByText("SCP-173");
      expect(scpText).toBeInTheDocument();
    });

    it("オブジェクトクラスバッジが表示される", () => {
      render(<TransitionCard {...defaultProps} objectClass="EUCLID" />);

      // ObjectClassBadge は "Euclid" (先頭大文字) で表示される
      expect(screen.getByText("Euclid")).toBeInTheDocument();
    });

    it("ratingが★付きカンマ区切り形式で表示される", () => {
      render(<TransitionCard {...defaultProps} rating={4250} />);

      expect(screen.getByText(/★\s*4,250/)).toBeInTheDocument();
    });
  });

  // ===========================================
  // AC-2: オブジェクトクラス別グラデーション
  // ===========================================
  describe("AC-2: オブジェクトクラス別グラデーション", () => {
    const gradientTestCases = [
      { objectClass: "SAFE", gradient: "linear-gradient(135deg, #065F46, #10B981)" },
      { objectClass: "EUCLID", gradient: "linear-gradient(135deg, #92400E, #F59E0B)" },
      { objectClass: "KETER", gradient: "linear-gradient(135deg, #991B1B, #EF4444)" },
      { objectClass: "THAUMIEL", gradient: "linear-gradient(135deg, #3730A3, #6366F1)" },
      { objectClass: "NEUTRALIZED", gradient: "linear-gradient(135deg, #374151, #6B7280)" },
      { objectClass: "APOLLYON", gradient: "linear-gradient(135deg, #450A0A, #DC2626)" },
      { objectClass: "ARCHON", gradient: "linear-gradient(135deg, #4C1D95, #8B5CF6)" },
    ];

    gradientTestCases.forEach(({ objectClass, gradient }) => {
      it(`${objectClass}クラスで専用グラデーションが適用される`, () => {
        render(<TransitionCard {...defaultProps} objectClass={objectClass} />);

        const card = screen.getByTestId("transition-card");
        expect(card).toHaveStyle({ background: gradient });
      });
    });

    it("未知の文字列でUnknownグラデーションが適用される", () => {
      render(<TransitionCard {...defaultProps} objectClass="INVALID_CLASS" />);

      const card = screen.getByTestId("transition-card");
      expect(card).toHaveStyle({
        background: "linear-gradient(135deg, #4B5563, #9CA3AF)",
      });
    });
  });

  // ===========================================
  // AC-3: フェードインアニメーション
  // ===========================================
  describe("AC-3: フェードインアニメーション", () => {
    it("isVisible=trueで初期opacity:0からフェードインが開始される", () => {
      render(<TransitionCard {...defaultProps} />);

      const card = screen.getByTestId("transition-card");
      // CSS transitionが設定されていることを確認
      expect(card.style.transition).toContain("opacity");
      expect(card.style.transition).toContain("150ms");
    });
  });

  // ===========================================
  // AC-4: 適応型タイミング（最小表示時間）
  // ===========================================
  describe("AC-4: 適応型タイミング（最小表示時間）", () => {
    it("iframe即完了でも最低500ms間はカードを表示し続ける", () => {
      const onDismissed = vi.fn();
      const { rerender } = render(<TransitionCard {...defaultProps} onDismissed={onDismissed} />);

      // 即座にiframe完了
      rerender(
        <TransitionCard {...defaultProps} isContentReady={true} onDismissed={onDismissed} />
      );

      // 400ms経過（まだフェードアウトしない）
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(onDismissed).not.toHaveBeenCalled();

      // 500ms + 150ms（フェードアウト分）経過でonDismissed
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(onDismissed).toHaveBeenCalledTimes(1);
    });

    it("ちょうど500ms時点でiframe完了すると即座にフェードアウト開始される", () => {
      const onDismissed = vi.fn();
      const { rerender } = render(<TransitionCard {...defaultProps} onDismissed={onDismissed} />);

      // 500ms経過
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // iframe完了を通知
      rerender(
        <TransitionCard {...defaultProps} isContentReady={true} onDismissed={onDismissed} />
      );

      // フェードアウト完了（150ms）
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(onDismissed).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================
  // AC-5: iframe読み込み完了まで表示し続ける
  // ===========================================
  describe("AC-5: iframe読み込み完了まで表示し続ける", () => {
    it("1000ms経過でもiframe未完了なら表示し続ける", () => {
      const onDismissed = vi.fn();
      render(<TransitionCard {...defaultProps} isContentReady={false} onDismissed={onDismissed} />);

      // 1000ms経過
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // フェードアウトしない
      expect(onDismissed).not.toHaveBeenCalled();

      // 3000ms経過してもiframe未完了なら表示し続ける
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onDismissed).not.toHaveBeenCalled();
    });

    it("安全弁タイムアウト（15秒）で強制フェードアウトする", () => {
      const onDismissed = vi.fn();
      render(<TransitionCard {...defaultProps} isContentReady={false} onDismissed={onDismissed} />);

      // 15000ms経過
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // フェードアウト完了（150ms）
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(onDismissed).toHaveBeenCalledTimes(1);
    });

    it("14999ms時点では強制フェードアウトしない", () => {
      const onDismissed = vi.fn();
      render(<TransitionCard {...defaultProps} isContentReady={false} onDismissed={onDismissed} />);

      act(() => {
        vi.advanceTimersByTime(14999);
      });

      expect(onDismissed).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // AC-6: 適応型タイミング（通常ケース）
  // ===========================================
  describe("AC-6: 適応型タイミング（通常ケース）", () => {
    it("500ms以降にiframe完了で即座にフェードアウトする", () => {
      const onDismissed = vi.fn();
      const { rerender } = render(<TransitionCard {...defaultProps} onDismissed={onDismissed} />);

      // 700ms経過
      act(() => {
        vi.advanceTimersByTime(700);
      });

      // iframe完了を通知
      rerender(
        <TransitionCard {...defaultProps} isContentReady={true} onDismissed={onDismissed} />
      );

      // フェードアウト完了（150ms）
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(onDismissed).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================
  // AC-7: フェードアウトアニメーション
  // ===========================================
  describe("AC-7: フェードアウトアニメーション", () => {
    it("フェードアウト150ms後にonDismissedが呼ばれる", () => {
      const onDismissed = vi.fn();
      const { rerender } = render(<TransitionCard {...defaultProps} onDismissed={onDismissed} />);

      // 500ms経過
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // iframe完了を通知 → フェードアウト開始
      rerender(
        <TransitionCard {...defaultProps} isContentReady={true} onDismissed={onDismissed} />
      );

      // 100ms経過（まだ完了していない）
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onDismissed).not.toHaveBeenCalled();

      // 残り50msでフェードアウト完了
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(onDismissed).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================
  // AC-8: objectClass未定義時のフォールバック
  // ===========================================
  describe("AC-8: objectClass未定義時のフォールバック", () => {
    it("objectClass=nullでUnknownグラデーションが適用される", () => {
      render(<TransitionCard {...defaultProps} objectClass={null} />);

      const card = screen.getByTestId("transition-card");
      expect(card).toHaveStyle({
        background: "linear-gradient(135deg, #4B5563, #9CA3AF)",
      });
    });

    it("objectClass=nullでバッジにUnknownと表示される", () => {
      render(<TransitionCard {...defaultProps} objectClass={null} />);

      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });
  });

  // ===========================================
  // AC-9: rating未定義時のフォールバック
  // ===========================================
  describe("AC-9: rating未定義時のフォールバック", () => {
    it("rating=nullでrating表示が省略される", () => {
      render(<TransitionCard {...defaultProps} rating={null} />);

      // SCP番号とバッジは表示
      expect(screen.getByText("SCP-173")).toBeInTheDocument();
      expect(screen.getByText("Euclid")).toBeInTheDocument();

      // ratingは非表示
      expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    });
  });

  // ===========================================
  // エッジケース
  // ===========================================
  describe("エッジケース", () => {
    it("isVisible=falseの場合は何もレンダリングされない", () => {
      const { container } = render(<TransitionCard {...defaultProps} isVisible={false} />);

      expect(screen.queryByTestId("transition-card")).not.toBeInTheDocument();
      expect(container.innerHTML).toBe("");
    });

    it("onDismissedコールバックは1度だけ呼ばれる", () => {
      const onDismissed = vi.fn();
      render(<TransitionCard {...defaultProps} isContentReady={true} onDismissed={onDismissed} />);

      // 500ms（最小表示） + 150ms（フェードアウト）
      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(onDismissed).toHaveBeenCalledTimes(1);

      // さらに時間を進めても再度呼ばれない
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onDismissed).toHaveBeenCalledTimes(1);
    });

    it("objectClassが小文字でも正しくグラデーションが適用される", () => {
      render(<TransitionCard {...defaultProps} objectClass="euclid" />);

      const card = screen.getByTestId("transition-card");
      expect(card).toHaveStyle({
        background: "linear-gradient(135deg, #92400E, #F59E0B)",
      });
    });

    it("rating=0でも正しく表示される", () => {
      render(<TransitionCard {...defaultProps} rating={0} />);

      expect(screen.getByText("★ 0")).toBeInTheDocument();
    });

    it("ratingが大きい値でもカンマ区切りで表示される", () => {
      render(<TransitionCard {...defaultProps} rating={9999999} />);

      expect(screen.getByText(/★\s*9,999,999/)).toBeInTheDocument();
    });
  });
});
