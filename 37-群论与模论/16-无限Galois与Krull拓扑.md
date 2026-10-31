# $\rm Chapter \, 16$ 无限 Galois 与 Krull 拓扑

第 13 章的基本定理给有限 Galois 扩张立了对表法则：中间域与子群互为镜像。本章把塔盖到无限高——$\overline{\mathbb{Q}}/\mathbb{Q}$ 与 $\overline{\mathbb{F}_p}/\mathbb{F}_p$ 都代数而无限（第 12 章 §12.5 的反例在此转正为主角）——并当场看到对表翻车：可以有两个不同的子群固定同一个域。翻车的根源与解法是同一句话：**无限群需要拓扑**。比喻先行：**Krull 拓扑是「只允许有限眼力的观察者」的视野账本**——一个观察者一次只能检查有限个元素上的作用，两个自同构算作「离得近」，当且仅当它们在某个有限世界里动作完全一致；**profinite 群是「有限群的极限拼图」**——整群是一张由有限群的碎片按相容规则拼出的图景，碎片有限、拼图无限，任何一眼都只看到有限片。本章路线：动机与翻车预告（§16.1）；Krull 拓扑的定义与拓扑群公理全证（§16.2）；逆极限的当堂语法与紧性（§16.3）；无限基本定理的完整陈述与证明骨架（§16.4）；「为什么闭性必需」的尸检（§16.5）；完美标本 $\mathrm{Gal}(\overline{\mathbb{F}_p}/\mathbb{F}_p) \cong \widehat{\mathbb{Z}}$ 与子域格（§16.6）；与数论册握手（§16.7）。范围外标注（Tychonoff 定理的一般形式、profinite 群的抽象刻画、étale 基本群）：Lang《Algebra》VI §14、Szamuely《Galois Groups and Fundamental Groups》第 1 章、Wilson《Profinite Groups》。

> **开始前自检**：本章假设你已经会：
>
> 1. □ Galois 基本定理的四条内容与全证结构（第 13 章定理 13.11；§16.4 的无限版逐条对照）；
> 2. □ Artin 定理与塔上遗传：$[K:K^H] = |H|$、$\mathrm{Gal}(K/K^H) = H$、$K^{\mathrm{Gal}(K/L)} = L$（第 13 章定理 13.7、推论 13.12；§16.4 的有限归约全靠它们）；
> 3. □ 同构延拓引理 12.14 与嵌入延拓引理 13.9（第 12、13 章；§16.2 的无限版 Zorn 论证在用）；
> 4. □ 有限域的 Frobenius 与子域格：$\mathrm{Gal}(\mathbb{F}_{p^n}/\mathbb{F}_p) \cong \mathbb{Z}_n$、$m \mid n$ 判据（第 15 章定理 15.7、15.9；§16.6 的标本全程在用）；
> 5. □ 分圆域的 Galois 群 $(\mathbb{Z}/n)^{\times}$ 与 Kronecker–Weber 定理的陈述（第 15 章 §15.6、§15.8 末；§16.7 在用）；
> 6. □ CRT 与最小公倍数（数论册第 1 章；§16.6 的 $\widehat{\mathbb{Z}}$ 分解在用）；
> 7. □ 直积、商群、指标与第一同构定理（第 1、2 章；§16.2–§16.4 的账全程在用）；
> 8. □ 代数未必有限的反例 $\overline{\mathbb{Q}}$（第 12 章 §12.5；§16.1 的动机在用）。

## $\rm \S \, 16.1$ 动机：无限世界的对表翻车

第 12 章 §12.5 已备好本章的舞台：$\overline{\mathbb{Q}}$ 是 $\mathbb{Q}$ 的代数扩张但次数无限（$2^{1/n}$ 的次数 $n$ 无界）。它还是正规与可分的：每个有理系数不可约多项式只要有一个根在 $\overline{\mathbb{Q}}$ 里就全部根都在（代数闭的定义），且特征 $0$ 无重根（定理 12.18）。于是 $\overline{\mathbb{Q}}/\mathbb{Q}$ 是 Galois 扩张，只是无限次的（下一节把「Galois 扩张」正式推广到无限次）。它的 Galois 群 $G_{\mathbb{Q}} = \mathrm{Gal}(\overline{\mathbb{Q}}/\mathbb{Q})$ 是无限群：第 13 章自测答案 4 已算出 $\mathrm{Gal}(\mathbb{Q}(\sqrt2,\sqrt3,\sqrt5)/\mathbb{Q}) \cong \mathbb{Z}_2^3$；沿素数一路添上 $\sqrt7, \sqrt{11}, \ldots$，每添一层群按 $\mathbb{Z}_2$ 涨一维（延拓引理保证每层都有自同构可延拓，见命题 16.3），Galois 群被任意大的有限群逼成无限。

无限群里，第 13 章的对表两处失灵。其一，Artin 定理 $[K:K^H] = |H|$ 两边都失去意义：$|G_{\mathbb{Q}}|$ 是无穷大，$[\overline{\mathbb{Q}}:\mathbb{Q}]$ 也是无穷大，「数」不出任何账。其二更要命：不同的子群可以固定同一个域——第 13 章双射的单射性（$H_1 \ne H_2 \Rightarrow K^{H_1} \ne K^{H_2}$）恰靠 Artin 定理支撑，支柱一抽就塌，§16.5 将给一个具体的撞车现场：$\mathrm{Gal}(\overline{\mathbb{F}_p}/\mathbb{F}_p)$ 里的两个不同的子群（一个稠密、一个闭）固定域都是 $\mathbb{F}_p$。出路不是给域论动手术，而是给群补上一种视野的度量：什么样的子群「小到分得清」、什么样的自同构「近到分不开」。这个度量就是 Krull 拓扑。

## $\rm \S \, 16.2$ Krull 拓扑：只允许有限眼力的观察者

先白话说定义要解决什么：我们想说「两个自同构差不多」，而任何可操作的检查都只能盯住有限多个元素——比如盯住 $\alpha$ 与 $\beta$，看两个自同构是否把它们送到同一处。把「在某个有限世界上动作完全一致」当成「贴近」，就得到拓扑。比喻立起来：**观察者只有有限眼力**，他举着放大镜只能看清一个有限子域 $E$；在他眼里，$E$ 上影子相同的自同构无法区分。

**定义 16.1**（无限 Galois 扩张）：代数扩张 $K/F$ 称为 **Galois 扩张**，若它正规（每个在 $K$ 中有根的 $F$ 上不可约多项式在 $K$ 中分裂）且可分（每个元素在 $F$ 上可分）；此时 $G := \mathrm{Gal}(K/F) := \mathrm{Aut}(K/F)$。读法：第 13 章定理 13.4 说有限时「Galois $=$ 可分 $+$ 正规 $=$ 固定域缩回 $F$」；无限时取第二条当定义，第三条不再是定义而成为定理（§16.4 步骤 2，要花真力气证）。

**定义 16.2**（Krull 拓扑）：$K/F$ 无限或有限 Galois，$E/F$ 跑遍含于 $K$ 的有限 Galois 子扩张。对 $\sigma \in G$ 与这样的 $E$，集合

