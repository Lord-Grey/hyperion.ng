$(document).ready(function () {

  performTranslation();

  const EFFECTENGINE_ENABLED = (jQuery.inArray("effectengine", globalThis.serverInfo.services) !== -1);

  const editors = {}; // Store JSON editors in a structured way
  let availableEffectNames = getAvailableEffectNames();

  initializeUI();
  setupEditors();
  updateHyperionInstanceListing();

  removeOverlay();

  function initializeUI() {
    if (globalThis.showOptHelp) {
      createSection("foregroundEffect", "edt_conf_fge_heading_title", globalThis.schema.foregroundEffect.properties, "fa-spinner", "conf_effect_fgeff_intro", "foregroundEffectHelpPanelId");
      createSection("backgroundEffect", "edt_conf_bge_heading_title", globalThis.schema.backgroundEffect.properties, "fa-spinner", "conf_effect_bgeff_intro", "backgroundEffectHelpPanelId");
      if (EFFECTENGINE_ENABLED && storedAccess != 'default') {
        createSection("effects", "edt_conf_effp_heading_title", globalThis.schema.effects.properties, "fa-spinner", "conf_effect_path_intro", "effectsHelpPanelId");
      }
    }
    else {
      appendPanel("foregroundEffect", "edt_conf_fge_heading_title", "fa-spinner");
      appendPanel("backgroundEffect", "edt_conf_bge_heading_title", "fa-spinner");
      if (EFFECTENGINE_ENABLED && storedAccess != 'default') {
        appendPanel("effects", "edt_conf_effp_heading_title", "fa-spinner");
      }
    }
  }

  function setupForegroundEffectEditor() {
    if (editors["foregroundEffect"]) {
      editors["foregroundEffect"].destroy();
      delete editors["foregroundEffect"];
    }

    if (EFFECTENGINE_ENABLED) {
      // Populate "effect" enumuration with available effects from the server
      globalThis.schema.foregroundEffect.properties.effect.enum = availableEffectNames;
      globalThis.schema.foregroundEffect.properties.effect.options.enum_titles = availableEffectNames;
    } else {
      // Remove "effect" type if effect engine is not enabled
      globalThis.schema.foregroundEffect.properties.type.enum.splice(1, 1);
      globalThis.schema.foregroundEffect.properties.type.options.enum_titles.splice(1, 1);
      globalThis.schema.foregroundEffect.properties.type.default = "color";
      delete globalThis.schema.foregroundEffect.properties.effect;
    }

    createEditor(editors, 'foregroundEffect', 'foregroundEffect', handleForegroundEffectChange, {
      bindDefaultChange: true,
      bindSubmit: false,
      submitButtonId: 'btn_submit_foregroundEffect'
    });

    $('#btn_submit_foregroundEffect').off().on('click', function () {
      const value = editors["foregroundEffect"].getValue();
      if (value.foregroundEffect.effect === undefined) {
        value.foregroundEffect.effect = globalThis.serverConfig.foregroundEffect.effect;
      }
      requestWriteConfig(value);
    });
  }

  function setupBackgroundEffectEditor() {
    if (editors["backgroundEffect"]) {
      editors["backgroundEffect"].destroy();
      delete editors["backgroundEffect"];
    }

    if (EFFECTENGINE_ENABLED) {
      // Populate "effect" enumuration with available effects from the server
      globalThis.schema.backgroundEffect.properties.effect.enum = availableEffectNames;
      globalThis.schema.backgroundEffect.properties.effect.options.enum_titles = availableEffectNames;
    } else {
      // Remove "effect" type if effect engine is not enabled
      globalThis.schema.backgroundEffect.properties.type.enum.splice(1, 1);
      globalThis.schema.backgroundEffect.properties.type.options.enum_titles.splice(1, 1);
      globalThis.schema.backgroundEffect.properties.type.default = "color";
      delete globalThis.schema.backgroundEffect.properties.effect;
    }

    createEditor(editors, 'backgroundEffect', 'backgroundEffect', handleBackgroundEffectChange, {
      bindDefaultChange: true,
      bindSubmit: false,
      submitButtonId: 'btn_submit_backgroundEffect'
    });

    $('#btn_submit_backgroundEffect').off().on('click', function () {
      const value = editors["backgroundEffect"].getValue();
      if (value.backgroundEffect.effect === undefined) {
        value.backgroundEffect.effect = globalThis.serverConfig.backgroundEffect.effect;
      }
      requestWriteConfig(value);
    });
  }

  function setupEffectsEditor() {
    const disabledEffects = globalThis.serverConfig.effects.disable || [];

    const allEffects = [
      ...new Set([
        ...availableEffectNames,
        ...disabledEffects
      ])
    ].sort((a, b) => a.localeCompare(b));

    globalThis.schema['effects'].properties.configuredEffects.properties.effects.items.enum = allEffects;
    globalThis.serverConfig.effects.configuredEffects.effects = allEffects;

    if (EFFECTENGINE_ENABLED && storedAccess != 'default') {
      if (editors["effects"]) {
        editors["effects"].destroy();
        delete editors["effects"];
      }

      createEditor(editors, 'effects', 'effects', '', {
        bindDefaultChange: true,
        bindSubmit: true
      });
    }
  }

  function setupEditors() {
    setupEffectsEditor();
    setupForegroundEffectEditor();
    setupBackgroundEffectEditor();
  }

  function handleForegroundEffectChange(editor) {
    editor.on('change', function () {
      onForegroundEffectEditorChange(editor);
    });
  }

  function handleBackgroundEffectChange(editor) {
    editor.on('change', function () {
      onBackgroundEffectEditorChange(editor);
    });
  }

  function onForegroundEffectEditorChange(editor) {
    if (!editor.ready) {
      return;
    }

    const foregroundEffectEnable = editor.getEditor("root.foregroundEffect.enable").getValue();
    if (foregroundEffectEnable) {
      $('#foregroundEffectHelpPanelId').show();
    } else {
      $('#foregroundEffectHelpPanelId').hide();
    }
  }

  function onBackgroundEffectEditorChange(editor) {
    if (!editor.ready) {
      return;
    }

    const backgroundEffectEnable = editor.getEditor("root.backgroundEffect.enable").getValue();
    if (backgroundEffectEnable) {
      $('#backgroundEffectHelpPanelId').show();
    } else {
      $('#backgroundEffectHelpPanelId').hide();
    }
  }

  // Update available effect names when receiving an update from the server
  $(globalThis.hyperion).on("cmd-effects-update", function (event) {
    globalThis.serverInfo.effects = event.response.data.effects

    availableEffectNames = getAvailableEffectNames();
    setupEditors();
  });

});

