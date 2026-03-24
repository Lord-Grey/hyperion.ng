$(document).ready(function () {
  performTranslation();

  const services = globalThis.serverInfo.services;
  const isServiceEnabled = (service) => services.includes(service);
  const isForwarderEnabled = isServiceEnabled("forwarder");
  const isFlatbufEnabled = isServiceEnabled("flatbuffer");
  const isProtoBufEnabled = isServiceEnabled("protobuffer");

  const editors = {}; // Store JSON editors in a structured way

  // Service properties , 2-dimensional array of [servicetype][id]
  let discoveredRemoteServices = new Map();

  addJsonEditorHostValidation();
  initializeUI();
  setupEditors();
  setupTokenManagement();

  removeOverlay();

  function initializeUI() {
    if (globalThis.showOptHelp) {
      createSection("network", "edt_conf_network_heading_title", globalThis.schema.network.properties);
      createTokenSection();
      createSection("jsonServer", "edt_conf_jsonServer_heading_title", globalThis.schema.jsonServer.properties);
      if (isFlatbufEnabled) createSection("flatbufServer", "edt_conf_flatbufServer_heading_title", globalThis.schema.flatbufServer.properties, "flatbufServerHelpPanelId");
      if (isProtoBufEnabled) createSection("protoServer", "edt_conf_protoServer_heading_title", globalThis.schema.protoServer.properties, "protoServerHelpPanelId");
      if (isForwarderEnabled && storedAccess !== 'default') createSection("forwarder", "edt_conf_forwarder_heading_title", globalThis.schema.forwarder.properties, "forwarderHelpPanelId");
    } else {
      appendPanel("network", "edt_conf_network_heading_title");
      createTokenSection();
      appendPanel("jsonServer", "edt_conf_jsonServer_heading_title");
      if (isFlatbufEnabled) appendPanel("flatbufServer", "edt_conf_flatbufServer_heading_title");
      if (isProtoBufEnabled) appendPanel("protoServer", "edt_conf_protoServer_heading_title");
      if (isForwarderEnabled) appendPanel("forwarder", "edt_conf_forwarder_heading_title");
    }
  }

  function updateConfiguredInstancesList() {
    const enumVals = [];
    const enumTitelVals = [];
    let enumDefaultVal = "";
    let addSelect = false;

    const configuredInstances = globalThis.serverInfo.instance;

    if (!configuredInstances || Object.keys(configuredInstances).length === 0) {
      enumVals.push("NONE");
      enumTitelVals.push($.i18n('edt_conf_forwarder_no_instance_configured_title'));
    } else {
      Object.values(configuredInstances).forEach(({ friendly_name, instance }) => {
        enumTitelVals.push(friendly_name);
        enumVals.push(instance.toString());
      });

      const configuredInstance = globalThis.serverConfig.forwarder.instance.toString();

      if (enumVals.includes(configuredInstance)) {
        enumDefaultVal = configuredInstance;
      } else {
        addSelect = true;
      }
    }

    if (enumVals.length > 0) {
      updateJsonEditorSelection(editors["forwarder"], 'root.forwarder', {
        key: 'instanceList',
        addElements: {},
        newEnumVals: enumVals,
        newTitleVals: enumTitelVals,
        newDefaultVal: enumDefaultVal,
        addSelect,
        addCustom: false
      });
    }
  }

  function setupEditors() {
    const editorConfigs = [
      { key: "network", schemaKey: "network" },
      { key: "jsonServer", schemaKey: "jsonServer" },
      { key: "flatbufServer", schemaKey: "flatbufServer", enabled: isFlatbufEnabled, handler: handleFlatbufChange },
      { key: "protoServer", schemaKey: "protoServer", enabled: isProtoBufEnabled, handler: handleProtoBufChange },
      { key: "forwarder", schemaKey: "forwarder", enabled: isForwarderEnabled && storedAccess !== 'default', handler: handleForwarderChange }
    ];

    editorConfigs.forEach(({ key, schemaKey, enabled = true, handler }) => {
      if (enabled) createEditor(editors, key, schemaKey, handler);
    });
  }

  function handleForwarderChange(editor) {
    editor.on('ready', () => {
      updateServiceCacheForwarderConfiguredItems("jsonapi");
      updateServiceCacheForwarderConfiguredItems("flatbuffer");

      if (editor.getEditor("root.forwarder.enable").getValue()) {
        updateConfiguredInstancesList();
        discoverRemoteHyperionServices("jsonapi");
        discoverRemoteHyperionServices("flatbuffer");
      } else {
        showInputOptionsForKey(editor, "forwarder", "enable", false);
      }
    });

    editor.on('change', () => {
      onForwarderEditorChange(editor);
    });

    ["jsonapi", "flatbuffer"].forEach(function (type) {
      editor.watch(`root.forwarder.${type}select`, () => {
        if (!editor.ready) return;
        updateForwarderServiceSections(type);
      });
      editor.watch(`root.forwarder.${type}`, () => {
        if (!editor.ready) return;
        onChangeForwarderServiceSections(type);
      });
    });

    editor.watch('root.forwarder.enable', () => {
      if (!editor.ready) return;
      const isEnabled = editor.getEditor("root.forwarder.enable").getValue();
      if (isEnabled) {

        updateConfiguredInstancesList();

        const instanceId = editor.getEditor("root.forwarder.instanceList").getValue();
        if (["NONE", "SELECT", "", undefined].includes(instanceId)) {
          editor.getEditor("root.forwarder.instance").setValue(-1);
        }

        discoverRemoteHyperionServices("jsonapi");
        discoverRemoteHyperionServices("flatbuffer");
      } else {
        const instance = editor.getEditor("root.forwarder.instance").getValue();
        if (instance === -1) {
          editor.getEditor("root.forwarder.instance").setValue(255);
        }
      }
      showInputOptionsForKey(editor, "forwarder", "enable", isEnabled);
    });

    editor.watch('root.forwarder.instanceList', () => {
      if (!editor.ready) return;
      const instanceId = editor.getEditor("root.forwarder.instanceList").getValue();
      if (!["NONE", "SELECT", "", undefined].includes(instanceId)) {
        editor.getEditor("root.forwarder.instance").setValue(Number.parseInt(instanceId, 10));
      }
    });
  }

  const onForwarderEditorChange = (editor) => {
    toggleHelpPanel(editor, "forwarder", "forwarderHelpPanelId");
  };

  // Validate for conflicting ports
  JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
    let errors = [];

    const conflictingPorts = {
      "root.jsonServer.port": ["flatbufServer", "protoServer", "webConfig_port", "webConfig_sslPort"],
      "root.flatbufServer.port": ["jsonServer", "protoServer", "webConfig_port", "webConfig_sslPort"],
      "root.protoServer.port": ["jsonServer", "flatbufServer", "webConfig_port", "webConfig_sslPort"]
    };

    if (!(path in conflictingPorts)) {
      return [];
    }

    conflictingPorts[path].forEach(conflictKey => {
      let conflictPort;

      const isWebConfigPort = conflictKey.startsWith("webConfig");
      if (isWebConfigPort) {
        conflictPort = globalThis.serverConfig?.webConfig?.[conflictKey.replace("webConfig_", "")];
      } else {
        conflictPort = editors?.[conflictKey]?.getEditor(`root.${conflictKey}.port`)?.getValue();
      }

      if (conflictPort != null && value === conflictPort) {
        let errorText;

        if (isWebConfigPort) {
          errorText = $.i18n("edt_conf_webConfig_heading_title") + " - " + $.i18n(`edt_conf_${conflictKey}_title`);
        } else {
          errorText = $.i18n(`edt_conf_${conflictKey}_heading_title`);
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


  function onChangeForwarderServiceSections(type) {
    const editor = editors["forwarder"].getEditor(`root.forwarder.${type}`);
    const configuredServices = structuredClone(editor?.getValue('items'));

    configuredServices.forEach((serviceConfig, i) => {
      const itemEditor = editors["forwarder"].getEditor(`root.forwarder.${type}.${i}`);
      const service = discoveredRemoteServices.get(type)?.get(serviceConfig.host);

      if (service?.wasDiscovered) {
        itemEditor.disable();

        const instanceIdsEditor = editors["forwarder"].getEditor(`root.forwarder.${type}.${i}.instanceIds`);
        instanceIdsEditor?.enable();

        showInputOptions(`root.forwarder.${type}.${i}`, ["name"], true);
      } else {
        itemEditor?.enable();
        showInputOptions(`root.forwarder.${type}.${i}`, ["name"], false);

        if (!service) {
          const hostEditor = editors["forwarder"].getEditor(`root.forwarder.${type}.${i}.host`);
          if (hostEditor?.getValue()) {
            updateServiceCacheForwarderConfiguredItems(type);
            updateForwarderSelectList(type);
          }
        }
      }
    });
  }

  function updateForwarderServiceSections(type) {
    const editorPath = `root.forwarder.${type}`;
    const selectedServices = editors["forwarder"].getEditor(`${editorPath}select`).getValue();

    if (!selectedServices || selectedServices.length === 0 || ["NONE", "SELECT"].includes(selectedServices[0])) {
      return;
    }

    const newServices = selectedServices.map((serviceKey) => {
      const service = discoveredRemoteServices.get(type).get(serviceKey);
      return {
        name: service.name,
        host: service.host,
        port: service.port,
        instanceIds: service.instanceIds,
        wasDiscovered: service.wasDiscovered
      };
    });

    editors["forwarder"].getEditor(editorPath).setValue(newServices);
  }

  function updateForwarderSelectList(type) {
    const selectionElement = `${type}select`;

    const enumVals = [];
    const enumTitleVals = [];
    const enumDefaultVals = [];

    if (discoveredRemoteServices.has(type)) {
      for (const service of discoveredRemoteServices.get(type).values()) {
        enumVals.push(service.host);
        enumTitleVals.push(service.name);
        if (service.inConfig) {
          enumDefaultVals.push(service.host);
        }
      }
    }

    const addSchemaElements = { "uniqueItems": true };

    const isServiceAvailable = enumVals.length > 0;
    if (!isServiceAvailable) {
      enumVals.push("NONE");
      enumTitleVals.push($.i18n('edt_conf_forwarder_remote_service_discovered_none'));
      enumDefaultVals.push("NONE");
    }

    updateJsonEditorMultiSelection(editors["forwarder"], 'root.forwarder', {
      key: selectionElement,
      addElements: addSchemaElements,
      newEnumVals: enumVals,
      newTitleVals: enumTitleVals,
      newDefaultVal: enumDefaultVals
    });

    if (isServiceAvailable) {
      editors["forwarder"].getEditor(`root.forwarder.${type}select`).activate();
    } else {
      editors["forwarder"].getEditor(`root.forwarder.${type}select`).deactivate();
    }
  }

  function updateServiceCacheForwarderConfiguredItems(serviceType) {
    const editor = editors["forwarder"].getEditor(`root.forwarder.${serviceType}`);

    if (editor) {
      if (!discoveredRemoteServices.has(serviceType)) {
        discoveredRemoteServices.set(serviceType, new Map());
      }

      const configuredServices = structuredClone(editor.getValue('items'));
      configuredServices.forEach((service) => {
        service.inConfig = true;
        let existingService = discoveredRemoteServices.get(serviceType).get(service.host) || {};
        discoveredRemoteServices.get(serviceType).set(service.host, { ...existingService, ...service });
      });
    }
  }

  function updateRemoteServiceCache(discoveryInfo) {
    Object.entries(discoveryInfo).forEach(([serviceType, discoveredServices]) => {
      if (!discoveredRemoteServices.has(serviceType)) {
        discoveredRemoteServices.set(serviceType, new Map());
      }

      discoveredServices.forEach((service) => {
        if (!service.sameHost) {
          service.name = service.name || service.host;
          service.host = service.service || service.host;
          service.wasDiscovered = Boolean(service.service);

          // Might be updated when instance IDs are provided by the remote service info
          service.instanceIds = [];

          if (discoveredRemoteServices.get(serviceType).has(service.host)) {
            service.inConfig = true;
            service.instanceIds = discoveredRemoteServices.get(serviceType).get(service.host).instanceIds;
          }

          discoveredRemoteServices.get(serviceType).set(service.host, service);
        }
      });
    });
  }

  async function discoverRemoteHyperionServices(type, params) {
    const result = await requestServiceDiscovery(type, params);

    const discoveryResult = result && !result.error ? result.info : { services: [] };

    if (["jsonapi", "flatbuffer"].includes(type)) {
      updateRemoteServiceCache(discoveryResult.services);
      updateForwarderSelectList(type);
    }
  }

});

function setupTokenManagement() {
  createTable('tkthead', 'tktbody', 'tktable');
  $('.tkthead').html(createTableRow([$.i18n('conf_network_token_idhead'), $.i18n('conf_network_token_cidhead'), $.i18n('conf_network_token_lastuse')], true, true));

  buildTokenList();

  // Initial state check based on server config
  checkApiTokenState(globalThis.serverConfig.network.localApiAuth || storedAccess === 'expert');

  // Listen for changes on the local API Auth toggle
  $('#root_network_localApiAuth').on("change", function () {
    checkApiTokenState($(this).is(":checked"));
  });

  $('#btn_create_token').off().on('click', function () {
    requestToken(encodeHTML($('#token_comment').val()));
    $('#token_comment').val("").prop('disabled', true);
  });

  $('#token_comment').off().on('input', function (e) {
    const charsNeeded = 10 - e.currentTarget.value.length;
    $('#btn_create_token').prop('disabled', charsNeeded > 0);
    $('#token_chars_needed').html(charsNeeded > 0 ? `${charsNeeded} ${$.i18n('general_chars_needed')}` : "<br />");
  });

  $(globalThis.hyperion).off("cmd-authorize-createToken").on("cmd-authorize-createToken", function (event) {
    const val = event.response.info;
    showInfoDialog("newToken", $.i18n('conf_network_token_diaTitle'), $.i18n('conf_network_token_diaMsg') + `<br><div style="font-weight:bold">${val.token}</div>`);
    addToTokenList(val);

    buildTokenList();
    $('#token_comment').val("").prop('disabled', false);
  });

  function buildTokenList(tokenList = null) {
    $('.tktbody').empty();

    const list = tokenList || getTokenList();
    list.forEach(token => {
      const lastUse = token.last_use || "-";
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-outline-danger';
      delBtn.id = `token${token.id}`;

      const delIcon = document.createElement('i');
      delIcon.className = 'mdi mdi-delete-forever';
      delBtn.appendChild(delIcon);

      $('.tktbody').append(createTableRow([token.id, token.comment, lastUse, delBtn], false, true));
      $(`#token${token.id}`).off().on('click', () => handleDeleteToken(token.id));
    });
  }

  function handleDeleteToken(id) {
    requestTokenDelete(id);

    deleteFromTokenList(id);
    buildTokenList();
  }

  function checkApiTokenState(state) {
    if (!state && storedAccess !== 'expert') {
      $("#conf_cont_token").hide();
    } else {
      $("#conf_cont_token").show();
    }
  }
}

function createSection(id, titleKey, schemaProps, helpPanelId = null) {
  const containerId = `conf_cont_${id}`;
  const bodyContainerId = `editor_body_${id}`;
  const editorContainerId = `editor_container_${id}`;
  $('#conf_cont').append(createRow(containerId));

  $(`#${containerId}`)
    .append(createOptPanel('fa-sitemap', $.i18n(titleKey), bodyContainerId, `btn_submit_${id}`, 'card-system'))
    .append(createHelpTable(schemaProps, $.i18n(titleKey), helpPanelId));

  if (globalThis.showOptHelp) {
    createHint("intro", $.i18n(`conf_network_${id}_intro`), bodyContainerId);
  }

  $(`#${bodyContainerId}`).append(`<div id="${editorContainerId}"></div>`);
}

function createTokenSection() {

  const phead = '<i class="fa fa-key fa-fw"></i>' + $.i18n('conf_network_token_title');
  const pfooter = document.createElement('button');
  pfooter.className = "btn btn-primary";
  pfooter.setAttribute("id", `btn_create_token`);
  pfooter.innerHTML = '<i class="mdi mdi-key-plus"></i> ' + $.i18n('conf_network_createToken_btn');

  const bodyContent = document.createElement('div');

  const tokenTable = document.createElement('div');
  tokenTable.id = 'tktable';
  bodyContent.appendChild(tokenTable);

  const spacer = document.createElement('div');
  spacer.className = 'my-4';
  bodyContent.appendChild(spacer);

  const inputRow = document.createElement('div');
  inputRow.className = 'row g-3 align-items-start';

  const labelCol = document.createElement('div');
  labelCol.className = 'col-auto';
  const tokenLabel = document.createElement('label');
  tokenLabel.setAttribute('for', 'token_comment');
  tokenLabel.className = 'col-form-label fw-bold text-nowrap';
  tokenLabel.textContent = $.i18n('conf_network_token_comment_title');
  labelCol.appendChild(tokenLabel);

  const inputCol = document.createElement('div');
  inputCol.className = 'col';
  const tokenInput = document.createElement('input');
  tokenInput.type = 'text';
  tokenInput.id = 'token_comment';
  tokenInput.className = 'form-control';
  tokenInput.setAttribute('aria-describedby', 'token_chars_needed');

  const tokenCharsNeeded = document.createElement('span');
  tokenCharsNeeded.id = 'token_chars_needed';
  tokenCharsNeeded.className = 'form-text';
  tokenCharsNeeded.innerHTML = '&nbsp;';

  inputCol.appendChild(tokenInput);
  inputCol.appendChild(tokenCharsNeeded);

  inputRow.appendChild(labelCol);
  inputRow.appendChild(inputCol);
  bodyContent.appendChild(inputRow);

  const containerId = `conf_cont_token`;
  $('#conf_cont').append(createRow(containerId));
  $(`#${containerId}`)
    .append(createPanel(phead, bodyContent, pfooter, 'editor_container_token', 'card-system'));

  if (globalThis.showOptHelp) {
    createHint("intro", $.i18n(`conf_network_token_intro`), 'editor_container_token');

    const schemaProps = { "token_comment": { "title": "conf_network_token_comment_title" } };
    $(`#${containerId}`)
      .append(createHelpTable(schemaProps, $.i18n('conf_network_token_title')));
  }
}

function appendPanel(id, titleKey) {
  const containerId = `conf_cont_${id}`;
  const bodyContainerId = `editor_body_${id}`;
  $('#conf_cont').append(createRow(containerId));
  $(`#${containerId}`)
    .append(createOptPanel('fa-sitemap', $.i18n(titleKey), bodyContainerId, `btn_submit_${id}`, 'card-system'));

  $(`#${bodyContainerId}`).append(`<div id="editor_container_${id}"></div>`);
}

function toggleHelpPanel(editor, key, panelId) {
  const enable = editor.getEditor(`root.${key}.enable`).getValue();
  $(`#${panelId}`).toggle(enable);
}

function onFlatbufEditorChange(editor) {
  toggleHelpPanel(editor, "flatbufServer", "flatbufServerHelpPanelId");
}

function onProtoBufEditorChange(editor) {
  toggleHelpPanel(editor, "protoServer", "protoServerHelpPanelId");
}


function handleFlatbufChange(editor) {
  editor.on('change', () => onFlatbufEditorChange(editor));

  editor.watch('root.flatbufServer.enable', () => {
    if (!editor.ready) return;
    const enable = editor.getEditor("root.flatbufServer.enable").getValue();
    showInputOptionsForKey(editor, "flatbufServer", "enable", enable);
  });
}

function handleProtoBufChange(editor) {
  editor.on('change', () => onProtoBufEditorChange(editor));

  editor.watch('root.protoServer.enable', () => {
    if (!editor.ready) return;
    const enable = editor.getEditor("root.protoServer.enable").getValue();
    showInputOptionsForKey(editor, "protoServer", "enable", enable);
  });
}