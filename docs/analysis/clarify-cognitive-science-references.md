# /clarify Skill 認知科学的根拠: 学術文献リファレンス

> このドキュメントは `/clarify` Skill の設計判断を支える認知科学・心理学の学術的根拠をまとめたものです。
> [clarify-engineering-analogy-strategy.md](./clarify-engineering-analogy-strategy.md) から参照されます。

---

## 1. アナロジー思考（Analogical Reasoning）

/clarify がエンジニアリングアナロジーで具体化を促す根拠。

### 構造写像理論（Structure Mapping Theory）

- **提唱者**: Dedre Gentner (1983)
- **核心**: アナロジーは表面的類似ではなく、**関係構造の写像**である。人間は要素間の因果関係・依存関係をソース領域からターゲット領域へマッピングする
- **体系性原理**: 孤立した関係より、高次の関係構造（関係の関係）を優先的にマッピングする
- **文献**: Gentner, D. (1983). Structure-mapping: A theoretical framework for analogy. _Cognitive Science_, 7(2), 155-170
- **URL**: https://doi.org/10.1207/s15516709cog0702_3

### 漸進的抽象化（Progressive Alignment）

- **提唱者**: Gentner & Markman (1997)
- **核心**: 人間は**具体的な類似性の比較から始めて、徐々に抽象的な共通構造を抽出**する。具体例の比較が抽象概念の理解を促進する
- **設計への示唆**: 二つの具体例を提示して「どちらに近い？」と問うことで、漸進的抽象化プロセスを起動できる
- **文献**: Gentner, D. & Markman, A.B. (1997). Structure mapping in analogy and similarity. _American Psychologist_, 52(1), 45-56
- **URL**: https://doi.org/10.1037/0003-066X.52.1.45

### スキーマ形成とアナロジー転移

- **提唱者**: Gick & Holyoak (1983)
- **核心**: **複数のアナロジカルな事例を比較**することで抽象的なスキーマが形成される。1事例では転移が起きにくいが、2事例の比較で転移率が大幅向上
- **設計への示唆**: 単一のアナロジーではなく、対比的な2つの概念を提示することの有効性
- **文献**: Gick, M.L. & Holyoak, K.J. (1983). Schema induction and analogical transfer. _Cognitive Psychology_, 15(1), 1-38
- **URL**: https://doi.org/10.1016/0010-0285(83)90002-6

### 関係シフト（Relational Shift）

- **提唱者**: Gentner & Rattermann (1991)
- **核心**: 発達的に、表面的類似→関係構造に基づくアナロジーへシフト。領域知識の蓄積と連動
- **設計への示唆**: 知識レベルの高いユーザーほど、抽象的なアナロジーが機能する
- **文献**: Gentner, D. & Rattermann, M.J. (1991). Language and the career of similarity. In S.A. Gelman & J.P. Byrnes (Eds.), _Perspectives on language and thought_

---

## 2. 段階的思考深化（Scaffolding / Progressive Deepening）

質問を段階的に深化させる設計の根拠。

### 最近接発達領域（Zone of Proximal Development: ZPD）

- **提唱者**: Lev Vygotsky (1978)
- **核心**: 「学習者が一人では達成できないが、支援があれば達成できる発達水準の範囲」。ZPDは固定的でなく、支援によって動的に拡張される
- **設計への示唆**: AIの質問は現在の回答レベルの少し先を問うことで、思考を段階的に引き上げる
- **文献**: Vygotsky, L.S. (1978). _Mind in Society: The Development of Higher Psychological Processes_. Harvard University Press
- **URL**: https://doi.org/10.2307/j.ctvjf9vz4

### 足場かけ理論（Scaffolding）

- **提唱者**: Wood, Bruner & Ross (1976)
- **核心**: 学習者の能力に合わせて支援レベルを調整し、能力向上に伴い支援を**撤去（fading）**する
- **6つの機能**: (1) 課題への注意喚起、(2) 自由度の制限（問題を扱いやすい部分に分割）、(3) 方向性の維持、(4) 重要特徴の強調、(5) フラストレーション制御、(6) 理想解の実演
- **設計への示唆**: /clarify の Phase 進行は、scaffold の段階的撤去に相当
- **文献**: Wood, D., Bruner, J.S. & Ross, G. (1976). The role of tutoring in problem solving. _Journal of Child Psychology and Psychiatry_, 17(2), 89-100
- **URL**: https://doi.org/10.1111/j.1469-7610.1976.tb00381.x

