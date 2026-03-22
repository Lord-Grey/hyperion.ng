const DURATION_ENDLESS = -1;

let prevTag;

function removeOverlay() {
  $("#loading_overlay").removeClass("overlay");
}

function reload() {
  location.reload();
}

function storageComp() {
  return typeof (Storage) !== "undefined";
}

function getStorage(item) {
  if (storageComp()) {
    return localStorage.getItem(item);
  }
  return null;
}

function setStorage(item, value) {
  if (storageComp()) {
    localStorage.setItem(item, value);
  }
}

function removeStorage(item) {
  if (storageComp()) {
    localStorage.removeItem(item);
  }
}

function debugMessage(msg) {
  if (globalThis.debugMessagesActive) {
    console.log(msg);
  }
}

function validateDuration(d) {
  if (d === undefined || d <= 0) {
    return DURATION_ENDLESS;
  } else {
    return d * 1000;
  }
}

function getHashtag() {
  const lastHashtag = getStorage('lasthashtag');
  if (lastHashtag === null) {
    let tag = document.URL;
    const hashIndex = tag.indexOf("#");
    if (hashIndex === -1) {
      tag = ""; // No hashtag found
    } else {
      tag = tag.slice(hashIndex + 1);
    }

    if (tag === "" || tag === undefined || tag.startsWith("http")) {
      tag = "dashboard";
    }

    return tag;
  } else {
    return lastHashtag;
  }
}

function isInstanceRunning(instanceId) {
  return globalThis.serverInfo?.instance?.some(
    (instance) => instance.instance === Number(instanceId) && instance.running
  );
}

function isCurrentInstanceRunning() {
  return isInstanceRunning(globalThis.currentHyperionInstance);
}

function getFirstRunningInstance() {

  const runningInstance = globalThis.serverInfo?.instance?.find(
    (instance) => instance.running
  );

  return runningInstance ? runningInstance.instance : null; // Return instance number or null if none is running
}

function getFirstConfiguredInstance() {
  const configuredInstance = globalThis.serverInfo?.instance?.find(
    (instance) => instance.instance !== undefined
  );

  return configuredInstance ? configuredInstance.instance : null; // Return instance number or null if none exists
}
function getConfiguredInstances() {
  const instances = globalThis.serverInfo?.instance || [];
  const list = Array.isArray(instances) ? instances : Object.values(instances);
  return list
    .filter((inst) => inst.instance !== undefined)
    .map((inst) => inst.instance);
}

function doesInstanceExist(instanceId) {

  if (instanceId == null) {
    return false; // Return false if instanceId is null or undefined
  }

  return globalThis.serverInfo?.instance?.some(
    (instance) => instance.instance === Number(instanceId)
  ) || false; // Return false if serverInfo or instance is undefined
}

function getInstanceName(instanceId) {
  const instance = globalThis.serverInfo?.instance?.find(
    (instance) => instance.instance === Number(instanceId)
  );

  return instance?.friendly_name || "unknown";
}

function getCurrentInstanceName() {

  const instanceId = globalThis.currentHyperionInstance;
  return getInstanceName(instanceId);
}

function loadContent(event, forceRefresh) {

  let tag;

  if (event === undefined) {
    tag = getHashtag();
  } else {
    tag = event.currentTarget.hash;
    tag = tag.substr(tag.indexOf("#") + 1);
    setStorage('lasthashtag', tag);
  }

  // Only load content if the tag is different or forced
  if (forceRefresh || prevTag !== tag) {
    prevTag = tag;

    $("#page-content").off().empty(); // Off all events and clear the content

    $("#page-content").load("/content/" + tag + ".html", function (response, status, xhr) {
      if (status === "error") {
        tag = 'dashboard';
        console.log("Could not find page:", prevTag, ", Redirecting to:", tag);
        setStorage('lasthashtag', tag);
        $("#page-content").html('<h3>' + encode_utf8(tag) + '<br/>' + $.i18n('info_404') + '</h3>');
        removeOverlay();
      } else {
        updateUiOnInstance(globalThis.currentHyperionInstance);
      }
    });
  }
}

function updateHyperionInstanceListing() {

  const data = globalThis.serverInfo.instance;
  if (data) {
    const instances = Object.values(data);
    // Sort instances by friendly_name (case-insensitive)
    instances.sort((a, b) => a.friendly_name.toLowerCase().localeCompare(b.friendly_name.toLowerCase()));

    $('#hyp_inst_listing').html("");

    instances.forEach((instance, index) => {
      const isRunningMarker = isInstanceRunning(instance.instance) ? "component-on" : "";

      const html = `
        <li id="hyperioninstance_${instance.instance}">
          <a>
            <div>
              <i class="fa fa-circle fa-fw ${isRunningMarker}"></i>
              <span>${instance.friendly_name}</span>
            </div>
          </a>
        </li>
        ${index < instances.length - 1 ? '<li class="divider"></li>' : ''}
      `;

      $('#hyp_inst_listing').append(html);

      $(`#hyperioninstance_${instance.instance}`).off().on("click", (e) => {
        const inst = e.currentTarget.id.split("_")[1];
        instanceSwitch(inst);
      });
    });
  }
}

