/**
 * data-testid属性のkebab-case命名規則を強制するESLintルール
 *
 * パターン: {component}-{element}-{variant?}
 * 例: article-card, pack-selector-horror, next-button
 */

const KEBAB_CASE_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** @param {string} value */
export function isValidTestId(value) {
  if (!value) return false;
  return KEBAB_CASE_PATTERN.test(value);
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce kebab-case naming for data-testid attributes",
    },
    schema: [],
    messages: {
      invalidTestId:
        "data-testid は kebab-case 形式で記述してください: '{{value}}' は不正です。パターン: {component}-{element}-{variant?}",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "data-testid") return;
        if (!node.value || node.value.type !== "Literal") return;

        const value = node.value.value;
        if (typeof value !== "string") return;

        if (!isValidTestId(value)) {
          context.report({
            node,
            messageId: "invalidTestId",
            data: { value },
          });
        }
      },
    };
  },
};

export default rule;
