/**
 * Behavioural test for the browser half, without a browser: the module is
 * evaluated against a fake module loader and a fake React that returns plain
 * element descriptions, so registration and the click handler can be asserted.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import test from 'node:test'

const bundleRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Evaluate client.js with a capturing module loader and return its factory. */
function loadFactory() {
  const source = readFileSync(join(bundleRoot, 'client.js'), 'utf8')
  let definition
  const window = { __ModuleLoader__: { load: (value) => { definition = value } } }
  new Function('window', source)(window)
  assert.ok(definition, 'client.js registered nothing')
  assert.equal(definition.id, '@local/dsh-ip-advisor')
  const requireStub = (specifier) => {
    assert.equal(specifier, 'react')
    const createElement = (type, props, ...children) => ({ type, props: props ?? {}, children })
    return { createElement, Fragment: Symbol.for('react.fragment') }
  }
  return definition.factory(requireStub)
}

/**
 * Build the smallest client context the module touches.
 * @param options - whether a Workspace exists.
 */
function makeContext(options = {}) {
  const { hasWorkspace = true } = options
  const state = { registrations: [], dictionaries: undefined, starts: [], effects: [] }
  const ctx = {
    effect: (callback, label) => {
      state.effects.push(label)
      return callback()
    },
    locale: {
      register: (ns, dictionaries) => {
        state.dictionaries = { ns, dictionaries }
        return () => {}
      },
      bind: (ns) => (key) => {
        assert.equal(ns, 'ipAdvisor')
        return state.dictionaries.dictionaries.zh[key] ?? key
      },
    },
    slots: {
      inject: (name, callback) => {
        state.injectedInto = name
        const disposer = callback()
        return disposer
      },
      register: (options, component) => {
        state.registrations.push({ options, component })
        return () => {}
      },
    },
    get: (name) => name !== 'workspaces' ? undefined : {
      list: {
        getSnapshot: () => (hasWorkspace
          ? { phase: 'ready', items: [{ workspaceId: 'w-1' }] }
          : { phase: 'ready', items: [] }),
      },
    },
    uiWorkspace: { startSession: (...args) => { state.starts.push(args) } },
  }
  return { ctx, state }
}

/** Flatten an element description into its text. */
function textOf(node) {
  if (typeof node === 'string') return node
  if (node === null || node === undefined || typeof node !== 'object') return ''
  return node.children.map(textOf).join('')
}

test('registers one entry at the sidebar foot', () => {
  const module = loadFactory()
  assert.deepEqual(module.inject, ['slots', 'locale', 'uiWorkspace'])
  const { ctx, state } = makeContext()
  module.apply(ctx)
  assert.equal(state.injectedInto, 'sidebar.footer.action')
  assert.equal(state.registrations.length, 1)
  const { options } = state.registrations[0]
  assert.equal(options.name, 'sidebar.footer.action')
  assert.equal(options.id, 'ip-advisor')
  assert.equal(options.locale, 'ipAdvisor')
  assert.deepEqual(Object.keys(state.dictionaries.dictionaries).sort(), ['en', 'zh'])
})

test('a click opens the consultant preset with the opening line staged', () => {
  const module = loadFactory()
  const { ctx, state } = makeContext()
  module.apply(ctx)
  state.registrations[0].options.inject().open()
  assert.deepEqual(state.starts, [[undefined, {
    agentPreset: 'ip-advisor',
    prompt: '帮我做个人IP定位，现在开始五阶段访谈。',
    whenDraftExists: 'keep',
  }]])
})

test('a click with no Workspace falls back to the New Session view', () => {
  const module = loadFactory()
  const { ctx, state } = makeContext({ hasWorkspace: false })
  module.apply(ctx)
  state.registrations[0].options.inject().open()
  assert.deepEqual(state.starts, [[]])
})

test('wide shows icon and label; the rail shows the icon only', () => {
  const module = loadFactory()
  const { ctx, state } = makeContext()
  module.apply(ctx)
  const component = state.registrations[0].component
  const t = (key) => ({ title: '顶尖IP定位顾问', aria: '打开对话' })[key]

  const wide = component({ wide: true, t, open: () => {} })
  const wideButton = wide.children.find((child) => child.type === 'button')
  assert.equal(wideButton.props['aria-label'], '打开对话')
  assert.equal(wideButton.props.title, undefined)
  assert.equal(textOf(wideButton), '顶尖IP定位顾问')
  assert.equal(wideButton.props.className, 'dsh-ip-advisor-entry')

  const rail = component({ wide: false, t, open: () => {} })
  const railButton = rail.children.find((child) => child.type === 'button')
  assert.equal(railButton.props.title, '顶尖IP定位顾问')
  assert.equal(textOf(railButton), '')
  assert.match(railButton.props.className, /dsh-ip-advisor-entry--rail/u)

  let clicks = 0
  const clickable = component({ wide: true, t, open: () => { clicks++ } })
  clickable.children.find((child) => child.type === 'button').props.onClick()
  assert.equal(clicks, 1)
})

test('the component ships its own styles and no foreign ones', () => {
  const module = loadFactory()
  const { ctx, state } = makeContext()
  module.apply(ctx)
  const element = state.registrations[0].component({ wide: true, t: (key) => key, open: () => {} })
  const style = element.children.find((child) => child.type === 'style')
  assert.ok(style, 'no <style> element')
  assert.match(style.children[0], /--dsw-alias-label-primary/u)
  assert.match(style.children[0], /--dsw-radius-md/u)
  assert.doesNotMatch(style.children[0], /#[0-9a-f]{3,6}\b/iu, 'hard-coded colour outside theme tokens')
})
