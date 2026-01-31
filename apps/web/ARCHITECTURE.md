# フロントエンドアーキテクチャガイドライン

このドキュメントは `apps/web` のアーキテクチャと設計原則を定義する。
フロントエンド実装時は必ずこのガイドラインに従うこと。

---

## 基本原則

### 1. コロケーション（Colocation）

**関連するものは同じ場所に配置する。**

これはフロントエンド開発における最重要原則。

```
# Good - 関連ファイルが同じディレクトリ
shared/components/ui/Drawer/
├── index.tsx           # エクスポート
├── Drawer.tsx          # UIコンポーネント
├── DrawerContext.tsx   # Context
├── DrawerProvider.tsx  # Provider
├── useDrawer.ts        # Hook
└── Drawer.test.tsx     # テスト

# Bad - 関連ファイルが散らばっている
shared/components/ui/Drawer/
├── Drawer.tsx
shared/contexts/
├── DrawerContext.tsx   # ← 別ディレクトリ
shared/hooks/
├── useDrawer.ts        # ← 別ディレクトリ
```

### 2. ページ専用リソースの明示

ページ専用のコンポーネント・フック・型定義は `_` プレフィックスで明示する。

```
app/(main)/history/
├── page.tsx
├── _components/        # ページ専用コンポーネント
│   ├── HistoryList.tsx
│   └── HistoryCard.tsx
├── _hooks/             # ページ専用フック
│   └── useHistory.ts
├── _lib/               # ページ専用ユーティリティ
│   └── historyStorage.ts
└── _types/             # ページ専用型定義
    └── index.ts
```

### 3. 共有と専用の判断基準

| 使用箇所 | 配置場所 | 例 |
|----------|----------|-----|
| 単一ページのみ | `app/.../page/_xxx/` | `_components/`, `_hooks/` |
| 複数ページで使用 | `shared/components/ui/` | `Drawer/`, `Button/` |
| アプリ全体で使用 | `shared/lib/` | `api-client.ts`, `utils.ts` |

---

## ディレクトリ構成

```
apps/web/src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # ルートレイアウト（フォント、メタデータ）
│   ├── (main)/                 # メインレイアウトグループ
│   │   ├── layout.tsx          # MainLayout（ドロワー、メニューボタン）
│   │   ├── recommend/          # 推薦画面
│   │   │   ├── page.tsx
│   │   │   ├── _components/
│   │   │   └── _hooks/
│   │   ├── favorites/          # お気に入り
│   │   │   ├── page.tsx
│   │   │   ├── _components/
│   │   │   └── _hooks/
│   │   └── history/            # 閲覧履歴
│   │       ├── page.tsx
│   │       ├── _components/
│   │       ├── _hooks/
│   │       ├── _lib/
│   │       └── _types/
│   └── onboarding/             # オンボーディング（別レイアウト）
│       ├── layout.tsx
│       ├── page.tsx
│       └── _components/
│
└── shared/                     # 共有リソース
    ├── components/
    │   └── ui/                 # 共通UIコンポーネント
    │       ├── Drawer/         # ドロワー（Context・Hook含む）
    │       │   ├── index.tsx
    │       │   ├── Drawer.tsx
    │       │   ├── DrawerContext.tsx
    │       │   ├── DrawerProvider.tsx
    │       │   ├── useDrawer.ts
    │       │   └── Drawer.test.tsx
    │       ├── MenuButton/
    │       ├── PillNav/
    │       ├── Badge/
    │       ├── ProgressBar/
    │       └── Button/
    ├── lib/                    # 共通ユーティリティ
    │   ├── api-client.ts
    │   └── utils.ts
    └── types/                  # 共通型定義
        └── index.ts
```

---

## コンポーネント設計

### UIコンポーネントの構成

各UIコンポーネントは以下の構成を標準とする。

