import { ledLayout } from './content_leds_layout.js';

import { ledPreview } from './ledPreview.js';


let onLedLayoutTab = false;
let nonBlacklistLedArray = [];
let ledBlacklist = [];
let finalLedArray = [];
let conf_editor = null;
let blacklist_editor = null;
let aceEdt = null;

const devRPiSPI = ['apa102', 'apa104', 'ws2801', 'lpd6803', 'lpd8806', 'p9813', 'sk6812spi', 'sk6822spi', 'sk9822', 'ws2812spi'];
const devRPiPWM = ['ws281x'];
const devRPiGPIO = ['piblaster'];
const devNET = ['atmoorb', 'cololight', 'fadecandy', 'philipshue', 'nanoleaf', 'razer', 'tinkerforge', 'tpm2net', 'udpe131', 'udpartnet', 'udpddp', 'udph801', 'udpraw', 'wled', 'yeelight'];
const devSerial = ['adalight', 'dmx', 'atmo', 'sedu', 'tpm2', 'karate'];
const devHID = ['hyperionusbasp', 'lightpack', 'paintpack', 'rawhid'];

const infoTextDefault = '<span>' + $.i18n("conf_leds_device_info_log") + ' </span><a href="" onclick="SwitchToMenuItem(\'MenuItemLogging\')" style="cursor:pointer">' + $.i18n("main_menu_logging_token") + '</a>';

function getLedConfig() {

  let ledConfig = { classic: {}, matrix: {} };

  const classicSchema = window.serverSchema.properties.ledConfig.properties.classic.properties;
  for (let key in classicSchema) {
    if (classicSchema[key].type === "boolean")
      ledConfig.classic[key] = $('#ip_cl_' + key).is(':checked');
    else if (classicSchema[key].type === "integer")
      ledConfig.classic[key] = parseInt($('#ip_cl_' + key).val());
    else
      ledConfig.classic[key] = $('#ip_cl_' + key).val();
  }

  const matrixSchema = window.serverSchema.properties.ledConfig.properties.matrix.properties;
  for (let key in matrixSchema) {
    if (matrixSchema[key].type === "boolean")
      ledConfig.matrix[key] = $('#ip_ma_' + key).is(':checked');
    else if (matrixSchema[key].type === "integer")
      ledConfig.matrix[key] = parseInt($('#ip_ma_' + key).val());
    else
      ledConfig.matrix[key] = $('#ip_ma_' + key).val();
  }

  ledConfig.ledBlacklist = blacklist_editor.getEditor("root.ledBlacklist").getValue();

  return ledConfig;
}
function restoreLedConfig(slConfig) {
  //restore ledConfig - Classic
  for (let key in slConfig.classic) {
    if (typeof (slConfig.classic[key]) === "boolean")
      $('#ip_cl_' + key).prop('checked', slConfig.classic[key]);
    else
      $('#ip_cl_' + key).val(slConfig.classic[key]);
  }

  //restore ledConfig - Matrix
  for (let key in slConfig.matrix) {
    if (typeof (slConfig.matrix[key]) === "boolean")
      $('#ip_ma_' + key).prop('checked', slConfig.matrix[key]);
    else
      $('#ip_ma_' + key).val(slConfig.matrix[key]);
  }
}

function createClassicLeds() {
  //get values
  let params = {
    ledstop: parseInt($("#ip_cl_top").val()),
    ledsbottom: parseInt($("#ip_cl_bottom").val()),
    ledsleft: parseInt($("#ip_cl_left").val()),
    ledsright: parseInt($("#ip_cl_right").val()),
    ledsglength: parseInt($("#ip_cl_glength").val()),
    ledsgpos: parseInt($("#ip_cl_gpos").val()),
    position: parseInt($("#ip_cl_position").val()),
    reverse: $("#ip_cl_reverse").is(":checked"),

    //advanced values
    ledsVDepth: parseInt($("#ip_cl_vdepth").val()) / 100,
    ledsHDepth: parseInt($("#ip_cl_hdepth").val()) / 100,
    edgeVGap: parseInt($("#ip_cl_edgegap").val()) / 100 / 2,
    //cornerVGap : parseInt($("#ip_cl_cornergap").val())/100/2,
    overlap: $("#ip_cl_overlap").val() / 100,

    //trapezoid values % -> float
    ptblh: parseInt($("#ip_cl_pblh").val()) / 100,
    ptblv: parseInt($("#ip_cl_pblv").val()) / 100,
    ptbrh: parseInt($("#ip_cl_pbrh").val()) / 100,
    ptbrv: parseInt($("#ip_cl_pbrv").val()) / 100,
    pttlh: parseInt($("#ip_cl_ptlh").val()) / 100,
    pttlv: parseInt($("#ip_cl_ptlv").val()) / 100,
    pttrh: parseInt($("#ip_cl_ptrh").val()) / 100,
    pttrv: parseInt($("#ip_cl_ptrv").val()) / 100,
  }

  const nonBlacklistLedArray = ledLayout.createClassicLedLayout(params);
  console.log("Classic - nonBlacklistLedArray", nonBlacklistLedArray);

  const finalLedArray = ledLayout.getBlackListLeds(nonBlacklistLedArray, ledBlacklist);

  console.log("Classic - finalLedArray", finalLedArray);

  //check led gap pos
  if (params.ledsgpos + params.ledsglength > finalLedArray.length) {
    const mpos = Math.max(0, finalLedArray.length - params.ledsglength);
    $('#ip_cl_ledsgpos').val(mpos);
  }
  //check led gap length
  if (params.ledsglength >= finalLedArray.length) {
    $('#ip_cl_ledsglength').val(finalLedArray.length - 1);
  }

  ledPreview.createLedPreview(finalLedArray, "classic");
  aceEdt.set(finalLedArray);
}

function createMatrixLeds() {
  // Big thank you to RanzQ (Juha Rantanen) from Github for this script
  // https://raw.githubusercontent.com/RanzQ/hyperion-audio-effects/master/matrix-config.js

  //get values
  const ledshoriz = parseInt($("#ip_ma_ledshoriz").val());
  const ledsvert = parseInt($("#ip_ma_ledsvert").val());
  const cabling = $("#ip_ma_cabling").val();
  const direction = $("#ip_ma_direction").val();
  const start = $("#ip_ma_start").val();
  const gap = {
    //gap values % -> float
    left: parseInt($("#ip_ma_gapleft").val()) / 100,
    right: parseInt($("#ip_ma_gapright").val()) / 100,
    top: parseInt($("#ip_ma_gaptop").val()) / 100,
    bottom: parseInt($("#ip_ma_gapbottom").val()) / 100,
  }

  const nonBlacklistLedArray = ledLayout.createMatrixLayout(ledshoriz, ledsvert, cabling, start, direction, gap);
  console.log("Matrix - nonBlacklistLedArray", nonBlacklistLedArray);
  const finalLedArray = ledLayout.getBlackListLeds(nonBlacklistLedArray, ledBlacklist);
  console.log("Maxtrix - finalLedArray", finalLedArray);

  ledPreview.createLedPreview(finalLedArray, "matrix");
  aceEdt.set(finalLedArray);
}