function initLanguageSelection() {
  const $select = $('#language-select');
  $select.empty(); // clear existing options

  for (let i = 0; i < availLang.length; i++) {
    $select.append('<option value="' + availLang[i] + '">' + availLangText[i] + '</option>');
  }

  let langLocale = storedLang;
  if (!langLocale) {
    langLocale = navigator.language?.substring(0, 2) || 'en';
  }

  let langIdx = availLang.indexOf(langLocale);
  if (langIdx === -1) {
    // Try fallback
    langLocale = $.i18n().options.fallbackLocale.substring(0, 2);
    langIdx = availLang.indexOf(langLocale);
  }

  if (langIdx === -1) {
    // Default to English
    langLocale = 'en';
  }

  // Update the language select dropdown
  // $select.val(langLocale); 
  // $select.selectpicker({
  //   container: 'body',
  //   width: 'fit',
  //   style: 'btn-transparent'
  // });
  // $select.selectpicker('refresh');
}

function updateUiOnInstance(inst) {

  globalThis.currentHyperionInstance = inst;
  if (inst === null) {
    //No instance defined, hide all instance related menue items
    $("#MenuItemLedInstances").closest("li").hide();
    $("#MenuItemRemoteControl, #MenuItemEffectsConfig, #NavMenuWizards, #btn_open_ledsim, #btn_streamer").hide();
  } else {
    globalThis.currentHyperionInstanceName = getInstanceName(inst);

    $("#active_instance_friendly_name").text(getInstanceName(inst));
    $('#btn_hypinstanceswitch').toggle(true);
    $('#active_instance_dropdown').prop('disabled', false);
    $('#active_instance_dropdown').css('cursor', 'pointer');
    $("#active_instance_dropdown").css("pointer-events", "auto");

    //Allow to configure an existing instance
    $("#MenuItemLedInstances").show().closest("li").show();

    // Show menue items according to instance's running state
    if (isInstanceRunning(globalThis.currentHyperionInstance)) {
      $("#MenuItemRemoteControl, #NavMenuWizards, #btn_open_ledsim").show();

      //Show effectsconfigurator menu entry, only if effectengine is available
      if (jQuery.inArray("effectengine", globalThis.serverInfo.services) !== -1) {
        $("#MenuItemEffectsConfig").show();
      }

      const isMediaStreamingSupported = getStorage('mediaStreamingSupported');
      if (isMediaStreamingSupported) {
        $('#btn_streamer').show();
      }

    } else {
      $("#MenuItemRemoteControl, #MenuItemEffectsConfig, #NavMenuWizards, #btn_open_ledsim, #btn_streamer").hide();
    }
  }
}

function instanceSwitch(inst) {
  const instanceID = Number(inst);
  requestInstanceSwitch(instanceID)
  globalThis.currentHyperionInstance = instanceID;
  globalThis.currentHyperionInstanceName = getInstanceName(instanceID);
  setStorage('lastSelectedInstance', instanceID)
}

function loadContentTo(containerId, fileName) {
  $(containerId).load("/content/" + fileName + ".html");
}

function toggleClass(obj, class1, class2) {
  if ($(obj).hasClass(class1)) {
    $(obj).removeClass(class1);
    $(obj).addClass(class2);
  }
  else {
    $(obj).removeClass(class2);
    $(obj).addClass(class1);
  }
}

function setClassByBool(obj, enable, class1, class2) {
  if (enable) {
    $(obj).removeClass(class1);
    $(obj).addClass(class2);
  }
  else {
    $(obj).removeClass(class2);
    $(obj).addClass(class1);
  }
}