$$
U(\sigma, E) \;=\; \{\, \tau \in G : \tau|_E = \sigma|_E \,\} \;=\; \sigma \cdot \mathrm{Gal}(K/E)
$$

称为 $\sigma$ 的**基本开邻域**；以全体基本开邻域（及它们的并）为开集的拓扑称为 $G$ 的 **Krull 拓扑**（Krull topology）。读法：$U(\sigma, E)$ 是「在有限世界 $E$ 上与 $\sigma$ 影子相同」的全部自同构——观察者的视野只有 $E$ 那么大，他就分不开这批元素。

承载一切的是一条延拓引理：观察者看到的 $E$ 上的动作永远能被全域的自同构实现。

**命题 16.3**（无限延拓引理，全证）：$K/F$ 是 Galois 扩张（不限次数），$\tau : M \to K$ 是中间域 $M$ 上的 $F$-嵌入（$\tau|_F = \mathrm{id}$，$\tau(M) \subseteq K$）。则存在 $\sigma \in G$ 使 $\sigma|_M = \tau$。

证明：$K/F$ 有限时就是引理 13.9；无限时改用 Zorn。考虑偏集 $\mathcal{P} = \{(M', \tau')\}$：${M'}$ 是含 $M$ 的中间域，$\tau' : M' \to K$ 是延拓 $\tau$ 的 $F$-嵌入；序为「延拓」。两条验证。1. **链有上界**：给链 $\{(M_i, \tau_i)\}$，令 $M_{\infty} = \bigcup_i M_i$（仍是中间域：任取两元素落进链中更大的成员，四则在其内封闭），定义 $\tau_{\infty}$ 为诸 $\tau_i$ 的并：良定义（两成员有公共延拓，在交上一致）、保持加乘（在任一 $M_i$ 内核）、固定 $F$。2. **极大元定义在全域**：Zorn 给极大元 $(M^*, \tau^*)$。反设 $\alpha \in K \setminus M^*$。整除链：$m_{\alpha, M^*} \mid m_{\alpha, F}$（后者在 $M^*[x]$ 中零化 $\alpha$，定理 12.5 之 2）；$m_{\alpha,F}$ 在 $K$ 中分裂（$K/F$ 正规），故 $m_{\alpha, M^*}$ 在 $K$ 中分裂；$\alpha$ 在 $M^*$ 上可分（$K/F$ 可分继承），故根互异。$\tau^*$ 逐系数作用于 $m_{\alpha,M^*}$：$\tau^*(m_{\alpha,M^*}) \mid \tau^*(m_{\alpha,F}) = m_{\alpha,F}$（$\tau^*$ 固定 $F$ 系数），故 $\tau^*(m_{\alpha,M^*})$ 在 $K$ 中有根 $\gamma$。引理 12.14（$\sigma := \tau^*$ 是同构 $M^* \to \tau^*(M^*)$，$m_{\alpha,M^*}$ 不可约，$\alpha$ 与 $\gamma$ 是对应多项式的根）给延拓 $M^*(\alpha) \to \tau^*(M^*)(\gamma) \subseteq K$，与极大性矛盾。故 $M^* = K$。∎

**命题 16.4**（拓扑群公理，全证）：$(G, \mathrm{Krull})$ 是 Hausdorff 拓扑群，且每个基本开邻域既开又闭。分四条。

证明：

1. **基本邻域是有限指标子群的陪集，且既开又闭**：限制映射 $\mathrm{res}_E : G \to \mathrm{Gal}(E/F)$ 是群同态（限制保持复合）；满射由命题 16.3（$\mathrm{Gal}(E/F)$ 的元素视为 $F$-嵌入 $E \to K$ 即得延拓）；核是 $\mathrm{Gal}(K/E)$。第一同构定理给 $G/\mathrm{Gal}(K/E) \cong \mathrm{Gal}(E/F)$，故指标 $[G : \mathrm{Gal}(K/E)] = [E:F] < \infty$。基本开邻域是子群 $\mathrm{Gal}(K/E)$ 的陪集；补集是其余有限多个陪集之并，每个都是开集，故补集开、原集闭。
2. **乘法连续**：给定 $U(\sigma\tau, E) \ni \sigma\tau$，取 $U(\sigma, E) \times U(\tau, E)$：若 $\sigma'|_E = \sigma|_E$ 且 $\tau'|_E = \tau|_E$，则 $(\sigma'\tau')|_E = \sigma'\circ\tau'$ 限制到 $E$ 上的复合 $= \sigma\tau|_E$（限制与复合交换）。故 $U(\sigma,E)\,U(\tau,E) \subseteq U(\sigma\tau, E)$；一般开集含某个基本邻域，归约到这一情形。
3. **求逆连续**：$\tau \in U(\sigma, E)$ 给 $\tau|_E = \sigma|_E$，两边取逆（限制与取逆交换）得 $\tau^{-1}|_E = \sigma^{-1}|_E$，即 $U(\sigma, E)^{-1} = U(\sigma^{-1}, E)$ 是 $\sigma^{-1}$ 的基本邻域。
4. **Hausdorff**：拓扑群 Hausdorff 当且仅当单位元的全体邻域之交是 $\{e\}$（$\Rightarrow$ 平凡；$\Leftarrow$：$\sigma \ne \tau$ 时取不含 $\sigma\tau^{-1}$ 的邻域 $N \ni e$，用乘法连续性取对称邻域 $W$ 使 $WW \subseteq N$，则开集 $\sigma W$ 与 $\tau W$ 不交）。算交：$\sigma \in \bigcap_E \mathrm{Gal}(K/E)$ 当且仅当 $\sigma$ 固定每个有限 Galois 子扩张，当且仅当 $\sigma$ 固定 $\bigcup_E E = K$（每个 $\alpha \in K$ 落在有限扩张 $F(\alpha)$，再装进它的有限正规闭包，第 13 章 §13.7），当且仅当 $\sigma = \mathrm{id}$。∎

读法：Hausdorff 那条是「有限眼力」比喻的收口——单个观察者分不开影子相同的自同构，但全体观察者的视野并起来盖满 $K$，影子系就分开了；拓扑不是外加的装饰，是把「域 $=$ 有限子域的并」这条代数事实翻译成群上的分离公理。

## $\rm \S \, 16.3$ 逆极限与紧性：有限群的极限拼图

定义前先说它解决什么：第 15 章 $\mathrm{Gal}(\mathbb{F}_{p^n}/\mathbb{F}_p) \cong \mathbb{Z}_n$ 的碎片如何拼成 $\mathrm{Gal}(\overline{\mathbb{F}_p}/\mathbb{F}_p)$？需要一个「把一族有限群按相容规则拼成一个群」的通用语法。

**定义 16.5**（逆向系统与逆极限，当堂语法）：指标集 $I$ 带预序 $\le$ 且**有向**（任给 $i, j \in I$ 有 $k$ 使 $i, j \le k$）。一族群 $\{G_i\}_{i \in I}$ 与转移同态 $\varphi_{ji} : G_j \to G_i$（$i \le j$，满足 $\varphi_{ii} = \mathrm{id}$ 与 $\varphi_{ki} = \varphi_{ji} \circ \varphi_{kj}$）称为**逆向系统**（inverse system）。其**逆极限**（inverse limit）是

$$
\varprojlim_{i} G_i \;=\; \Bigl\{\, (g_i)_{i \in I} \in \prod_{i \in I} G_i \;:\; \varphi_{ji}(g_j) = g_i \ \text{对一切}\ i \le j \,\Bigr\},
$$

带直积的乘积拓扑（当堂定义：每个 $G_i$ 取离散拓扑，乘积的基本开集是「固定有限多个坐标」的柱形集）。逐坐标乘法使它成为拓扑群的子群（相容条件在乘法下保持：两个相容族逐坐标相乘仍相容）。读法：一个元素是一张**拼法清单**——在每个有限碎片里指定一个元素，且各层指定互相咬合（大层限制到小层必须对得上）；比喻「极限拼图」的语法就在这句相容条件里。

**命题 16.6**（G 是逆极限且紧，全证；Tychonoff 一角陈述级）：指标集取含于 $K$ 的有限 Galois 子扩张 $E$（按包含序，有向：两个有限子扩张的合成再取正规闭包仍在族里）。则 $\sigma \mapsto (\sigma|_E)_E$ 是 $G \to \varprojlim_E \mathrm{Gal}(E/F)$ 的拓扑群同构，从而 $G$ 紧、Hausdorff。

证明：1. **落入逆极限**：$E_1 \subseteq E_2$ 时 $\sigma|_{E_1} = (\sigma|_{E_2})|_{E_1}$，转移同态是限制。2. **单**：限制全部相等的两个自同构在 $\bigcup_E E = K$ 上相等（Hausdorff 的同一笔账）。3. **满**：给相容族 $(\sigma_E)$，定义 $\sigma(\alpha) := \sigma_E(\alpha)$，$E$ 取任一含 $\alpha$ 的成员：相容条件与有向性保证与选取无关（两个候选都等于 $\sigma_{E''}(\alpha)$，$E'' \supseteq E \cup E'$）；加乘在足够大的单个 $E$ 内核，故 $\sigma \in \mathrm{Gal}(K/F)$ 且限制恰为给定族。4. **同胚**：坐标映射连续（$U(\sigma,E)$ 是坐标 $E$ 上单点的原像，开）；由 2、3 是双射；而 $G$ 紧（下条）、逆极限 Hausdorff（离散空间的积 Hausdorff，闭子集继承），连续双射从紧到 Hausdorff 必为同胚。5. **紧性**：每个 $\mathrm{Gal}(E/F)$ 有限离散，紧（有限开覆盖本就有限）；乘积紧是 Tychonoff 定理（陈述级：本章只用「紧空间的任意乘积紧」这一半；可数情形可用对角论证自证，一般情形依赖选择公理，见 Wilson《Profinite Groups》第 1 章）；相容条件 $\varphi_{ji}(g_j) = g_i$ 的解集是连续映射（两个坐标映射与转移同态的复合）取离散空间单点处的原像，闭；紧空间中的闭子集紧。∎

**定义 16.7**（profinite 群）：有限离散群的逆向系统的逆极限称为 **profinite 群**（profinite group）。等价刻画（陈述级，Wilson 第 1 章）：紧、Hausdorff、完全不连通的拓扑群。样本：$\varprojlim \mathbb{Z}_n$（§16.6）、$G_{\mathbb{Q}}$（§16.7）。读法：比喻收束——profinite 群是「有限群的极限拼图」，碎片有限、任意一眼只见有限片，但整张拼图（比如 $G_{\mathbb{Q}}$）可以是无限的对象；紧性说拼图的边界不漏风，Hausdorff 说碎片影子互不重合。

## $\rm \S \, 16.4$ 无限 Galois 基本定理：闭子群版

**定理 16.8**（无限 Galois 基本定理）：$K/F$ 是（可能无限的）Galois 扩张，$G = \mathrm{Gal}(K/F)$ 配 Krull 拓扑。则：

1. **双射**：$\Phi : E \mapsto \mathrm{Gal}(K/E)$ 是中间域全体到 $G$ 的**闭**子群全体的双射，逆为 $\Psi : H \mapsto K^H$；包含反向：$E_1 \subseteq E_2 \iff \mathrm{Gal}(K/E_1) \supseteq \mathrm{Gal}(K/E_2)$，$H_1 \subseteq H_2 \iff K^{H_1} \supseteq K^{H_2}$；
2. **开子群账**：子群 $H \le G$（不必先设闭）开 $\iff [K : K^H] < \infty$；此时 $[K : K^H] = |H|$ 且 $[K^H : F] = [G : H]$；
3. **正规对应**：$E/F$ 正规 $\iff \mathrm{Gal}(K/E) \trianglelefteq G$；此时 $E/F$ 自动可分（故是 Galois 扩张），且 $\mathrm{Gal}(E/F) \cong G/\mathrm{Gal}(K/E)$（拓扑群同构，右侧取商拓扑）；
4. **闭包公式**：对任意子群 $H$（不必闭），$\mathrm{Gal}(K/K^H) = \overline{H}$（Krull 拓扑下的闭包）。闭性不是技术补丁：它恰是「$H$ 与自己的固定域互相认领」的准入证，§16.5 给违反它的尸检。

证明骨架（六步；完整细节见 Lang《Algebra》VI §14 与 Szamuely 第 1 章）：

1. **塔向上 Galois（推论 13.12 的无限版）**：$K/E$ 正规且可分：可分继承；正规走元素级账 $m_{\alpha,E} \mid m_{\alpha,F}$，而 $m_{\alpha,F}$ 在 $K$ 中分裂（定义 16.1 的正规），故 $m_{\alpha,E}$ 在 $K$ 中分裂。
2. **$K^{\mathrm{Gal}(K/E)} = E$ 对每个中间域成立**：$\supseteq$ 平凡；$\subseteq$：$\alpha \notin E$ 时 $m_{\alpha,E}$ 次数 $\ge 2$ 且在 $K$ 中分裂为互异一次因子（步骤 1），取另一根 $\beta \ne \alpha$；引理 12.14（$\sigma = \mathrm{id}_E$）给固定 $E$ 的同构 $E(\alpha) \to E(\beta)$，命题 16.3 延拓成 $\sigma \in \mathrm{Gal}(K/E)$ 挪动 $\alpha$。这一条把定义 16.1 后的欠条结清：固定域条件在无限时仍是定理而非定义。它同时给 $\Phi$ 单。
3. **$\Phi$ 的值域都是闭子群**：$\mathrm{Gal}(K/E) = \bigcap_{\alpha \in E} \{\sigma : \sigma(\alpha) = \alpha\}$，每个 $\{\sigma : \sigma(\alpha) = \alpha\}$ 是 $\mathrm{Gal}(K/F(\alpha))$ 的一个陪集（命题 16.4 之 1，含 $\alpha$ 的成员存在靠命题 16.3），既开又闭；闭集之交闭。
4. **闭包公式（全证）**：$H \subseteq \mathrm{Gal}(K/K^H)$（$H$ 按定义固定 $K^H$）且右边闭（步骤 3），故 $\overline{H} \subseteq \mathrm{Gal}(K/K^H)$。反向：设 $\sigma$ 固定 $K^H$，要证 $\sigma$ 落进 $H$ 的每个基本邻域 $\sigma \cdot \mathrm{Gal}(K/E)$（$E/F$ 有限 Galois），即找 $h \in H \cap \sigma\,\mathrm{Gal}(K/E)$。造 $N' := E \cdot \sigma(E)$ 在 $K$ 内的正规闭包：它是有限 Galois 于 $F$，且被 $\sigma$ 与一切 $h \in H$ 保持（$F$-自同构限制到正规子扩张上像不出去，元素级账同步骤 1）。再造 $N'' := K^H \cdot N'$：有限 Galois 于 $A := K^H$（$A$-嵌入保持 ${N'}$ 故保持 ${N''}$，账同上），且 ${N''}$ 中被 $H$ 的限制固定的元素恰为 $N'' \cap A = A$。有限理论收口：$H'' := H|_{N''} \subseteq \mathrm{Gal}(N''/A)$；Artin 定理 13.7 给 $[N'' : N''^{H''}] = |H''|$，而 $N''^{H''} = A$，故 $|H''| = [N'' : A]$；另一侧 $\mathrm{Gal}(N''/A)$ 的固定域也是 $A$（步骤 2 的有限情形，即第 13 章定理 13.11 第 3 步），Artin 再给 $|\mathrm{Gal}(N''/A)| = [N'' : A]$；有限群包含加同基数逼 $H'' = \mathrm{Gal}(N''/A)$，而 $\sigma|_{N''} \in \mathrm{Gal}(N''/A)$（$\sigma$ 保持 ${N''}$ 且固定 $A$），故存在 $h \in H$ 使 $h|_{N''} = \sigma|_{N''}$，特别地 $h|_E = \sigma|_E$。∎（骨架完）
5. **开 $\iff$ 有限次**：（$\Leftarrow$）设 $[K : K^H] < \infty$。闭包公式给 $\overline{H} = \mathrm{Gal}(K/K^H) =: C$；由第 2 条的有限理论 $|C| = [K : K^H] < \infty$，$C$ 有限从而子空间拓扑离散（Hausdorff 下单点闭，有限并成离散），离散空间里只有全空间稠密于自身，故 $H = C$；又 $K$ 由有限多个生成元（$K/K^H$ 有限故有限生成）张出，把这些生成元与其 $F$-共轭装进有限 Galois 子扩张 $M$，则 $\mathrm{Gal}(K/M) \subseteq C = H$ 是单位元的基本开邻域，子群含单位元的开邻域即开。（$\Rightarrow$）$H$ 开时含 $\mathrm{Gal}(K/E)$，故 $K^H \subseteq K^{\mathrm{Gal}(K/E)} = E$（步骤 2）；$H$ 限制在 $E$ 上的像 $H_E$ 是有限群 $\mathrm{Gal}(E/F)$ 的子群，其固定域为 $E \cap K^H = K^H$，Artin 定理给 $[E : K^H] = |H_E| < \infty$，塔式公式给 $[K : K^H] \le [K:E]\,[E:K^H] < \infty$；此时 $K/K^H$ 有限 Galois（步骤 1），第 13 章的次数账给 $[K : K^H] = |\mathrm{Gal}(K/K^H)| = |H|$（$H$ 开则闭，闭包公式读回 $H$）；末条 $[K^H : F] = [G : H]$：映射 $\sigma \mapsto \sigma|_{K^H}$ 的纤维是右陪集（限制相等 $\iff$ 相差 $H$ 中元素），满射由命题 16.3，而 $F$-嵌入 $K^H \to K$ 恰有 $[K^H : F]$ 个（可分扩张的嵌入计数，第 12 章 §12.7 桥句），陪集双射读出等式。
6. **正规对应与商**：$\sigma\,\mathrm{Gal}(K/E)\,\sigma^{-1} = \mathrm{Gal}(K/\sigma(E))$（直接验：$\tau$ 固定 $E$ 逐点 $\iff$ $\sigma\tau\sigma^{-1}$ 固定 $\sigma(E)$ 逐点），与第 13 章 §13.4 第 6 步的「共轭子群对应搬家域」同一笔账；于是 $E/F$ 正规（$\sigma(E) = E$ 对一切 $\sigma$，正规的定义）$\iff \mathrm{Gal}(K/E) \trianglelefteq G$；商同构：限制映射 $G \to \mathrm{Gal}(E/F)$ 满射（命题 16.3）、核 $\mathrm{Gal}(K/E)$，第一同构定理；拓扑层面两边的基本开集在限制下互相对应，商拓扑与 $\mathrm{Gal}(E/F)$ 自身的 Krull 拓扑一致（核对陈述级）。∎（骨架完）

对照读法：与第 13 章定理 13.11 逐条比，第 1 条把「子群」换成「闭子群」、第 2 条把「次数账」换成「开子群账」，第 3、4 条形状未变但商多带拓扑。有限情形两处替换都自动消失：有限群离散，所有子群既闭又开——定理 16.8 恰好退化成定理 13.11，对照组闭合。

## $\rm \S \, 16.5$ 为什么闭性必需：稠密子群的尸检

**命题 16.9**（固定域只认闭包，全证）：对任意子群 $H \le G$，$K^H = K^{\overline{H}}$。

证明：$H \subseteq \overline{H}$ 给 $K^H \supseteq K^{\overline{H}}$。反向：取 $\alpha \in K^H$ 与 $\tau \in \overline{H}$。取含 $\alpha$ 的有限 Galois 子扩张 $E/F$（$F(\alpha)$ 的正规闭包）。$\tau$ 的基本邻域 $U(\tau, E)$ 与 $H$ 相交非空（$\tau \in \overline{H}$，每个邻域都撞上 $H$）：存在 $h \in H$ 使 $h|_E = \tau|_E$。于是 $\tau(\alpha) = h(\alpha) = \alpha$（$\alpha \in K^H$）。$\alpha$ 任意，故 $\tau \in K^{\overline{H}}$ 一侧。∎

**推论 16.10**（撞车现场）：$H$ 不闭时，$K^H = K^{\overline{H}}$ 而域一侧对 $H$ 与 $\overline{H}$ 完全失明；且 $\mathrm{Gal}(K/K^H) = \overline{H} \ne H$，第 13 章的互逆双射两边同时坏掉。极端样本在 §16.6：整数群 $\mathbb{Z}$ 在 $\widehat{\mathbb{Z}}$ 中稠密但不相等，两者在 $\overline{\mathbb{F}_p}$ 中的固定域都是 $\mathbb{F}_p$。读法：**拓扑是记账的入场券**——非闭子群多出来的元素是「极限动作」，域论看不到它们，但它们确实改变群；把对表限制在闭子群上，等于只登记域论看得见的账目。

## $\rm \S \, 16.6$ 完美标本：$\mathrm{Gal}(\overline{\mathbb{F}_p}/\mathbb{F}_p) \cong \widehat{\mathbb{Z}}$

**定义 16.11**（$\widehat{\mathbb{Z}}$）：正整数按整除序有向（${m, n}$ 的公共上界是 $\mathrm{lcm}(m,n)$）。逆系统 $\{\mathbb{Z}_n\}$（加法群，转移同态取模：$m \mid n$ 时 $\mathbb{Z}_n \to \mathbb{Z}_m$）的逆极限记作 $\widehat{\mathbb{Z}} := \varprojlim_n \mathbb{Z}_n$；元素是相容族 $(a_n)_n$，$a_n \in \mathbb{Z}_n$，$m \mid n$ 时 $a_m \equiv a_n \pmod m$。整数以对角嵌入 $j \mapsto (j \bmod n)_n$ 进入。数值锚（sympy 真算）：前四层按 $\mathrm{lcm}$ 链取 $\mathbb{Z}_2, \mathbb{Z}_6, \mathbb{Z}_{30}, \mathbb{Z}_{210}$，$\mathrm{lcm}(2,3,5) = 30$，且 $\mathbb{Z}_6 \cong \mathbb{Z}_2 \times \mathbb{Z}_3$、$\mathbb{Z}_{30} \cong \mathbb{Z}_2 \times \mathbb{Z}_3 \times \mathbb{Z}_5$、$\mathbb{Z}_{210} \cong \mathbb{Z}_2 \times \mathbb{Z}_3 \times \mathbb{Z}_5 \times \mathbb{Z}_7$（CRT：对全部元素验证双射、对全部元素对验证加法保持）——每上一层恰好添一个素数坐标，一张拼法清单被 ${2, 3, 5, 7}$ 四个素数坐标逐层钉死。

**定理 16.12**（完美标本，全证）：$K = \overline{\mathbb{F}_p}$，$\varphi : x \mapsto x^p$（Frobenius）。则 $\Phi : \widehat{\mathbb{Z}} \to \mathrm{Gal}(K/\mathbb{F}_p)$、$(a_n)_n \mapsto$ （唯一满足 $\sigma|_{\mathbb{F}_{p^n}} = \varphi^{a_n}|_{\mathbb{F}_{p^n}}$ 的 $\sigma$）是拓扑群同构；$\varphi$ 的像是对角族 $(1, 1, 1, \ldots)$，生成子群 $\langle \varphi \rangle \cong \mathbb{Z}$ **稠密而不等于** $G$。

证明：四步。1. **$K = \bigcup_n \mathbb{F}_{p^n}$**：$\alpha \in K$ 时 $\alpha \in \mathbb{F}_p(\alpha)$，后者有 $p^d$ 个元素（$d = \deg m_{\alpha}$，定理 12.6）；而 $\overline{\mathbb{F}_p}$ 中 $p^d$ 元子域唯一——任何 $p^d$ 元子域的非零元满足 $a^{p^d - 1} = 1$（Lagrange，定理 1.13），其全部元素恰为 $x^{p^d} - x$ 的根集，故都是同一个集合（定理 15.3 的根集）。于是 $\mathbb{F}_p(\alpha) = \mathbb{F}_{p^d}$，一个 $\mathbb{F}_{p^n}$ 的拷贝躺在 $K$ 里（定理 15.3、15.4）。2. **限制读出相容族**：$\sigma \in G$ 时 $\sigma|_{\mathbb{F}_{p^n}} \in \mathrm{Gal}(\mathbb{F}_{p^n}/\mathbb{F}_p) = \langle \varphi \rangle \cong \mathbb{Z}_n$（定理 15.7），即 $\sigma|_{\mathbb{F}_{p^n}} = \varphi^{a_n}|_{\mathbb{F}_{p^n}}$，$a_n \bmod n$ 唯一；$m \mid n$ 时相容（限制的锁链）；故 $\sigma$ 给出 $\widehat{\mathbb{Z}}$ 的元素。3. **$\Phi$ 是群同构**：良定义与单如命题 16.6 之 2、3（用 $\bigcup \mathbb{F}_{p^n} = K$）；同态逐坐标（限制与复合交换）；$d \mid n$ 时 $\varphi^{a_n}|_{\mathbb{F}_{p^d}} = \varphi^{a_d}|_{\mathbb{F}_{p^d}}$ 靠 $\varphi^d = \mathrm{id}$ 于 $\mathbb{F}_{p^d}$；同胚同命题 16.6 之 4（紧到 Hausdorff）。4. **稠密与不等于**：$\widehat{\mathbb{Z}}$ 的基本开集是「指定一层余数」的柱形 $a_m = r$，对角 $\mathbb{Z}$ 的元素 $j = r \pmod m$ 撞进每个柱形，故对角稠密；不等于：取约束「被一切 $2^k$ 整除」加「$\bmod\ 3$ 余 $1$」——相容族存在（第 $30$ 层的解 $x = 10$：$10 \equiv 0 \pmod 2$、$10 \equiv 1 \pmod 3$；逐层用 CRT 向上拼），但没有整数同时满足（被一切 $2^k$ 整除的整数只有 $0$，而 $0 \not\equiv 1 \pmod 3$）。∎

推论即 §16.5 的尸检兑现：$\langle \varphi \rangle \cong \mathbb{Z}$ 稠密于 $G$，故 $K^{\langle \varphi \rangle} = K^{G} = \mathbb{F}_p$（命题 16.9）——两个不同的子群（$\mathbb{Z}$ 与 $\widehat{\mathbb{Z}}$）固定同一个域，闭性这一刀非砍不可。

**命题 16.13**（子域格 $\iff$ 闭子群格，全证侧推）：在 $K = \overline{\mathbb{F}_p}$ 中：1. 每个中间域是有限子域的有向并；2. 中间域 $E$ 对应闭子群 $\bigcap_{\mathbb{F}_{p^m} \subseteq E} m\,\widehat{\mathbb{Z}}$，闭子群 $H$ 对应 $K^H$，互逆；3. 有限子域 $\mathbb{F}_{p^d}$ 对应开子群 $d\,\widehat{\mathbb{Z}} := \ker(\widehat{\mathbb{Z}} \to \mathbb{Z}_d)$，且 $\widehat{\mathbb{Z}}$ 的开子群恰是 $\{d\,\widehat{\mathbb{Z}}\}$，指标为 $d$。

证明：1.（全证）$\alpha \in E$ 落在 $\mathbb{F}_p(\alpha) = \mathbb{F}_{p^d} \subseteq E$（定理 16.12 之 1 的唯一性论证）；故 $E = \bigcup_{\mathbb{F}_{p^m} \subseteq E} \mathbb{F}_{p^m}$，且这类 $m$ 的集合对因子封闭（$\mathbb{F}_{p^{m'}} \subseteq \mathbb{F}_{p^m}$ 当且仅当 $m' \mid m$，定理 15.9）。2. $\sigma$ 固定 $E$ 当且仅当固定每个 $\mathbb{F}_{p^m} \subseteq E$（并集），而 $\mathrm{Gal}(K/\mathbb{F}_{p^m})$ 在同构 $\Phi$ 下恰是 $m\,\widehat{\mathbb{Z}}$（坐标 $m$ 归零的族）；闭性由命题 16.4 之 1 或闭集之交。互逆性即定理 16.8 之 1 在本标本的实例：$K^{\mathrm{Gal}(K/E)} = E$ 由 $E$ 是有限子域之并逐元素读出。3. $d\,\widehat{\mathbb{Z}}$ 是坐标 $d$ 的核，闭且指标 $d$（满射 $\widehat{\mathbb{Z}} \to \mathbb{Z}_d$）；它对应 $\mathbb{F}_{p^d}$（固定 $\mathbb{F}_{p^d}$ 当且仅当坐标 $d$ 归零，因子封闭性把条件传到下界）。反之开子群 $U$ 含某基本邻域 $\ker(\widehat{\mathbb{Z}} \to \mathbb{Z}_n)$，$U$ 在 $\mathbb{Z}_n$ 里的像是循环群的子群 $d'\mathbb{Z}_n$（$d' \mid n$，第 1 章定理 1.6），故 $U = \ker(\widehat{\mathbb{Z}} \to \mathbb{Z}_n \to \mathbb{Z}_n/d'\mathbb{Z}_n) = d\,\widehat{\mathbb{Z}}$（$d = d'$，同一核）。∎

数值锚（sympy 真算，$\mathbb{F}_{64} = \mathbb{F}_2[x]/(x^6 + x + 1)$，$x^6 + x + 1$ 在 $\mathbb{F}_2$ 上不可约）：$\varphi^n$ 在 $\mathbb{F}_{64}$ 内的不动集与 $2^{\gcd(n,6)}$ 逐格咬合， $\varphi$ 在不动集上的阶恰为 $\gcd(n,6)$：

| $n$ | $\lvert \{x \in \mathbb{F}_{64} : x^{2^n} = x\} \rvert$ | $2^{\gcd(n,6)}$ | 不动域 | $\varphi$ 在其上的阶 |
| --- | --- | --- | --- | --- |
| $1$ | $2$ | $2$ | $\mathbb{F}_2$ | $1$ |
| $2$ | $4$ | $4$ | $\mathbb{F}_4$ | $2$ |
| $3$ | $8$ | $8$ | $\mathbb{F}_8$ | $3$ |
| $4$ | $4$ | $4$ | $\mathbb{F}_4$ | $2$ |
| $5$ | $2$ | $2$ | $\mathbb{F}_2$ | $1$ |
| $6$ | $64$ | $64$ | $\mathbb{F}_{64}$ | $6$ |

读法两条。1. 全域里 $\varphi^n$ 的固定域是 $\mathbb{F}_{p^n}$（$x^{p^n} - x$ 的根集），本表是在 $\mathbb{F}_{64}$ 处切片，看到的正是它与 $\mathbb{F}_{64}$ 的交 $\mathbb{F}_{p^{\gcd(n,6)}}$（定理 15.9），两处账互相咬合；$\gcd(n,6) \in \{1,2,3,6\}$ 也当场复验了子域格只许除数层（大小 $\{2, 4, 8, 64\}$，无别的层）。2. 指标账：$[\mathbb{F}_{64} : \mathbb{F}_{2^{\gcd(n,6)}}] = 6/\gcd(n,6)$，恰是开子群指标 $[G : U]$ 的一角，定理 16.8 之 2 在标本上落账。

## $\rm \S \, 16.7$ 与数论册握手

1. **绝对 Galois 群**：$G_{\mathbb{Q}} := \mathrm{Gal}(\overline{\mathbb{Q}}/\mathbb{Q})$ 配 Krull 拓扑，是 profinite 群（§16.3 的机器原样适用：$\overline{\mathbb{Q}}/\mathbb{Q}$ 正规可分）。限制到分圆塔 $\mathbb{Q}(\zeta_n)$（定理 15.14：$\mathrm{Gal} \cong (\mathbb{Z}/n)^{\times}$）给连续满同态 $G_{\mathbb{Q}} \to \varprojlim_n (\mathbb{Z}/n)^{\times} =: \widehat{\mathbb{Z}}^{\times}$；满射那一步就是 Kronecker–Weber 定理（每个有限交换扩张装进某个 $\mathbb{Q}(\zeta_n)$，第 15 章 §15.8 末的陈述级）：$\widehat{\mathbb{Z}}^{\times}$ 是 $\mathbb{Q}$ 的极大交换扩张的 Galois 群。CRT 的无限版给 $\widehat{\mathbb{Z}}^{\times} \cong \prod_p \mathbb{Z}_p^{\times}$（陈述级）。
2. **$\mathbb{Z}_p$ 重现**：$\mathbb{Z}_p := \varprojlim_k \mathbb{Z}_{p^k}$ 是 $\widehat{\mathbb{Z}}$ 的素数因子（坐标里只留 $p$ 的那一份）。数论册第 9 章的局部世界里它再度现身：$p$ 进域的极大非分歧扩张的 Galois 群同构于 $\widehat{\mathbb{Z}}$，Frobenius 第三次当生成元的稠密影子（陈述级，Serre《Local Fields》第 1 章）。单位群结构 $\mathbb{Z}_p^{\times} \cong \mathbb{Z}_{p-1} \times \mathbb{Z}_p$（$p$ 奇，陈述级）的有限影子是真算过的：$(\mathbb{Z}/5^k)^{\times} \cong \mathbb{Z}_4 \times \mathbb{Z}_{5^{k-1}}$ 对 $k = 1, 2, 3$ 逐项验证（sympy 阶账：群阶 $4 \cdot 5^{k-1}$；$x^4 = 1$ 恰 $4$ 个解、$x^{5^{k-1}} = 1$ 恰 $5^{k-1}$ 个解、最大元素阶恰 $4 \cdot 5^{k-1}$、两组解的交只有 $\{1\}$；$\bmod\ 25$ 里 $4$ 阶元是 $\{7, 18\}$、$5$ 阶元是 $\{6, 11, 16, 21\}$）。
3. **Grothendieck 一瞥（一句）**：在 étale 基本群的语言里 $\pi_1(\mathrm{Spec}\ \mathbb{F}_q) \cong \widehat{\mathbb{Z}}$、$\pi_1(\mathrm{Spec}\ \mathbb{Q}) = G_{\mathbb{Q}}$——本章的完美标本是「一个点的基本群」，算术几何的整座大厦从这里起跳（Szamuely 第 5 章起）。

## $\rm \S \, 16.8$ 关键概念回顾

1. 为什么 $G_{\mathbb{Q}}$ 是无限群？Artin 定理的两笔账（$|H|$ 与 $[K:K^H]$）在无限时各失去什么？
2. Krull 拓扑的基本开邻域 $U(\sigma, E)$ 是什么形状？「有限眼力」的比喻对应定义里哪一句？「拼图」的比喻对应逆极限的哪条语法？
3. 命题 16.3 的 Zorn 论证里，链的并为什么还是合法的「中间域 $+$ 嵌入」？极大元的定义域为什么必是 $K$？哪一步用到正规、哪一步用到可分？
4. 命题 16.4 的四条各靠什么？Hausdorff 为什么等价于「并起全部有限世界就分得开」？基本开集为什么既开又闭？
5. 逆极限的元素怎么读？紧性三步（有限离散紧、Tychonoff、闭子集）各在哪一步？「连续双射从紧到 Hausdorff 是同胚」用在何处？
6. 定理 16.8 与定理 13.11 逐条对照：哪条没变、哪条加了「闭」、哪条换了「开」？有限时两处替换为什么自动消失？
7. 闭包公式证明的收口「$|H''| = |\mathrm{Gal}(N''/A)|$」用了哪两条有限定理？${N''}$ 为什么要造两次（先 ${N'}$ 再 $K^H \cdot N'$）？
8. 命题 16.9 里为什么能取「装下 $\alpha$ 的有限 Galois 子扩张」？$\mathbb{Z} \subsetneq \widehat{\mathbb{Z}}$ 如何撞车？
9. $\widehat{\mathbb{Z}}$ 的元素怎么读？为什么对角 $\mathbb{Z}$ 稠密而不等于全部？举一个不属于对角线的元素。
10. $\overline{\mathbb{F}_p}$ 的中间域为什么都是有限子域的并？开子群为什么恰是 $d\,\widehat{\mathbb{Z}}$？$\bigcap_k 2^k\,\widehat{\mathbb{Z}}$ 这类不开的闭子群对应什么样的中间域？

## $\rm \S \, 16.9$ 应用与辨析

1. 有同学说：「无限 Galois 理论就是把第 13 章定理照抄，子群换成全部子群即可。」指出两处失灵，并给出 §16.6 的撞车数据。
2. 设 $L = \mathbb{Q}(\sqrt2, \sqrt3, \sqrt5, \sqrt7, \ldots)$（全部二次域的合成，陈述级）。写出 $\mathrm{Gal}(L/\mathbb{Q})$ 的同构类型，说明它是 $\mathrm{Gal}(\overline{\mathbb{Q}}/\mathbb{Q})$ 的闭子群还是商群，并说明它紧。
3. 在 $\widehat{\mathbb{Z}}$ 中解 $x \equiv 3 \pmod 4$、$x \equiv 5 \pmod 9$；解在第几层可见？它对应 $\mathrm{Gal}(\overline{\mathbb{F}_p}/\mathbb{F}_p)$ 里的什么？
4. 有同学说：「$\mathrm{Gal}(\overline{\mathbb{F}_p}/\mathbb{F}_p)$ 由 $\varphi$ 生成，因为每个自同构都是 $\varphi$ 的幂。」指出错误：哪些自同构确实是 $\varphi$ 的幂？哪些不是？
5. $H = \langle \varphi^2 \rangle \subseteq \mathrm{Gal}(\overline{\mathbb{F}_2}/\mathbb{F}_2)$：闭包是什么？$K^H$ 与 $K^{\overline{H}}$ 各是什么？二者为何相同？

## $\rm \S \, 16.10$ 本章自测答案

> 先闭卷作答 §16.8 与 §16.9，再核对。

### $\rm \S \, 16.10.1$ 关键概念回顾答案

1. 链 $\mathbb{Q}(\sqrt2) \subset \mathbb{Q}(\sqrt2,\sqrt3) \subset \cdots$ 的 Galois 群 $(\mathbb{Z}_2)^k$ 无界，延拓引理把每一层实现成 $G_{\mathbb{Q}}$ 的商，故 $G_{\mathbb{Q}}$ 无限。失灵：$|H|$ 对无限群不数元素个数（基数账不再给「够不够」的判据）；$[K:K^H]$ 两边都无穷，Artin 的等式失去内容，双射的单射性随之塌。（§16.1）
2. $U(\sigma,E) = \{\tau : \tau|_E = \sigma|_E\} = \sigma\,\mathrm{Gal}(K/E)$，$E/F$ 有限 Galois；「有限眼力」对应「$E$ 只能有限」这一句；「拼图」对应相容条件 $\varphi_{ji}(g_j) = g_i$——每层碎片指定一个元素，大层限制到小层必须对上。（§16.2、§16.3）
3. 链的并：域性靠「任取两元素有链中更大成员包住」；嵌入良定义靠链成员两两相容（公共延拓在交上一致）。极大元不是全域时，取 $\alpha \notin M^*$，正规给 $\tau^*(m_{\alpha,M^*})$ 在 $K$ 中有根（整除链 $+$ 正规），可分给根互异、根存在可取，引理 12.14 延拓一步，违反极大性。正规用在「根全在 $K$」，可分用在「有异于旧根的新根」。（§16.2）
4. 陪集结构靠限制映射满射（命题 16.3）加第一同构定理；乘法连续靠限制与复合交换；求逆连续靠限制与取逆交换；Hausdorff 靠 $\bigcup E = K$。基本开集的补是有限多个陪集之并，故闭。（§16.2）
5. 元素 $=$ 相容族 $(g_i)$，$\varphi_{ji}(g_j) = g_i$；三步：有限离散空间紧、Tychonoff 给乘积紧、相容条件是连续映射的点原像故闭；「连续双射紧 $\to$ Hausdorff」用在把群同构升级成拓扑群同构。（§16.3）
6. 第 1 条加「闭」，第 2 条把次数账换成开子群账 $[K:K^H] = |H|$、$[K^H:F] = [G:H]$，第 3、4 条形状不变、商带拓扑；有限群离散故子群全闭全开，两处替换消失。（§16.4）
7. Artin 定理（$[N'':A] = |H''|$）与有限基本定理的固定域条件（$\mathrm{Gal}(N''/A)$ 的固定域也是 $A$，再 Artin 一次）；${N'}$ 把 $E$ 与 $\sigma(E)$ 装进同一个 $\sigma$ 与 $H$ 都保持的有限 Galois 世界，$N'' = K^H \cdot N'$ 让「被 $H$ 限制固定的元素」恰好缩成 $A$，Artin 的计数才有落点。（§16.4）
8. $\alpha$ 代数故 $F(\alpha)$ 有限，正规闭包有限且在 $K$ 内（§13.7）；撞车：$\mathbb{Z}$ 稠密于 $\widehat{\mathbb{Z}}$ 而不等，命题 16.9 给两者固定域同为 $\mathbb{F}_p$，域一侧对二者失明。（§16.5、§16.6）
9. 元素是相容族 $(a_n)_n$，$m \mid n$ 时 $a_m \equiv a_n \pmod m$；对角稠密：每个柱形（指定一层余数）都被某个整数撞进；非对角元素：满足「被一切 $2^k$ 整除且 $\bmod\ 3$ 余 $1$」的相容族（如第 $30$ 层的 $10$），无整数可当。（§16.6）
10. 每个元素落在唯一的最小有限子域 $\mathbb{F}_p(\alpha) = \mathbb{F}_{p^d}$（$p^d$ 元子域唯一）；开子群含基本邻域 $\ker(\widehat{\mathbb{Z}} \to \mathbb{Z}_n)$，像在 $\mathbb{Z}_n$ 中是 $d\mathbb{Z}_n$，核拉回恰是 $d\,\widehat{\mathbb{Z}}$；$\bigcap_k 2^k\,\widehat{\mathbb{Z}}$ 闭不开，对应无穷中间域 $\bigcup_k \mathbb{F}_{p^{2^k}}$——闭子群格比「有限层」富裕。（§16.6）

### $\rm \S \, 16.10.2$ 应用与辨析答案

1. 两处失灵：其一 Artin 定理只对有限群，$|H| = [K:K^H]$ 双双失语；其二固定域映射不再单射。数据：$\mathrm{Gal}(\overline{\mathbb{F}_2}/\mathbb{F}_2) \cong \widehat{\mathbb{Z}}$ 里 $\mathbb{Z} = \langle \varphi \rangle$ 与 $\widehat{\mathbb{Z}}$ 是不同子群（对角族之外有满足「被一切 $2^k$ 整除、$\bmod\ 3$ 余 $1$」的相容族），固定域都是 $\mathbb{F}_2$。正确版本是定理 16.8：闭子群 $\leftrightarrow$ 中间域。（§16.1、§16.5、§16.6）
2. $\mathrm{Gal}(L/\mathbb{Q}) \cong \prod_{p} \mathbb{Z}_2$（每层一个独立变号，陈述级，延拓引理保证商映射 $G_{\mathbb{Q}} \to \prod_p \mathbb{Z}_2$ 满且连续）。它是商群不是闭子群：$L$ 是正规中间域，正规对应（定理 16.8 之 3）给 $G_{\mathbb{Q}}/\mathrm{Gal}(\overline{\mathbb{Q}}/L) \cong \mathrm{Gal}(L/\mathbb{Q})$。紧：它是有限离散群 $\mathbb{Z}_2$ 的直积、按乘积拓扑，Tychonoff 一角直接给紧；也可从 $\mathrm{Gal}(\overline{\mathbb{Q}}/L)$ 闭（商映射核）加 $G_{\mathbb{Q}}$ 紧读出商紧。（§16.3、§16.4、§16.7）
3. CRT：$x \equiv 3 \pmod 4$、$x \equiv 5 \pmod 9$ 在 $\mathbb{Z}_{36}$ 有唯一解 $x = 13$（$13 = 3 \times 4 + 1$：$13 \equiv 3 \pmod 4$、$13 \equiv 5 \pmod 9$；sympy 同型验证过 $\mathbb{Z}_{mn} \cong \mathbb{Z}_m \times \mathbb{Z}_n$ 的双射），第 $36$ 层可见，且由相容条件在第 $36$ 的倍数层全部可见。对应：$\mathrm{Gal}(\overline{\mathbb{F}_p}/\mathbb{F}_p)$ 中限制到 $\mathbb{F}_{p^4}$ 是 $\varphi^3$、限制到 $\mathbb{F}_{p^9}$ 是 $\varphi^5$ 的那个自同构；存在唯一性就是 $\widehat{\mathbb{Z}}$ 的语法（命题 16.6 的相容族拼接）。（§16.3、§16.6）
4. 错在把「生成稠密子群」当「生成全群」。是 $\varphi$ 的幂的自同构：对角族 $(j, j, j, \ldots)$，即 $\varphi^j$；不是的：任何非对角相容族，例如坐标「被一切 $2^k$ 整除、$\bmod\ 3$ 余 $1$」的族。$\langle \varphi \rangle \cong \mathbb{Z}$ 只是稠密真子群，闭包才是全群（定理 16.12 之 4）。（§16.6）
5. $\overline{H} = \overline{\langle \varphi^2 \rangle} = 2\,\widehat{\mathbb{Z}}$（偶数对角族的闭包：基本开集「坐标 $m$ 定余数」能被偶数撞进当且仅当该余数是偶数类，闭包恰是坐标全偶的族）。$K^{\overline{H}} = K^{2\,\widehat{\mathbb{Z}}} = \mathbb{F}_4$（坐标 $2$ 归零 $\iff$ 固定 $\mathbb{F}_{2^2}$）；$K^H = K^{\overline{H}} = \mathbb{F}_4$（命题 16.9：固定域只认闭包）。相同的原因：$\varphi^2$ 的奇数幂不在 $H$ 里但落在其闭包里，域论对「极限动作」失明。（§16.5、§16.6）

---

本章把第 13 章的对表法则升级到无限世界：Krull 拓扑给群装上「有限眼力」的视野账本，闭子群接替子群与中间域对表，完美标本 $\widehat{\mathbb{Z}}$ 把 Frobenius 的稠密影子、子域格与闭子群格逐层对齐，并与数论册的 $G_{\mathbb{Q}}$、$\mathbb{Z}_p$ 接上了轨。下一章是全册的收束地图：群、模、域三卷的定理与机器将在一张图上归位，本章的 profinite 语言也将标出它通向类域论与算术几何的接口。

> 你现在能：陈述无限 Galois 扩张的定义并用 $2^{1/n}$ 与二次塔说明 $G_{\mathbb{Q}}$ 无限、Artin 两笔账为何失语；全证 Krull 拓扑的拓扑群公理（陪集结构、乘法与求逆连续、Hausdorff 的 $\bigcup E = K$ 账）与无限延拓引理的 Zorn 论证；当堂写出逆极限的相容族语法并走通紧性三步（有限离散紧、Tychonoff、闭子集）；复述无限基本定理四条与六步骨架（塔向上 Galois、固定域条件、闭值域、闭包公式的 Artin 计数收口、开 $\iff$ 有限次、正规对应与商），并指出有限时它如何退化成定理 13.11；全证 $K^H = K^{\overline{H}}$ 并用 $\mathbb{Z} \subsetneq \widehat{\mathbb{Z}}$ 稠密演示撞车；全证 $\mathrm{Gal}(\overline{\mathbb{F}_p}/\mathbb{F}_p) \cong \widehat{\mathbb{Z}}$ 的四步与子域格 $\iff$ 闭子群格的侧推；报出本章数值锚（$\widehat{\mathbb{Z}}$ 前四层 $\mathbb{Z}_2, \mathbb{Z}_6, \mathbb{Z}_{30}, \mathbb{Z}_{210}$ 的 CRT 分解与 $\mathrm{lcm}(2,3,5) = 30$、$\mathbb{F}_{64}$ 中 $\varphi^n$ 不动集 $\{2, 4, 8, 4, 2, 64\} = 2^{\gcd(n,6)}$ 与 $\varphi$ 的阶 $\gcd(n,6)$、$(\mathbb{Z}/5^k)^{\times}$ 对 $k = 1,2,3$ 的 $\mathbb{Z}_4 \times \mathbb{Z}_{5^{k-1}}$ 阶账与 $\bmod\ 25$ 的 $4$ 阶元 $\{7,18\}$、$5$ 阶元 $\{6,11,16,21\}$）各验的是什么。