### 精緻化質問（Elaborative Interrogation）

- **提唱者**: Chi et al. (1994)
- **核心**: 「なぜそうなるのか？」という精緻化質問を段階的に行うことで、**自己説明（self-explanation）**が促進され深い理解につながる
- **設計への示唆**: Phase 3 の掘り下げ質問は精緻化質問に相当
- **文献**: Chi, M.T.H., de Leeuw, N., Chiu, M.H., & LaVancher, C. (1994). Eliciting self-explanations improves understanding. _Cognitive Science_, 18(3), 439-477
- **URL**: https://doi.org/10.1207/s15516709cog1803_3

### ソクラテス式問答法の6カテゴリ

- **提唱者**: Paul & Elder (2006)
- **6カテゴリ**: (1) 明確化の質問、(2) 前提を探る質問、(3) 理由と証拠を問う質問、(4) 視点・観点を問う質問、(5) 含意と帰結を問う質問、(6) 質問自体についての質問
- **設計への示唆**: /clarify の Phase 1→4 はこの6カテゴリの段階的適用に相当
- **文献**: Paul, R. & Elder, L. (2006). _Critical Thinking: Tools for Taking Charge of Your Learning and Your Life_. Pearson

---

## 3. 暗黙知の言語化（Tacit Knowledge Externalization）

/clarify の核心である「暗黙知→形式知」変換の根拠。

### 暗黙知の次元（The Tacit Dimension）

- **提唱者**: Michael Polanyi (1966)
- **核心**: 「我々は語れること以上のことを知っている（We can know more than we can tell）」。暗黙知は身体化された知識であり、完全な形式化は本質を損なう可能性がある
- **焦点意識と補助意識**: 焦点対象を理解するために、背景の暗黙的手がかりに依存
- **文献**: Polanyi, M. (1966). _The Tacit Dimension_. University of Chicago Press
- **URL**: https://doi.org/10.7208/chicago/9780226232768.001.0001

### SECIモデル（知識創造理論）

- **提唱者**: Nonaka & Takeuchi (1995)
- **核心**: 知識創造の4モード: 共同化(S)→表出化(E)→連結化(C)→内面化(I)
- **/clarify が担うのは「表出化（Externalization）」**: 暗黙知→形式知の変換。メタファー・アナロジーが触媒として機能
- **弁証法的対話**: 「AとBのどちらに近い？」「その反対は何？」という対比的問いが暗黙知の輪郭を浮かび上がらせる
- **文献**: Nonaka, I. & Takeuchi, H. (1995). _The Knowledge-Creating Company: How Japanese Companies Create the Dynamics of Innovation_. Oxford University Press
- **URL**: https://doi.org/10.1093/oso/9780195092691.001.0001

### 反省的実践（Reflective Practice）

- **提唱者**: Donald Schon (1983)
- **核心**: 行為の中の省察（reflection-in-action）と行為についての省察（reflection-on-action）の区別。問いかけは後者を促進
- **設計への示唆**: /clarify は「普段無意識にやっていること」を意識化する reflection-on-action の構造化
- **文献**: Schon, D.A. (1983). _The Reflective Practitioner: How Professionals Think in Action_. Basic Books

---

## 4. 二者択一と認知負荷

質問を二者択一形式にする設計の根拠。

### ヒックの法則（Hick's Law）

- **提唱者**: Hick (1952), Hyman (1953)
- **核心**: 選択肢が増えるごとに意思決定時間は対数的に増加。RT = a + b × log₂(n)
- **認知的解釈**: 人間は選択肢を二分探索的に評価している
- **設計への示唆**: 選択肢は2つに絞ることで反応時間を最小化
- **文献**: Hick, W.E. (1952). On the rate of gain of information. _Quarterly Journal of Experimental Psychology_, 4(1), 11-26
- **URL**: https://doi.org/10.1080/17470215208416600

### 選択のパラドックス