function setupDialogContent(type, header, message) {
  const typeHandlers = {
    success: () => {
      $('#id_body').html('<i style="margin-bottom:20px" class="fa fa-check modal-icon-check">');
      if (header == "")
        $('#id_body').append('<h4 style="font-weight:bold;text-transform:uppercase;">' + $.i18n('infoDialog_general_success_title') + '</h4>');
      $('#id_footer').html('<button type="button" class="btn btn-success" data-bs-dismiss="modal">' + $.i18n('general_btn_ok') + '</button>');
    },
    warning: () => {
      $('#id_body').html('<i style="margin-bottom:20px" class="fa fa-warning modal-icon-warning">');
      if (header == "")
        $('#id_body').append('<h4 style="font-weight:bold;text-transform:uppercase;">' + $.i18n('infoDialog_general_warning_title') + '</h4>');
      $('#id_footer').html('<button type="button" class="btn btn-warning" data-bs-dismiss="modal">' + $.i18n('general_btn_ok') + '</button>');
    },
    error: () => {
      $('#id_body').html('<i style="margin-bottom:20px" class="fa fa-warning modal-icon-error"></i>');
      if (header == "") {
        $('#id_body').append('<h4 style="font-weight:bold;text-transform:uppercase;">' + $.i18n('infoDialog_general_error_title') + '</h4>');
      }
      $('#id_footer').html('<button type="button" class="btn btn-danger" data-bs-dismiss="modal">' + $.i18n('general_btn_ok') + '</button>');
    },
    select: () => {
      $('#id_body').html('<img style="margin-bottom:20px" id="id_logo" src="img/hyperion/logo_positiv.png" alt="Redefine ambient light!">');
      $('#id_footer').html('<button type="button" id="id_btn_saveset" class="btn btn-primary" data-bs-dismiss="modal"><i class="fa fa-fw fa-save"></i>' + $.i18n('general_btn_saveandreload') + '</button>');
      $('#id_footer').append('<button type="button" class="btn btn-danger" data-bs-dismiss="modal"><i class="fa fa-fw fa-close"></i>' + $.i18n('general_btn_cancel') + '</button>');
    },
    iswitch: () => {
      $('#id_body').html('<img style="margin-bottom:20px" id="id_logo" src="img/hyperion/logo_positiv.png" alt="Redefine ambient light!">');
      $('#id_footer').html('<button type="button" id="id_btn_saveset" class="btn btn-primary" data-bs-dismiss="modal"><i class="fa fa-fw fa-exchange"></i>' + $.i18n('general_btn_iswitch') + '</button>');
      $('#id_footer').append('<button type="button" class="btn btn-danger" data-bs-dismiss="modal"><i class="fa fa-fw fa-close"></i>' + $.i18n('general_btn_cancel') + '</button>');
    },
    uilock: () => {
      $('#id_body').html('<img id="id_logo" src="img/hyperion/logo_positiv.png" alt="Redefine ambient light!">');
      $('#id_footer').html('<b>' + $.i18n('InfoDialog_nowrite_foottext') + '</b>');
    },
    import: () => {
      $('#id_body').html('<i style="margin-bottom:20px" class="fa fa-warning modal-icon-warning"></i>');
      $('#id_footer').html('<button type="button" id="id_btn_import" class="btn btn-warning"><i class="fa fa-fw fa-save"></i>' + $.i18n('general_btn_saverestart') + '</button>');
      $('#id_footer').append('<button type="button" class="btn btn-danger" data-bs-dismiss="modal"><i class="fa fa-fw fa-close"></i>' + $.i18n('general_btn_cancel') + '</button>');
    },
    delInst: () => {
      $('#id_body').html('<i style="margin-bottom:20px" class="fa fa-remove modal-icon-warning">');
      $('#id_footer').html('<button type="button" id="id_btn_yes" class="btn btn-warning" data-bs-dismiss="modal"><i class="fa fa-fw fa-trash"></i>' + $.i18n('general_btn_yes') + '</button>');
      $('#id_footer').append('<button type="button" class="btn btn-danger" data-bs-dismiss="modal"><i class="fa fa-fw fa-close"></i>' + $.i18n('general_btn_cancel') + '</button>');
    },
    renInst: () => {
      $('#id_body_rename').html('<i style="margin-bottom:20px" class="fa fa-pencil modal-icon-edit"><br>');
      $('#id_body_rename').append('<h4>' + header + '</h4>');
      $('#id_body_rename').append('<input class="form-control" id="renInst_name" type="text" value="' + message + '">');
      $('#id_footer_rename').html('<button type="button" id="id_btn_ok" class="btn btn-success" data-bs-dismiss="modal" disabled><i class="fa fa-fw fa-save"></i>' + $.i18n('general_btn_ok') + '</button>');
      $('#id_footer_rename').append('<button type="button" class="btn btn-danger" data-bs-dismiss="modal"><i class="fa fa-fw fa-close"></i>' + $.i18n('general_btn_cancel') + '</button>');
    },
    changePassword: () => {
      $('#id_body_rename').html('<i style="margin-bottom:20px" class="fa fa-key modal-icon-edit"><br>');
      $('#id_body_rename').append('<h4>' + header + '</h4><br>');
      $('#id_body_rename').append('<form id="changePasswordForm"; return false;">');
      $('#changePasswordForm').append(
        '<div class="row">' +
        '<div class="col-md-4"><p class="text-start">' + $.i18n('infoDialog_username_text') + '</p></div>' +
        '<div class="col-md-8"><input class="form-control" id="username" type="text" value="Hyperion" disabled autocomplete="username"></div>' +
        '</div><br>'
      );
      $('#changePasswordForm').append(
        '<div class="row">' +
        '<div class="col-md-4"><p class="text-start">' + $.i18n('infoDialog_password_current_text') + '</p></div>' +
        '<div class="col-md-8"><input class="form-control" id="current-password" placeholder="Old" type="password" autocomplete="current-password"></div>' +
        '</div><br>'
      );
      $('#changePasswordForm').append(
        '<div class="row">' +
        '<div class="col-md-4"><p class="text-start">' + $.i18n('infoDialog_password_new_text') + '</p></div>' +
        '<div class="col-md-8"><input class="form-control" id="new-password" placeholder="New" type="password" autocomplete="new-password"></div>' +
        '</div>'
      );
      $('#changePasswordForm').append(
        '<div class="alert alert-info"><span>' + $.i18n('infoDialog_password_minimum_length') + '</span></div>'
      );
      $('#changePasswordForm').append('</form>');
      $('#id_footer_rename').html(
        '<button type="submit" form="changePasswordForm" id="id_btn_ok" class="btn btn-success" data-bs-dismiss="modal" disabled>' +
        '<i class="fa fa-fw fa-save"></i>' + $.i18n('general_btn_ok') + '</button>'
      );
      $('#id_footer_rename').append(
        '<button type="button" class="btn btn-danger" data-bs-dismiss="modal">' +
        '<i class="fa fa-fw fa-close"></i>' + $.i18n('general_btn_cancel') + '</button>'
      );
    },
    checklist: () => {
      $('#id_body').html('<img style="margin-bottom:20px" id="id_logo" src="img/hyperion/logo_positiv.png" alt="Redefine ambient light!">');
      $('#id_body').append('<h4 style="font-weight:bold;text-transform:uppercase;">' + $.i18n('infoDialog_checklist_title') + '</h4>');
      $('#id_body').append(header);
      $('#id_footer').html('<button type="button" class="btn btn-primary" data-bs-dismiss="modal">' + $.i18n('general_btn_ok') + '</button>');
    },
    newToken: () => {
      $('#id_body').html('<img style="margin-bottom:20px" id="id_logo" src="img/hyperion/logo_positiv.png" alt="Redefine ambient light!">');
      $('#id_footer').html('<button type="button" class="btn btn-primary" data-bs-dismiss="modal">' + $.i18n('general_btn_ok') + '</button>');
    },
    grantToken: () => {
      $('#id_body').html('<img style="margin-bottom:20px" id="id_logo" src="img/hyperion/logo_positiv.png" alt="Redefine ambient light!">');
      $('#id_footer').html('<button type="button" class="btn btn-primary" data-bs-dismiss="modal" id="tok_grant_acc">' + $.i18n('general_btn_grantAccess') + '</button>');
      $('#id_footer').append('<button type="button" class="btn btn-danger" data-bs-dismiss="modal" id="tok_deny_acc">' + $.i18n('general_btn_denyAccess') + '</button>');
    }
  };

  if (typeHandlers[type]) {
    typeHandlers[type]();
  }
}

