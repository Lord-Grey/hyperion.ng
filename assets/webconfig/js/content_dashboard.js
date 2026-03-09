$(document).ready(function () {
  performTranslation();

  function updateInstanceComponents() {

    let instanceRunningStatus = isInstanceRunning(globalThis.currentHyperionInstance);
    let isInstanceEnabled = false;
    const components = globalThis.comps;

    if (instanceRunningStatus) {
      isInstanceEnabled = components.some(obj => obj.name === "ALL" && obj.enabled);
    }

    // Generate instance status button (Bootstrap 5 form-switch)
    let instBtn = `
  <div class="form-check form-switch" style="margin:3px">
    <input class="form-check-input" type="checkbox" role="switch" id="instanceButton"
      ${isInstanceEnabled ? "checked" : ""}
      ${instanceRunningStatus ? "" : "disabled"}>
  </div>
`;

    // Remove existing instance elements
    $("div[class*='currentInstance']").remove();

    // Start constructing the HTML for instances
    let instances_html = `
  <div class="col-md-6 col-xxl-4 currentInstance-">
    <div class="card card-default">
      <div class="card-header card-instance">
        <div class="dropdown">
          <a id="active_instance_dropdown"
             class="dropdown-toggle"
             data-bs-toggle="dropdown"
             href="#"
             style="text-decoration:none; display:flex; align-items:center;">
            <div id="btn_hypinstanceswitch" style="white-space:nowrap;">
              <span class="mdi mdi-lightbulb-group" style="margin-right:5px;"></span>
            </div>
            <div id="active_instance_friendly_name"></div>
          </a>
          <ul id="hyp_inst_listing"
              class="dropdown-menu"
              style="cursor:pointer;">
          </ul>
        </div>
      </div>
      <div class="card-body">
        <table class="table borderless">
          <thead>
            <tr>
              <th style="vertical-align:middle">
                <i class="mdi mdi-lightbulb-on fa-fw"></i>
                <span>${$.i18n('dashboard_componentbox_label_status')}</span>
              </th>
              <th style="width:1px; text-align:right">
                ${instBtn}
              </th>
              </tr>
          </thead>
      </table>              
`;

    instances_html += `
  <table class="table borderless">
    <thead>
      <tr>
        <th colspan="3">
          <i class="fa fa-info-circle fa-fw"></i>
          <span>${$.i18n('dashboard_infobox_label_title')}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td></td>
        <td>${$.i18n('conf_leds_contr_label_contrtype')}</td>
        <td style="text-align:right; padding-right:0">
          <span>${globalThis.serverConfig.device.type}</span>
          <a class="fa fa-cog fa-fw" 
             onclick="SwitchToMenuItem('MenuItemInstLeds')" 
             style="text-decoration:none; cursor:pointer">
          </a>
        </td>
      </tr>
    </tbody>
  </table>
`;

    // If the current instance is running, add components table
    if (instanceRunningStatus) {
      instances_html += `
    <table class="table first_cell_borderless">
      <thead>
        <tr>
          <th colspan="3">
            <i class="fa fa-eye fa-fw"></i>
            <span>${$.i18n('dashboard_componentbox_label_title')}</span>
          </th>
        </tr>
      </thead>
  `;

      // Initialize components table body
      let instance_components = "";

      for (const element of components) {
        const componentName = element.name;

        // Skip unwanted components
        if (componentName === "ALL" ||
          (componentName === "FORWARDER" && globalThis.currentHyperionInstance !== globalThis.serverConfig.forwarder.instance) ||
          (componentName === "GRABBER" && !globalThis.serverConfig.framegrabber.enable) ||
          (componentName === "V4L" && !globalThis.serverConfig.grabberV4L2.enable) ||
          (componentName === "AUDIO" && !globalThis.serverConfig.grabberAudio.enable)) {
          continue;
        }

        // Determine if the component is enabled
        const comp_enabled = element.enabled ? "checked" : "";
        const general_comp = `general_comp_${componentName}`;

        // Create the toggle switch for the component (Bootstrap 5 form-switch)
        const componentBtn = `
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch"
          id="${general_comp}" ${comp_enabled}>
      </div>
    `;

        // Add row for the component
        instance_components += `
      <tr>
        <td></td>
        <td>${$.i18n('general_comp_' + componentName)}</td>
        <td style="text-align:right">${componentBtn}</td>
      </tr>
    `;
      }

      // Close components table
      instances_html += `
      <tbody>${instance_components}</tbody>
    </table>
  `;
    }

    // Close the container divs
    instances_html += `
  </div>
</div>
</div>
`;

    // Prepend the instances HTML to the DOM
    $('.instances').prepend(instances_html);

    // Wire up instance toggle
    $('#instanceButton').on('change', function () {
      requestSetComponentState('ALL', $(this).prop('checked'));
    });

    if (instanceRunningStatus) {
      for (const element of components) {
        const componentName = element.name;
        if (componentName !== "ALL") {
          $("#general_comp_" + componentName).prop("disabled", !isInstanceEnabled);

          $("#general_comp_" + componentName).on('change', function () {
            const isChecked = $(this).prop('checked');
            requestSetComponentState(componentName, isChecked);
          });
        }
      }
    }

    updateHyperionInstanceListing();
    updateUiOnInstance(globalThis.currentHyperionInstance);
  }

  function updateGlobalComponents() {

    // add more info
    const screenGrabberAvailable = (globalThis.serverInfo.grabbers.screen.available.length !== 0);
    const videoGrabberAvailable = (globalThis.serverInfo.grabbers.video.available.length !== 0);
    const audioGrabberAvailable = (globalThis.serverInfo.grabbers.audio.available.length !== 0);

    if (screenGrabberAvailable || videoGrabberAvailable || audioGrabberAvailable) {

      if (screenGrabberAvailable) {
        const screenGrabber = globalThis.serverConfig.framegrabber.enable ? $.i18n('general_enabled') : $.i18n('general_disabled');
        $('#dash_screen_grabber').html(screenGrabber);
      } else {
        $("#dash_screen_grabber_row").hide();
      }

      if (videoGrabberAvailable) {
        const videoGrabber = globalThis.serverConfig.grabberV4L2.enable ? $.i18n('general_enabled') : $.i18n('general_disabled');
        $('#dash_video_grabber').html(videoGrabber);
      } else {
        $("#dash_video_grabber_row").hide();
      }

      if (audioGrabberAvailable) {
        const audioGrabber = globalThis.serverConfig.grabberAudio.enable ? $.i18n('general_enabled') : $.i18n('general_disabled');
        $('#dash_audio_grabber').html(audioGrabber);
      } else {
        $("#dash_audio_grabber_row").hide();
      }
    } else {
      $("#dash_capture_hw").hide();
    }

    if (jQuery.inArray("flatbuffer", globalThis.serverInfo.services) !== -1) {
      const fbPort = globalThis.serverConfig.flatbufServer.enable ? globalThis.serverConfig.flatbufServer.port : $.i18n('general_disabled');
      $('#dash_fbPort').html(fbPort);
    } else {
      $("#dash_ports_flat_row").hide();
    }

    if (jQuery.inArray("protobuffer", globalThis.serverInfo.services) !== -1) {
      const pbPort = globalThis.serverConfig.protoServer.enable ? globalThis.serverConfig.protoServer.port : $.i18n('general_disabled');
      $('#dash_pbPort').html(pbPort);
    } else {
      $("#dash_ports_proto_row").hide();
    }

    if (jQuery.inArray("boblight", globalThis.serverInfo.services) !== -1 && globalThis.serverConfig.boblightServer) {
      const boblightPort = globalThis.serverConfig.boblightServer.enable ? globalThis.serverConfig.boblightServer.port : $.i18n('general_disabled');
      $('#dash_boblightPort').html(boblightPort);
    } else {
      $("#dash_ports_boblight_row").hide();
    }

    const jsonPort = globalThis.serverConfig.jsonServer.port;
    $('#dash_jsonPort').html(jsonPort);
    const wsPorts = globalThis.serverConfig.webConfig.port + ' | ' + globalThis.serverConfig.webConfig.sslPort;
    $('#dash_wsPorts').html(wsPorts);


    $('#dash_currv').html(globalThis.currentVersion);
    $('#dash_watchedversionbranch').html(globalThis.serverConfig.general.watchedVersionBranch);

    getReleases(function (callback) {
      if (callback) {
        $('#dash_latev').html(globalThis.latestVersion.tag_name);

        if (semverLite.gt(globalThis.latestVersion.tag_name, globalThis.currentVersion)) {
          $('#versioninforesult').html(
            `<div class="alert alert-warning" role="alert" style="margin:0px">
           <a target="_blank" href="${globalThis.latestVersion.html_url}" class="alert-link">
             ${$.i18n('dashboard_infobox_message_updatewarning', globalThis.latestVersion.tag_name)}
           </a>
         </div>`
          );
        } else {
          $('#versioninforesult').html(
            `<div class="alert alert-info" role="alert" style="margin:0px">
           ${$.i18n('dashboard_infobox_message_updatesuccess')}
         </div>`
          );
        }
      }
    });
  }
  function updateDashboard() {

    //Only show an instance, if minimum one configured
    if (globalThis.serverInfo.instance.length !== 0) {
      updateInstanceComponents();
    }
    updateGlobalComponents();
  }

  updateDashboard();

  $(globalThis.hyperion).on("components-updated", updateDashboard);

  if (globalThis.showOptHelp) {
    createHintH("intro", $.i18n('dashboard_label_intro'), "dash_intro");
  }

  removeOverlay();
});
