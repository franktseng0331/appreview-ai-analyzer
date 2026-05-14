import { useState } from 'react';

const INSIGHT_DICTIONARY_PATH = '/Users/mac/Desktop/appreview-ai-analyzer/config/insight-dictionaries.json';

type FieldGuide = {
  name: string;
  meaningEn: string;
  meaningZh: string;
  impactEn: string;
  impactZh: string;
  example: string;
};

const useCaseFields: FieldGuide[] = [
  {
    name: 'label',
    meaningEn: 'The final normalized use case name shown in the report.',
    meaningZh: '最终展示在报告中的标准化场景标签名称。',
    impactEn: 'Changing this will directly change labels shown in Use Case Radar, Persona Insights, and related report narratives.',
    impactZh: '修改后会直接影响 Use Case Radar、Persona Insights 以及相关报告解读中的标签名称。',
    example: 'Professional Productivity',
  },
  {
    name: 'categories',
    meaningEn: 'The app categories where this rule is allowed to match.',
    meaningZh: '该规则允许命中的应用类别范围。',
    impactEn: 'Changing this affects which app genres are allowed to use the label during scenario normalization.',
    impactZh: '修改后会影响哪些应用类别可以使用该标签参与场景归并。',
    example: '["productivity", "general"]',
  },
  {
    name: 'patterns',
    meaningEn: 'Keyword or regex-like patterns used to map raw model output into the normalized use case label.',
    meaningZh: '用于把模型原始场景输出归并到标准标签的关键词或正则模式。',
    impactEn: 'Changing this affects recall and grouping quality. It decides which raw phrases will be merged into this use case.',
    impactZh: '修改后会影响召回和归并效果，决定哪些原始场景表达会被并入该标签。',
    example: '["daily productivity", "\\\\bwork\\\\b", "task management"]',
  },
];

const painGainFields: FieldGuide[] = [
  {
    name: 'painLabels',
    meaningEn: 'The normalized pain labels that should trigger the same strategy recommendation.',
    meaningZh: '应归到同一策略建议下的标准化痛点标签集合。',
    impactEn: 'Changing this affects which dealbreakers and pain signals will be routed to the same strategy response.',
    impactZh: '修改后会影响哪些 Dealbreakers 和 Pain Signals 会被归到同一条策略结论。',
    example: '["Pricing", "Billing", "Subscription"]',
  },
  {
    name: 'gain',
    meaningEn: 'The final strategy statement shown in the Pain-to-Gain Matrix.',
    meaningZh: 'Pain-to-Gain 矩阵里最终展示的策略结论文案。',
    impactEn: 'Changing this directly alters the strategic recommendation displayed in the report for the matched pain labels.',
    impactZh: '修改后会直接改变报告里该组痛点对应展示的策略结论文案。',
    example: 'Lower adoption risk with clearer pricing and flexible plans.',
  },
  {
    name: 'icon',
    meaningEn: 'The visual icon key used in the report card.',
    meaningZh: '报告卡片中使用的图标键值。',
    impactEn: 'Changing this only affects the visual icon shown in the Pain-to-Gain card, not the matching logic.',
    impactZh: '修改后只会影响 Pain-to-Gain 卡片展示的图标，不会影响匹配逻辑本身。',
    example: '"Download" / "Shield" / "Zap" / "MousePointer2"',
  },
];

const editingTips = [
  {
    en: 'Keep labels short, stable, and reusable. Prefer taxonomy-style labels over full sentences.',
    zh: '标签尽量保持简短、稳定、可复用，优先使用 taxonomy 风格的名称，而不是完整句子。',
  },
  {
    en: 'If several raw phrases mean the same thing, merge them into one label in the dictionary instead of changing report code.',
    zh: '如果多种原始表达本质是同一问题，应在字典里归并到同一标签，而不是修改报告代码。',
  },
  {
    en: 'Use patterns to absorb spelling variants, wording variants, and adjacent synonyms.',
    zh: '可以通过 patterns 吸收拼写差异、措辞差异和相邻近义词。',
  },
  {
    en: 'When updating Pain-to-Gain strategies, write concise, action-oriented statements rather than generic slogans.',
    zh: '更新 Pain-to-Gain 策略时，优先写简洁、可执行的策略表达，不要写空泛口号。',
  },
  {
    en: 'After editing the dictionary file, restart the backend service so the updated rules are reloaded.',
    zh: '修改字典文件后，需要重启后端服务，新的规则才会被重新加载。',
  },
];