function appendDialogContent(type, header, message, details) {
  if (type != "renInst" && type != "changePassword") {
    $('#id_body').append('<h4 style="font-weight:bold;text-transform:uppercase;">' + header + '</h4>');
    $('#id_body').append(message);
  }

  if (type == "select" || type == "iswitch") {
    $('#id_body').append('<select id="id_select" class="form-select" style="margin-top:10px;width:auto;"></select>');
  }

  if (Array.isArray(details) && details.length > 0) {
    const detailsContent = $('<div></div>').css({
      'text-align': 'left',
      'white-space': 'pre-wrap',
      'word-wrap': 'break-word',
      'margin-top': '15px'
    });
    detailsContent.append('<hr>');
    details.forEach((desc, index) => {
      detailsContent.append(document.createTextNode(`${index + 1}. ${desc}\n`));
    });
    $('#id_body').append(detailsContent);
  }
}

function showInfoDialog(type, header = "", message = "", details = []) {
  setupDialogContent(type, header, message);
  appendDialogContent(type, header, message, details);

  if (getStorage("darkMode") == "on")
    $('#id_logo').attr("src", 'img/hyperion/logo_negativ.png');

  const modalSelector = type == "renInst" || type == "changePassword" ? "#modal_dialog_rename" : "#modal_dialog";
  const modalElement = document.querySelector(modalSelector);
  
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement, {
      backdrop: "static",
      keyboard: false
    });
    modal.show();
  }
}

function createHintH(type, text, container) {
  type = String(type);

  let tclass;
  if (type == "intro") {
    tclass = "introd";
  }

  // Prepend the formatted hint to the container
  $('#' + container).prepend(
    '<div class="' + tclass + '">' +
    '<h4 style="font-size:16px">' + text + '</h4>' +
    '<hr/>' +
    '</div>'
  );
}

