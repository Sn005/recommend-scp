export interface FloatingUIProps {
  /** お気に入り状態 */
  isFavorited: boolean;
  /** お気に入りボタンのコールバック */
  onFavorite: () => void;
  /** 次へボタンのコールバック */
  onNext: () => void;
  /** 現在のスクロール率（0-100） */
  scrollPercentage?: number;
}

export { FloatingUI } from "./FloatingUI";
export { useFloatingUIVisibility } from "./useFloatingUIVisibility";
