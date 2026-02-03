/**
 * @file TranslationNotFoundコンポーネント テスト
 * @description 翻訳なし記事のサジェスト画面テスト
 * @see specs/010-ja-article-display/010-03-webview-ja/010-03-02.md
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TranslationNotFound } from "./index";

describe("TranslationNotFound", () => {
  describe("AC-4: サジェスト画面UI", () => {
    it("「この記事の日本語訳は」メッセージが表示される", () => {
      // Arrange
      const onSuggest = vi.fn();

      // Act
      render(<TranslationNotFound onSuggest={onSuggest} />);

      // Assert
      expect(screen.getByText("この記事の日本語訳は")).toBeInTheDocument();
    });

    it("「まだ公開されていません」メッセージが表示される", () => {
      // Arrange
      const onSuggest = vi.fn();

      // Act
      render(<TranslationNotFound onSuggest={onSuggest} />);

      // Assert
      expect(screen.getByText("まだ公開されていません")).toBeInTheDocument();
    });

    it("「別の記事をおすすめ」ボタンが表示される", () => {
      // Arrange
      const onSuggest = vi.fn();

      // Act
      render(<TranslationNotFound onSuggest={onSuggest} />);

      // Assert
      expect(screen.getByRole("button", { name: "別の記事をおすすめ" })).toBeInTheDocument();
    });

    it("アイコンが表示される", () => {
      // Arrange
      const onSuggest = vi.fn();

      // Act
      render(<TranslationNotFound onSuggest={onSuggest} />);

      // Assert
      expect(screen.getByTestId("translation-not-found-icon")).toBeInTheDocument();
    });
  });

  describe("AC-5: 別記事遷移", () => {
    it("ボタンクリックでonSuggestが呼ばれる", () => {
      // Arrange
      const onSuggest = vi.fn();
      render(<TranslationNotFound onSuggest={onSuggest} />);

      // Act
      fireEvent.click(screen.getByRole("button", { name: "別の記事をおすすめ" }));

      // Assert
      expect(onSuggest).toHaveBeenCalledTimes(1);
    });

    it("連続クリック時、1回のみonSuggestを呼び出す", () => {
      // Arrange
      const onSuggest = vi.fn();
      render(<TranslationNotFound onSuggest={onSuggest} />);
      const button = screen.getByRole("button", { name: "別の記事をおすすめ" });

      // Act
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Assert（debounce/disableで1回のみ）
      expect(onSuggest).toHaveBeenCalledTimes(1);
    });
  });

  describe("アクセシビリティ", () => {
    it("ボタンがキーボード操作可能", () => {
      // Arrange
      const onSuggest = vi.fn();
      render(<TranslationNotFound onSuggest={onSuggest} />);
      const button = screen.getByRole("button", { name: "別の記事をおすすめ" });

      // Act
      fireEvent.keyDown(button, { key: "Enter" });

      // Assert
      expect(onSuggest).toHaveBeenCalledTimes(1);
    });
  });

  describe("レイアウト", () => {
    it("中央揃えコンテナが存在する", () => {
      // Arrange
      const onSuggest = vi.fn();

      // Act
      const { container } = render(<TranslationNotFound onSuggest={onSuggest} />);

      // Assert
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("flex", "flex-col", "items-center", "justify-center");
    });
  });
});