function addClassicLayoutControls() {
  $('.ledCLconstr').on("change", function () {

    //Ensure Values are in min/max ranges
    if ($(this).val() < $(this).attr('min') * 1) { $(this).val($(this).attr('min')); }
    if ($(this).val() > $(this).attr('max') * 1) { $(this).val($(this).attr('max')); }

    //top/bottom and left/right must not overlap
    switch (this.id) {
      case "ip_cl_ptlh": {
        const ptrh = parseInt($("#ip_cl_ptrh").val());
        if (this.value > ptrh) {
          $(this).val(ptrh);
        }
        const pbrh = parseInt($("#ip_cl_pbrh").val());
        if (this.value > pbrh) {
          $(this).val(pbrh);
        }
      }
        break;
      case "ip_cl_ptrh": {
        const ptlh = parseInt($("#ip_cl_ptlh").val());
        if (this.value < ptlh) {
          $(this).val(ptlh);
        }
        const pblh = parseInt($("#ip_cl_pblh").val());
        if (this.value < pblh) {
          $(this).val(pblh);
        }
      }
        break;
      case "ip_cl_pblh": {
        const pbrh = parseInt($("#ip_cl_pbrh").val());
        if (this.value > pbrh) {
          $(this).val(pbrh);
        }
        const ptrh = parseInt($("#ip_cl_ptrh").val());
        if (this.value > ptrh) {
          $(this).val(ptrh);
        }
      }
        break;
      case "ip_cl_pbrh": {
        const pblh = parseInt($("#ip_cl_pblh").val());
        if (this.value < pblh) {
          $(this).val(pblh);
        }
        const ptlh = parseInt($("#ip_cl_ptlh").val());
        if (this.value < ptlh) {
          $(this).val(ptlh);
        }
      }
        break;
      case "ip_cl_ptlv": {
        const pblv = parseInt($("#ip_cl_pblv").val());
        if (this.value > pblv) {
          $(this).val(pblv);
        }
        const pbrv = parseInt($("#ip_cl_pbrv").val());
        if (this.value > pbrv) {
          $(this).val(pbrv);
        }
      }
        break;
      case "ip_cl_pblv": {
        const ptrv = parseInt($("#ip_cl_ptrv").val());
        if (this.value < ptrv) {
          $(this).val(ptrv);
        }
        const ptlv = parseInt($("#ip_cl_ptlv").val());
        if (this.value < ptlv) {
          $(this).val(ptlv);
        }
      }
        break;
      case "ip_cl_ptrv": {
        const pbrv = parseInt($("#ip_cl_pbrv").val());
        if (this.value > pbrv) {
          $(this).val(pbrv);
        }
        const pblv = parseInt($("#ip_cl_pblv").val());
        if (this.value > pblv) {
          $(this).val(pblv);
        }
      }
        break;
      case "ip_cl_pbrv": {
        const ptlv = parseInt($("#ip_cl_ptlv").val());
        if (this.value < ptlv) {
          $(this).val(ptlv);
        }
        const ptrv = parseInt($("#ip_cl_ptrv").val());
        if (this.value < ptrv) {
          $(this).val(ptrv);
        }
      }
        break;

      case "ip_cl_top":
      case "ip_cl_bottom":
      case "ip_cl_left":
      case "ip_cl_right":
      case "ip_cl_glength":
      case "ip_cl_gpos": {
        const ledstop = parseInt($("#ip_cl_top").val());
        const ledsbottom = parseInt($("#ip_cl_bottom").val());
        const ledsleft = parseInt($("#ip_cl_left").val());
        const ledsright = parseInt($("#ip_cl_right").val());
        const maxLEDs = ledstop + ledsbottom + ledsleft + ledsright;

        const gpos = parseInt($("#ip_cl_gpos").val());
        $("#ip_cl_gpos").attr({ 'max': maxLEDs - 1 });

        let max = maxLEDs - gpos;
        if (gpos == 0) {
          --max;
        }
        $("#ip_cl_glength").attr({ 'max': max });

        const glength = parseInt($("#ip_cl_glength").val());
        if (glength + gpos >= maxLEDs) {
          $("#ip_cl_glength").val($("#ip_cl_glength").attr('max'));
        }
      }
        break;

      default:
    }
    createClassicLeds();
  });
}

