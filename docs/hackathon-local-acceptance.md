# 本地教学版验收 / Local teaching acceptance

日期 / Date: 2026-10-12. 本次仅本地交付；未推送 GitHub，未调用 Sites 发布流程，线上 v16 保持原状。

## 已验证的范围

- 五个教学板块默认进入真实 CAD 整体模型；中英文导航、操作、教程和材料说明可切换。
- Edge 桌面窗口 1440×900、1280×720、1024×768 无页面横向溢出。装配播放控制与右侧步骤按钮在窗口内可用。
- 九阶段场景加载无浏览器错误；播放、暂停、拖动进度、半速和推荐镜头有效。播放完成不会自动勾选实物检查。
- 当前阶段、环号、手动检查和收料记录刷新后恢复。重置学习进度保留收料与磁铁设计。
- 材料 CSV 下载、零件详情、键盘 Escape、零件到资料与步骤的关联有效。44 份资料及当前语言尺寸图的 45 个下载入口响应成功。
- MATLAB 数据与教学模型一致：14 层、每环 28 列、1,736 颗 12 mm 方块；R05 的混合方向环为 84 块。CAD 中观察到 56 底座、56 盖板、182 短螺丝实例；这些不代替发行制造或采购清单。
- 全部十四层注册矩阵为毫米单位的正交刚体变换。导槽轴线用于扇形与半环滑合；100 mm 为动画分离距离，不是安装规格。
- 原磁场实验的方向编辑保持手动计算。整层修改 28 块后，已完成场图保持不变，直到点击计算；切换章节保留设计、保存文件、撤销／重做和计算结果。
- 新版初始中心场仍为 37.343568936442715 mT 的理想模型值；旧版为约 32.2635 mT。物理计算模块及初始缓存未随教学改版变更；此前模型、设计、有限磁块场、标定、初始场、实时场、线圈及对比测试通过。
- TypeScript 检查、本地生产构建、新增教学代码的 ESLint 检查通过。图片使用原生图片标签的性能建议保留；原实验台已有的静态规则问题不在本次教学改版中重写。

## 实物装配前仍需补齐

1. R05/R10 最外槽有约 **0.2 mm 名义内侧干涉**。网页保留真实尺寸并显示提示，不修改磁铁几何掩盖问题。
2. 亚克力暂无独立确认的 CAD、厚度和最终到位层位。蓝色悬浮层是滑动关系示意，位于真实磁铁与盖板之外。
3. 短螺丝 CAD `2.9×16 BF` 与参考图 `M3×18` 存在版本差异；M10 黄铜螺母参考不能证明长杆规格或完整紧固配置。
4. R01/R14 外缘支撑注册、发行打印版本、公差、夹具、磁铁加载约束、紧固要求以及铝型材切割清单仍须核实。
5. 动画验证几何轴向关系，不验证装配力、磁吸力或现场工艺。机械结构没有未经材料建模就加入磁场求解；模型数值仍须实测校验。

详细来源与坐标核对见 [CAD audit](cad-audit.md)。封面来源见 [visual provenance](teaching-visuals.md)。

## English summary

The local build and desktop browser checks passed. Tutorial state persists independently of the retained magnetic-field Lab. Downloads, CSV, manual completion checks, animation controls and bilingual navigation work. CAD registrations preserve millimetres and proper rotations; the 14×28 layout contains 1,736 separate cubes. No GitHub push or Sites publication was performed.

This is a teaching preview, not a released fabrication package. Confirm the R05/R10 0.2 mm nominal interference, acrylic seating, screw-version mismatch, support registration, printing tolerances, fixtures, rod/frame specifications and workshop procedures before manufacturing. Field results remain ideal-model calculations requiring measurement.
