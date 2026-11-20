/**
 * Browser half of the 顶尖IP定位顾问 bundle.
 *
 * Registers one entry at the sidebar foot ("顶尖IP定位顾问"). A click opens a
 * new Session under the bundle's `ip-advisor` Agent preset and stages the
 * opening line in the composer, so the consultant starts the five-stage
 * interview on the first send. The same preset also appears in the
 * new-session preset picker, which the Agent-preset plugin owns.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-ip-advisor',
  factory(require) {
    var React = require('react');
    var h = React.createElement;

    /** Preset declared by this bundle's patch. */
    var PRESET_ID = 'ip-advisor';

    /** Locale dictionary namespace owned by this plugin. */
    var NS = 'ipAdvisor';

    var ZH = {
      title: '顶尖IP定位顾问',
      aria: '与顶尖IP定位顾问开始对话，开启个人IP定位访谈',
      openPrompt: '帮我做个人IP定位，现在开始五阶段访谈。',
    };

    var EN = {
      title: 'IP positioning advisor',
      aria: 'Start a chat with the IP positioning advisor',
      openPrompt: 'Help me position my personal brand. Start the five-stage interview.',
    };

    // Sidebar-foot row: the same 12px radius, 32px rhythm and theme tokens the
    // sidebar's own rows use, so the entry sits with Settings instead of
    // looking bolted on. The rail keeps the 36px control box.
    // Row geometry copies the sidebar's own rows: the 3px transparent paint
    // inset the panel rows use (so the hover pill is the same width, not 3px
    // wider per side), 5px/9px padding, 6px label gap, 14/22 type.
    var CSS = [
      '.dsh-ip-advisor-entry{display:flex;align-items:center;gap:var(--dsh-sidebar-label-gap,6px);',
      'width:100%;min-height:32px;margin:0;padding:5px 9px;box-sizing:border-box;border:0;',
      'border-inline:var(--dsh-sidebar-paint-inset,3px) solid transparent;border-radius:var(--dsw-radius-md);',
      'background:transparent;background-clip:padding-box;color:var(--dsw-alias-label-primary);',
      'font:inherit;font-size:14px;line-height:22px;text-align:left;cursor:pointer;}',
      '@media (hover:hover){.dsh-ip-advisor-entry:hover{background-color:var(--dsw-alias-interactive-bg-hover);}}',
      '.dsh-ip-advisor-entry:focus-visible{outline:var(--dsw-focus-ring-width) solid',
      'var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px;}',
      '.dsh-ip-advisor-entry--rail{width:36px;height:36px;min-height:36px;padding:0;justify-content:center;',
      'gap:0;border-inline:0;}',
      '.dsh-ip-advisor-entry-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;',
      'color:var(--dsw-alias-label-secondary);}',
      '.dsh-ip-advisor-entry--rail .dsh-ip-advisor-entry-icon{color:var(--dsw-alias-label-primary);}',
      '.dsh-ip-advisor-entry .dsh-ip-advisor-entry-label{min-width:0;overflow:hidden;text-overflow:ellipsis;',
      'white-space:nowrap;}',
    ].join('');

    /**
     * Pin glyph: one subject, drawn at the size the row asks for.
     * @param props - { size } square edge in pixels.
     */
    function PinGlyph(props) {
      return h('svg', {
        width: props.size,
        height: props.size,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': 'true',
        focusable: 'false',
        style: { display: 'block' },
      },
      h('path', {
        d: 'M12 3.2C8.7 3.2 6 5.9 6 9.2c0 4.3 6 11.6 6 11.6s6-7.3 6-11.6c0-3.3-2.7-6-6-6Z',
        stroke: 'currentColor',
        strokeWidth: 1.9,
        strokeLinejoin: 'round',
      }),
      h('circle', { cx: 12, cy: 9.1, r: 2.1, fill: 'currentColor' }));
    }

    /**
     * The sidebar-foot entry. Wide renders icon + label; the rail renders the
     * icon alone, with the title as its tooltip.
     * @param props - slot owner state (wide), the locale seat (t) and `open`.
     */
    function AdvisorEntry(props) {
      var wide = props.wide;
      return h(React.Fragment, null,
        h('style', null, CSS),
        h('button', {
          type: 'button',
          className: wide ? 'dsh-ip-advisor-entry' : 'dsh-ip-advisor-entry dsh-ip-advisor-entry--rail',
          onClick: function () { props.open(); },
          title: wide ? undefined : props.t('title'),
          'aria-label': props.t('aria'),
        },
        h('span', { className: 'dsh-ip-advisor-entry-icon' }, h(PinGlyph, { size: wide ? 16 : 18 })),
        wide ? h('span', { className: 'dsh-ip-advisor-entry-label' }, props.t('title')) : null));
    }

    /**
     * Open the consultant: a new Session under this bundle's preset with the
     * opening line staged in the composer. A Workspace is required for that
     * draft, so with no Workspace at all this falls back to the shell's own
     * New Session (the preset stays pickable on that screen).
     * @param ctx - the browser plugin context.
     * @param t - the plugin's bound translator.
     */
    function openAdvisor(ctx, t) {
      var workspaces = ctx.get('workspaces');
      var snapshot = workspaces === undefined ? undefined : workspaces.list.getSnapshot();
      if (snapshot === undefined || snapshot.phase !== 'ready' || snapshot.items.length === 0) {
        ctx.uiWorkspace.startSession();
        return;
      }
      ctx.uiWorkspace.startSession(undefined, {
        agentPreset: PRESET_ID,
        prompt: t('openPrompt'),
        whenDraftExists: 'keep',
      });
    }

    return {
      inject: ['slots', 'locale', 'uiWorkspace'],
      apply: function apply(ctx) {
        ctx.effect(function () {
          return ctx.locale.register(NS, { zh: ZH, en: EN });
        }, 'ip-advisor: dictionaries');
        var t = ctx.locale.bind(NS);
        ctx.slots.inject('sidebar.footer.action', function () {
          return ctx.slots.register({
            name: 'sidebar.footer.action',
            id: 'ip-advisor',
            locale: NS,
            inject: function () { return { open: function () { openAdvisor(ctx, t); } }; },
          }, AdvisorEntry);
        });
      },
    };
  },
});