function addMatrixLayoutControls() {
  $('.ledMAconstr').on("change", function () {
    valValue(this.id, this.value, this.min, this.max);

    // top/bottom and left/right must not overlap
    switch (this.id) {
      case "ip_ma_gapleft": {
        const left = 100 - parseInt($("#ip_ma_gapright").val());
        if (this.value > left) {
          $(this).val(left);
        }
      }
        break;
      case "ip_ma_gapright": {
        const right = 100 - parseInt($("#ip_ma_gapleft").val());
        if (this.value > right) {
          $(this).val(right);
        }
      }
        break;
      case "ip_ma_gaptop": {
        const top = 100 - parseInt($("#ip_ma_gapbottom").val());
        if (this.value > top) {
          $(this).val(top);
        }
      }
        break;
      case "ip_ma_gapbottom": {
        const bottom = 100 - parseInt($("#ip_ma_gaptop").val());
        if (this.value > bottom) {
          $(this).val(bottom);
        }
      }
        break;
      default:
    }
    createMatrixLeds();
  });
}
$(document).ready(function () {
  // translate
  performTranslation();

  // update instance listing
  updateHyperionInstanceListing();

  //add intros
  if (window.showOptHelp) {
    createHintH("intro", $.i18n('conf_leds_device_intro'), "leddevice_intro");
    createHintH("intro", $.i18n('conf_leds_layout_intro'), "layout_intro");
    $('#led_vis_help').html('<div><div class="led_ex" style="background-color:black;margin-right:5px;margin-top:3px"></div><div style="display:inline-block;vertical-align:top">' + $.i18n('conf_leds_layout_preview_l1') + '</div></div><div class="led_ex" style="background-color:grey;margin-top:3px;margin-right:2px"></div><div class="led_ex" style="background-color: rgb(169, 169, 169);margin-right:5px;margin-top:3px;"></div><div style="display:inline-block;vertical-align:top">' + $.i18n('conf_leds_layout_preview_l2') + '</div>');
  }



  //**************************************************
  // Handle LED-Layout Configuration
  //**************************************************
  
  restoreLedConfig(window.serverConfig.ledConfig);
  addClassicLayoutControls();
  addMatrixLayoutControls();

  // check access level and adjust ui
  if (storedAccess == "default") {
    $('#texfield_panel').toggle(false);
    $('#previewcreator').toggle(false);
  }

  // Wiki link
  $('#leds_wl').append('<p style="font-weight:bold">' + $.i18n('general_wiki_moreto', $.i18n('conf_leds_nav_label_ledlayout')) + buildWL("user/advanced/Advanced.html#led-layout", "Wiki") + '</p>');

  $('#collapse1').on('shown.bs.collapse', function () {
    $("#leds_prev_toggle_keystone_correction_area").show();
    createClassicLeds();
  });

  $('#collapse2').on('shown.bs.collapse', function () {
    $("#leds_prev_toggle_keystone_correction_area").hide();
    createMatrixLeds();
  });

  $('#collapse5').on('shown.bs.collapse', function () {
    $("#leds_prev_toggle_keystone_correction_area").hide();

    console.log("content leds - collapse5 ");
    ledPreview.createLedPreview(finalLedArray, "text");
    aceEdt.set(finalLedArray);
  });

  // Initialise from config and apply blacklist rules
  nonBlacklistLedArray = window.serverConfig.leds;
  ledBlacklist = window.serverConfig.ledConfig.ledBlacklist;
  finalLedArray = ledLayout.getBlackListLeds(nonBlacklistLedArray, ledBlacklist);

  const blacklistOptions = window.serverSchema.properties.ledConfig.properties.ledBlacklist;
  blacklist_editor = createJsonEditor('editor_container_blacklist_conf', {
    ledBlacklist: blacklistOptions,
  });
  blacklist_editor.getEditor("root.ledBlacklist").setValue(ledBlacklist);

  // v4 of json schema with diff required assignment - remove when hyperion schema moved to v4
  const ledschema = { "items": { "additionalProperties": false, "required": ["hmin", "hmax", "vmin", "vmax"], "properties": { "name": { "type": "string" }, "colorOrder": { "enum": ["rgb", "bgr", "rbg", "brg", "gbr", "grb"], "type": "string" }, "hmin": { "maximum": 1, "minimum": 0, "type": "number" }, "hmax": { "maximum": 1, "minimum": 0, "type": "number" }, "vmin": { "maximum": 1, "minimum": 0, "type": "number" }, "vmax": { "maximum": 1, "minimum": 0, "type": "number" } }, "type": "object" }, "type": "array" };
  //create jsonace editor
  aceEdt = new JSONACEEditor(document.getElementById("aceedit"), {
    mode: 'code',
    schema: ledschema,
    onChange: function () {
      let success = true;
      try {
        aceEdt.get();
      }
      catch (err) {
        success = false;
      }

      if (success) {
        $('#leds_custom_updsim').prop("disabled", false);
        $('#leds_custom_save').prop("disabled", false);
      }
      else {
        $('#leds_custom_updsim').prop("disabled", true);
        $('#leds_custom_save').prop("disabled", true);
      }

      if (window.readOnlyMode) {
        $('#leds_custom_save').prop('disabled', true);
      }
    }
  }, finalLedArray);

  //TODO: HACK! No callback for schema validation - Add it!
  setInterval(function () {
    if ($('#aceedit table').hasClass('jsoneditor-text-errors')) {
      $('#leds_custom_updsim').prop("disabled", true);
      $('#leds_custom_save').prop("disabled", true);
    }
  }, 1000);

  $('.jsoneditor-menu').toggle();

  // validate textfield and update preview
  $("#leds_custom_updsim").off().on("click", function () {
    nonBlacklistLedArray = aceEdt.get();
    finalLedArray = ledLayout.getBlackListLeds(nonBlacklistLedArray, ledBlacklist);

    console.log("content leds - leds_custom_updsim on click ");
    ledPreview.createLedPreview(finalLedArray);
  });

  // save led layout, the generated textfield configuration always represents the latest layout
  $("#btn_ma_save, #btn_cl_save, #btn_bl_save, #leds_custom_save").off().on("click", function () {
    const hardwareLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount").getValue();
    const layoutLedCount = aceEdt.get().length;

    if (hardwareLedCount < layoutLedCount) {
      // Not enough hardware LEDs for configured layout
      showInfoDialog('error', $.i18n("conf_leds_config_error"), $.i18n('conf_leds_error_hwled_lt_layout', hardwareLedCount, layoutLedCount));
    } else {
      saveLedConfig(false);
    }
  });

  // toggle right icon on "Advanced Settings" click
  $('#advanced_settings').on('click', function (e) {
    $('#advanced_settings_right_icon').toggleClass('fa-angle-down fa-angle-up');
  });



  // nav
  $('#leds_cfg_nav a[data-toggle="tab"]').off().on('shown.bs.tab', function (e) {
    const target = $(e.target).attr("href") // activated tab
    if (target == "#menu_gencfg") {
      onLedLayoutTab = true;
      $('#leds_custom_updsim').trigger('click');
    } else {
      onLedLayoutTab = false;
      window.dispatchEvent(new Event('resize')); // remove keystone correction lines
    }

    blacklist_editor.on('change', function () {
      // only update preview, if config is valid
      if (blacklist_editor.validate().length <= 0) {

        ledBlacklist = blacklist_editor.getEditor("root.ledBlacklist").getValue();
        finalLedArray = ledLayout.getBlackListLeds(nonBlacklistLedArray, ledBlacklist);

        console.log("content leds - blacklist_editor on change ");        
        ledPreview.createLedPreview(finalLedArray);
        aceEdt.set(finalLedArray);
      }

      // change save button state based on validation result
      blacklist_editor.validate().length || window.readOnlyMode ? $('#btn_bl_save').prop('disabled', true) : $('#btn_bl_save').prop('disabled', false);
    });

  });

  //**************************************************
  // Handle LED-Device Configuration
  //**************************************************

  // External properties properties, 2-dimensional arry of [ledType][key]
  let devicesProperties = {};

  addJsonEditorHostValidation();

  JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
    let errors = [];

    if (path === "root.specificOptions.segments.segmentList") {
      const overlapSegNames = validateWledSegmentConfig(value);
      if (overlapSegNames.length > 0) {
        errors.push({
          path: "root.specificOptions.segments",
          message: $.i18n('edt_dev_spec_segmentsOverlapValidation_error', overlapSegNames.length, overlapSegNames.join(', '))
        });
      }
    }
    return errors;
  });

  $("#leddevices").off().on("change", function () {
    const generalOptions = window.serverSchema.properties.device;

    const ledType = $(this).val();
    const specificOptions = window.serverSchema.properties.alldevices[ledType];

    conf_editor = createJsonEditor('editor_container_leddevice', {
      specificOptions: specificOptions,
      generalOptions: generalOptions,
    });

    let values_general = {};
    let values_specific = {};
    const isCurrentDevice = (window.serverConfig.device.type == ledType);

    for (const key in window.serverConfig.device) {
      if (key != "type" && key in generalOptions.properties) values_general[key] = window.serverConfig.device[key];
    };
    conf_editor.getEditor("root.generalOptions").setValue(values_general);

    if (isCurrentDevice) {
      const specificOptions_val = conf_editor.getEditor("root.specificOptions").getValue();
      for (const key in specificOptions_val) {
        values_specific[key] = (key in window.serverConfig.device) ? window.serverConfig.device[key] : specificOptions_val[key];
      };
      conf_editor.getEditor("root.specificOptions").setValue(values_specific);
    };

    $("#info_container_text").html(infoTextDefault);

    // change save button state based on validation result
    conf_editor.validate().length || window.readOnlyMode ? $('#btn_submit_controller').prop('disabled', true) : $('#btn_submit_controller').prop('disabled', false);

    // LED controller specific wizards
    createLedDeviceWizards(ledType);

    conf_editor.on('ready', function () {
      let hwLedCountDefault = 1;
      let colorOrderDefault = "rgb";
      let filter = {};

      $('#btn_layout_controller').hide();
      $('#btn_test_controller').hide();

      switch (ledType) {
        case "wled":
        case "cololight":
        case "nanoleaf":
          showAllDeviceInputOptions("hostList", false);
        case "apa102":
        case "apa104":
        case "ws2801":
        case "lpd6803":
        case "lpd8806":
        case "p9813":
        case "sk6812spi":
        case "sk6822spi":
        case "sk9822":
        case "ws2812spi":
        case "piblaster":
        case "ws281x":

        //Serial devices
        case "adalight":
        case "atmo":
        case "dmx":
        case "karate":
        case "sedu":
        case "tpm2":
          if (storedAccess === 'expert') {
            filter.discoverAll = true;
          }

          $('#btn_submit_controller').prop('disabled', true);

          discover_device(ledType, filter)
            .then(discoveryResult => {
              updateOutputSelectList(ledType, discoveryResult);
            })
            .then(discoveryResult => {
              if (ledType === "wled") {
                updateElementsWled(ledType);
              }
            })
            .catch(error => {
              showNotification('danger', "Device discovery for " + ledType + " failed with error:" + error);
            });
          break;

        case "philipshue": {
          disableAutoResolvedGeneralOptions();

          const lights = conf_editor.getEditor("root.specificOptions.lightIds").getValue();
          hwLedCountDefault = lights.length;
        }
          break;

        case "yeelight": {
          disableAutoResolvedGeneralOptions();

          const lights = conf_editor.getEditor("root.specificOptions.lights").getValue();
          hwLedCountDefault = lights.length;
        }
          break;

        case "atmoorb": {
          disableAutoResolvedGeneralOptions();

          const configruedOrbIds = conf_editor.getEditor("root.specificOptions.orbIds").getValue().trim();
          if (configruedOrbIds.length !== 0) {
            hwLedCountDefault = configruedOrbIds.split(",").map(Number).length;
          } else {
            hwLedCountDefault = 0;
          }
        }
          break;

        case "razer": {
          disableAutoResolvedGeneralOptions();
          colorOrderDefault = "bgr";

          const subType = conf_editor.getEditor("root.specificOptions.subType").getValue();
          const params = { subType };
          getProperties_device(ledType, subType, params);
        }
          break;

        default:
      }

      if (ledType !== window.serverConfig.device.type) {
        let hwLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount");
        if (hwLedCount) {
          hwLedCount.setValue(hwLedCountDefault);
        }
        let colorOrder = conf_editor.getEditor("root.generalOptions.colorOrder");
        if (colorOrder) {
          colorOrder.setValue(colorOrderDefault);
        }
      }
    });

    conf_editor.on('change', function () {
      // //Check, if device can be identified/tested and/or saved
      let canIdentify = false;
      let canSave = false;

      switch (ledType) {

        case "atmoorb":
        case "fadecandy":
        case "tinkerforge":
        case "tpm2net":
        case "udpe131":
        case "udpartnet":
        case "udpddp":
        case "udph801":
        case "udpraw": {
          const host = conf_editor.getEditor("root.specificOptions.host").getValue();
          if (host !== "") {
            canSave = true;
          }
        }
          break;

        case "adalight":
        case "atmo":
        case "karate":
        case "dmx":
        case "sedu":
        case "tpm2": {
          let currentDeviceType = window.serverConfig.device.type;
          if ($.inArray(currentDeviceType, devSerial) === -1) {
            canIdentify = true;
          } else {
            let output = conf_editor.getEditor("root.specificOptions.output").getValue();
            if (window.serverConfig.device.output !== output) {
              canIdentify = true;
            }
          }

          const rate = conf_editor.getEditor("root.specificOptions.rate").getValue();
          if (rate > 0) {
            canSave = true;
          }
        }
          break;

        case "philipshue": {
          const host = conf_editor.getEditor("root.specificOptions.host").getValue();
          const username = conf_editor.getEditor("root.specificOptions.username").getValue();
          if (host !== "" && username != "") {
            const useEntertainmentAPI = conf_editor.getEditor("root.specificOptions.useEntertainmentAPI").getValue();
            const clientkey = conf_editor.getEditor("root.specificOptions.clientkey").getValue();
            if (!useEntertainmentAPI || clientkey !== "") {
              canSave = true;
            }
          }
        }
          break;

        case "wled":
        case "cololight": {
          const hostList = conf_editor.getEditor("root.specificOptions.hostList").getValue();
          if (hostList !== "SELECT") {
            const host = conf_editor.getEditor("root.specificOptions.host").getValue();
            if (host !== "") {
              canIdentify = true;
              canSave = true;
            }
          }
        }
          break;

        case "nanoleaf": {
          const hostList = conf_editor.getEditor("root.specificOptions.hostList").getValue();
          if (hostList !== "SELECT") {
            const host = conf_editor.getEditor("root.specificOptions.host").getValue();
            const token = conf_editor.getEditor("root.specificOptions.token").getValue();
            if (host !== "" && token !== "") {
              canIdentify = true;
              canSave = true;
            }
          }
        }
          break;
        default:
          canSave = true;
      }

      if (!conf_editor.validate().length) {
        if (canIdentify) {
          $("#btn_test_controller").show();
          $('#btn_test_controller').prop('disabled', false);
        } else {
          $('#btn_test_controller').hide();
          $('#btn_test_controller').prop('disabled', true);
        }
      } else {
        canSave = false;
      }

      if (canSave) {
        if (!window.readOnlyMode) {
          $('#btn_submit_controller').prop('disabled', false);
        }
      }
      else {
        $('#btn_submit_controller').prop('disabled', true);
      }

      window.readOnlyMode ? $('#btn_cl_save').prop('disabled', true) : $('#btn_submit').prop('disabled', false);
      window.readOnlyMode ? $('#btn_ma_save').prop('disabled', true) : $('#btn_submit').prop('disabled', false);
      window.readOnlyMode ? $('#leds_custom_save').prop('disabled', true) : $('#btn_submit').prop('disabled', false);
    });

    conf_editor.watch('root.specificOptions.hostList', () => {
      const specOptPath = 'root.specificOptions.';

      //Disable General Options, as LED count will be resolved from device itself
      disableAutoResolvedGeneralOptions();

      const hostList = conf_editor.getEditor("root.specificOptions.hostList");
      if (hostList) {
        const val = hostList.getValue();
        const host = conf_editor.getEditor("root.specificOptions.host");
        let showOptions = true;

        switch (val) {
          case 'CUSTOM':
          case '':
            host.enable();
            //Populate existing host for current custom config
            if (ledType === window.serverConfig.device.type) {
              host.setValue(window.serverConfig.device.host);
            } else {
              host.setValue("");
            }
            break;
          case 'NONE':
            host.enable();
            //Trigger getProperties via host value
            conf_editor.notifyWatchers(specOptPath + "host");
            break;
          case 'SELECT':
            host.setValue("");
            host.disable();
            showOptions = false;
            break;
          default:
            host.disable();
            host.setValue(val);
            //Trigger getProperties via host value
            conf_editor.notifyWatchers(specOptPath + "host");
            break;
        }

        showAllDeviceInputOptions("hostList", showOptions);

        if (!host.isEnabled() && host.getValue().endsWith("._tcp.local")) {
          showInputOptionForItem(conf_editor, 'specificOptions', 'host', false);
        }
      }
    });

    conf_editor.watch('root.specificOptions.host', () => {
      const host = conf_editor.getEditor("root.specificOptions.host").getValue();

      if (host === "") {
        conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(1);
        switch (ledType) {

          case "nanoleaf":
            $('#btn_wiz_holder').hide();
            break;
          default:
        }
      }
      else {
        let params = {};
        switch (ledType) {

          case "cololight":
            params = { host: host };
            getProperties_device(ledType, host, params);
            break;

          case "nanoleaf": {
            $('#btn_wiz_holder').show();

            const token = conf_editor.getEditor("root.specificOptions.token").getValue();
            if (token === "") {
              return;
            }
            params = { host: host, token: token };
            getProperties_device(ledType, host, params);
          }
            break;

          case "wled":
            //Ensure that elements are defaulted for new host
            updateElementsWled(ledType, host);
            params = { host: host };
            getProperties_device(ledType, host, params);
            break;

          case "udpraw":
            getProperties_device(ledType, host, params);
            break;

          default:
        }
      }
    });

    conf_editor.watch('root.specificOptions.output', () => {
      const output = conf_editor.getEditor("root.specificOptions.output").getValue();
      if (output === "NONE" || output === "SELECT" || output === "") {

        $('#btn_submit_controller').prop('disabled', true);
        $('#btn_test_controller').prop('disabled', true);
        $('#btn_test_controller').hide();
        conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(1);
        showAllDeviceInputOptions("output", false);
      }
      else {
        showAllDeviceInputOptions("output", true);
        let params = {};
        switch (ledType) {
          case "atmo":
          case "karate":
            params = { serialPort: output };
            getProperties_device(ledType, output, params);
            break;
          case "adalight":
          case "dmx":
          case "sedu":
          case "tpm2":
          case "apa102":
          case "apa104":
          case "ws2801":
          case "lpd6803":
          case "lpd8806":
          case "p9813":
          case "sk6812spi":
          case "sk6822spi":
          case "sk9822":
          case "ws2812spi":
          case "piblaster":
          default:
        }

        if ($.inArray(ledType, devSerial) != -1) {
          const rateList = conf_editor.getEditor("root.specificOptions.rateList").getValue();
          let showRate = false;
          if (rateList == "CUSTOM") {
            showRate = true;
          }
          showInputOptionForItem(conf_editor, 'specificOptions', 'rate', showRate);
        }

        if (!conf_editor.validate().length) {
          if (!window.readOnlyMode) {
            $('#btn_submit_controller').prop('disabled', false);
          }
        }
      }
    });

    conf_editor.watch('root.specificOptions.subType', () => {
      const subType = conf_editor.getEditor("root.specificOptions.subType").getValue();
      let params = {};

      switch (ledType) {
        case "razer":
          params = { subType: subType };
          getProperties_device(ledType, subType, params);
          break;
        default:
      }
    });

    conf_editor.watch('root.specificOptions.streamProtocol', () => {
      const streamProtocol = conf_editor.getEditor("root.specificOptions.streamProtocol").getValue();

      switch (ledType) {
        case "adalight": {
          let rate;
          if (streamProtocol === window.serverConfig.device.streamProtocol) {
            rate = window.serverConfig.device.rate.toString();
          } else {
            // Set default rates per protocol type
            switch (streamProtocol) {
              case "2":
                rate = "2000000";
                break;
              case "0":
              case "1":
              default:
                rate = "115200";
            }
          }
          conf_editor.getEditor("root.specificOptions.rateList").setValue(rate);
        }
          break;
        case "wled": {
          const hardwareLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount").getValue();
          validateWledLedCount(hardwareLedCount);
        }
          break;
        default:
      }
    });

    conf_editor.watch('root.specificOptions.rateList', () => {
      const specOptPath = 'root.specificOptions.';
      const rateList = conf_editor.getEditor("root.specificOptions.rateList");
      let rate = conf_editor.getEditor("root.specificOptions.rate");

      if (rateList) {
        const val = rateList.getValue();
        switch (val) {
          case 'CUSTOM':
          case '':
            rate.enable();
            //Populate existing rate for current custom config
            if (ledType === window.serverConfig.device.type) {
              rate.setValue(window.serverConfig.device.rate);
            } else {
              rate.setValue("");
            }
            break;
          default:
            rate.disable();
            rate.setValue(val);
            //Trigger getProperties via rate value
            conf_editor.notifyWatchers(specOptPath + "rate");
            break;
        }
      }
      showInputOptionForItem(conf_editor, 'specificOptions', 'rate', rate.isEnabled());
    });

    conf_editor.watch('root.specificOptions.token', () => {

      const token = conf_editor.getEditor("root.specificOptions.token").getValue();

      if (token !== "") {
        let params = {};

        let host = "";
        switch (ledType) {
          case "nanoleaf":
            host = conf_editor.getEditor("root.specificOptions.host").getValue();
            if (host === "") {
              return
            }
            params = { host: host, token: token };
            break;
          default:
        }

        getProperties_device(ledType, host, params);
      }
    });

    //Yeelight
    conf_editor.watch('root.specificOptions.lights', () => {
      //Disable General Options, as LED count will be resolved from number of lights configured
      disableAutoResolvedGeneralOptions();

      let hwLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount")
      if (hwLedCount) {
        const lights = conf_editor.getEditor("root.specificOptions.lights").getValue();
        hwLedCount.setValue(lights.length);
      }
    });

    //Philips Hue
    conf_editor.watch('root.specificOptions.lightIds', () => {
      //Disable General Options, as LED count will be resolved from number of lights configured
      disableAutoResolvedGeneralOptions();

      let hwLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount")
      if (hwLedCount) {
        const lights = conf_editor.getEditor("root.specificOptions.lightIds").getValue();
        hwLedCount.setValue(lights.length);
      }
    });

    //Atmo Orb
    conf_editor.watch('root.specificOptions.orbIds', () => {
      //Disable General Options, as LED count will be resolved from number of lights configured
      disableAutoResolvedGeneralOptions();

      let hwLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount")
      if (hwLedCount) {
        let lights = 0;
        const configruedOrbIds = conf_editor.getEditor("root.specificOptions.orbIds").getValue().trim();
        if (configruedOrbIds.length !== 0) {
          lights = configruedOrbIds.split(",").map(Number);
        }
        hwLedCount.setValue(lights.length);
      }
    });

    //WLED
    conf_editor.watch('root.specificOptions.segments.segmentList', () => {

      //Update hidden streamSegmentId element
      const selectedSegment = conf_editor.getEditor("root.specificOptions.segments.segmentList").getValue();
      const streamSegmentId = parseInt(selectedSegment);
      conf_editor.getEditor("root.specificOptions.segments.streamSegmentId").setValue(streamSegmentId);

      if (devicesProperties[ledType]) {
        const host = conf_editor.getEditor("root.specificOptions.host").getValue();
        const ledDeviceProperties = devicesProperties[ledType][host];

        if (ledDeviceProperties) {
          let hardwareLedCount = 1;
          if (streamSegmentId > -1) {
            // Set hardware LED count to segment length
            if (ledDeviceProperties.state) {
              const segments = ledDeviceProperties.state.seg;
              const segmentConfig = segments.filter(seg => seg.id == streamSegmentId)[0];
              hardwareLedCount = segmentConfig.len;
            }
          } else if (ledDeviceProperties.info) {
            //"Use main segment only" is disabled, i.e. stream to all LEDs
            hardwareLedCount = ledDeviceProperties.info.leds.count;
          }
          conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(hardwareLedCount);
        }
      }
    });

    //Handle Hardware Led Count constraint list
    conf_editor.watch('root.generalOptions.hardwareLedCountList', () => {
      const hwLedCountSelected = conf_editor.getEditor("root.generalOptions.hardwareLedCountList").getValue();
      conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(Number(hwLedCountSelected));
    });

    //Handle Hardware Led update and constraints
    conf_editor.watch('root.generalOptions.hardwareLedCount', () => {
      const hardwareLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount").getValue();
      switch (ledType) {
        case "wled":
          validateWledLedCount(hardwareLedCount);
          break;
        default:
      }
    });
  });

  //philipshueentertainment backward fix
  if (window.serverConfig.device.type == "philipshueentertainment") window.serverConfig.device.type = "philipshue";

  // create led device selection
  const ledDevices = window.serverInfo.ledDevices.available;

  const optArr = [[]];
  optArr[1] = [];
  optArr[2] = [];
  optArr[3] = [];
  optArr[4] = [];
  optArr[5] = [];

  for (let idx = 0; idx < ledDevices.length; idx++) {
    if ($.inArray(ledDevices[idx], devRPiSPI) != -1)
      optArr[0].push(ledDevices[idx]);
    else if ($.inArray(ledDevices[idx], devRPiPWM) != -1)
      optArr[1].push(ledDevices[idx]);
    else if ($.inArray(ledDevices[idx], devRPiGPIO) != -1)
      optArr[2].push(ledDevices[idx]);
    else if ($.inArray(ledDevices[idx], devNET) != -1)
      optArr[3].push(ledDevices[idx]);
    else if ($.inArray(ledDevices[idx], devSerial) != -1)
      optArr[4].push(ledDevices[idx]);
    else if ($.inArray(ledDevices[idx], devHID) != -1)
      optArr[4].push(ledDevices[idx]);
    else
      optArr[5].push(ledDevices[idx]);
  }

  $("#leddevices").append(createSel(optArr[0], $.i18n('conf_leds_optgroup_RPiSPI')));
  $("#leddevices").append(createSel(optArr[1], $.i18n('conf_leds_optgroup_RPiPWM')));
  $("#leddevices").append(createSel(optArr[2], $.i18n('conf_leds_optgroup_RPiGPIO')));
  $("#leddevices").append(createSel(optArr[3], $.i18n('conf_leds_optgroup_network')));
  $("#leddevices").append(createSel(optArr[4], $.i18n('conf_leds_optgroup_usb')));

  if (storedAccess === 'expert' || window.serverConfig.device.type === "file") {
    $("#leddevices").append(createSel(optArr[5], $.i18n('conf_leds_optgroup_other')));
  }

  $("#leddevices").val(window.serverConfig.device.type);
  $("#leddevices").trigger("change");

  // Generate layout for LED-Device
  $("#btn_layout_controller").off().on("click", function () {
    const ledType = $("#leddevices").val();
    let isGenerated = false;

    switch (ledType) {
      case "nanoleaf": {
        const host = conf_editor.getEditor("root.specificOptions.host").getValue();
        const ledDeviceProperties = devicesProperties[ledType][host];
        if (ledDeviceProperties) {
          const panelOrderTopDown = conf_editor.getEditor("root.specificOptions.panelOrderTopDown").getValue() === "top2down";
          const panelOrderLeftRight = conf_editor.getEditor("root.specificOptions.panelOrderLeftRight").getValue() === "left2right";
          const ledArray = nanoleafGeneratelayout(ledDeviceProperties.panelLayout, panelOrderTopDown, panelOrderLeftRight);
          aceEdt.set(ledArray);
          isGenerated = true;
        }
      }
        break;
      default:
    }

    if (isGenerated) {
      showInfoDialog('success', "", $.i18n('conf_leds_layout_generation_success'));
    } else {
      showInfoDialog('error', "", $.i18n('conf_leds_layout_generation_error'));
    }
  });

  // Identify/ Test LED-Device
  $("#btn_test_controller").off().on("click", function () {
    const ledType = $("#leddevices").val();
    let params = {};

    switch (ledType) {
      case "cololight":
      case "wled": {
        const host = conf_editor.getEditor("root.specificOptions.host").getValue();
        params = { host: host };
      }
        break;

      case "nanoleaf": {
        const host = conf_editor.getEditor("root.specificOptions.host").getValue();
        const token = conf_editor.getEditor("root.specificOptions.token").getValue();
        params = { host: host, token: token };
      }
        break;

      case "adalight": {
        const currentLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount").getValue();
        params = Object.assign(conf_editor.getEditor("root.generalOptions").getValue(),
          conf_editor.getEditor("root.specificOptions").getValue(),
          { currentLedCount }
        );
      }
        break;
      default:
    }

    identify_device(ledType, params);
  });

  // Save LED device config
  $("#btn_submit_controller").off().on("click", function (event) {
    const hardwareLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount").getValue();
    const layoutLedCount = aceEdt.get().length;

    if (hardwareLedCount === layoutLedCount) {
      saveLedConfig(false);
    } else {
      if (hardwareLedCount > layoutLedCount) {
        // More Hardware LEDs than on layout
        $('#id_body').html('<i style="margin-bottom:20px" class="fa fa-warning modal-icon-warning">');
        $('#id_body').append('<h4 style="font-weight:bold;text-transform:uppercase;">' + $.i18n("conf_leds_config_warning") + '</h4>');
        $('#id_body').append($.i18n('conf_leds_error_hwled_gt_layout', hardwareLedCount, layoutLedCount, hardwareLedCount - layoutLedCount));
        $('#id_body').append('<hr>');
        $('#id_body').append($.i18n('conf_leds_note_layout_overwrite', hardwareLedCount));
        $('#id_footer').html('<button type="button" class="btn btn-secondary" id="btn_back" data-dismiss="modal"><i class="fa fa-fw fa-chevron-left"></i>' + $.i18n('general_btn_back') + '</button>');
        $('#id_footer').append('<button type="button" class="btn btn-danger" id="btn_overwrite" data-dismiss="modal"><i class="fa fa-fw fa-save"></i>' + $.i18n('general_btn_overwrite') + '</button>');
        $('#id_footer').append('<button type="button" class="btn btn-primary" id="btn_continue" data-dismiss="modal">' + $.i18n('general_btn_continue') + '<i style="margin-left:4px;"class="fa fa-fw fa-chevron-right"></i> </button>');
      }
      else {
        // Less Hardware LEDs than on layout
        $('#id_body').html('<i style="margin-bottom:20px" class="fa fa-warning modal-icon-error">');
        $('#id_body').append('<h4 style="font-weight:bold;text-transform:uppercase;">' + $.i18n("conf_leds_config_error") + '</h4>');
        $('#id_body').append($.i18n('conf_leds_error_hwled_lt_layout', hardwareLedCount, layoutLedCount));
        $('#id_body').append('<hr>');
        $('#id_body').append($.i18n('conf_leds_note_layout_overwrite', hardwareLedCount));
        $('#id_footer').html('<button type="button" class="btn btn-primary" id="btn_back" data-dismiss="modal"><i class="fa fa-fw fa-chevron-left"></i>' + $.i18n('general_btn_back') + '</button>');
        $('#id_footer').append('<button type="button" class="btn btn-danger" id="btn_overwrite" data-dismiss="modal"><i class="fa fa-fw fa-save"></i>' + $.i18n('general_btn_overwrite') + '</button>');
      }

      $("#modal_dialog").modal({
        backdrop: "static",
        keyboard: false,
        show: true
      });

      $('#btn_back').off().on('click', function () {
        //Continue with the configuration
      });

      $('#btn_continue').off().on('click', function () {
        saveLedConfig(false);
      });

      $('#btn_overwrite').off().on('click', function () {
        saveLedConfig(true);
      });
    }
  });

  removeOverlay();
});

