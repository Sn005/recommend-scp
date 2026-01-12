export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // 新機能
        "fix", // バグ修正
        "docs", // ドキュメント
        "style", // フォーマット
        "refactor", // リファクタリング
        "perf", // パフォーマンス
        "test", // テスト
        "chore", // その他
      ],
    ],
  },
};