- **提唱者**: Barry Schwartz (2004)
- **核心**: 選択肢の増加は満足度・意思決定品質の低下を招く
- **ジャム実験**: Iyengar & Lepper (2000) — 24種提示で購入率3%、6種提示で30%
- **設計への示唆**: 質問の選択肢を最小化し、決定麻痺を防ぐ
- **文献**: Schwartz, B. (2004). _The Paradox of Choice: Why More Is Less_. HarperCollins
- **文献**: Iyengar, S.S. & Lepper, M.R. (2000). When choice is demotivating. _Journal of Personality and Social Psychology_, 79(6), 995-1006
- **URL**: https://doi.org/10.1037/0022-3514.79.6.995

### 認知負荷理論（Cognitive Load Theory）

- **提唱者**: John Sweller (1988)
- **核心**: ワーキングメモリの処理容量は限られており、**課題外負荷（extraneous cognitive load）**を最小化することが効率化に寄与
- **設計への示唆**: 二者択一は比較次元を1つに限定し、課題外負荷を大幅削減
- **文献**: Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. _Cognitive Science_, 12(2), 257-285
- **URL**: https://doi.org/10.1207/s15516709cog1202_4

### 二肢強制選択法（2AFC: Two-Alternative Forced Choice）

- **概要**: 心理測定学で広く使われる方法。被験者の内的基準を顕在化させる信頼性の高い手法
- **設計への示唆**: /clarify の二者択一はこの2AFCの応用

---

## 5. チャンキングと知識レベル適応

ユーザーの知識レベルに応じて質問粒度を調整する根拠。

### 魔法の数 7±2（Miller's Law）

- **提唱者**: George Miller (1956)
- **核心**: 短期記憶の容量制限。チャンク数が記憶容量の単位
- **現代的修正**: Cowan (2001) — リハーサルなしの純粋容量は **4±1チャンク**
- **設計への示唆**: 一度に提示する選択肢・情報は4チャンク以内
- **文献**: Miller, G.A. (1956). The magical number seven, plus or minus two. _Psychological Review_, 63(2), 81-97
- **URL**: https://doi.org/10.1037/h0043158
- **文献**: Cowan, N. (2001). The magical number 4 in short-term memory. _Behavioral and Brain Sciences_, 24(1), 87-114
- **URL**: https://doi.org/10.1017/S0140525X01003922

### エキスパートとノビスのチャンキング差異

- **提唱者**: Chase & Simon (1973)
- **核心**: チェスの名人は対局パターンを大きなチャンクとして認識。エキスパートのチャンクはサイズが大きく、階層的に組織化され、抽象的パターンに基づく
- **設計への示唆**: Tier 1/2/3 のアナロジー難易度調整の根拠
- **文献**: Chase, W.G. & Simon, H.A. (1973). Perception in chess. _Cognitive Psychology_, 4(1), 55-81
- **URL**: https://doi.org/10.1016/0010-0285(73)90004-2

### 専門性逆転効果（Expertise Reversal Effect）

- **提唱者**: Kalyuga (2007)
- **核心**: 初心者に有効な教授法（詳細な手引き）がエキスパートにはむしろ学習を**阻害**する。最適な情報粒度は知識レベルに依存
- **設計への示唆**: エキスパートには抽象的な大チャンクで質問し、ノビスには具体的な小チャンクに分解
- **文献**: Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction. _Educational Psychology Review_, 19(4), 509-539
- **URL**: https://doi.org/10.1007/s10648-007-9054-3

### 精緻化理論（Elaboration Theory）

- **提唱者**: Reigeluth (1999)
- **核心**: 全体像→詳細へ、概要→精緻化へとズームインする情報提示が効果的
- **設計への示唆**: /clarify の Phase 1（広い文脈）→ Phase 4（具体的仕様）の段階的深化
- **文献**: Reigeluth, C.M. (1999). _Instructional-Design Theories and Models: Volume II_. Lawrence Erlbaum Associates

---

## 設計要素と理論の対応表

