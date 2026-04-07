$(document).ready(() => {
  // Perform initial translation setup
  performTranslation();

  const DEFAULT_CPCOLOR = '#B500FF';
  const BG_PRIORITY = 254;
  // Check if the effect engine is enabled
  const EFFECTENGINE_ENABLED = (jQuery.inArray("effectengine", globalThis.serverInfo.services) !== -1);

  const editors = {}; // Store JSON editors in a structured way


  // Update the list of Hyperion instances
  updateHyperionInstanceListing();


  // Initialize variables
  let oldEffects = [];
  const mappingList = globalThis.serverSchema.properties.color.properties.imageProcessing.properties.imageToLedMappingType.enum;
  let uiInputDuration_s = 0; // Endless
  let rgb = { r: 255, g: 0, b: 0 };
  let lastImgData = "";
  let lastFileName = "";

  // // Create initial HTML structure
  createTable('ssthead', 'sstbody', 'sstcont');
  $('.ssthead').html(createTableRow([$.i18n('remote_input_origin'), $.i18n('remote_input_owner'), $.i18n('remote_input_priority'), $.i18n('remote_input_status')], true, true));

  setupColorEditor();
  setupImageProcessingEditor();
  setupChannelAdjustmentEditor();


    // Hide color effect table and reset color button if current instance is not running
  if (!isCurrentInstanceRunning()) {
    $("#color_effect_table").hide();
    $("#reset_color").hide();
    removeOverlay();
    return;
  }

  // Create introduction hints if the help option is enabled
  if (globalThis.showOptHelp) {
    createHint("intro", $.i18n('remote_input_intro', $.i18n('remote_losthint')), "sstcont");
    createHint("intro", $.i18n('remote_components_intro', $.i18n('remote_losthint')), "comp_intro");
    createHint("intro", $.i18n('remote_videoMode_intro', $.i18n('remote_losthint')), "videomode_intro");
  }

  /// Color and Effect Management
  function setupColorEditor() {

    createSection('colorEffects', $.i18n("remote_color_label"), '', 'fa-wifi', 'remote_color_intro', {}, 'card-default', '');
    const colorEffectsSubmitButton = document.getElementById('btn_submit_colorEffects');
    if (colorEffectsSubmitButton) {
      colorEffectsSubmitButton.dataset.i18n = 'remote_color_button_reset';
      colorEffectsSubmitButton.setAttribute('type', 'button');
      colorEffectsSubmitButton.innerHTML = `<i class="fa fa-fw fa-undo"></i>${$.i18n('remote_color_button_reset')}`;
    }

    let colorEffectsSchema = {
      colorEffects: {
        "type": "object",
        "title": "edt_conf_bge_heading_title",
        "options": {
          "titleHidden": false
        },
        "properties": {
          "color": {
            "type": "string",
            "title": "remote_color_label_color",
            "format": "color",
            "propertyOrder": 1
          },
          "effect": {
            "type": "string",
            "format": "choices",
            "title": "remote_effects_label_effects",
            "enum": getAvailableEffectNames(),
            "options": {
              "enum_titles": getAvailableEffectNames()
            },
            "propertyOrder": 2
          },
          "image": {
            "type": "string",
            "format": "file",
            "title": "remote_effects_label_picture",
            "propertyOrder": 3
          },
          "duration": {
            "type": "integer",
            "title": "remote_input_duration",
            "default": 0,
            "minimum": 0,
            "append": "edt_append_s",
            "propertyOrder": 4
          }
        }
      }
    };

    const startval = {
      colorEffects: {
        color: "#ff0000",
        effect: "",
        image: "",
        duration: 0
      }
    };

    //console.log("Starting Color/Effects Editor with value: " + JSON.stringify(startval));
    createEditor(editors, 'colorEffects', colorEffectsSchema, handleColorEffectsChange, {
      bindDefaultChange: false,
      bindSubmit: true,
      onSubmit: resetColorEffectsEditor,
      startval: startval
    });
  }

  function resetColorEffectsEditor() {
    if (editors['colorEffects'].ready) {
      console.log("Resetting Color/Effects value: " + JSON.stringify(editors['colorEffects'].getValue()));
    }
  }

  function handleColorEffectsChange(editor) {

    editor.watch('root.colorEffects.color', () => {
      if (!editor.ready) return;
      const color = editor.getEditor("root.colorEffects.color").getValue();

      debugMessage("Color changed to: " + JSON.stringify(color));
    });

    editor.watch('root.colorEffects.effect', () => {
      if (!editor.ready) return;
      const effect = editor.getEditor("root.colorEffects.effect").getValue();

      debugMessage("Effect changed to: " + effect);
    });

    editor.watch('root.colorEffects.image', () => {
      if (!editor.ready) return;
      const image = editor.getEditor("root.colorEffects.image").getValue();

      debugMessage("Image changed to: " + JSON.stringify(image));
    });

  }

    // Function to send the selected color
  function sendColor() {
    requestSetColor(rgb.r, rgb.g, rgb.b, uiInputDuration_s);
  }

  // Function to send the selected effect
  function sendEffect() {
    const effect = $("#effect_select").val();
    if (effect !== "__none__") {
      requestPriorityClear();
      $(globalThis.hyperion).one("cmd-clear", function () {
        setTimeout(function () { requestPlayEffect(effect, uiInputDuration_s); }, 100);
      });
    }
  }

    /// Effect Management
  // Update Effect List
  function updateEffectlist() {
    const newEffects = globalThis.serverInfo.effects;

    if (newEffects.length !== oldEffects.length) {
      $('#effect_select').html('<option value="__none__"></option>');
      const usrEffArr = [];
      const sysEffArr = [];

      newEffects.forEach(effect => {
        const effectName = effect.name;
        const effectArr = effect.file.startsWith(":") ? sysEffArr : usrEffArr;
        effectArr.push(effectName);
      });

      $('#effect_select')
        .append(createSel(usrEffArr, $.i18n('remote_optgroup_usreffets')))
        .append(createSel(sysEffArr, $.i18n('remote_optgroup_syseffets')));

      oldEffects = newEffects;
    }
  }

 // Initialize Color Picker and Effects
  function initColorPickerAndEffects() {
    let cpcolor = getStorage('rmcpcolor') || DEFAULT_CPCOLOR;
    if (cpcolor) rgb = hexToRgb(cpcolor);

    const storedDuration = getStorage('rmduration');
    if (storedDuration) {
      uiInputDuration_s = Number(storedDuration);
      $("#remote_duration").val(uiInputDuration_s);
      updateDurationPlaceholder(); // Update the placeholder for "Endless"
    }

    createCP('cp2', cpcolor, function (rgbT, hex) {
      rgb = rgbT;
      sendColor();
      setStorage('rmcpcolor', hex);
      updateInputSelect();
    });

    setupEventListeners();
  }

  // Setup Event Listeners for Controls
  function setupEventListeners() {
    $("#reset_color").off().on("click", resetColor);
    $("#remote_duration").off().on("change", updateDuration);
    $("#effect_select").off().on("change", sendEffect);
    $("#remote_input_reseff, #remote_input_rescol").off().on("click", handleResetOrColor);
    $("#remote_input_repimg").off().on("click", handleImageRequest);
    $("#remote_input_img").on("change", handleImageChange);
  }

  // Reset Color Function
  function resetColor() {
    requestPriorityClear();
    lastImgData = "";
    $("#effect_select").val("__none__");
    $("#remote_input_img").val("");
  }

  // Update Duration
  function updateDuration() {
    uiInputDuration_s = valValue(this.id, this.value, this.min, this.max);
    setStorage('rmduration', uiInputDuration_s);
    updateDurationPlaceholder(); // Ensure placeholder is updated dynamically
  }

  // Update the placeholder or display "Endless" dynamically
  function updateDurationPlaceholder() {
    const remoteDuration = $("#remote_duration");
    if (Number(remoteDuration.val()) === 0) {
      remoteDuration.val(""); // Clear value temporarily
      remoteDuration.attr("placeholder", $.i18n('remote_input_duration_endless'));
    } else {
      remoteDuration.attr("placeholder", "");
    }
  }

  // Handle Reset or Color Click
  function handleResetOrColor() {
    if (this.id === "remote_input_rescol") {
      sendColor();
    } else if (EFFECTENGINE_ENABLED) {
      sendEffect();
    }
  }

  // Handle Image Request
  function handleImageRequest() {
    if (lastImgData) {
      requestSetImage(lastImgData, uiInputDuration_s, lastFileName);
    }
  }

  // Handle Image Change
  function handleImageChange() {
    readImg(this, function (src, fileName) {
      lastFileName = fileName;
      lastImgData = src.includes(",") ? src.split(",")[1] : src;
      requestSetImage(lastImgData, uiInputDuration_s, lastFileName);
    });
  }


  /// Image Processing Management
  function setupImageProcessingEditor() {

    createSection('imageProcessing', $.i18n("remote_maptype_label"), '', 'fa-wifi', 'remote_maptype_intro', {}, 'card-default', '');

    const imageProcessingSubmitButton = document.getElementById('btn_submit_imageProcessing');
    const imageProcessingDefaultsButtonId = 'btn_submit_imageProcessingDefaults';
    if (imageProcessingSubmitButton && !document.getElementById(imageProcessingDefaultsButtonId)) {
      const defaultsButton = document.createElement('button');
      defaultsButton.className = 'btn btn-primary me-2';
      defaultsButton.id = imageProcessingDefaultsButtonId;
      defaultsButton.type = 'button';
      defaultsButton.innerHTML = '<i class="fa fa-fw fa-undo"></i><span data-i18n="general_button_reset">' + $.i18n('general_button_reset') + '</span>';
      defaultsButton.addEventListener('click', resetToImageProcessingConfig);
      imageProcessingSubmitButton.parentNode.insertBefore(defaultsButton, imageProcessingSubmitButton);
    }

    const startval = {
      imageProcessing: globalThis.serverConfig.color.imageProcessing
        ? globalThis.serverConfig.color.imageProcessing
        : {}
    };

    console.log("Starting ImageProcessing Editor with value: " + JSON.stringify(startval));
    createEditor(editors, 'imageProcessing', 'imageProcessing', handleImageProcessingChange, {
      bindDefaultChange: true,
      bindSubmit: true,
      onSubmit: saveImageProcessingConfig,
      startval: startval
    });
  }

  function resetToImageProcessingConfig() {
    console.log("Setting Image Processing config values...");
    editors['imageProcessing'].setValue({
      imageProcessing: globalThis.serverConfig.color.imageProcessing
        ? globalThis.serverConfig.color.imageProcessing
        : {}
    });
  }

  function saveImageProcessingConfig() {
    if (editors['imageProcessing'].ready) {
      console.log("Submitting ImageProcessing configuration: " + JSON.stringify(editors['imageProcessing'].getValue()));
      // requestWriteConfig(editors['imageProcessing'].getValue());
    }
  }

  function updateLedMapping() {
    const mapping = globalThis.serverInfo.imageToLedMappingType;

    // ToDo Update ImagePorcessing Editor with new mapping value
    if (editors['imageProcessing']?.ready) {
      const currentValue = editors['imageProcessing'].getValue().imageProcessing?.imageToLedMappingType;
      if (currentValue !== mapping) {
        editors['imageProcessing'].setValue({ imageProcessing: { imageToLedMappingType: mapping } });
      }
    }
  }

  /// Channel Adjustment Management
  function setupChannelAdjustmentEditor() {

    createSection('channelAdjustment', $.i18n("remote_adjustment_label"), '', 'fa-wifi', 'remote_adjustment_intro', {}, 'card-default', '');

    const channelAdjustmentSubmitButton = document.getElementById('btn_submit_channelAdjustment');
    const channelAdjustmentDefaultsButtonId = 'btn_submit_channelAdjustmentDefaults';
    if (channelAdjustmentSubmitButton && !document.getElementById(channelAdjustmentDefaultsButtonId)) {
      const defaultsButton = document.createElement('button');
      defaultsButton.className = 'btn btn-primary me-2';
      defaultsButton.id = channelAdjustmentDefaultsButtonId;
      defaultsButton.type = 'button';
      defaultsButton.innerHTML = '<i class="fa fa-fw fa-undo"></i><span data-i18n="general_button_reset">' + $.i18n('general_button_reset') + '</span>';
      defaultsButton.addEventListener('click', resetToChannelAdjustmentConfig);
      channelAdjustmentSubmitButton.parentNode.insertBefore(defaultsButton, channelAdjustmentSubmitButton);
    }

    let channelAdjustmenSchema = globalThis.schema.channelAdjustment;
    channelAdjustmenSchema.properties.id = { options: { hidden: true } };
    channelAdjustmenSchema.properties.leds = { options: { hidden: true } };
    const startval = {
      channelAdjustment: globalThis.serverConfig.color.channelAdjustment && globalThis.serverConfig.color.channelAdjustment.length > 0
        ? globalThis.serverConfig.color.channelAdjustment[0]
        : {}
    };

    console.log("Starting ChannelAdjustment Editor with value: " + JSON.stringify(startval));
    createEditor(editors, 'channelAdjustment', 'channelAdjustment', handleChannelAdjustmentChange, {
      bindDefaultChange: true,
      bindSubmit: true,
      onSubmit: saveChannelAdjustmentConfig,
      startval: startval
    });
  }

  function resetToChannelAdjustmentConfig() {
    console.log("Setting Channel Adjustment config values...");
    editors['channelAdjustment'].setValue({
      channelAdjustment: globalThis.serverConfig.color.channelAdjustment && globalThis.serverConfig.color.channelAdjustment.length > 0
        ? globalThis.serverConfig.color.channelAdjustment[0]
        : {}
    });
  }

  function saveChannelAdjustmentConfig() {
    if (editors['channelAdjustment'].ready) {
      console.log("Submitting ChannelAdjustment configuration: " + JSON.stringify(editors['channelAdjustment'].getValue()));
      // requestWriteConfig(editors['channelAdjustment'].getValue());
    }
  }

  // Update the channel adjustments
  function updateChannelAdjustments() {
    if (!globalThis.serverInfo.adjustment || globalThis.serverInfo.adjustment.length === 0) {
      return;
    }

    debugMessage("Updating channel adjustments with: " + JSON.stringify(globalThis.serverInfo.adjustment[0]));

    const values = globalThis.serverInfo.adjustment[0];
    if (editors['channelAdjustment']?.ready) {
      editors['channelAdjustment'].setValue({ channelAdjustment: values });
    }
  }

  /// Input Source Management

  const parsePriorityOrigin = (priorityEntry) => {
    const origin = priorityEntry.origin ? priorityEntry.origin : "System";
    const [originName, ip] = origin.split("@");
    return { originName, ip };
  };

  function resolveOwnerText(componentId, owner, value) {
    switch (componentId) {
      case "EFFECT":
        return $.i18n('remote_effects_label_effects') + " " + owner;
      case "COLOR":
        return $.i18n('remote_color_label_color') + ' ' +
          `<div style="width:18px; height:18px; border-radius:20px; margin-bottom:-4px; border:1px grey solid; background-color: rgb(${value}); display:inline-block" title="RGB: (${value})"></div>`;
      case "IMAGE":
        return $.i18n('remote_effects_label_picture') + (owner ? `  ${owner}` : "");
      case "GRABBER":
      case "V4L":
      case "AUDIO":
        return `${$.i18n("general_comp_" + componentId)}: (${owner})`;
      case "BOBLIGHTSERVER":
      case "FLATBUFSERVER":
      case "PROTOSERVER":
        return $.i18n("general_comp_" + componentId);
      default:
        return owner;
    }
  }

  function resolveButtonState(active, visible) {
    if (visible) {
      return {
        btnType: "success",
        btnText: $.i18n('remote_input_sourceactiv_btn'),
        btnState: "disabled"
      };
    }

    return {
      btnType: active ? "primary" : "default",
      btnText: $.i18n('remote_input_setsource_btn'),
      btnState: "enabled"
    };
  }

  function buildSourceButtonHtml(index, priority, btnState, btnType, btnText, componentId) {
    let btn = `<button id="srcBtn${index}" type="button" ${btnState} class="btn btn-${btnType} btn_input_selection" onclick="requestSetSource(${priority});">${btnText}</button>`;

    if (["EFFECT", "COLOR", "IMAGE"].includes(componentId) && priority < BG_PRIORITY) {
      btn += `<button type="button" class="btn btn-sm btn-danger" style="margin-left:10px;" onclick="requestPriorityClear(${priority});"><i class="fa fa-close"></i></button>`;
    }

    return btn;
  }

  // Update input select options based on priorities
  function updateInputSelect() {
    // Clear existing elements
    $('.sstbody').empty().html('');

    const prios = globalThis.serverInfo.priorities;
    let clearAll = false;

    if (prios.length === 0) {
      $('.sstbody').append(`<tr><td colspan="4" class="text-center text-muted">${$.i18n('remote_input_no_sources')}</td></tr>`);
      $('#auto_btn').empty();
      return;
    }

    // Iterate over priorities
    prios.forEach((priorityEntry, index) => {
      const { owner, active, visible, priority, componentId, duration_ms } = priorityEntry;

      if (priority > BG_PRIORITY) {
        return;
      }

      if (priority < BG_PRIORITY && ["EFFECT", "COLOR", "IMAGE"].includes(componentId)) {
        clearAll = true;
      }

      const remoteInputDuration_s = duration_ms / 1000;
      const { originName, ip } = parsePriorityOrigin(priorityEntry);
      const origin = ip
        ? `${originName}<br/><span style="font-size:80%; color:grey;">${$.i18n('remote_input_ip')} ${ip}</span>`
        : originName;

      const value = "value" in priorityEntry ? priorityEntry.value.RGB : "0,0,0";
      let ownerText = resolveOwnerText(componentId, owner, value);

      if (remoteInputDuration_s > 0 && !["GRABBER", "FLATBUFSERVER", "PROTOSERVER"].includes(componentId)) {
        ownerText += `<br/><span style="font-size:80%; color:grey;">${$.i18n('remote_input_duration')} ${remoteInputDuration_s.toFixed(0)}${$.i18n('edt_append_s')}</span>`;
      }

      if (remoteInputDuration_s > 0 || remoteInputDuration_s === 0) {
        const { btnType, btnText, btnState } = resolveButtonState(active, visible);
        if (btnType !== 'default') {
          const btn = buildSourceButtonHtml(index, priority, btnState, btnType, btnText, componentId);
          $('.sstbody').append(createTableRow([origin, ownerText, priority, btn], false, true));
        }
      }
    });

    // Auto-select and Clear All buttons
    const autoColor = globalThis.serverInfo.priorities_autoselect ? "btn-success" : "btn-danger";
    const autoState = globalThis.serverInfo.priorities_autoselect ? "disabled" : "enabled";
    const autoText = globalThis.serverInfo.priorities_autoselect ? $.i18n('general_btn_on') : $.i18n('general_btn_off');
    const callState = clearAll ? "enabled" : "disabled";

    $('#auto_btn').html(`
        <button id="srcBtnAuto" type="button" ${autoState} class="btn ${autoColor}" style="margin-right:5px; display:inline-block;" 
        onclick="requestSetSource('auto');">${$.i18n('remote_input_label_autoselect')} (${autoText})</button>
    `);

    $('#auto_btn').append(`
        <button type="button" ${callState} class="btn btn-danger" style="display:inline-block;" 
        onclick="requestClearAll();">${$.i18n('remote_input_clearall')}</button>
    `);

    // Adjust button widths
    let maxWidth = 100;
    $('.btn_input_selection').each(function () {
      if ($(this).innerWidth() > maxWidth) maxWidth = $(this).innerWidth();
    });
    $('.btn_input_selection').css("min-width", maxWidth + "px");
  }


  /// Component Management
  function shouldSkipComponent(componentName) {
    // Define conditions to skip certain components
    const skipConditions = {
      "ALL": false,
      "FORWARDER": globalThis.currentHyperionInstance !== globalThis.serverConfig.forwarder.instance,
      "GRABBER": !globalThis.serverConfig.framegrabber.enable,
      "V4L": !globalThis.serverConfig.grabberV4L2.enable,
      "AUDIO": !globalThis.serverConfig.grabberAudio.enable
    };

    return skipConditions[componentName] || componentName === "ALL";
  }

  function createSwitchHtml(id, isChecked, isDisabled, componentName = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-check form-switch form-switch-md d-inline-flex align-items-center m-0 ps-0';
    wrapper.style.minHeight = '1.5rem';

    const input = document.createElement('input');
    input.className = 'form-check-input m-0 align-self-center';
    input.style.marginLeft = '0';
    input.type = 'checkbox';
    input.role = 'switch';
    input.id = id;
    input.defaultChecked = isChecked;
    input.disabled = isDisabled;
    if (componentName) {
      input.dataset.name = componentName;
    }
    input.setAttribute('switch', '');

    wrapper.appendChild(input);
    return wrapper.outerHTML;
  }

  function createComponentRow(componentName, isEnabled) {
    const tr = document.createElement('tr');
    const switchId = `comp_btn_${componentName}`;

    const tdComponent = document.createElement('td');
    tdComponent.colSpan = 2;
    tdComponent.style.verticalAlign = 'middle';
    tdComponent.className = 'text-start py-2';

    const wrapper = document.createElement('div');
    wrapper.className = 'd-flex align-items-center justify-content-start gap-4';

    const switchWrap = document.createElement('div');
    switchWrap.className = 'd-flex align-items-center flex-shrink-0';
    switchWrap.innerHTML = createSwitchHtml(switchId, isEnabled, false, componentName);

    const label = document.createElement('label');
    label.className = 'mb-0 d-flex align-items-center ms-1';
    label.setAttribute('for', switchId);
    label.textContent = $.i18n(`general_comp_${componentName}`);

    wrapper.appendChild(switchWrap);
    wrapper.appendChild(label);
    tdComponent.appendChild(wrapper);
    tr.appendChild(tdComponent);

    return tr.outerHTML;
  }

  function initComponents() {
    const components = globalThis.comps;

    const isInstanceEnabled = components.some((comp) => comp.name === "ALL" && comp.enabled);
    const componentRows = components
      .filter((element) => !shouldSkipComponent(element.name))
      .map((element) => createComponentRow(element.name, isInstanceEnabled ? element.enabled : false))
      .join('');
    $('#components').html(componentRows);

    components
      .filter((comp) => !shouldSkipComponent(comp.name))
      .forEach((comp) => {
        const $switch = getComponentSwitch(comp.name);
        if ($switch.length === 0) {
          return;
        }

        setComponentSwitchState(comp.name, { disabled: !isInstanceEnabled });
        $switch.off('change').on('change', (e) => {
          requestSetComponentState(comp.name, e.currentTarget.checked);
        });
      });
  }

  function getComponentSwitchId(componentName) {
    return `comp_btn_${componentName}`;
  }

  function getComponentSwitch(componentName) {
    return $(`#${getComponentSwitchId(componentName)}`);
  }

  function setComponentSwitchState(componentName, { checked, disabled } = {}) {
    const $switch = getComponentSwitch(componentName);
    if ($switch.length === 0) {
      return $switch;
    }

    if (checked !== undefined && $switch.prop('checked') !== checked) {
      $switch.prop('checked', checked);
    }

    if (disabled !== undefined) {
      $switch.prop('disabled', disabled);
    }

    return $switch;
  }

  function updateComponent(component) {
    if (component.name === "ALL") {
      updateAllComponents(component.enabled);
    } else {
      updateSingleComponent(component);
    }
  }

  function updateAllComponents(enabled) {
    globalThis.comps.forEach((comp) => {
      if (comp.name === "ALL") return;

      if (enabled) {
        setComponentSwitchState(comp.name, { disabled: false });
        updateSingleComponent(comp);
      } else {
        setComponentSwitchState(comp.name, { checked: false, disabled: true });
      }
    });
  }

  function updateSingleComponent(component) {
    setComponentSwitchState(component.name, { checked: component.enabled });
  }



  // Update Video Mode
  function updateVideoMode() {
    const videoModes = ["2D", "3DSBS", "3DTAB"];
    const currVideoMode = globalThis.serverInfo.videomode;

    $('#videomodebtns').empty();
    videoModes.forEach(mode => {
      const btnStyle = currVideoMode === mode ? 'btn-success' : 'btn-primary';
      const buttonHtml = `<button type="button" id="vModeBtn_${mode}" class="btn ${btnStyle}" 
                          style="margin:3px;min-width:200px" 
                          onclick="requestVideoMode('${mode}')">
                          ${$.i18n('remote_videoMode_' + mode)}
                        </button><br/>`;

      $('#videomodebtns').append(buttonHtml);
    });
  }

 
  // Force First Update
  function forceFirstUpdate() {
    initComponents();
    updateInputSelect();
    //updateLedMapping();
    updateVideoMode();
    //updateChannelAdjustments();
    if (EFFECTENGINE_ENABLED) {
      updateEffectlist();
    } else {
      $('#effect_row').hide();
    }
  }

  // Interval Updates and Event Handlers
  function setupEventListenersForUpdates() {
    $(globalThis.hyperion).on('components-updated', (e, comp) => updateComponent(comp));

    $(globalThis.hyperion).on("cmd-priorities-update", (event) => {
      globalThis.serverInfo.priorities = event.response.data.priorities;
      globalThis.serverInfo.priorities_autoselect = event.response.data.priorities_autoselect;
      updateInputSelect();
    });

    $(globalThis.hyperion).on("cmd-imageToLedMapping-update", (event) => {
      globalThis.serverInfo.imageToLedMappingType = event.response.data.imageToLedMappingType;
      updateLedMapping();
    });

    $(globalThis.hyperion).on("cmd-videomode-update", (event) => {
      globalThis.serverInfo.videomode = event.response.data.videomode;
      updateVideoMode();
    });

    $(globalThis.hyperion).on("cmd-effects-update", (event) => {
      globalThis.serverInfo.effects = event.response.data.effects;
      updateEffectlist();
    });

    $(globalThis.hyperion).on("cmd-settings-update", (event) => {
      if (event.response.data.color) {
        globalThis.serverInfo.imageToLedMappingType = event.response.data.color.imageToLedMappingType;
        updateLedMapping();
        globalThis.serverInfo.adjustment = event.response.data.color.channelAdjustment;
        updateChannelAdjustments();
      }
    });

    removeOverlay();
  }

  // Initialize everything
  function init() {
    //initColorPickerAndEffects();
    forceFirstUpdate();
    setupEventListenersForUpdates();
  }

  init();

});