function saveLedConfig(genDefLayout = false) {
  const ledType = $("#leddevices").val();
  let result = { device: {} };

  const general = conf_editor.getEditor("root.generalOptions").getValue();
  const specific = conf_editor.getEditor("root.specificOptions").getValue();
  for (let key in general) {
    result.device[key] = general[key];
  }

  for (let key in specific) {
    result.device[key] = specific[key];
  }
  result.device.type = ledType;

  let ledConfig = {};
  let leds = [];

  const hardwareLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount").getValue();
  result.device.hardwareLedCount = hardwareLedCount;

  // Special handling per LED-type
  switch (ledType) {
    case "cololight": {

      const host = conf_editor.getEditor("root.specificOptions.host").getValue();
      if (window.serverConfig.device.type !== ledType) {
        //smoothing off, if new device
        result.smoothing = { enable: false };
      }

      if (genDefLayout === true) {

        if (!jQuery.isEmptyObject(devicesProperties) && devicesProperties[ledType][host].modelType === "Strip") {
          ledConfig = {
            "classic": {
              "top": hardwareLedCount / 2,
              "bottom": 0,
              "left": hardwareLedCount / 4,
              "right": hardwareLedCount / 4,
              "position": hardwareLedCount / 4 * 3
            },
            "matrix": { "cabling": "snake", "ledshoriz": 1, "ledsvert": 1, "start": "top-left" }
          };
          leds = ledLayout.createClassicLedLayoutSimple(hardwareLedCount / 2, hardwareLedCount / 4, hardwareLedCount / 4, 0, hardwareLedCount / 4 * 3, false);
        }
        else {
          ledConfig = {
            "classic": {
              "top": hardwareLedCount,
              "bottom": 0,
              "left": 0,
              "right": 0
            },
            "matrix": { "cabling": "snake", "ledshoriz": 1, "ledsvert": 1, "start": "top-left" }
          };
          leds = ledLayout.createClassicLedLayoutSimple(hardwareLedCount, 0, 0, 0, 0, false);
        }
        result.ledConfig = ledConfig;
        result.leds = leds;
      }
    }
      break;

    case "nanoleaf":
    case "wled":
    case "yeelight":
      if (window.serverConfig.device.type !== ledType) {
        //smoothing off, if new device
        result.smoothing = { enable: false };
      }

    case "adalight":
    case "atmo":
    case "dmx":
    case "karate":
    case "sedu":
    case "tpm2":
    case "apa102":
    case "apa104":
    case "ws2801":
    case "lpd6803":
    case "lpd8806":
    case "p9813":
    case "sk6812spi":
    case "sk6822spi":
    case "sk9822":
    case "ws2812spi":
    case "piblaster":
    default:
      if (genDefLayout === true) {
        ledConfig = {
          "classic": {
            "top": hardwareLedCount,
            "bottom": 0,
            "left": 0,
            "right": 0
          },
          "matrix": { "cabling": "snake", "ledshoriz": 1, "ledsvert": 1, "start": "top-left" }
        }
          ;
        result.ledConfig = ledConfig;
        leds = ledLayout.createClassicLedLayoutSimple(hardwareLedCount, 0, 0, 0, 0, false);
        result.leds = leds;
      }
      break;
  }

  //Rewrite whole LED & Layout configuration, in case changes were done accross tabs and no default layout
  if (genDefLayout !== true) {
    result.ledConfig = getLedConfig();
    result.leds = JSON.parse(aceEdt.getText());
  }

  requestWriteConfig(result);
  location.reload();
}

