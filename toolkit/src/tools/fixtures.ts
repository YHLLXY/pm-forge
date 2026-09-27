export const COMPETITOR_FIXTURE = `# 竞品分析：随手记账 Q4 差异化方向

## 一、分析目的
为 Q4 迭代选择差异化方向（【依据输入】决策目的）。

## 二、市场与竞品选择
- 钱迹：无广告、主打资产管理（【依据输入】）。
- 选择理由：同为记账工具、目标人群重叠（【推断】）。

## 三、竞品画像
| 竞品 | 定位 | 目标用户 | 商业模式 | 数据表现 |
|---|---|---|---|---|
| 钱迹 | 极简记账+资产管理 | 上班族为主 | Pro 买断 | 待验证 |

## 四、功能矩阵与体验对比
| 功能 | 我方 | 钱迹 | 备注 |
|---|---|---|---|
| 快速记账 | 4 | 3 | 我方 10 秒记一笔（【依据输入】） |
| 报表图表 | 2 | 3 | 我方报表简单（【依据输入】差评） |

## 五、差异化与机会点
机会点：把"10 秒记账"做到极致（语音/贴纸快捷输入），暂避报表硬碰硬（【推断】）。

## 六、信息来源
- 竞品评分来自用户材料；钱迹商业模式为【行业常识】，建议核实方式：App Store 页面核对。`;

export const FEEDBACK_FIXTURE = JSON.stringify(
  {
    themes: [
      {
        name: "叫车匹配慢",
        summary: "高峰期发单后长时间无人接单，等待时间过长",
        sentiment: "negative",
        count: 2,
        quotes: ["等了十分钟没人接单", "高峰期根本叫不到车"],
        impact: 4,
        severity: 5,
        opportunities: ["等待超时自动改派并提示预计时间"],
      },
      {
        name: "司机履约差",
        summary: "接单后司机取消或爽约",
        sentiment: "negative",
        count: 1,
        quotes: ["司机爽约了"],
        impact: 4,
        severity: 4,
        opportunities: ["爽约信用分与赔付券"],
      },
      {
        name: "支付失败",
        summary: "支付环节报错导致行程结束体验差",
        sentiment: "negative",
        count: 1,
        quotes: ["支付总是失败"],
        impact: 3,
        severity: 5,
        opportunities: ["增加支付重试与渠道降级"],
      },
      {
        name: "界面好评",
        summary: "视觉设计受到认可",
        sentiment: "positive",
        count: 1,
        quotes: ["界面很好看"],
        impact: 2,
        severity: 1,
        opportunities: ["保持设计语言，截图用于宣传"],
      },
      {
        name: "想要包月",
        summary: "高频用户希望有更优惠的付费方式",
        sentiment: "mixed",
        count: 1,
        quotes: ["想要包月套餐"],
        impact: 3,
        severity: 2,
        opportunities: ["试点学生包月卡"],
      },
    ],
    overallSentiment: "negative",
    notableOutliers: [],
  },
  null,
  2,
);

export const PRD_FIXTURE = `# PRD：月度报告导出 PDF

## 一、背景与目标
- 问题：用户只能截图分享月度报告，排版差（【依据输入】）。
- 北极星指标：月度报告分享次数 / 人·月（口径：点击分享按钮的去重用户）。
- 护栏指标：导出成功率 ≥99%、页面加载 ≤2s。

## 二、用户与场景
大学生用户在月底查看消费报告并分享给家人（【依据输入】）。

## 三、用户故事与功能需求
| 编号 | 用户故事 | 优先级 | 验收标准 |
|---|---|---|---|
| F1 | 作为用户，我想要一键导出 PDF，以便保存和分享 | P0 | 给定月度报告页，当点击导出，则 5 秒内生成含图表的 PDF |

## 四、流程与交互
报告页 → 点"导出 PDF" → 生成中（进度条）→ 完成（预览+保存）。异常：生成失败提示重试【待补充：小程序端 PDF 方案选型，找技术确认】。

## 五、非功能需求
- 埋点：export_report_clicked（触发：点击导出按钮）；export_report_success / export_report_fail。
- 兼容：iOS/Android 微信小程序最新两个大版本。

## 六、风险与开放问题
| 风险/问题 | 影响 | 当前判断 | 需要谁拍板 |
|---|---|---|---|
| 小程序生成 PDF 的技术方案 | 高 | 待调研 | 技术 |
| 信息缺口清单 | 中 | 见各【待补充】 | - |`;