function createHint(type, text, container, buttonid) {
  let fe = '';
  let tclass = '';
  let buttonHtml = '';

  // Set up icon HTML and hint class based on type
  switch (type) {
    case 'intro':
      tclass = 'intro-hint';
      break;
    case 'info':
      fe = `
        <div style="font-size:25px;text-align:center">
          <i class="fa fa-info"></i>
        </div>
        <div style="text-align:center;font-size:13px">Information</div>`;
      tclass = 'info-hint';
      break;
    case 'wizard':
      fe = `
        <div style="font-size:25px;text-align:center">
          <i class="fa fa-magic"></i>
        </div>
        <div style="text-align:center;font-size:13px">Information</div>`;
      tclass = 'wizard-hint';
      break;
    case 'warning':
      fe = `
        <div style="font-size:25px;text-align:center">
          <i class="fa fa-info"></i>
        </div>
        <div style="text-align:center;font-size:13px">Information</div>`;
      tclass = 'warning-hint';
      break;
    default:
      tclass = 'info-hint'; // Default to info-hint if no match
  }

  // Create button HTML if buttonid is provided
  if (buttonid) {
    buttonHtml = `
      <p>
        <button id="${buttonid}" class="btn btn-wizard" style="margin-top:15px;">
          ${text}
        </button>
      </p>`;
  }

  // Add hint to the container based on type
  switch (type) {
    case 'intro':
      $('#' + container).prepend(`
        <div class="alert intro-hint" style="margin-top:0px">
          <h4>${$.i18n("conf_helptable_expl")}</h4>
          ${text}
        </div>`);
      break;
    case 'wizard':
      $('#' + container).prepend(`
        <div class="alert wizard-hint" style="margin-top:0px">
          <h4>${$.i18n("wiz_wizavail")}</h4>
          ${$.i18n('wiz_guideyou', text)}
          ${buttonHtml}
        </div>`);
      break;
    default:
      createTable('', 'htb', container, true, tclass);
      $('#' + container + ' .htb').append(createTableRow([fe, text], false, true));
  }
}


function createEffHint(title, text) {
  return `
    <div class="alert alert-primary" style="margin-top:0px">
      <h4>${title}</h4>
      ${text}
    </div>
  `;
}

function valValue(id, value, min, max) {
  // Default max to 999999 if it's undefined or an empty string
  max = (max === undefined || max === "") ? 999999 : Number(max);

  const numericValue = Number(value);
  const numericMin = Number(min);

  if (numericValue > max) {
    $('#' + id).val(max);
    showInfoDialog("warning", "", $.i18n('edt_msg_error_maximum_incl', max));
    return max;
  }

  if (numericValue < numericMin) {
    $('#' + id).val(numericMin);
    showInfoDialog("warning", "", $.i18n('edt_msg_error_minimum_incl', numericMin));
    return numericMin;
  }

  return numericValue;
}

function readImg(input, callback) {
  const file = input.files?.[0];

  if (file) {
    const reader = new FileReader();
    reader.fileName = file.name;

    // Handle file load
    reader.onload = (e) => {
      callback(e.target.result, e.target.fileName);
    };

    reader.readAsDataURL(file);
  }
}


function isJsonString(str) {
  try {
    JSON.parse(str);
  }
  catch (e) {
    return e;
  }
  return "";
}

// Build a link with localization
function buildWL(link, linkt, cl) {
  const baseLink = "https://docs.hyperion-project.org/";
  const lang = (storedLang === "de" || navigator.locale === "de") ? "de/" : "";

  if (cl) {
    linkt = $.i18n(linkt);
    return `<div class="alert alert-primary"><h4>${linkt}</h4>${$.i18n('general_wiki_moreto', linkt)}: <a href="${baseLink}${lang}${link}" target="_blank">${linkt}</a></div>`;
  } else {
    return `: <a href="${baseLink}${lang}${link}" target="_blank">${linkt}</a>`;
  }
}

// Convert RGB values to Hex color
function rgbToHex(rgb) {
  if (rgb.length === 3) {
    return `#${("0" + Number.parseInt(rgb[0], 10).toString(16)).slice(-2)}${("0" + Number.parseInt(rgb[1], 10).toString(16)).slice(-2)}${("0" + Number.parseInt(rgb[2], 10).toString(16)).slice(-2)}`;
  } else {
    debugMessage('rgbToHex: Given rgb is no array or has wrong length');
  }
}

// Convert Hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}


/*
  Show a notification
  @param type     Valid types are "info","success","warning","danger"
  @param message  The message to show
  @param title     A title (optional)
  @param addhtml   Add custom html to the notification end
 */
