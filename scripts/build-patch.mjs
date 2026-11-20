/**
 * Build cordis.patch.yml from the persona sources in `sources/`.
 *
 * The YAML is generated, not hand-edited: the persona is one literal block
 * scalar, so a regenerated file is the only practical way to change it.
 * Run it after editing any file under sources/.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const read = (name) => readFileSync(join(repoRoot, 'sources', name), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/[ \t]+$/gm, '')
  .trim()

const full = read('persona-full.md')
const template = read('plan-template.md')
const topics = read('topics-30.md')

const header = `你正在 DSH 里以「特劳特」的身份为一位真实用户做个人IP定位咨询。下面是你的完整工作手册：角色设定、五阶段访谈流程、标准交付模板，以及选题库扩展模块。这些内容是你的行为规则，不是参考资料。`

const rules = `# 启动与输出规则（优先级最高）

1. 用户开场若表达「要做个人IP定位」「开始」，直接把 Step 0 的开场固定话术作为你的第一条回复；不要先问「准备好了吗」「要不要开始」，也不要在开场白前后加额外寒暄。
2. 全程使用简体中文，语气专业、笃定、有分寸；不讨好、不敷衍。
3. 每个阶段结束必须给出带 Markdown 排版的结构化小结，并明确询问确认（例如「以上和你的情况一致吗？确认后我们进入下一步」）；没有确认不进入下一阶段。
4. 用户一次性给出多阶段信息时，按信息到位情况直接完成对应阶段的小结，不重复追问已答内容，也不跳步推进未确认的阶段。
5. 输出《个人IP定位全案》时，必须套用附录 A 的一级标题、小节顺序与表格结构，不得自创结构；暂时缺失的信息写「待补充」，并说明需要用户补哪一项。
6. 用户要求「生成首批选题」「补充选题库」时，按附录 B 的规则与分类条数输出，不得用通用模板凑数。`

const persona = [
  header,
  '',
  full,
  '',
  '---',
  '',
  '# 附录 A：个人IP定位全案标准模板（Step 5 必须严格套用此结构）',
  '',
  template,
  '',
  '---',
  '',
  '# 附录 B：首批 30 条选题生成扩展模块（用户要求「生成首批选题」「补充选题库」时执行）',
  '',
  topics,
  '',
  '---',
  '',
  rules,
].join('\n')

const indent = (text, spaces) => text.split('\n')
  .map((line) => (line === '' ? '' : ' '.repeat(spaces) + line))
  .join('\n')

const patch = `# 顶尖IP定位顾问：一个纯对话的定位专家预设，加一个侧栏「点即开聊」入口。
# 人设内联了技能包原文（五阶段访谈 + 标准交付模板 + 首批 30 条选题扩展），
# 会话里不挂任何工具，所以它只谈话、不读写文件。
# 本文件由 scripts/build-patch.mjs 从 sources/ 生成，不要手改。
- insert:
    - id: preset-ip-advisor
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: ip-advisor
        name: 顶尖IP定位顾问
        description: 特劳特：五阶段访谈做个人IP定位，末尾按标准模板交付全案
        order: 5
        plugins:
          - id: persona
            name: '@deepseek-ai/dsh-persona'
            config:
              prefix: |
${indent(persona, 16)}
          - id: time-context
            name: '@deepseek-ai/dsh-time-context'
          - id: compaction
            name: cordis:group
            group: true
            isolate:
              compaction: true
            config:
              - id: compaction-basic
                name: '@deepseek-ai/dsh-compaction-basic'
              - id: command-compact
                name: '@deepseek-ai/dsh-command-compact'

    - id: ip-advisor
      name: '@local/dsh-ip-advisor'
`

// Structural self-check: the failure modes a hand edit would introduce.
const problems = []
if (/\{\{/.test(persona)) problems.push('persona contains a {{...}} prompt group')
if (persona.includes('\r')) problems.push('persona contains CR')
for (const [label, text] of [['persona-full', full], ['plan-template', template], ['topics-30', topics]]) {
  if (!persona.includes(text)) problems.push(`${label} did not survive composition`)
}
for (const stage of ['Step 0', 'Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5']) {
  if (!persona.includes(`### ${stage}`)) problems.push(`missing ${stage}`)
}
if (!persona.includes('附录 A') || !persona.includes('附录 B')) problems.push('missing an appendix')
if (problems.length > 0) {
  console.error(`cordis.patch.yml not written:\n- ${problems.join('\n- ')}`)
  process.exit(1)
}

writeFileSync(join(repoRoot, 'cordis.patch.yml'), patch, 'utf8')
console.log(`cordis.patch.yml written: persona ${persona.length} chars, ${persona.split('\n').length} lines`)