```
shared/components/ui/[ComponentName]/
├── index.tsx           # 公開エクスポート
├── [ComponentName].tsx # メインコンポーネント
├── [ComponentName].test.tsx  # テスト
├── types.ts            # 型定義（必要に応じて）
├── [SubComponent].tsx  # サブコンポーネント（必要に応じて）
├── use[Hook].ts        # 関連フック（必要に応じて）
└── [Name]Context.tsx   # 関連Context（必要に応じて）
```

### index.tsx のパターン

```typescript
// shared/components/ui/Drawer/index.tsx
export { Drawer } from './Drawer';
export { DrawerProvider } from './DrawerProvider';
export { useDrawer } from './useDrawer';
export type { DrawerProps, DrawerContextValue } from './types';
```

### Context + Hook のコロケーション

Context と Hook は必ず同じディレクトリに配置する。

```typescript
// shared/components/ui/Drawer/DrawerContext.tsx
import { createContext } from 'react';

export interface DrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const DrawerContext = createContext<DrawerContextValue | null>(null);
```

```typescript
// shared/components/ui/Drawer/useDrawer.ts
import { useContext } from 'react';
import { DrawerContext } from './DrawerContext';

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within DrawerProvider');
  }
  return context;
};
```

---

## ページ専用リソース

### `_components/` パターン

```typescript
// app/(main)/history/_components/HistoryCard.tsx
import { Badge } from '@/shared/components/ui/Badge';
import type { HistoryEntry } from '../_types';

interface HistoryCardProps {
  entry: HistoryEntry;
  onClick: () => void;
}

export const HistoryCard = ({ entry, onClick }: HistoryCardProps) => {
  return (
    <button onClick={onClick} className="...">
      <Badge variant={entry.objectClass}>{entry.objectClass}</Badge>
      <span>{entry.scpNumber}</span>
      <span>{entry.title}</span>
    </button>
  );
};
```

### `_hooks/` パターン

```typescript
// app/(main)/history/_hooks/useHistory.ts
import { useState, useEffect } from 'react';
import { getHistory, addHistory, clearHistory } from '../_lib/historyStorage';
import type { HistoryEntry } from '../_types';

export const useHistory = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setEntries(getHistory());
    setIsLoading(false);
  }, []);

  const add = (entry: Omit<HistoryEntry, 'viewedAt'>) => {
    const newEntry = addHistory(entry);
    setEntries((prev) => [newEntry, ...prev]);
  };

  const clear = () => {
    clearHistory();
    setEntries([]);
  };

  return { entries, isLoading, add, clear };
};
```

### `_lib/` パターン

```typescript
// app/(main)/history/_lib/historyStorage.ts
import type { HistoryEntry } from '../_types';

const STORAGE_KEY = 'scp-recommend-history';
const MAX_ENTRIES = 100;

export const getHistory = (): HistoryEntry[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const addHistory = (entry: Omit<HistoryEntry, 'viewedAt'>): HistoryEntry => {
  const newEntry: HistoryEntry = {
    ...entry,
    viewedAt: new Date().toISOString(),
  };

  const history = getHistory();
  const filtered = history.filter((e) => e.scpNumber !== entry.scpNumber);
  const updated = [newEntry, ...filtered].slice(0, MAX_ENTRIES);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newEntry;
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
```

### `_types/` パターン

```typescript
// app/(main)/history/_types/index.ts
export type ObjectClass = 'Safe' | 'Euclid' | 'Keter' | 'Thaumiel' | 'Neutralized';

export interface HistoryEntry {
  scpNumber: string;      // "SCP-173"
  title: string;          // "彫刻 - オリジナル"
  objectClass: ObjectClass;
  viewedAt: string;       // ISO8601
}
```

---

## スタイリング

### Tailwind CSS + CSS変数

