$(document).ready(function () {
  performTranslation();

  const isGrabberAvailable = {};
  isGrabberAvailable["screen"] = (globalThis.serverInfo.grabbers.screen.available.length !== 0);
  isGrabberAvailable["video"] = (globalThis.serverInfo.grabbers.video.available.length !== 0);
  isGrabberAvailable["audio"] = (globalThis.serverInfo.grabbers.audio.available.length !== 0);

  const BOBLIGHT_ENABLED = (jQuery.inArray("boblight", globalThis.serverInfo.services) !== -1);

  const editors = {}; // Store JSON editors in a structured way

  initializeUI();
  setupEditors();
  updateHyperionInstanceListing();

  removeOverlay();

  function initializeUI() {
    if (globalThis.showOptHelp) {
      if (isGrabberAvailable["screen"] || isGrabberAvailable["video"] || isGrabberAvailable["audio"]) {
        createSection("instCapture", "edt_conf_instCapture_heading_title", globalThis.schema.instCapture.properties, "fa-camera", "conf_grabber_inst_grabber_config_info", "instCaptureHelpPanelId");
      }
      createSection("boblightserver", "edt_conf_bobls_heading_title", globalThis.schema.boblightServer.properties, "fa-sitemap", "conf_network_bobl_intro", "boblightServerHelpPanelId");
    }
    else {
      if (isGrabberAvailable["screen"] || isGrabberAvailable["video"] || isGrabberAvailable["audio"]) {
        appendPanel("instCapture", "edt_conf_instCapture_heading_title", "fa-camera");
      }
      appendPanel("boblightserver", "edt_conf_bobls_heading_title", "fa-sitemap");
    }
  }

  function setupEditors() {
    if (isGrabberAvailable["screen"] || isGrabberAvailable["video"] || isGrabberAvailable["audio"]) {
      setupInstCaptureEditor();
    }

    if (BOBLIGHT_ENABLED) {
      setupBoblightEditor();
    }
  }

  function initScreenGrabberState() {
    if (isGrabberAvailable["screen"]) {
      if (globalThis.serverConfig.framegrabber.enable) {
        editors["instCapture"].getEditor("root.instCapture.systemGrabberDevice").setValue(globalThis.serverConfig.framegrabber.available_devices);
        editors["instCapture"].getEditor("root.instCapture.systemGrabberDevice").disable();
      } else {
        editors["instCapture"].getEditor("root.instCapture.systemEnable").setValue(false);
        editors["instCapture"].getEditor("root.instCapture.systemEnable").disable();
      }
    }
  }

  function initVideoGrabberState() {
    if (isGrabberAvailable["video"]) {
      if (globalThis.serverConfig.grabberV4L2.enable) {
        editors["instCapture"].getEditor("root.instCapture.v4lGrabberDevice").setValue(globalThis.serverConfig.grabberV4L2.available_devices);
        editors["instCapture"].getEditor("root.instCapture.v4lGrabberDevice").disable();
      } else {
        editors["instCapture"].getEditor("root.instCapture.v4lEnable").setValue(false);
        editors["instCapture"].getEditor("root.instCapture.v4lEnable").disable();
      }
    }
  }

  function initAudioGrabberState() {
    if (isGrabberAvailable["audio"]) {
      if (globalThis.serverConfig.grabberAudio.enable) {
        editors["instCapture"].getEditor("root.instCapture.audioGrabberDevice").setValue(globalThis.serverConfig.grabberAudio.available_devices);
        editors["instCapture"].getEditor("root.instCapture.audioGrabberDevice").disable();
      } else {
        editors["instCapture"].getEditor("root.instCapture.audioEnable").setValue(false);
        editors["instCapture"].getEditor("root.instCapture.audioEnable").disable();
      }
    }
  }

  function setupInstCaptureEditor() {

    //Hide fields if grabber type is not available
    for (const grabberType of ["screen", "video", "audio"]) {
      for (const elementToHide of ["Enable", "GrabberDevice", "Priority"]) {

        // ToDO: Update schema and database with consistent naming (video instead of V4L and screen instead of system) to avoid this workaround
        let grabberTypeElement = grabberType;
        if (grabberType === "screen") {
          grabberTypeElement = "system";
        } else if (grabberType === "video") {
          grabberTypeElement = "v4l";
        }
        globalThis.schema.instCapture.properties[grabberTypeElement + elementToHide].options["hidden"] = !isGrabberAvailable[grabberType];
      }
    }

    for (const grabberType of ["screen", "video", "audio"]) {
      for (const elementToHide of ["InactiveTimeout"]) {
        globalThis.schema.instCapture.properties[grabberType + elementToHide].options["hidden"] = !isGrabberAvailable[grabberType];
      }
    }

    // Instance Capture
    createEditor(editors, 'instCapture', 'instCapture', '', {
      bindDefaultChange: false,
      bindSubmit: true
    });

    const grabber_config_info_html = '<div class="alert alert-info"><h4>' + $.i18n('dashboard_infobox_label_title') + '</h4 >'
      + '<span>' + $.i18n('conf_grabber_inst_grabber_config_info') + '</span>'
      + '<a class="fa fa-cog fa-fw" onclick="SwitchToMenuItem(\'MenuItemGrabber\')" style="text-decoration:none;cursor:pointer"></a>'
      + '</div>';
    $('#editor_container_instCapture').append(grabber_config_info_html);


    editors["instCapture"].on('ready', function () {
      initScreenGrabberState();
      initVideoGrabberState();
      initAudioGrabberState();
    });

    editors["instCapture"].watch('root.instCapture.systemEnable', () => {
      const screenEnable = editors["instCapture"].getEditor("root.instCapture.systemEnable").getValue();
      if (screenEnable) {
        editors["instCapture"].getEditor("root.instCapture.systemGrabberDevice").setValue(globalThis.serverConfig.framegrabber.available_devices);
        editors["instCapture"].getEditor("root.instCapture.systemGrabberDevice").disable();
      }
    });

    editors["instCapture"].watch('root.instCapture.videoEnable', () => {
      const videoEnable = editors["instCapture"].getEditor("root.instCapture.videoEnable").getValue();
      if (videoEnable) {
        editors["instCapture"].getEditor("root.instCapture.videoGrabberDevice").setValue(globalThis.serverConfig.grabberV4L2.available_devices);
        editors["instCapture"].getEditor("root.instCapture.videoGrabberDevice").disable();
      }
    });

    editors["instCapture"].watch('root.instCapture.audioEnable', () => {
      const audioEnable = editors["instCapture"].getEditor("root.instCapture.audioEnable").getValue();
      if (audioEnable) {
        editors["instCapture"].getEditor("root.instCapture.audioGrabberDevice").setValue(globalThis.serverConfig.grabberAudio.available_devices);
        editors["instCapture"].getEditor("root.instCapture.audioGrabberDevice").disable();
      }
    });
  }

  function setupBoblightEditor() {
    createEditor(editors, 'boblightserver', 'boblightServer', '', {
      bindDefaultChange: true,
      bindSubmit: true
    });

    editors["boblightserver"].watch('root.boblightServer.enable', () => {
      const boblightServerEnable = editors["boblightserver"].getEditor("root.boblightServer.enable").getValue();
      if (boblightServerEnable) {
        $('#boblightServerHelpPanelId').show();
      } else {
        $('#boblightServerHelpPanelId').hide();
      }

      if (boblightServerEnable) {
        //Make port instance specific, if port is still the default one (avoids overlap of used ports)
        let port = editors["boblightserver"].getEditor("root.boblightServer.port").getValue();
        if (port === editors["boblightserver"].schema.properties.boblightServer.properties.port.default) {
          port += Number.parseInt(globalThis.currentHyperionInstance);
        }
        editors["boblightserver"].getEditor("root.boblightServer.port").setValue(port);
      }
    });
  }
});