function handleChannelAdjustmentChange(channelEditor) {

  channelEditor.on('ready', () => {
    const allEditors = Object.values(channelEditor.editors);

    for (const editor of allEditors) {
      if (!editor?.input) {
        continue;
      }

      if (editor.input_type !== 'color' && editor.input.type !== 'color') {
        continue;
      }

      const input = editor.input;

      // add Bootstrap styling
      //input.classList.add('form-control', 'form-control-color');
      input.dataset.editorKey = editor.key;
      input.dataset.editorPath = editor.path;

      const sendColorAdjustment = (adjustmentKey, color) => {
        const rgb = hexToRgb(color);
        if (!rgb) {
          return;
        }

        debugMessage('Color adjustment event. Color: ' + adjustmentKey + ' -> RGB: ' + JSON.stringify(rgb));
        requestAdjustment(adjustmentKey, [rgb.r, rgb.g, rgb.b]);
      };

      const sendColorAdjustmentDebounced = debounce(sendColorAdjustment, 150);

      input.addEventListener('input', (e) => {
        const { editorKey } = input.dataset;
        sendColorAdjustmentDebounced(editorKey, e.currentTarget.value);
      });

      input.addEventListener('change', () => {
        const { editorKey, editorPath } = input.dataset;
        const currentEditor = channelEditor.editors[editorPath];
        if (!currentEditor) {
          return;
        }

        const currentValue = currentEditor.getValue();
        sendColorAdjustmentDebounced.cancel();
        sendColorAdjustment(editorKey, currentValue);
      });
    }
  });
}

function handleImageProcessingChange(editor) {

  editor.watch('root.imageProcessing.imageToLedMappingType', () => {
    if (!editor.ready) return;
    const mappingType = editor.getEditor("root.imageProcessing.imageToLedMappingType").getValue();

    debugMessage("Image to LED mapping type changed to: " + mappingType);
  });

  editor.watch('root.imageProcessing.accuracyLevel', () => {
    if (!editor.ready) return;
    const accuracyLevel = editor.getEditor("root.imageProcessing.accuracyLevel").getValue();

    debugMessage("Accuracy level changed to: " + accuracyLevel);
  });

  editor.watch('root.imageProcessing.reducedPixelSetFactorFactor', () => {
    if (!editor.ready) return;
    const reducedPixelSetFactor = editor.getEditor("root.imageProcessing.reducedPixelSetFactorFactor").getValue();

    debugMessage("Reduced pixel set factor changed to: " + reducedPixelSetFactor);
  });

}