`design-tokens.css` の CSS変数を Tailwind と統合して使用する。

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        safe: 'var(--color-safe)',
        euclid: 'var(--color-euclid)',
        keter: 'var(--color-keter)',
        primary: 'var(--color-primary)',
      },
      spacing: {
        drawer: 'var(--drawer-width)',
      },
      zIndex: {
        nav: 'var(--z-nav)',
        'drawer-overlay': 'var(--z-drawer-overlay)',
        drawer: 'var(--z-drawer)',
      },
    },
  },
};
```

### cn() ユーティリティ

条件付きクラス名は `cn()` を使用する。

```typescript
import { cn } from '@/shared/lib/utils';

const Button = ({ variant, className, ...props }) => {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md font-medium',
        variant === 'primary' && 'bg-primary text-white',
        variant === 'secondary' && 'bg-gray-100 text-gray-900',
        className
      )}
      {...props}
    />
  );
};
```

---

## 状態管理

### 判断基準

| 状態の種類 | 推奨アプローチ |
|------------|----------------|
| UIのみ（開閉状態など） | React Context |
| ページ内データ | useState / useReducer |
| 永続化データ | localStorage + カスタムフック |
| サーバーデータ | TanStack Query（将来導入時） |

### Context は最小スコープで

```typescript
// Good - 必要なProviderのみ
<DrawerProvider>
  <MainLayout>
    {children}
  </MainLayout>
</DrawerProvider>

// Bad - 過剰なProvider
<ThemeProvider>
  <DrawerProvider>
    <HistoryProvider>  {/* ← 履歴はページ専用なので不要 */}
      <MainLayout>
        {children}
      </MainLayout>
    </HistoryProvider>
  </DrawerProvider>
</ThemeProvider>
```

---

## テスト

### テストファイルはコンポーネントと同じディレクトリ

```
shared/components/ui/Drawer/
├── Drawer.tsx
├── Drawer.test.tsx     # ← 同じディレクトリ
├── useDrawer.ts
└── useDrawer.test.ts   # ← 同じディレクトリ
```

### テストケース名は日本語

```typescript
describe('Drawer', () => {
  it('開くボタンをクリックするとドロワーが表示される', () => {
    // ...
  });

  it('オーバーレイをクリックするとドロワーが閉じる', () => {
    // ...
  });
});
```

---

## 避けるべき実装

### 1. Context と Hook の分離

```typescript
// Bad
shared/contexts/DrawerContext.tsx
shared/hooks/useDrawer.ts
shared/components/ui/Drawer/Drawer.tsx

// Good
shared/components/ui/Drawer/
├── DrawerContext.tsx
├── useDrawer.ts
└── Drawer.tsx
```

### 2. ページ専用リソースを shared に配置

```typescript
// Bad - 履歴は history ページ専用
shared/hooks/useHistory.ts
shared/lib/historyStorage.ts

// Good - ページディレクトリ内
app/(main)/history/_hooks/useHistory.ts
app/(main)/history/_lib/historyStorage.ts
```

### 3. 過度な抽象化

```typescript
// Bad - 1箇所でしか使わないのに抽象化
shared/components/ui/HistoryCard/  // ← history ページでしか使わない

// Good - ページ専用として配置
app/(main)/history/_components/HistoryCard.tsx
```

### 4. 型定義の散在

```typescript
// Bad - 型定義が離れている
shared/types/history.ts  // ← history ページの型なのに shared にある

// Good - 使用箇所と同じディレクトリ
app/(main)/history/_types/index.ts
```

---

## 参照ドキュメント

- [mockups/DESIGN_GUIDELINES.md](../../mockups/DESIGN_GUIDELINES.md) - UIデザインガイドライン
- [mockups/design-tokens.css](../../mockups/design-tokens.css) - CSS変数定義
- [.ai/coding-guidelines.md](../../.ai/coding-guidelines.md) - プロジェクト全体のコーディング規約
- [vidmark architecture.md](https://github.com/Sn005/vidmark/blob/main/docs/architecture.md) - 参照アーキテクチャ