// build dynamic enum for hosts or output paths
const updateOutputSelectList = function (ledType, discoveryInfo) {
  // Only update, if ledType is equal of selected controller type and discovery info exists
  if (ledType !== $("#leddevices").val() || !discoveryInfo.devices) {
    return;
  }

  let addSchemaElements = {
  };

  let key;
  const enumVals = [];
  const enumTitleVals = [];
  let enumDefaultVal = "";
  let addSelect = false;
  let addCustom = false;

  let ledTypeGroup;

  if ($.inArray(ledType, devNET) != -1) {
    ledTypeGroup = "devNET";
  } else if ($.inArray(ledType, devSerial) != -1) {
    ledTypeGroup = "devSerial";
  } else if ($.inArray(ledType, devRPiSPI) != -1) {
    ledTypeGroup = "devRPiSPI";
  } else if ($.inArray(ledType, devRPiGPIO) != -1) {
    ledTypeGroup = "devRPiGPIO";
  } else if ($.inArray(ledType, devRPiPWM) != -1) {
    ledTypeGroup = "devRPiPWM";
  }

  switch (ledTypeGroup) {
    case "devNET":
      key = "hostList";

      if (discoveryInfo.devices.length === 0) {
        enumVals.push("NONE");
        enumTitleVals.push($.i18n('edt_dev_spec_devices_discovered_none'));
      }
      else {
        let discoveryMethod = "ssdp";
        if (discoveryInfo.discoveryMethod) {
          discoveryMethod = discoveryInfo.discoveryMethod;
        }

        for (const device of discoveryInfo.devices) {
          let name;
          let host;

          if (discoveryMethod === "ssdp") {
            host = device.ip;
          }
          else {
            host = device.service;
          }

          switch (ledType) {
            case "nanoleaf":
              if (discoveryMethod === "ssdp") {
                name = device.other["nl-devicename"] + " (" + host + ")";
              }
              else {
                name = device.name;
              }
              break;
            default:
              if (discoveryMethod === "ssdp") {
                name = device.hostname + " (" + host + ")";
              }
              else {
                name = device.name;
              }
              break;
          }

          enumVals.push(host);
          enumTitleVals.push(name);
        }

        //Always allow to add custom configuration
        addCustom = true;
        // Select configured device
        const configuredDeviceType = window.serverConfig.device.type;
        const configuredHost = window.serverConfig.device.hostList;
        if (ledType === configuredDeviceType) {
          if ($.inArray(configuredHost, enumVals) != -1) {
            enumDefaultVal = configuredHost;
          } else if (configuredHost === "CUSTOM") {
            enumDefaultVal = "CUSTOM";
          } else {
            addSelect = true;
          }
        }
        else {
          addSelect = true;
        }
      }
      break;

    case "devSerial":
      key = "output";

      if (discoveryInfo.devices.length == 0) {
        enumVals.push("NONE");
        enumTitleVals.push($.i18n('edt_dev_spec_devices_discovered_none'));
        $('#btn_submit_controller').prop('disabled', true);
        showAllDeviceInputOptions(key, false);
      }
      else {
        switch (ledType) {
          case "adalight":
          case "atmo":
          case "dmx":
          case "karate":
          case "sedu":
          case "tpm2": {
            for (const device of discoveryInfo.devices) {
              if (device.udev) {
                enumVals.push(device.systemLocation);
              } else {
                enumVals.push(device.portName);
              }
              enumTitleVals.push(device.portName + " (" + device.vendorIdentifier + "|" + device.productIdentifier + ") - " + device.manufacturer);
            }

            // Select configured device
            const configuredDeviceType = window.serverConfig.device.type;
            const configuredOutput = window.serverConfig.device.output;
            if (ledType === configuredDeviceType) {
              if ($.inArray(configuredOutput, enumVals) != -1) {
                enumDefaultVal = configuredOutput;
              } else {
                enumVals.push(window.serverConfig.device.output);
                enumDefaultVal = configuredOutput;
              }
            }
            else {
              addSelect = true;
            }
          }
            break;
          default:
        }
      }
      break;
    case "devRPiSPI":
    case "devRPiGPIO":
      key = "output";

      if (discoveryInfo.devices.length == 0) {
        enumVals.push("NONE");
        enumTitleVals.push($.i18n('edt_dev_spec_devices_discovered_none'));
        $('#btn_submit_controller').prop('disabled', true);
        showAllDeviceInputOptions(key, false);
      }
      else {
        switch (ledType) {
          case "apa102":
          case "apa104":
          case "ws2801":
          case "lpd6803":
          case "lpd8806":
          case "p9813":
          case "sk6812spi":
          case "sk6822spi":
          case "sk9822":
          case "ws2812spi":
          case "piblaster": {
            for (const device of discoveryInfo.devices) {
              enumVals.push(device.systemLocation);
              enumTitleVals.push(device.deviceName + " (" + device.systemLocation + ")");
            }

            // Select configured device
            const configuredDeviceType = window.serverConfig.device.type;
            const configuredOutput = window.serverConfig.device.output;
            if (ledType === configuredDeviceType && $.inArray(configuredOutput, enumVals) != -1) {
              enumDefaultVal = configuredOutput;
            }
            else {
              addSelect = true;
            }
          }
            break;
          default:
        }
      }
      break;
    case "devRPiPWM":
      key = ledType;

      if (!discoveryInfo.isUserAdmin) {
        enumVals.push("NONE");
        enumTitleVals.push($.i18n('edt_dev_spec_devices_discovered_none'));
        $('#btn_submit_controller').prop('disabled', true);
        showAllDeviceInputOptions(key, false);

        $("#info_container_text").html($.i18n("conf_leds_info_ws281x"));
      }
      break;
    default:
  }

  if (enumVals.length > 0) {
    updateJsonEditorSelection(conf_editor, 'root.specificOptions', key, addSchemaElements, enumVals, enumTitleVals, enumDefaultVal, addSelect, addCustom);
  }
};