| /clarify の設計要素            | 根拠となる理論                     | 効果                               |
| ------------------------------ | ---------------------------------- | ---------------------------------- |
| 二者択一の対立概念提示         | Hick's Law, 認知負荷理論, 2AFC     | 認知負荷最小化、内的基準の顕在化   |
| エンジニアリングアナロジー     | 構造写像理論, 漸進的抽象化         | 暗黙的な構造知識の即座の参照       |
| 対比的選択肢（A vs B）         | スキーマ形成理論, SECIモデル表出化 | 概念の輪郭明確化、暗黙知の表出     |
| Phase 1→4 の段階的深化         | ZPD, Scaffolding, ソクラテス式問答 | 思考の段階的引き上げ               |
| Tier 1/2/3 の難易度調整        | 専門性逆転効果, チャンキング理論   | 知識レベルに最適化された問いかけ   |
| 選択肢を4つ以下に制限          | Miller's Law (4±1チャンク)         | ワーキングメモリ容量内での処理     |
| 精緻化質問での掘り下げ         | 精緻化質問, 自己説明効果           | 表層回答から深層意図の引き出し     |
| セッション文脈での比喩切り替え | 関係シフト, 反省的実践             | ユーザー固有の思考フレームへの適応 |

---

## 参考文献一覧（アルファベット順）

1. Chase, W.G. & Simon, H.A. (1973). Perception in chess. _Cognitive Psychology_, 4(1), 55-81. https://doi.org/10.1016/0010-0285(73)90004-2
2. Chi, M.T.H., de Leeuw, N., Chiu, M.H., & LaVancher, C. (1994). Eliciting self-explanations improves understanding. _Cognitive Science_, 18(3), 439-477. https://doi.org/10.1207/s15516709cog1803_3
3. Cowan, N. (2001). The magical number 4 in short-term memory. _Behavioral and Brain Sciences_, 24(1), 87-114. https://doi.org/10.1017/S0140525X01003922
4. Gentner, D. (1983). Structure-mapping: A theoretical framework for analogy. _Cognitive Science_, 7(2), 155-170. https://doi.org/10.1207/s15516709cog0702_3
5. Gentner, D. & Markman, A.B. (1997). Structure mapping in analogy and similarity. _American Psychologist_, 52(1), 45-56. https://doi.org/10.1037/0003-066X.52.1.45
6. Gentner, D. & Rattermann, M.J. (1991). Language and the career of similarity. In S.A. Gelman & J.P. Byrnes (Eds.), _Perspectives on language and thought_.
7. Gick, M.L. & Holyoak, K.J. (1983). Schema induction and analogical transfer. _Cognitive Psychology_, 15(1), 1-38. https://doi.org/10.1016/0010-0285(83)90002-6
8. Hick, W.E. (1952). On the rate of gain of information. _Quarterly Journal of Experimental Psychology_, 4(1), 11-26. https://doi.org/10.1080/17470215208416600
9. Iyengar, S.S. & Lepper, M.R. (2000). When choice is demotivating. _Journal of Personality and Social Psychology_, 79(6), 995-1006. https://doi.org/10.1037/0022-3514.79.6.995
10. Kalyuga, S. (2007). Expertise reversal effect and its implications. _Educational Psychology Review_, 19(4), 509-539. https://doi.org/10.1007/s10648-007-9054-3
11. Miller, G.A. (1956). The magical number seven, plus or minus two. _Psychological Review_, 63(2), 81-97. https://doi.org/10.1037/h0043158
12. Nonaka, I. & Takeuchi, H. (1995). _The Knowledge-Creating Company_. Oxford University Press. https://doi.org/10.1093/oso/9780195092691.001.0001
13. Paul, R. & Elder, L. (2006). _Critical Thinking: Tools for Taking Charge of Your Learning and Your Life_. Pearson.
14. Polanyi, M. (1966). _The Tacit Dimension_. University of Chicago Press. https://doi.org/10.7208/chicago/9780226232768.001.0001
15. Reigeluth, C.M. (1999). _Instructional-Design Theories and Models: Volume II_. Lawrence Erlbaum Associates.
16. Schon, D.A. (1983). _The Reflective Practitioner_. Basic Books.
17. Schwartz, B. (2004). _The Paradox of Choice_. HarperCollins.
18. Sweller, J. (1988). Cognitive load during problem solving. _Cognitive Science_, 12(2), 257-285. https://doi.org/10.1207/s15516709cog1202_4
19. Vygotsky, L.S. (1978). _Mind in Society_. Harvard University Press. https://doi.org/10.2307/j.ctvjf9vz4
20. Wood, D., Bruner, J.S. & Ross, G. (1976). The role of tutoring in problem solving. _Journal of Child Psychology and Psychiatry_, 17(2), 89-100. https://doi.org/10.1111/j.1469-7610.1976.tb00381.x
