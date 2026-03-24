$(document).ready(function () {

  const DDA_INACTIVE_TIMEOUT = 300; // The DDA grabber will not issue updates when no screen activity, define timeout of 5 minutes to avoid off/on blinking

  performTranslation();

  const screenGrabberAvailable = (globalThis.serverInfo.grabbers.screen.available.length !== 0);
  const videoGrabberAvailable = (globalThis.serverInfo.grabbers.video.available.length !== 0);
  const audioGrabberAvailable = (globalThis.serverInfo.grabbers.audio.available.length !== 0);

  const editors = {};

  let configuredDevice = "";
  const discoveredInputSources = {};

  initializeUI();
  setupEditors();
  addHints();

  removeOverlay();

  function initializeUI() {
    if (screenGrabberAvailable) {
      $('#conf_cont').append(createRow('conf_cont_screen'));
      $('#conf_cont_screen').append(createOptPanel('fa-camera', $.i18n("edt_conf_fg_heading_title"), 'editor_container_screengrabber', 'btn_submit_screengrabber', 'card-system', 'screengrabberPanelId'));
      if (globalThis.showOptHelp) {
        $('#conf_cont_screen').append(createHelpTable(globalThis.schema.framegrabber.properties, $.i18n("edt_conf_fg_heading_title"), "screengrabberHelpPanelId"));
        createHint("intro", $.i18n('conf_grabber_fg_intro'), "editor_container_screengrabber");
      }
    }

    if (videoGrabberAvailable) {
      $('#conf_cont').append(createRow('conf_cont_video'));
      $('#conf_cont_video').append(createOptPanel('fa-camera', $.i18n("edt_conf_v4l2_heading_title"), 'editor_container_videograbber', 'btn_submit_videograbber', 'card-system', 'videograbberPanelId'));

      if (storedAccess === 'expert') {
        const conf_cont_video_footer = document.getElementById("editor_container_videograbber").nextElementSibling;
        $(conf_cont_video_footer).prepend('<button class="btn btn-primary mdi-24px" id="btn_videograbber_set_defaults" disabled data-bs-toggle="tooltip" data-placement="top" title="' + $.i18n("edt_conf_v4l2_hardware_set_defaults_tip") + '">'
          + '<i class= "fa fa-fw fa-undo" ></i >' + $.i18n("edt_conf_v4l2_hardware_set_defaults") + '</button > ');
      }

      if (globalThis.showOptHelp) {
        $('#conf_cont_video').append(createHelpTable(globalThis.schema.grabberV4L2.properties, $.i18n("edt_conf_v4l2_heading_title"), "videograbberHelpPanelId"));
        createHint("intro", $.i18n('conf_grabber_v4l_intro'), "editor_container_videograbber");
      }
    }

    if (audioGrabberAvailable) {
      $('#conf_cont').append(createRow('conf_cont_audio'));
      $('#conf_cont_audio').append(createOptPanel('fa-volume', $.i18n("edt_conf_audio_heading_title"), 'editor_container_audiograbber', 'btn_submit_audiograbber', 'card-system', 'audiograbberPanelId'));

      if (storedAccess === 'expert') {
        const conf_cont_audio_footer = document.getElementById("editor_container_audiograbber").nextElementSibling;
        $(conf_cont_audio_footer).prepend('<button class="btn btn-primary mdi-24px" id="btn_audiograbber_set_effect_defaults" disabled data-bs-toggle="tooltip" data-placement="top" title="' + $.i18n("edt_conf_audio_hardware_set_defaults_tip") + '">'
          + '<i class= "fa fa-fw fa-undo" ></i >' + $.i18n("edt_conf_audio_effect_set_defaults") + '</button > ');
      }

      if (globalThis.showOptHelp) {
        $('#conf_cont_audio').append(createHelpTable(globalThis.schema.grabberAudio.properties, $.i18n("edt_conf_audio_heading_title"), "audiograbberHelpPanelId"));
        createHint("intro", $.i18n('conf_grabber_audio_intro'), "editor_container_audiograbber");
      }
    }
  }

  function addHints() {
    if (globalThis.showOptHelp) {

      if (screenGrabberAvailable) {
        createHint("intro", $.i18n('conf_grabber_fg_intro'), "editor_container_screengrabber");
      }

      if (videoGrabberAvailable) {
        createHint("intro", $.i18n('conf_grabber_v4l_intro'), "editor_container_videograbber");
      }

      if (audioGrabberAvailable) {
        createHint("intro", $.i18n('conf_grabber_audio_intro'), "editor_container_audiograbber");
      }
    }
  }

  function setupEditors() {
    if (screenGrabberAvailable) {
      handleScreenChange();
    }

    if (videoGrabberAvailable) {
      handleVideoChange();
    }

    if (audioGrabberAvailable) {
      handleAudioChange();
    }
  }

  function onScreenEditorChange(editor) {
    if (!editor.ready) {
      return;
    }

    if (editor.validate().length) {
      $('#btn_submit_screengrabber').prop('disabled', true);
    }
    else {
      const availableDevicesEditor = editor.getEditor("root.framegrabber.available_devices");
      if (!availableDevicesEditor) {
        return;
      }

      const deviceSelected = availableDevicesEditor.getValue();
      switch (deviceSelected) {
        case "SELECT":
          showInputOptionsForKey(editor, "framegrabber", ["enable", "available_devices"], false);
          break;
        case "NONE":
          showInputOptionsForKey(editor, "framegrabber", ["enable", "available_devices"], false);
          break;
        default:
          globalThis.readOnlyMode ? $('#btn_submit_screengrabber').prop('disabled', true) : $('#btn_submit_screengrabber').prop('disabled', false);
          break;
      }
    }
  }

  function onVideoEditorChange(editor) {
    if (!editor.ready) {
      return;
    }

    if (editor.validate().length) {
      $('#btn_submit_videograbber').prop('disabled', true);
    }
    else {
      const availableDevicesEditor = editor.getEditor("root.grabberV4L2.available_devices");
      if (!availableDevicesEditor) {
        return;
      }

      const deviceSelected = availableDevicesEditor.getValue();
      switch (deviceSelected) {
        case "SELECT":
          showInputOptionsForKey(editor, "grabberV4L2", ["enable", "available_devices"], false);
          break;
        case "NONE":
          showInputOptionsForKey(editor, "grabberV4L2", ["enable", "available_devices"], false);
          break;
        default:
          globalThis.readOnlyMode ? $('#btn_submit_videograbber').prop('disabled', true) : $('#btn_submit_videograbber').prop('disabled', false);
          break;
      }
    }
  }

  function onAudioEditorChange(editor) {
    if (!editor.ready) {
      return;
    }

    if (editor.validate().length) {
      $('#btn_submit_audiograbber').prop('disabled', true);
    }
    else {
      const availableDevicesEditor = editor.getEditor("root.grabberAudio.available_devices");
      if (!availableDevicesEditor) {
        return;
      }

      const deviceSelected = availableDevicesEditor.getValue();
      switch (deviceSelected) {
        case "SELECT":
          showInputOptionsForKey(editor, "grabberAudio", ["enable", "available_devices"], false);
          break;
        case "NONE":
          showInputOptionsForKey(editor, "grabberAudio", ["enable", "available_devices"], false);
          break;
        default:
          globalThis.readOnlyMode ? $('#btn_submit_audiograbber').prop('disabled', true) : $('#btn_submit_audiograbber').prop('disabled', false);
          break;
      }
    }
  }

  JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
    let errors = [];

    if (path === "root.grabberV4L2" || path === "root.framegrabber") {
      let editor;
      switch (path) {
        case "root.framegrabber":
          editor = editors.screengrabber;
          break;
        case "root.grabberV4L2":
          editor = editors.videograbber;
          break;
      }

      if (value.cropLeft || value.cropRight) {
        const width = editor.getEditor(path + ".width").getValue();
        if (value.cropLeft + value.cropRight > width) {
          errors.push({
            path: path,
            property: 'maximum',
            message: $.i18n('edt_conf_v4l2_cropWidthValidation_error', width)
          });
        }
      }

      if (value.cropTop || value.cropBottom) {
        const height = editor.getEditor(path + ".height").getValue();
        if (value.cropTop + value.cropBottom > height) {
          errors.push({
            path: path,
            property: 'maximum',
            message: $.i18n('edt_conf_v4l2_cropHeightValidation_error', height)
          });
        }
      }
    }
    return errors;
  });

  function handleScreenChange() {
    createEditor(editors, 'screengrabber', 'framegrabber', onScreenEditorChange, {
      bindDefaultChange: false,
      bindSubmit: false
    });

    editors["screengrabber"].on('ready', function () {
      // Trigger editors["screengrabber"].watch - 'root.framegrabber.enable'
      const screenEnable = globalThis.serverConfig.framegrabber.enable;
      editors["screengrabber"].getEditor("root.framegrabber.enable").setValue(screenEnable);
    });

    editors["screengrabber"].on('change', () => {
      onScreenEditorChange(editors["screengrabber"]);
    });

    editors["screengrabber"].watch('root.framegrabber.enable', () => {
      if (!editors["screengrabber"].ready) return;

      const screenEnable = editors["screengrabber"].getEditor("root.framegrabber.enable").getValue();
      if (screenEnable) {
        showInputOptionsForKey(editors["screengrabber"], "framegrabber", "enable", true);
        if (globalThis.showOptHelp) {
          $('#screengrabberHelpPanelId').show();
        }
        discoverInputSources("screen");
      }
      else {
        $('#btn_submit_screengrabber').prop('disabled', false);
        showInputOptionsForKey(editors["screengrabber"], "framegrabber", "enable", false);
        $('#screengrabberHelpPanelId').hide();
      }

    });

    editors["screengrabber"].watch('root.framegrabber.available_devices', () => {
      if (!editors["screengrabber"].ready) return;

      const deviceSelected = editors["screengrabber"].getEditor("root.framegrabber.available_devices").getValue();
      if (deviceSelected === "SELECT" || deviceSelected === "NONE" || deviceSelected === "") {
        $('#btn_submit_screengrabber').prop('disabled', true);
        showInputOptionsForKey(editors["screengrabber"], "framegrabber", ["enable", "available_devices"], false);
      }
      else {
        showInputOptionsForKey(editors["screengrabber"], "framegrabber", ["enable", "available_devices"], true);
        let addSchemaElements = {};
        let enumVals = [];
        let enumTitelVals = [];
        let enumDefaultVal = "";

        const deviceProperties = getPropertiesOfDevice("screen", deviceSelected);

        //Update hidden input element
        editors["screengrabber"].getEditor("root.framegrabber.device").setValue(deviceProperties.device);

        const video_inputs = deviceProperties.video_inputs;
        if (video_inputs.length <= 1) {
          addSchemaElements.access = "expert";
        }

        for (const video_input of video_inputs) {
          enumVals.push(video_input.inputIdx.toString());
          enumTitelVals.push(video_input.name);
        }

        if (enumVals.length > 0) {
          if (deviceSelected === configuredDevice) {
            const configuredVideoInput = globalThis.serverConfig.framegrabber.input.toString();
            if ($.inArray(configuredVideoInput, enumVals) != -1) {
              enumDefaultVal = configuredVideoInput;
            }
          }
          updateJsonEditorSelection(editors["screengrabber"], 'root.framegrabber', {
            key: 'device_inputs',
            addElements: addSchemaElements,
            newEnumVals: enumVals,
            newTitleVals: enumTitelVals,
            newDefaultVal: enumDefaultVal,
            addSelect: false
          });
        }

        if (editors["screengrabber"].validate().length && !globalThis.readOnlyMode) {
          $('#btn_submit_screengrabber').prop('disabled', false);
        }
      }
    });

    editors["screengrabber"].watch('root.framegrabber.device_inputs', () => {
      if (!editors["screengrabber"].ready) return;
      const deviceSelected = editors["screengrabber"].getEditor("root.framegrabber.available_devices").getValue();
      const videoInputSelected = editors["screengrabber"].getEditor("root.framegrabber.device_inputs").getValue();

      //Update hidden input element
      editors["screengrabber"].getEditor("root.framegrabber.input").setValue(Number.parseInt(videoInputSelected));

      let addSchemaElements = {};
      let enumVals = [];
      let enumTitelVals = [];
      let enumDefaultVal = "";

      const deviceProperties = getPropertiesOfDevice("screen", deviceSelected);

      const videoInput = deviceProperties.video_inputs.find(input => input.inputIdx === Number.parseInt(videoInputSelected));
      const formats = videoInput.formats;
      let formatIdx = 0;

      let resolutions = formats[formatIdx].resolutions;
      if (resolutions.length <= 1) {
        addSchemaElements.access = "advanced";
      } else {
        resolutions.sort(compareTwoValues('width', 'height', 'asc'));
      }

      for (let i = 0; i < resolutions.length; i++) {
        enumVals.push(i.toString());
        const resolutionText = resolutions[i].width + "x" + resolutions[i].height;
        enumTitelVals.push(resolutionText);
      }

      if (enumVals.length > 0) {
        if (deviceSelected === configuredDevice) {
          const configuredResolutionText = globalThis.serverConfig.framegrabber.width + "x" + globalThis.serverConfig.framegrabber.height;
          const idx = $.inArray(configuredResolutionText, enumTitelVals);
          if (idx != -1) {
            enumDefaultVal = idx.toString();
          }
        }

        updateJsonEditorSelection(editors["screengrabber"], 'root.framegrabber', {
          key: 'resolutions',
          addElements: addSchemaElements,
          newEnumVals: enumVals,
          newTitleVals: enumTitelVals,
          newDefaultVal: enumDefaultVal,
          addSelect: false
        });
      }

      if (editors["screengrabber"].validate().length && !globalThis.readOnlyMode) {
        $('#btn_submit_screengrabber').prop('disabled', false);
      }
    });

    editors["screengrabber"].watch('root.framegrabber.resolutions', () => {
      if (!editors["screengrabber"].ready) return;
      const deviceSelected = editors["screengrabber"].getEditor("root.framegrabber.available_devices").getValue();
      const videoInputSelected = editors["screengrabber"].getEditor("root.framegrabber.device_inputs").getValue();
      const resolutionSelected = editors["screengrabber"].getEditor("root.framegrabber.resolutions").getValue();

      let addSchemaElements = {};
      let enumVals = [];
      let enumDefaultVal = "";

      const deviceProperties = getPropertiesOfDevice("screen", deviceSelected);
      const videoInput = deviceProperties.video_inputs.find(input => input.inputIdx == videoInputSelected);
      const formats = videoInput.formats;
      let formatIdx = 0;

      //Update hidden resolution related elements
      const width = Number.parseInt(formats[formatIdx].resolutions[resolutionSelected].width);
      editors["screengrabber"].getEditor("root.framegrabber.width").setValue(width);

      const height = Number.parseInt(formats[formatIdx].resolutions[resolutionSelected].height);
      editors["screengrabber"].getEditor("root.framegrabber.height").setValue(height);

      //Update crop rage depending on selected resolution
      updateCropForWidth(editors["screengrabber"], "root.framegrabber");
      updateCropForHeight(editors["screengrabber"], "root.framegrabber");

      const fps = formats[formatIdx].resolutions[resolutionSelected].fps;
      if (fps) {
        fps.sort((a, b) => a - b);
        for (const element of fps) {
          enumVals.push(element.toString());
        }
      } else {
        enumVals.push("NONE");
        addSchemaElements.options = { "hidden": true };
      }

      if (enumVals.length <= 1) {
        addSchemaElements.access = "expert";
      }

      if (enumVals.length > 0) {
        if (deviceSelected === configuredDevice) {
          const configuredFps = globalThis.serverConfig.framegrabber.fps.toString();
          if ($.inArray(configuredFps, enumVals) != -1) {
            enumDefaultVal = configuredFps;
          }
        } else if (deviceProperties.hasOwnProperty('default') && !jQuery.isEmptyObject(deviceProperties.default.video_input)) {
          if (deviceProperties.default.video_input.resolution.fps) {
            enumDefaultVal = deviceProperties.default.video_input.resolution.fps.toString();
          }
        }
        updateJsonEditorSelection(editors["screengrabber"], 'root.framegrabber', {
          key: 'framerates',
          addElements: addSchemaElements,
          newEnumVals: enumVals,
          newTitleVals: [],
          newDefaultVal: enumDefaultVal,
          addSelect: false
        });
      }

      if (editors["screengrabber"].validate().length && !globalThis.readOnlyMode) {
        $('#btn_submit_screengrabber').prop('disabled', false);
      }
    });

    editors["screengrabber"].watch('root.framegrabber.framerates', () => {
      if (!editors["screengrabber"].ready) return;
      //Update hidden fps element
      let fps = 0;
      const framerates = editors["screengrabber"].getEditor("root.framegrabber.framerates").getValue();
      if (framerates !== "NONE") {
        fps = Number.parseInt(framerates);
      }
      editors["screengrabber"].getEditor("root.framegrabber.fps").setValue(fps);
    });

    $('#btn_submit_screengrabber').off().on('click', function () {
      let saveOptions = editors["screengrabber"].getValue();

      // As the DDA grabber will not issue updates when no screen activity, set all instances to a timeout of 5 minutes to avoid off/on blinking
      // until a better design is in place
      if (saveOptions.framegrabber.device === "dda") {
        let instCaptOptions = globalThis.serverConfig.instCapture;
        instCaptOptions.systemEnable = saveOptions.framegrabber.enable;
        instCaptOptions.screenInactiveTimeout = DDA_INACTIVE_TIMEOUT;

        saveOptions.instCapture = instCaptOptions;
        requestWriteConfig(saveOptions, false, getConfiguredInstances());
        return;
      }

      const currentInstance = globalThis.currentHyperionInstance;
      //If an instance exists, enable/disable grabbing in line with the global state
      if (currentInstance !== null && globalThis.serverConfig.instCapture) {
        let instCaptOptions = globalThis.serverConfig.instCapture;
        instCaptOptions.systemEnable = saveOptions.framegrabber.enable;
        instCaptOptions.screenInactiveTimeout = globalThis.schema.instCapture.properties.screenInactiveTimeout.default;

        saveOptions.instCapture = instCaptOptions;
      }
      requestWriteConfig(saveOptions);
    });
  }

  function handleVideoChange() {
    function updateDeviceProperties(deviceProperties, property, key) {
      let properties = {};
      if (deviceProperties) {
        if (deviceProperties.hasOwnProperty(property)) {
          properties = deviceProperties[property];
        }
      }
      updateJsonEditorRange(editors["videograbber"], "root.grabberV4L2", key,
        properties.minValue,
        properties.maxValue,
        properties.default,
        properties.step,
        true);

      if (jQuery.isEmptyObject(properties)) {
        showInputOptionForItem(editors["videograbber"], "grabberV4L2", key, false);
      } else {
        showInputOptionForItem(editors["videograbber"], "grabberV4L2", key, true);
      }
    }

    createEditor(editors, 'videograbber', 'grabberV4L2', onVideoEditorChange, {
      bindDefaultChange: false,
      bindSubmit: false
    });

    editors["videograbber"].on('ready', function () {
      // Trigger editors["videograbber"].watch - 'root.grabberV4L2.enable'
      const videoEnable = globalThis.serverConfig.grabberV4L2.enable;
      editors["videograbber"].getEditor("root.grabberV4L2.enable").setValue(videoEnable);
    });

    editors["videograbber"].on('change', () => {
      onVideoEditorChange(editors["videograbber"]);
    });



    editors["videograbber"].watch('root.grabberV4L2.enable', () => {
      if (!editors["videograbber"].ready) return;

      const videoEnable = editors["videograbber"].getEditor("root.grabberV4L2.enable").getValue();
      if (videoEnable) {
        showInputOptionsForKey(editors["videograbber"], "grabberV4L2", "enable", true);
        $('#btn_videograbber_set_defaults').show();
        if (globalThis.showOptHelp) {
          $('#videograbberHelpPanelId').show();
        }
        discoverInputSources("video");
      }
      else {
        $('#btn_submit_videograbber').prop('disabled', false);
        $('#btn_videograbber_set_defaults').hide();
        showInputOptionsForKey(editors["videograbber"], "grabberV4L2", "enable", false);
        $('#videograbberHelpPanelId').hide();
      }
    });

    editors["videograbber"].watch('root.grabberV4L2.available_devices', () => {
      if (!editors["videograbber"].ready) return;
      const editor = editors["videograbber"].getEditor("root.grabberV4L2.available_devices");
      const deviceSelected = editor.getValue();
      const invalidSelections = ["SELECT", "NONE", ""];

      if (invalidSelections.includes(deviceSelected)) {
        $('#btn_submit_videograbber').prop('disabled', true);
        showInputOptionsForKey(editors["videograbber"], "grabberV4L2", ["enable", "available_devices"], false);
        return;
      }

      showInputOptionsForKey(editors["videograbber"], "grabberV4L2", ["enable", "available_devices"], true);

      const deviceProperties = getPropertiesOfDevice("video", deviceSelected);
      editors["videograbber"].getEditor("root.grabberV4L2.device").setValue(deviceProperties.device);

      const defaultProperties = deviceProperties.default?.properties ?? {};
      const hasDefaults = Object.keys(defaultProperties).length > 0;
      $('#btn_videograbber_set_defaults').prop('disabled', !hasDefaults);

      const isConfiguredDevice = (deviceSelected === configuredDevice);
      const { grabberV4L2 } = globalThis.serverConfig;
      const currentProps = deviceProperties.properties;

      const propMappings = {
        brightness: 'hardware_brightness',
        contrast: 'hardware_contrast',
        saturation: 'hardware_saturation',
        hue: 'hardware_hue'
      };

      for (const prop in propMappings) {
        if (hasDefaults && currentProps[prop] && Object.hasOwn(defaultProperties, prop)) {
          currentProps[prop].default = defaultProperties[prop];
        }
        // Ensure min,max and step values are set inline with the selected grabber to ensure valid input
        updateDeviceProperties(currentProps, prop, [propMappings[prop]]);

        let currentValue = 0;
        if (isConfiguredDevice) {
          currentValue = globalThis.serverConfig.grabberV4L2[propMappings[prop]];
        } else if (hasDefaults && currentProps[prop]?.hasOwnProperty('default')) {
          currentValue = currentProps[prop].default;
        }

        if (currentValue !== undefined) {
          editors["videograbber"].getEditor("root.grabberV4L2." + propMappings[prop]).setValue(currentValue);
        }
      }

      const { video_inputs = [] } = deviceProperties;

      const addSchemaElements = {};

      if (video_inputs.length <= 1) {
        addSchemaElements.access = "expert";
      }

      const enumVals = video_inputs.map(input => input.inputIdx.toString());
      const enumTitelVals = video_inputs.map(input => input.name);

      if (enumVals.length > 0) {
        let enumDefaultVal = "";
        if (isConfiguredDevice) {
          const configuredInput = grabberV4L2.input.toString();
          if (enumVals.includes(configuredInput)) {
            enumDefaultVal = configuredInput;
          }
        }

        updateJsonEditorSelection(editors["videograbber"], 'root.grabberV4L2', {
          key: 'device_inputs',
          addElements: addSchemaElements,
          newEnumVals: enumVals,
          newTitleVals: enumTitelVals,
          newDefaultVal: enumDefaultVal,
          addSelect: false,
          addCustom: false
        });
      }

      const isValid = editors["videograbber"].validate().length === 0;
      if (isValid && !globalThis.readOnlyMode) {
        $('#btn_submit_videograbber').prop('disabled', false);
      }
    });

    editors["videograbber"].watch('root.grabberV4L2.device_inputs', () => {
      if (!editors["videograbber"].ready) return;
      const deviceSelected = editors["videograbber"].getEditor("root.grabberV4L2.available_devices").getValue();
      const videoInputSelected = editors["videograbber"].getEditor("root.grabberV4L2.device_inputs").getValue();

      let addSchemaElements = {};
      let enumVals = [];
      let enumTitelVals = [];
      let enumDefaultVal = "";

      const deviceProperties = getPropertiesOfDevice("video", deviceSelected);
      const formats = deviceProperties.video_inputs[videoInputSelected].formats;

      addSchemaElements.access = "advanced";

      for (const element of formats) {
        if (element.format) {
          enumVals.push(element.format);
          enumTitelVals.push(element.format.toUpperCase());
        }
        else {
          enumVals.push("NONE");
        }
      }

      if (enumVals.length > 0) {
        if (deviceSelected === configuredDevice) {
          const configuredEncoding = globalThis.serverConfig.grabberV4L2.encoding;
          if ($.inArray(configuredEncoding, enumVals) != -1) {
            enumDefaultVal = configuredEncoding;
          }
        }
        updateJsonEditorSelection(editors["videograbber"], 'root.grabberV4L2', {
          key: 'encoding',
          addElements: addSchemaElements,
          newEnumVals: enumVals,
          newTitleVals: enumTitelVals,
          newDefaultVal: enumDefaultVal,
          addSelect: false
        });
      }

      const standards = deviceProperties.video_inputs[videoInputSelected].standards;
      if (standards) {
        enumVals = standards;
      } else {
        enumVals.push("NONE");
        addSchemaElements.options = { "hidden": true };
      }

      if (enumVals.length > 0) {
        if (deviceSelected === configuredDevice) {
          const configuredStandard = globalThis.serverConfig.grabberV4L2.standard;
          if ($.inArray(configuredStandard, enumVals) != -1) {
            enumDefaultVal = configuredStandard;
          }
        }

        updateJsonEditorSelection(editors["videograbber"], 'root.grabberV4L2', {
          key: 'standard',
          addElements: addSchemaElements,
          newEnumVals: enumVals,
          newTitleVals: [],
          newDefaultVal: enumDefaultVal,
          addSelect: false
        });
      }

      if (editors["videograbber"].validate().length && !globalThis.readOnlyMode) {
        $('#btn_submit_videograbber').prop('disabled', false);
      }
    });

    editors["videograbber"].watch('root.grabberV4L2.encoding', () => {
      if (!editors["videograbber"].ready) return;
      const deviceSelected = editors["videograbber"].getEditor("root.grabberV4L2.available_devices").getValue();
      const videoInputSelected = editors["videograbber"].getEditor("root.grabberV4L2.device_inputs").getValue();
      const formatSelected = editors["videograbber"].getEditor("root.grabberV4L2.encoding").getValue();

      //Update hidden input element
      editors["videograbber"].getEditor("root.grabberV4L2.input").setValue(Number.parseInt(videoInputSelected));

      let addSchemaElements = {};
      let enumVals = [];
      let enumTitelVals = [];
      let enumDefaultVal = "";

      const deviceProperties = getPropertiesOfDevice("video", deviceSelected);

      const formats = deviceProperties.video_inputs[videoInputSelected].formats;
      let formatIdx = 0;
      if (formatSelected !== "NONE") {
        formatIdx = formats.findIndex(x => x.format === formatSelected);
      }

      const resolutions = formats[formatIdx].resolutions;
      if (resolutions.length <= 1) {
        addSchemaElements.access = "advanced";
      } else {
        resolutions.sort(compareTwoValues('width', 'height', 'asc'));
      }

      for (let i = 0; i < resolutions.length; i++) {
        enumVals.push(i.toString());
        const resolutionText = resolutions[i].width + "x" + resolutions[i].height;
        enumTitelVals.push(resolutionText);
      }

      if (enumVals.length > 0) {
        if (deviceSelected === configuredDevice) {
          const configuredResolutionText = globalThis.serverConfig.grabberV4L2.width + "x" + globalThis.serverConfig.grabberV4L2.height;
          const idx = $.inArray(configuredResolutionText, enumTitelVals);
          if (idx != -1) {
            enumDefaultVal = idx.toString();
          }
        }

        updateJsonEditorSelection(editors["videograbber"], 'root.grabberV4L2', {
          key: 'resolutions',
          addElements: addSchemaElements,
          newEnumVals: enumVals,
          newTitleVals: enumTitelVals,
          newDefaultVal: enumDefaultVal,
          addSelect: false
        });
      }

      if (editors["videograbber"].validate().length && !globalThis.readOnlyMode) {
        $('#btn_submit_videograbber').prop('disabled', false);
      }
    });

    editors["videograbber"].watch('root.grabberV4L2.resolutions', () => {
      if (!editors["videograbber"].ready) return;
      const deviceSelected = editors["videograbber"].getEditor("root.grabberV4L2.available_devices").getValue();
      const videoInputSelected = editors["videograbber"].getEditor("root.grabberV4L2.device_inputs").getValue();
      const formatSelected = editors["videograbber"].getEditor("root.grabberV4L2.encoding").getValue();
      const resolutionSelected = editors["videograbber"].getEditor("root.grabberV4L2.resolutions").getValue();

      let addSchemaElements = {};
      let enumVals = [];
      let enumDefaultVal = "";

      const deviceProperties = getPropertiesOfDevice("video", deviceSelected);
      const formats = deviceProperties.video_inputs[videoInputSelected].formats;
      let formatIdx = 0;
      if (formatSelected !== "NONE") {
        formatIdx = formats.findIndex(x => x.format === formatSelected);
      }

      //Update hidden resolution related elements
      const width = Number.parseInt(formats[formatIdx].resolutions[resolutionSelected].width);
      editors["videograbber"].getEditor("root.grabberV4L2.width").setValue(width);

      const height = Number.parseInt(formats[formatIdx].resolutions[resolutionSelected].height);
      editors["videograbber"].getEditor("root.grabberV4L2.height").setValue(height);

      //Update crop rage depending on selected resolution
      updateCropForWidth(editors["videograbber"], "root.grabberV4L2");
      updateCropForHeight(editors["videograbber"], "root.grabberV4L2");

      const fps = formats[formatIdx].resolutions[resolutionSelected].fps;
      if (fps) {
        fps.sort((a, b) => a - b);
        for (const element of fps) {
          enumVals.push(element.toString());
        }
      } else {
        addSchemaElements.options = { "hidden": true };
      }

      if (enumVals.length <= 1) {
        addSchemaElements.access = "expert";
      }

      if (enumVals.length > 0) {
        if (deviceSelected === configuredDevice) {
          const configuredFps = globalThis.serverConfig.grabberV4L2.fps.toString();
          if ($.inArray(configuredFps, enumVals) != -1) {
            enumDefaultVal = configuredFps;
          }
        }
        updateJsonEditorSelection(editors["videograbber"], 'root.grabberV4L2', {
          key: 'framerates',
          addElements: addSchemaElements,
          newEnumVals: enumVals,
          newTitleVals: [],
          newDefaultVal: enumDefaultVal,
          addSelect: false
        });
      }

      if (editors["videograbber"].validate().length && !globalThis.readOnlyMode) {
        $('#btn_submit_videograbber').prop('disabled', false);
      }
    });

    editors["videograbber"].watch('root.grabberV4L2.framerates', () => {
      if (!editors["videograbber"].ready) return;
      //Update hidden fps element
      let fps = 0;
      const framerates = editors["videograbber"].getEditor("root.grabberV4L2.framerates").getValue();
      if (framerates !== "NONE") {
        fps = Number.parseInt(framerates);
      }
      //Show Frameskipping only when more than 2 fps
      if (fps > 2) {
        showInputOptionForItem(editors["videograbber"], "grabberV4L2", "fpsSoftwareDecimation", true);
      }
      else {
        showInputOptionForItem(editors["videograbber"], "grabberV4L2", "fpsSoftwareDecimation", false);
      }
      editors["videograbber"].getEditor("root.grabberV4L2.fps").setValue(fps);
    });

    $('#btn_submit_videograbber').off().on('click', function () {
      let saveOptions = editors["videograbber"].getValue();

      const currentInstance = globalThis.currentHyperionInstance;
      //If an instance exists, enable/disable grabbing in line with the global state
      if (currentInstance !== null && globalThis.serverConfig.instCapture) {
        let instCaptOptions = globalThis.serverConfig.instCapture;
        instCaptOptions.v4lEnable = saveOptions.grabberV4L2.enable;
        saveOptions.instCapture = instCaptOptions;
      }

      requestWriteConfig(saveOptions);
    });

    // ------------------------------------------------------------------

    $('#btn_videograbber_set_defaults').off().on('click', function () {
      const deviceSelected = editors["videograbber"].getEditor("root.grabberV4L2.available_devices").getValue();
      const deviceProperties = getPropertiesOfDevice("video", deviceSelected);

      let defaultDeviceProperties = {};
      if (deviceProperties.hasOwnProperty('default')) {
        if (deviceProperties.default.hasOwnProperty('properties')) {
          defaultDeviceProperties = deviceProperties.default.properties;
          if (defaultDeviceProperties.brightness) {
            editors["videograbber"].getEditor("root.grabberV4L2.hardware_brightness").setValue(defaultDeviceProperties.brightness);
          }
          if (defaultDeviceProperties.contrast) {
            editors["videograbber"].getEditor("root.grabberV4L2.hardware_contrast").setValue(defaultDeviceProperties.contrast);
          }
          if (defaultDeviceProperties.saturation) {
            editors["videograbber"].getEditor("root.grabberV4L2.hardware_saturation").setValue(defaultDeviceProperties.saturation);
          }
          if (defaultDeviceProperties.hue) {
            editors["videograbber"].getEditor("root.grabberV4L2.hardware_hue").setValue(defaultDeviceProperties.hue);
          }
        }
      }
    });
  }

  function handleAudioChange() {

    createEditor(editors, 'audiograbber', 'grabberAudio', onAudioEditorChange, {
      bindDefaultChange: false,
      bindSubmit: false
    });

    editors["audiograbber"].on('ready', () => {
      // Trigger editors["audiograbber"].watch - 'root.grabberAudio.enable'
      const audioEnable = globalThis.serverConfig.grabberAudio.enable;
      editors["audiograbber"].getEditor("root.grabberAudio.enable").setValue(audioEnable);
    });

    editors["audiograbber"].on('change', () => {
      onAudioEditorChange(editors["audiograbber"]);
    });



    // Enable
    editors["audiograbber"].watch('root.grabberAudio.enable', () => {
      if (!editors["audiograbber"].ready) return;

      const audioEnable = editors["audiograbber"].getEditor("root.grabberAudio.enable").getValue();
      if (audioEnable) {
        showInputOptionsForKey(editors["audiograbber"], "grabberAudio", "enable", true);

        $('#btn_audiograbber_set_effect_defaults').show();

        if (globalThis.showOptHelp) {
          $('#audiograbberHelpPanelId').show();
        }

        discoverInputSources("audio");
      }
      else {
        $('#btn_submit_audiograbber').prop('disabled', false);
        $('#btn_audiograbber_set_effect_defaults').hide();
        showInputOptionsForKey(editors["audiograbber"], "grabberAudio", "enable", false);
        $('#audiograbberHelpPanelId').hide();
      }
    });

    // Available Devices
    editors["audiograbber"].watch('root.grabberAudio.available_devices', () => {
      if (!editors["audiograbber"].ready) return;
      const deviceSelected = editors["audiograbber"].getEditor("root.grabberAudio.available_devices").getValue();

      if (deviceSelected === "SELECT" || deviceSelected === "NONE" || deviceSelected === "") {
        $('#btn_submit_audiograbber').prop('disabled', true);
        showInputOptionsForKey(editors["audiograbber"], "grabberAudio", ["enable", "available_devices"], false);
      }
      else {
        showInputOptionsForKey(editors["audiograbber"], "grabberAudio", ["enable", "available_devices"], true);

        const deviceProperties = getPropertiesOfDevice("audio", deviceSelected);

        //Update hidden input element
        editors["audiograbber"].getEditor("root.grabberAudio.device").setValue(deviceProperties.device);

        //Enfore configured JSON-editor dependencies
        editors["audiograbber"].notifyWatchers("root.grabberAudio.audioEffect");

        //Enable set defaults button
        $('#btn_audiograbber_set_effect_defaults').prop('disabled', false);

        if (editors["audiograbber"].validate().length && !globalThis.readOnlyMode) {
          $('#btn_submit_audiograbber').prop('disabled', false);
        }
      }
    });

    $('#btn_submit_audiograbber').off().on('click', function () {
      let saveOptions = editors["audiograbber"].getValue();

      const currentInstance = globalThis.currentHyperionInstance;
      //If an instance exists, enable/disable grabbing in line with the global state
      if (currentInstance !== null && globalThis.serverConfig.instCapture) {
        let instCaptOptions = globalThis.serverConfig.instCapture;
        instCaptOptions.audioEnable = saveOptions.grabberAudio.enable;
        saveOptions.instCapture = instCaptOptions;
      }

      requestWriteConfig(saveOptions);
    });

    // ------------------------------------------------------------------

    $('#btn_audiograbber_set_effect_defaults').off().on('click', function () {
      const currentEffect = editors["audiograbber"].getEditor("root.grabberAudio.audioEffect").getValue();
      let effectEditor = editors["audiograbber"].getEditor("root.grabberAudio." + currentEffect);
      const defaultProperties = effectEditor.schema.defaultProperties;

      let default_values = {};
      for (const item of defaultProperties) {

        default_values[item] = effectEditor.schema.properties[item].default;
      }
      effectEditor.setValue(default_values);
    });
  }

  // ------------------------------------------------------------------

  //////////////////////////////////////////////////



  // build dynamic screen input enum
  const updateScreenSourcesList = function (type, discoveryInfo) {

    let enumVals = [];
    let enumTitelVals = [];
    let enumDefaultVal = "";
    let addSelect = false;

    if (jQuery.isEmptyObject(discoveryInfo)) {
      enumVals.push("NONE");
      enumTitelVals.push($.i18n('edt_conf_grabber_discovered_none'));
    }
    else {
      for (const device of discoveryInfo) {
        enumVals.push(device.device_name);
      }
      editors["screengrabber"].getEditor('root.framegrabber').enable();
      configuredDevice = globalThis.serverConfig.framegrabber.available_devices;

      if ($.inArray(configuredDevice, enumVals) == -1) {
        addSelect = true;
      }
      else {
        enumDefaultVal = configuredDevice;
      }
    }
    if (enumVals.length > 0) {
      updateJsonEditorSelection(editors["screengrabber"], 'root.framegrabber', {
        key: 'available_devices',
        addElements: {},
        newEnumVals: enumVals,
        newTitleVals: enumTitelVals,
        newDefaultVal: enumDefaultVal,
        addSelect,
        addCustom: false
      });
    }
  };

  // build dynamic video input enum
  const updateVideoSourcesList = function (type, discoveryInfo) {
    let enumVals = [];
    let enumTitelVals = [];
    let enumDefaultVal = "";
    let addSelect = false;
    if (jQuery.isEmptyObject(discoveryInfo)) {
      enumVals.push("NONE");
      enumTitelVals.push($.i18n('edt_conf_grabber_discovered_none'));
    }
    else {
      for (const device of discoveryInfo) {
        enumVals.push(device.device_name);
      }
      editors["videograbber"].getEditor('root.grabberV4L2').enable();
      configuredDevice = globalThis.serverConfig.grabberV4L2.available_devices;

      if ($.inArray(configuredDevice, enumVals) == -1) {
        addSelect = true;
      }
      else {
        enumDefaultVal = configuredDevice;
      }
    }

    if (enumVals.length > 0) {
      updateJsonEditorSelection(editors["videograbber"], 'root.grabberV4L2', {
        key: 'available_devices',
        addElements: {},
        newEnumVals: enumVals,
        newTitleVals: enumTitelVals,
        newDefaultVal: enumDefaultVal,
        addSelect,
        addCustom: false
      });
    }
  };

  // build dynamic audio input enum
  const updateAudioSourcesList = function (type, discoveryInfo) {
    const enumVals = [];
    const enumTitelVals = [];
    let enumDefaultVal = "";
    let addSelect = false;

    if (jQuery.isEmptyObject(discoveryInfo)) {
      enumVals.push("NONE");
      enumTitelVals.push($.i18n('edt_conf_grabber_discovered_none'));
    }
    else {
      for (const device of discoveryInfo) {
        enumVals.push(device.device_name);
      }
      editors["audiograbber"].getEditor('root.grabberAudio').enable();
      configuredDevice = globalThis.serverConfig.grabberAudio.available_devices;

      if ($.inArray(configuredDevice, enumVals) == -1) {
        addSelect = true;
      }
      else {
        enumDefaultVal = configuredDevice;
      }
    }

    if (enumVals.length > 0) {
      updateJsonEditorSelection(editors["audiograbber"], 'root.grabberAudio', {
        key: 'available_devices',
        addElements: {},
        newEnumVals: enumVals,
        newTitleVals: enumTitelVals,
        newDefaultVal: enumDefaultVal,
        addSelect,
        addCustom: false
      });
    }
  };

  async function discoverInputSources(type, params) {
    const result = await requestInputSourcesDiscovery(type, params);

    let discoveryResult;
    if (result && !result.error) {
      discoveryResult = result.info;
    }
    else {
      discoveryResult = {
        "video_sources": [],
        "audio_sources": []
      };
    }

    switch (type) {
      case "screen":
        discoveredInputSources.screen = discoveryResult.video_sources;
        if (screenGrabberAvailable) {
          updateScreenSourcesList(type, discoveredInputSources.screen);
        }
        break;
      case "video":
        discoveredInputSources.video = discoveryResult.video_sources;
        if (videoGrabberAvailable) {
          updateVideoSourcesList(type, discoveredInputSources.video);
        }
        break;
      case "audio":
        discoveredInputSources.audio = discoveryResult.audio_sources;
        if (audioGrabberAvailable) {
          updateAudioSourcesList(type, discoveredInputSources.audio);
        }
        break;
    }
  }

  function getPropertiesOfDevice(type, deviceName) {
    let props = {};
    const sourceList = discoveredInputSources[type] || [];
    for (const deviceRecord of sourceList) {
      if (deviceRecord.device_name === deviceName) {
        // Deep copy to prevent modifying the original object in discoveredInputSources
        props = structuredClone(deviceRecord);
        break;
      }
    }
    return props;
  }

});

function updateCropForWidth(editor, path) {
  const width = editor.getEditor(path + ".width").getValue();
  updateJsonEditorRange(editor, path, 'cropLeft', 0, width);
  updateJsonEditorRange(editor, path, 'cropRight', 0, width);
}

function updateCropForHeight(editor, path) {
  const height = editor.getEditor(path + ".height").getValue();
  updateJsonEditorRange(editor, path, 'cropTop', 0, height);
  updateJsonEditorRange(editor, path, 'cropBottom', 0, height);
}