async function discover_device(ledType, params) {

  const result = await requestLedDeviceDiscovery(ledType, params);

  let discoveryResult = {};
  if (result) {
    if (result.error) {
      throw (result.error);
    }
    discoveryResult = result.info;
  }
  else {
    discoveryResult = {
      devices: [],
      ledDevicetype: ledType
    }
  }
  return discoveryResult;
}

async function getProperties_device(ledType, key, params) {
  const disabled = $('#btn_submit_controller').is(':disabled');
  // Take care that connfig cannot be saved during background processing
  $('#btn_submit_controller').prop('disabled', true);

  //Create ledType cache entry
  if (!devicesProperties[ledType]) {
    devicesProperties[ledType] = {};
  }

  // get device's properties, if properties not available in chache
  if (!devicesProperties[ledType][key]) {
    const res = await requestLedDeviceProperties(ledType, params);
    if (res && !res.error) {
      const ledDeviceProperties = res.info.properties;

      if (!jQuery.isEmptyObject(ledDeviceProperties)) {
        devicesProperties[ledType][key] = ledDeviceProperties;

        if (!window.readOnlyMode) {
          $('#btn_submit_controller').prop('disabled', disabled);
        }
      }
      else {
        showNotification('warning', $.i18n('conf_leds_error_get_properties_text'), $.i18n('conf_leds_error_get_properties_title'));
        $('#btn_submit_controller').prop('disabled', true);
        $('#btn_test_controller').prop('disabled', true);
      }
    }
  }

  updateElements(ledType, key);
}