function showNotification(type, message, title = "", addhtml = "") {
  if (title == "") {
    switch (type) {
      case "info":
        title = $.i18n('infoDialog_general_info_title');
        break;
      case "success":
        title = $.i18n('infoDialog_general_success_title');
        break;
      case "warning":
        title = $.i18n('infoDialog_general_warning_title');
        break;
      case "danger":
        title = $.i18n('infoDialog_general_error_title');
        break;
    }
  }

  $.notify({
    // options
    title: title,
    message: message
  }, {
    // settings
    type: type,
    animate: {
      enter: 'animate__animated animate__fadeInDown',
      exit: 'animate__animated animate__fadeOutUp'
    },
    placement: {
      align: 'center'
    },
    mouse_over: 'pause',
    template: '<div data-notify="container" class="bg-w col-md-6 alert alert-{0}" role="alert">' +
      '<button type="button" aria-hidden="true" class="btn-close" data-notify="dismiss"></button>' +
      '<span data-notify="icon"></span> ' +
      '<h4 data-notify="title">{1}</h4> ' +
      '<span data-notify="message">{2}</span>' +
      addhtml +
      '<div class="progress" data-notify="progressbar">' +
      '<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>' +
      '</div>' +
      '<a href="{3}" target="{4}" data-notify="url"></a>' +
      '</div>'
  });
}

function createCP(id, color, cb) {
  // Ensure color is valid and handle cases where it's an array or undefined
  if (Array.isArray(color)) {
    color = rgbToHex(color);  // Convert array to hex
  } else if (color === "undefined") {
    color = "#AA3399";  // Default color
  }

  // Only proceed if the color is a valid hex color
  if (color.startsWith("#")) {
    // Initialize colorpicker with the given color
    $(`#${id}`).colorpicker({
      format: 'rgb',
      customClass: 'colorpicker-2x',
      color: color,
      sliders: {
        saturation: {
          maxLeft: 200,
          maxTop: 200
        },
        hue: {
          maxTop: 200
        },
      }
    });

    // Handle color change events
    $(`#${id}`).colorpicker().on('changeColor', (e) => {
      const rgb = e.color.toRGB();
      const hex = e.color.toHex();
      cb(rgb, hex, e);  // Callback with updated color values
    });
  } else {
    debugMessage('createCP: Given color is not legit');
  }
}

// Function to create a table with thead and tbody elements
// @param {string} hid - Class name for thead
// @param {string} bid - Class name for tbody
// @param {string} cont - Container ID to append the table
// @param {boolean} bless - If true, the table is borderless
// @param {string} tclass - Additional class for the table (optional)
function createTable(hid, bid, cont, bless, tclass) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // Set the base class for the table
  table.className = "table";

  // If 'bless' is true, add the borderless class
  if (bless) {
    table.classList.add("table-borderless");
  }

  // If 'tclass' is provided, add it as a class
  if (tclass) {
    table.classList.add(tclass);
  }

  // Remove bottom margin for the table
  table.style.marginBottom = "0px";

  // Set class for thead and tbody if provided
  if (hid !== "") {
    thead.className = hid;
  }
  tbody.className = bid;

  // Append thead and tbody to the table
  if (hid !== "") {
    table.appendChild(thead);
  }
  table.appendChild(tbody);

  // Append the table to the specified container
  $(`#${cont}`).append(table);
}

// Creates a table row <tr>
// @param array list :innerHTML content for <td>/<th>
// @param bool head  :if null or false it's body
// @param bool align :if null or false no alignment
//
// @return : <tr> with <td> or <th> as child(s)
function createTableRow(list, head, align) {
  const row = document.createElement('tr');

  for (const element of list) {
    let el = head === true ? document.createElement('th') : document.createElement('td');
    if (align) {
      el.style.verticalAlign = "middle";
    }
    const purifyConfig = {
      ADD_TAGS: ['button'],
      ADD_ATTR: ['onclick']
    };
    el.innerHTML = DOMPurify.sanitize(element, purifyConfig);
    row.appendChild(el);
  }

  // Return the constructed table row
  return row;
}

function createRow(id) {
  let el = document.createElement('div');
  el.className = "row gy-2";
  el.setAttribute('id', id);
  return el;
}

function createOptPanel(phicon, phead, bodyid, footerid, css, panelId) {
  phead = '<i class="fa ' + phicon + ' fa-fw"></i>' + phead;

  let pfooter = document.createElement('button');
  pfooter.className = "btn btn-primary";
  pfooter.setAttribute("id", footerid);
  pfooter.innerHTML = '<i class="fa fa-fw fa-save"></i>' + $.i18n('general_button_savesettings');

  return createPanel(phead, "", pfooter, bodyid, css, panelId);
}

function compareValues(varA, varB) {
  if (varA > varB) {
    return 1;
  } else if (varA < varB) {
    return -1;
  }
  return 0;
}

