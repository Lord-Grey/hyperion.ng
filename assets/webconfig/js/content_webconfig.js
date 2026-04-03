$(document).ready(function () {
  performTranslation();

  const editors = {};

  initializeUI();
  setupWebConfigEditor();

  removeOverlay();

  function initializeUI() {
    if (globalThis.showOptHelp) {
      createSystemSection("webConfig", "edt_conf_webConfig_heading_title", globalThis.schema.webConfig.properties, "fa-wrench", "conf_webconfig_label_intro", "webConfigHelpPanelId");
    }
    else {
      appendSystemPanel("webConfig", "edt_conf_webConfig_heading_title", "fa-wrench");
    }
  }

  function setupWebConfigEditor() {
    createEditor(editors, 'webConfig', 'webConfig', '', {
      bindDefaultChange: true,
      bindSubmit: false,
      submitButtonId: 'btn_submit_container'
    });

    $('#btn_submit_container').off().on('click', function () {
      const val = editors["webConfig"].getValue();
      globalThis.fastReconnect = true;
      globalThis.jsonPort = val.webConfig.port;
      requestWriteConfig(val);
    });
  }

  // Validate for conflicting ports
  JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
    let errors = [];
    const conflictingPorts = {
      "root.webConfig.port": ["jsonServer", "flatbufServer", "protoServer", "webConfig_sslPort"],
      "root.webConfig.sslPort": ["jsonServer", "flatbufServer", "protoServer", "webConfig_port"]
    };

    if (!(path in conflictingPorts)) {
      return [];
    }

    conflictingPorts[path].forEach(conflictKey => {
      let conflictPort;

      const isWebConfigPort = conflictKey.startsWith("webConfig");
      if (isWebConfigPort) {
        conflictPort = editors["webConfig"]?.getEditor(`root.${conflictKey.replace("_", ".")}`)?.getValue();
      } else {
        conflictPort = globalThis.serverConfig?.[conflictKey]?.port;
      }

      if (conflictPort != null && value === conflictPort) {
        let errorText;

        if (isWebConfigPort) {
          errorText = $.i18n(`edt_conf_${conflictKey}_title`);
        } else {
          errorText = $.i18n("main_menu_network_conf_token") + " - " + $.i18n(`edt_conf_${conflictKey}_heading_title`);
        }

        errors.push({
          path: path,
          property: "port",
          message: $.i18n('edt_conf_network_port_validation_error', errorText)
        });
      }

    });

    return errors;
  });

});