async function identify_device(type, params) {
  const disabled = $('#btn_submit_controller').is(':disabled');
  // Take care that connfig cannot be saved and identification cannot be retriggerred during background processing
  $('#btn_submit_controller').prop('disabled', true);
  $('#btn_test_controller').prop('disabled', true);

  await requestLedDeviceIdentification(type, params);

  $('#btn_test_controller').prop('disabled', false);
  if (!window.readOnlyMode) {
    $('#btn_submit_controller').prop('disabled', disabled);
  }
}

function updateElements(ledType, key) {
  let canLayout = false;
  if (devicesProperties[ledType][key]) {
    const ledProperties = devicesProperties[ledType][key];
    let hardwareLedCount = 1;
    switch (ledType) {
      case "cololight":
        if (ledProperties) {
          hardwareLedCount = ledProperties.ledCount;
        }
        conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(hardwareLedCount);
        break;
      case "wled":
        updateElementsWled(ledType, key);
        break;

      case "nanoleaf":
        if (ledProperties) {
          hardwareLedCount = ledProperties.ledCount;
          canLayout = true;
        }
        conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(hardwareLedCount);
        break;

      case "udpraw":
        if (ledProperties && ledProperties.maxLedCount) {
          hardwareLedCount = conf_editor.getEditor("root.generalOptions.hardwareLedCount").getValue();
          const maxLedCount = ledProperties.maxLedCount;
          if (hardwareLedCount > maxLedCount) {
            showInfoDialog('warning', $.i18n("conf_leds_config_warning"), $.i18n('conf_leds_error_hwled_gt_maxled', hardwareLedCount, maxLedCount, maxLedCount));
            hardwareLedCount = maxLedCount;
          }
          updateJsonEditorRange(conf_editor, "root.generalOptions", "hardwareLedCount", 1, maxLedCount, hardwareLedCount);
        }
        break;

      case "atmo":
      case "karate":
        if (ledProperties && ledProperties.ledCount) {
          if (ledProperties.ledCount.length > 0) {
            const configuredLedCount = window.serverConfig.device.hardwareLedCount;
            showInputOptionForItem(conf_editor, 'generalOptions', "hardwareLedCount", false);
            updateJsonEditorSelection(conf_editor, 'root.generalOptions', "hardwareLedCountList", { "title": "edt_dev_general_hardwareLedCount_title" },
              ledProperties.ledCount.map(String), [], configuredLedCount);
          }
        }
        break;

      case "razer":
        if (ledProperties) {
          conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(ledProperties.maxLedCount);
          $("#ip_ma_ledshoriz").val(ledProperties.maxColumn);
          $("#ip_ma_ledsvert").val(ledProperties.maxRow);
          $("#ip_ma_cabling").val("parallel");
          $("#ip_ma_direction").val("horizontal");
          $("#ip_ma_start").val("top-left");
          createMatrixLeds();
        }
        break;

      default:
    }
  }

  if (!conf_editor.validate().length) {
    if (canLayout) {
      $("#btn_layout_controller").show();
      $('#btn_layout_controller').prop('disabled', false);
    } else {
      $('#btn_layout_controller').hide();
    }

    if (!window.readOnlyMode) {
      $('#btn_submit_controller').attr('disabled', false);
    }
  }
  else {
    $('#btn_layout_controller').prop('disabled', true);
    $('#btn_submit_controller').attr('disabled', true);
  }
}

function showAllDeviceInputOptions(showForKey, state) {
  showInputOptionsForKey(conf_editor, "generalOptions", showForKey, state);
  showInputOptionsForKey(conf_editor, "specificOptions", showForKey, state);
}

function disableAutoResolvedGeneralOptions() {
  conf_editor.getEditor("root.generalOptions.hardwareLedCount").disable();
  conf_editor.getEditor("root.generalOptions.colorOrder").disable();
}

function validateWledSegmentConfig(streamSegmentId) {
  const overlapSegNames = [];
  if (streamSegmentId > -1) {
    if (!jQuery.isEmptyObject(devicesProperties)) {
      const host = conf_editor.getEditor("root.specificOptions.host").getValue();
      const ledProperties = devicesProperties['wled'][host];
      if (ledProperties && ledProperties.state) {
        const segments = ledProperties.state.seg;
        const segmentConfig = segments.filter(seg => seg.id == streamSegmentId)[0];

        const overlappingSegments = segments.filter((seg) => {
          if (seg.id != streamSegmentId) {
            if ((segmentConfig.start >= seg.stop) || (segmentConfig.start < seg.start && segmentConfig.stop <= seg.start)) {
              return false;
            }
            return true;
          }
        });

        if (overlappingSegments.length > 0) {
          for (const segment of overlappingSegments) {
            if (segment.n) {
              overlapSegNames.push(segment.n);
            } else {
              overlapSegNames.push("Segment " + segment.id);
            }
          }
        }
      }
    }
  }
  return overlapSegNames;
}

function validateWledLedCount(hardwareLedCount) {

  if (!jQuery.isEmptyObject(devicesProperties)) {
    const host = conf_editor.getEditor("root.specificOptions.host").getValue();
    const ledDeviceProperties = devicesProperties["wled"][host];

    if (ledDeviceProperties) {

      const streamProtocol = conf_editor.getEditor("root.specificOptions.streamProtocol").getValue();
      if (streamProtocol === "RAW") {
        let maxLedCount = 490;
        if (ledDeviceProperties.maxLedCount) {
          //WLED not DDP ready
          maxLedCount = ledDeviceProperties.maxLedCount;
          if (hardwareLedCount > maxLedCount) {
            showInfoDialog('warning', $.i18n("conf_leds_config_warning"), $.i18n('conf_leds_error_hwled_gt_maxled', hardwareLedCount, maxLedCount, maxLedCount));
            hardwareLedCount = maxLedCount;
            conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(hardwareLedCount);
            conf_editor.getEditor("root.specificOptions.streamProtocol").setValue("RAW");
          }
        } else if (hardwareLedCount > maxLedCount) {  //WLED is DDP ready
          const newStreamingProtocol = "DDP";
          showInfoDialog('warning', $.i18n("conf_leds_config_warning"), $.i18n('conf_leds_error_hwled_gt_maxled_protocol', hardwareLedCount, maxLedCount, newStreamingProtocol));
          conf_editor.getEditor("root.specificOptions.streamProtocol").setValue(newStreamingProtocol);
        }
      }
    }
  }
}