function compareTwoValues(key1, key2, order = 'asc') {
  return function innerSort(a, b) {
    if (!a.hasOwnProperty(key1) || !b.hasOwnProperty(key1)) {
      // property key1 doesn't exist on either object
      return 0;
    }

    const varA1 = (typeof a[key1] === 'string')
      ? a[key1].toUpperCase() : a[key1];
    const varB1 = (typeof b[key1] === 'string')
      ? b[key1].toUpperCase() : b[key1];

    let comparison = compareValues(varA1, varB1);
    
    if (comparison === 0) {
      if (!a.hasOwnProperty(key2) || !b.hasOwnProperty(key2)) {
        // property key2 doesn't exist on either object
        return 0;
      }

      const varA2 = (typeof a[key2] === 'string')
        ? a[key2].toUpperCase() : a[key2];
      const varB2 = (typeof b[key1] === 'string')
        ? b[key2].toUpperCase() : b[key2];

      comparison = compareValues(varA2, varB2);
    }
    
    return (order === 'desc') ? (comparison * -1) : comparison;
  };
}

function sortProperties(list) {
  // Assign the key as a property for each item in the list
  for (const key in list) {
    if (Object.hasOwn(list, key)) {
      list[key].key = key;
    }
  }

  // Convert the object to an array
  const mappedList = $.map(list, function (value) {
    return [value];
  });

  // Sort the array based on the propertyOrder
  return mappedList.sort((a, b) => a.propertyOrder - b.propertyOrder);
}

function shouldSkipItem(item) {
  if ("options" in item && "hidden" in item.options && item.options.hidden) {
    return true;
  }

  if ("access" in item && ((item.access === "advanced" && storedAccess === "default") || (item.access === "expert" && storedAccess !== "expert"))) {
    return true;
  }

  return false;
}

function addItemRowToTable(item, tbody) {
  const text = item.title.replace('title', 'expl');
  tbody.appendChild(createTableRow([$.i18n(item.title), $.i18n(text)], false, false));
}

function addSubItemsToTable(item, tbody) {
  if (item.items?.properties) {
    const ilist = sortProperties(item.items.properties);
    for (const ikey in ilist) {
      if (shouldSkipItem(ilist[ikey])) {
        continue;
      }

      addItemRowToTable(ilist[ikey], tbody);
    }
  }
}

function createHelpTable(list, phead, panelId) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  
  list = sortProperties(list);

  // Update the heading with an icon and the translation
  phead = '<i class="fa fa-fw fa-info-circle"></i>' + phead + ' ' + $.i18n("conf_helptable_expl");

  table.className = 'table table-hover table-borderless';

  // Create the table header
  thead.appendChild(createTableRow([$.i18n('conf_helptable_option'), $.i18n('conf_helptable_expl')], true, false));

  // Iterate over the list and populate the table
  for (const key in list) {
    if (list[key].access === 'system') {
      continue;
    }

    if (shouldSkipItem(list[key])) {
      continue;
    }

    addItemRowToTable(list[key], tbody);
    addSubItemsToTable(list[key], tbody);
  }

  table.appendChild(thead);
  table.appendChild(tbody);

  return createPanel(phead, table, undefined, undefined, undefined, panelId, undefined);
}

function createPanel(head, body, footer, bodyid, css, panelId, type = 'card-default') {
  const cont = document.createElement('div');
  const card = document.createElement('div');
  const cardHeader = document.createElement('div');
  const cardBody = document.createElement('div');
  const cardFooter = document.createElement('div');

  cont.className = "col-lg-6";

  card.className = `card ${type}`;
  if (panelId) {
    card.setAttribute("id", panelId);
  }

  cardHeader.className = `card-header ${css || ''}`;
  cardBody.className = 'card-body';
  cardFooter.className = 'card-footer';

  cardHeader.innerHTML = head;

  if (bodyid) {
    cardFooter.style.textAlign = 'right';
    cardBody.setAttribute("id", bodyid);
  }

  if (body) {
    if (typeof body === 'string') {
      cardBody.innerHTML = body;
    } else {
      cardBody.appendChild(body);
    }
  }

  if (footer) {
    if (typeof footer === 'string') {
      cardFooter.innerHTML = footer;
    } else {
      cardFooter.appendChild(footer);
    }
  }

  card.appendChild(cardHeader);
  card.appendChild(cardBody);

  if (footer) {
    cardFooter.style.textAlign = "right";
    card.appendChild(cardFooter);
  }

  cont.appendChild(card);

  return cont;
}

function createSelGroup(group) {
  const el = document.createElement('optgroup');
  el.setAttribute('label', group);
  return el;
}

function createSelOpt(opt, title = opt) {
  const el = document.createElement('option');
  el.setAttribute('value', opt);
  el.textContent = title;
  return el;
}