const commonCases = [
  {
    titleEn: 'Merge multiple raw phrases into one Use Case',
    titleZh: '把多种原始表达归并成一个 Use Case',
    bodyEn: 'If users mention "meeting note", "meeting transcription", and "Zoom transcription", place all three patterns under the same label such as "Knowledge Capture".',
    bodyZh: '如果评论里同时出现 “meeting note”、“meeting transcription” 和 “Zoom transcription”，可以把它们都归到同一个标签，例如 “Knowledge Capture”。',
  },
  {
    titleEn: 'Refine a pricing strategy response',
    titleZh: '细化定价类策略建议',
    bodyEn: 'If product wants a stronger pricing conclusion, update the "gain" field under the pricing pain group instead of editing report code.',
    bodyZh: '如果产品希望定价类结论更强，可以直接修改 Pricing 所在 pain group 的 “gain” 文案，而不是改报告代码。',
  },
  {
    titleEn: 'Add a new product-specific use case',
    titleZh: '新增产品特有的场景标签',
    bodyEn: 'If a new scenario repeatedly appears in reviews, add a new useCaseRules item with a stable label, categories, and patterns.',
    bodyZh: '如果评论里持续出现新的使用场景，可以新增一条 useCaseRules，定义稳定标签、适用类别和匹配 patterns。',
  },
];

const exampleJson = `{
  "useCaseRules": [
    {
      "label": "Professional Productivity",
      "categories": ["productivity", "general"],
      "patterns": ["daily productivity", "\\\\bwork\\\\b", "task management"]
    }
  ],
  "painGainRules": {
    "productivity": [
      {
        "painLabels": ["Pricing", "Billing", "Subscription"],
        "gain": "Lower adoption risk with clearer pricing, flexible plans, and better access to previously generated outputs.",
        "icon": "Download"
      }
    ]
  }
}`;

export default function DictionaryGuide() {
  const [copied, setCopied] = useState(false);

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(exampleJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Dictionary Guide / 规则说明</h2>
        <div className="mt-2 space-y-2">
          <p className="text-sm text-slate-500">
            This page explains how operations and product teams can maintain the Use Case taxonomy
            and Pain-to-Gain strategy dictionary without editing backend logic.
          </p>
          <p className="text-sm text-slate-500">
            本页用于说明运营和产品如何在不修改后端逻辑的情况下，维护 Use Case taxonomy 和
            Pain-to-Gain 策略字典。
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Dictionary file / 字典文件：
          {' '}
          <span className="font-semibold">{INSIGHT_DICTIONARY_PATH}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Use Case Rules / 场景标签规则</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-500">
              These rules map raw inferred scenarios into the normalized labels used by the Use Case
              Radar and Persona Insights modules.
            </p>
            <p className="text-sm text-slate-500">
              这组规则负责把模型原始推断出的使用场景，归并成 Use Case Radar 和 Persona
              Insights 中使用的标准化标签。
            </p>
          </div>
          <div className="mt-5 space-y-4">
            {useCaseFields.map((field) => (
              <div key={field.name} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{field.name}</div>
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-medium text-slate-700">{field.meaningEn}</p>
                  <p className="text-sm text-slate-500">{field.meaningZh}</p>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Impact / 修改影响</div>
                  <p className="mt-1 text-sm font-medium text-slate-700">{field.impactEn}</p>
                  <p className="mt-1 text-sm text-slate-500">{field.impactZh}</p>
                </div>
                <div className="mt-3 text-xs font-mono text-slate-500">{field.example}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Pain-to-Gain Rules / 痛点策略规则</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-500">
              These rules define how normalized pain labels are grouped and what strategic response is
              displayed in the report.
            </p>
            <p className="text-sm text-slate-500">
              这组规则定义了标准化痛点标签如何归组，以及报告里最终展示什么策略应对结论。
            </p>
          </div>
          <div className="mt-5 space-y-4">
            {painGainFields.map((field) => (
              <div key={field.name} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{field.name}</div>
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-medium text-slate-700">{field.meaningEn}</p>
                  <p className="text-sm text-slate-500">{field.meaningZh}</p>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Impact / 修改影响</div>
                  <p className="mt-1 text-sm font-medium text-slate-700">{field.impactEn}</p>
                  <p className="mt-1 text-sm text-slate-500">{field.impactZh}</p>
                </div>
                <div className="mt-3 text-xs font-mono text-slate-500">{field.example}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Example JSON / 示例 JSON</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-500">
              Product or operations teams can use this structure as a reference when editing the
              dictionary file.
            </p>
            <p className="text-sm text-slate-500">
              运营或产品团队可以参考下面的结构编辑字典文件，无需改动后端逻辑。
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleCopyTemplate}
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Copy Template JSON
            </button>
            <span className="text-xs text-slate-400">
              {copied ? 'Copied.' : 'Copy the sample structure for quick editing.'}
            </span>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-100">
            <code>{exampleJson}</code>
          </pre>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Editing Tips / 编辑建议</h3>
          <div className="mt-5 space-y-3">
            {editingTips.map((tip) => (
              <div key={tip.en} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-700">{tip.en}</p>
                <p className="mt-1 text-sm text-slate-500">{tip.zh}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Common Operations Cases / 运营常见修改案例</h3>
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
          {commonCases.map((item) => (
            <div key={item.titleEn} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">{item.titleEn}</div>
              <div className="mt-1 text-sm text-slate-500">{item.titleZh}</div>
              <p className="mt-3 text-sm font-medium text-slate-700">{item.bodyEn}</p>
              <p className="mt-2 text-sm text-slate-500">{item.bodyZh}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