function updateElementsWled(ledType, key) {

  // Get configured device's details
  const configuredDeviceType = window.serverConfig.device.type;
  const configuredHost = window.serverConfig.device.host;
  const host = conf_editor.getEditor("root.specificOptions.host").getValue();

  //New segment selection list values
  let enumSegSelectVals = [];
  let enumSegSelectTitleVals = [];
  let enumSegSelectDefaultVal = "";
  const defaultSegmentId = "-1";

  if (devicesProperties[ledType] && devicesProperties[ledType][key]) {
    const ledDeviceProperties = devicesProperties[ledType][key];

    if (!jQuery.isEmptyObject(ledDeviceProperties)) {

      if (ledDeviceProperties.info) {
        if (!ledDeviceProperties.info.hasOwnProperty("liveseg") || ledDeviceProperties.info.liveseg < 0) {
          // "Use main segment only" is disabled
          enumSegSelectVals.push(defaultSegmentId);
          enumSegSelectTitleVals.push($.i18n('edt_dev_spec_segments_disabled_title'));
          enumSegSelectDefaultVal = defaultSegmentId;

        } else if (ledDeviceProperties.state) {
          //Prepare new segment selection list
          const segments = ledDeviceProperties.state.seg;
          for (const segment of segments) {
            enumSegSelectVals.push(segment.id.toString());
            if (segment.n) {
              enumSegSelectTitleVals.push(segment.n);
            } else {
              enumSegSelectTitleVals.push("Segment " + segment.id);
            }
          }
          const currentSegmentId = conf_editor.getEditor("root.specificOptions.segments.streamSegmentId").getValue().toString();
          enumSegSelectDefaultVal = currentSegmentId;
        }

        // Check if currently configured segment is available at WLED
        const configuredDeviceType = window.serverConfig.device.type;
        const configuredHost = window.serverConfig.device.host;

        const host = conf_editor.getEditor("root.specificOptions.host").getValue();
        if (configuredDeviceType == ledType && configuredHost == host) {
          const configuredStreamSegmentId = window.serverConfig.device.segments.streamSegmentId.toString();
          const segmentIdFound = enumSegSelectVals.filter(segId => segId == configuredStreamSegmentId).length;
          if (!segmentIdFound) {
            showInfoDialog('warning', $.i18n("conf_leds_config_warning"), $.i18n('conf_leds_error_wled_segment_missing', configuredStreamSegmentId));
          }
        }
      }
    }
  } else {
    //If failed to get properties
    let hardwareLedCount;
    let segmentConfig = false;

    if (configuredDeviceType == ledType && configuredHost == host) {
      // Populate elements from existing configuration
      if (window.serverConfig.device.segments) {
        segmentConfig = true;
      }
      hardwareLedCount = window.serverConfig.device.hardwareLedCount;
    } else {
      // Populate elements with default values
      hardwareLedCount = 1;
    }

    if (segmentConfig && segmentConfig.streamSegmentId > defaultSegmentId) {
      const configuredstreamSegmentId = window.serverConfig.device.segments.streamSegmentId.toString();
      enumSegSelectVals = [configuredstreamSegmentId];
      enumSegSelectTitleVals = ["Segment " + configuredstreamSegmentId];
      enumSegSelectDefaultVal = configuredstreamSegmentId;
    } else {
      enumSegSelectVals.push(defaultSegmentId);
      enumSegSelectTitleVals.push($.i18n('edt_dev_spec_segments_disabled_title'));
      enumSegSelectDefaultVal = defaultSegmentId;
    }
    conf_editor.getEditor("root.generalOptions.hardwareLedCount").setValue(hardwareLedCount);
  }

  updateJsonEditorSelection(conf_editor, 'root.specificOptions.segments',
    'segmentList', {}, enumSegSelectVals, enumSegSelectTitleVals, enumSegSelectDefaultVal, false, false);

  //Show additional configuration options, if more than one segment is available
  let showAdditionalOptions = false;
  if (enumSegSelectVals.length > 1) {
    showAdditionalOptions = true;
  }
  showInputOptionForItem(conf_editor, "root.specificOptions.segments", "switchOffOtherSegments", showAdditionalOptions);
}
function sortByPanelCoordinates(arr, topToBottom, leftToRight) {
  arr.sort((a, b) => {
    //Nanoleaf corodinates start at bottom left, therefore reverse topToBottom
    if (!topToBottom) {
      if (a.y === b.y) {
        if (leftToRight) {
          return a.x - b.x;
        } else {
          return b.x - a.x;
        }
      } else {
        return a.y - b.y;
      }
    }
    else if (a.y === b.y) {
      if (leftToRight) {
        return a.x - b.x;
      } else {
        return b.x - a.x;
      }
    } else {
      return b.y - a.y;
    }
  });
}
function rotateCoordinates(x, y, radians) {
  const rotatedX = x * Math.cos(radians) - y * Math.sin(radians);
  const rotatedY = x * Math.sin(radians) + y * Math.cos(radians);

  return { x: rotatedX, y: rotatedY };
}

function nanoleafGeneratelayout(panelLayout, panelOrderTopDown, panelOrderLeftRight) {

  // Dictionary for Nanoleaf shape types
  const shapeTypes = {
    0: { name: "LightsTriangle", led: true, sideLengthX: 150, sideLengthY: 150 },
    1: { name: "LightsRythm", led: false, sideLengthX: 0, sideLengthY: 0 },
    2: { name: "Square", led: true, sideLengthX: 100, sideLengthY: 100 },
    3: { name: "SquareControllerMaster", led: true, sideLengthX: 100, sideLengthY: 100 },
    4: { name: "SquareControllerPassive", led: true, sideLengthX: 100, sideLengthY: 100 },
    5: { name: "PowerSupply", led: true, sideLengthX: 100, sideLengthY: 100 },
    7: { name: "ShapesHexagon", led: true, sideLengthX: 67, sideLengthY: 67 },
    8: { name: "ShapesTriangle", led: true, sideLengthX: 134, sideLengthY: 134 },
    9: { name: "ShapesMiniTriangle", led: true, sideLengthX: 67, sideLengthY: 67 },
    12: { name: "ShapesController", led: false, sideLengthX: 0, sideLengthY: 0 },
    14: { name: "ElementsHexagon", led: true, sideLengthX: 134, sideLengthY: 134 },
    15: { name: "ElementsHexagonCorner", led: true, sideLengthX: 33.5, sideLengthY: 58 },
    16: { name: "LinesConnector", led: false, sideLengthX: 11, sideLengthY: 11 },
    17: { name: "LightLines", led: true, sideLengthX: 154, sideLengthY: 154 },
    18: { name: "LightLinesSingleZone", led: true, sideLengthX: 77, sideLengthY: 77 },
    19: { name: "ControllerCap", led: false, sideLengthX: 11, sideLengthY: 11 },
    20: { name: "PowerConnector", led: false, sideLengthX: 11, sideLengthY: 11 },
    999: { name: "Unknown", led: true, sideLengthX: 100, sideLengthY: 100 }
  };

  const { globalOrientation, layout } = panelLayout;

  let degreesToRotate = 0;
  if (globalOrientation) {
    degreesToRotate = globalOrientation.value;
  }

  //Align rotation degree to 15 degree steps
  const degreeSteps = 15;
  let degreeRounded = ((Math.round(degreesToRotate / degreeSteps) * degreeSteps) + 360) % 360;

  //Nanoleaf orientation is counter-clockwise
  degreeRounded *= -1;

  // Convert degrees to radians
  const radians = (degreeRounded * Math.PI) / 180;

  //Reduce the capture area
  const areaSizeFactor = 0.5;

  const panelDataXY = [...layout.positionData];
  panelDataXY.forEach(panel => {

    if (shapeTypes[panel.shapeType] == undefined) {
      panel.shapeType = 999;
    }

    panel.shapeName = shapeTypes[panel.shapeType].name;
    panel.led = shapeTypes[panel.shapeType].led;
    panel.areaWidth = shapeTypes[panel.shapeType].sideLengthX * areaSizeFactor;
    panel.areaHeight = shapeTypes[panel.shapeType].sideLengthY * areaSizeFactor;

    if (radians !== 0) {
      const rotatedXY = rotateCoordinates(panel.x, panel.y, radians);
      panel.x = Math.round(rotatedXY.x);
      panel.y = Math.round(rotatedXY.y);
    }

    panel.maxX = panel.x + panel.areaWidth;
    panel.maxY = panel.y + panel.areaHeight;
  });

  let minX = panelDataXY[0].x;
  let maxX = panelDataXY[0].x;
  let minY = panelDataXY[0].y;
  let maxY = panelDataXY[0].y;
  panelDataXY.forEach(panel => {

    if (panel.maxX > maxX) {
      maxX = panel.maxX;
    }
    if (panel.x < minX) {
      minX = panel.x;
    }
    if (panel.maxY > maxY) {
      maxY = panel.maxY;
    }
    if (panel.y < minY) {
      minY = panel.y;
    }
  });

  const width = Math.abs(maxX - minX);
  const height = Math.abs(maxY - minY);
  const scaleX = 1 / width;
  const scaleY = 1 / height;

  let layoutObjects = [];
  let i = 0;

  sortByPanelCoordinates(panelDataXY, panelOrderTopDown, panelOrderLeftRight);
  panelDataXY.forEach(panel => {

    if (panel.led) {
      const layoutObject = {
        name: i + "-" + panel.panelId,
        hmin: Math.min(1, Math.max(0, (panel.x - minX) * scaleX)),
        hmax: Math.min(1, Math.max(0, (panel.x - minX + panel.areaWidth) * scaleX)),
        //Nanoleaf corodinates start at bottom left, therefore reverse vertical positioning
        vmax: (1 - Math.min(1, Math.max(0, (panel.y - minY) * scaleY))),
        vmin: (1 - Math.min(1, Math.max(0, (panel.y - minY + panel.areaHeight) * scaleY)))
      };
      layoutObjects.push(JSON.parse(JSON.stringify(layoutObject)));
      ++i;
    }
  });
  return layoutObjects;
}