function createSel(array, group, split) {
  if (array.length !== 0) {
    const el = createSelGroup(group);
    for (const element of array) {
      let opt;
      if (split) {
        const [value, label] = element.split(":");
        opt = createSelOpt(value, label);
      } else {
        opt = createSelOpt(element);
      }
      el.appendChild(opt);
    }
    return el;
  }
}

function performTranslation() {
  $('[data-i18n]').i18n();
}

function encode_utf8(s) {
  return btoa(new TextEncoder().encode(s).reduce((data, byte) => data + String.fromCodePoint(byte), ''));
}

function getReleases(callback) {
  $.ajax({
    url: globalThis.gitHubReleaseApiUrl,
    method: 'GET',
    error: function () {
      callback(false);
    },
    success: function (releases) {
      globalThis.gitHubVersionList = releases;

      // Initialize release categories
      const defaultRelease = { tag_name: '0.0.0' };
      let highestRelease = { ...defaultRelease };
      let highestAlphaRelease = { ...defaultRelease };
      let highestBetaRelease = { ...defaultRelease };
      let highestRcRelease = { ...defaultRelease };

      // Iterate through releases
      releases.forEach((release) => {

        if (release.tag_name === "nightly") return;
        if (release.draft) return;

        if (release.tag_name.includes('alpha') && semverLite.gt(release.tag_name, highestAlphaRelease.tag_name)) {
          highestAlphaRelease = release;
        } else if (release.tag_name.includes('beta') && semverLite.gt(release.tag_name, highestBetaRelease.tag_name)) {
          highestBetaRelease = release;
        } else if (release.tag_name.includes('rc') && semverLite.gt(release.tag_name, highestRcRelease.tag_name)) {
          highestRcRelease = release;
        } else if (semverLite.gt(release.tag_name, highestRelease.tag_name)) {
          highestRelease = release;
        }
      });

      // Update global variables with the latest releases
      globalThis.latestStableVersion = highestRelease;
      globalThis.latestBetaVersion = highestBetaRelease;
      globalThis.latestAlphaVersion = highestAlphaRelease;
      globalThis.latestRcVersion = highestRcRelease;

      // Determine the latest version based on the watched branch
      const { watchedVersionBranch } = globalThis.serverConfig.general;

      if (watchedVersionBranch === "Beta" && semverLite.gt(highestBetaRelease.tag_name, highestRelease.tag_name)) {
        globalThis.latestVersion = highestBetaRelease;
      } else if (watchedVersionBranch === "Alpha") {
        globalThis.latestVersion = semverLite.gt(highestAlphaRelease.tag_name, highestBetaRelease.tag_name)
          ? highestAlphaRelease
          : highestBetaRelease;
      } else {
        globalThis.latestVersion = highestRelease;
      }

      // Fallback handling if no stable or beta release exists
      if (globalThis.latestVersion.tag_name === '0.0.0') {
        if (highestBetaRelease.tag_name !== '0.0.0') {
          globalThis.latestVersion = highestBetaRelease;
        } else if (highestAlphaRelease.tag_name !== '0.0.0') {
          globalThis.latestVersion = highestAlphaRelease;
        }
      }

      // Execute the callback with success
      callback(true);
    }
  });
}

function handleDarkMode() {
  $("<link/>", {
    rel: "stylesheet",
    type: "text/css",
    href: "../css/darkMode.css"
  }).appendTo("head");

  setStorage("darkMode", "on");
  $('#btn_darkmode_icon').removeClass('fa fa-moon-o').addClass('mdi mdi-white-balance-sunny');
  $('#navbar_brand_logo').attr("src", 'img/hyperion/logo_negativ.png');
}

function encodeHTML(s) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
}

const loadedScripts = [];

function isScriptLoaded(src) {
  return loadedScripts.includes(src);
}

function loadScript(src, callback, ...params) {
  if (isScriptLoaded(src)) {
    debugMessage('Script ' + src + ' already loaded');
    if (callback && typeof callback === 'function') {
      callback(...params);
    }
    return;
  }

  const script = document.createElement('script');
  script.src = src;

  script.onload = function () {
    debugMessage('Script ' + src + ' loaded successfully');
    loadedScripts.push(src);

    if (callback && typeof callback === 'function') {
      callback(...params);
    }
  };

  document.head.appendChild(script);
}

// Function to reverse the transformed config into the legacy format
function reverseTransformConfig(serverConfig, instanceId) {
  const { global, instances } = serverConfig;

  // Initialize the resulting legacy config
  const legacyConfig = {};

  // Add global settings to the legacy config
  if (global?.settings) {
    Object.assign(legacyConfig, global.settings);
  }

  // Find the instance with the matching id and add its settings
  const instance = instances?.find(inst => inst.id === instanceId);
  if (instance?.settings) {
    Object.assign(legacyConfig, instance.settings);
  }

  return legacyConfig;
}

