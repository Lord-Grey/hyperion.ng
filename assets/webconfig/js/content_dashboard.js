$(document).ready(function () {
    performTranslation();

    addIntro();    
    updateDashboard();

    removeOverlay();

    $(globalThis.hyperion).off("components-updated", updateDashboard).on("components-updated", updateDashboard);
});

function addIntro() {
    if (globalThis.showOptHelp) {
        createHintH("intro", $.i18n('dashboard_label_intro'), "dash_intro");
    }
}

function isServiceAvailable(serviceName) {
    return globalThis.serverInfo?.services?.includes(serviceName);
}

function getEnabledDisabledText(isEnabled) {
    return isEnabled ? $.i18n('general_enabled') : $.i18n('general_disabled');
}

function shouldSkipDashboardComponent(componentName) {
    return componentName === "ALL" ||
        (componentName === "FORWARDER" && globalThis.currentHyperionInstance !== globalThis.serverConfig.forwarder.instance) ||
        (componentName === "GRABBER" && !globalThis.serverConfig.framegrabber.enable) ||
        (componentName === "V4L" && !globalThis.serverConfig.grabberV4L2.enable) ||
        (componentName === "AUDIO" && !globalThis.serverConfig.grabberAudio.enable);
}

function createSwitchHtml(id, isChecked, isDisabled) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-check form-switch form-switch-md';

    const input = document.createElement('input');
    input.className = 'form-check-input';
    input.type = 'checkbox';
    input.role = 'switch';
    input.id = id;
    input.defaultChecked = isChecked;
    input.disabled = isDisabled;
    input.setAttribute('switch', '');

    wrapper.appendChild(input);
    return wrapper.outerHTML;
}

function createInstanceHeaderHtml(instanceButtonHtml) {
    return `
    <div class="card card-default">
      <div class="card-header card-instance">
        <div class="dropdown">
          <button class="btn dropdown-toggle bg-transparent border-0 p-0 text-start" id="active_instance_dropdown"
            type="button" data-bs-toggle="dropdown" aria-expanded="false"
            style="display:flex;align-items:center;color:inherit;box-shadow:none;">
            <span class="mdi mdi-lightbulb-group" style="margin-right:5px;"></span>
            <div id="active_instance_friendly_name"></div>
          </button>
          <ul class="dropdown-menu" id="hyp_inst_listing" style="cursor:pointer;"></ul>
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
              <th style="width:1px; text-align:right;">
                ${instanceButtonHtml}
              </th>
            </tr>
          </thead>
        </table>
`;
}

function createDeviceInfoHtml() {
    return `
  <table class="table borderless">
    <tbody>
      <tr>
        <th colspan="3">
          <i class="fa fa-info-circle fa-fw"></i>
          <span>${$.i18n('dashboard_infobox_label_title')}</span>
        </th>
      </tr>
    </tbody>
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
}

function createDashboardComponentRow(componentName, isEnabled) {
    const tr = document.createElement('tr');

    const tdEmpty = document.createElement('td');

    const tdLabel = document.createElement('td');
    tdLabel.style.verticalAlign = 'middle';
    tdLabel.textContent = $.i18n(`general_comp_${componentName}`);

    const tdSwitch = document.createElement('td');
    tdSwitch.style.width = '1px';
    tdSwitch.style.textAlign = 'right';
    tdSwitch.innerHTML = createSwitchHtml(`general_comp_${componentName}`, isEnabled, false);

    tr.appendChild(tdEmpty);
    tr.appendChild(tdLabel);
    tr.appendChild(tdSwitch);
    return tr.outerHTML;
}

function createDashboardComponentsTable(components) {
    const componentRows = components
        .filter((element) => !shouldSkipDashboardComponent(element.name))
        .map((element) => createDashboardComponentRow(element.name, element.enabled))
        .join('');

    return `
    <table class="table borderless">
      <thead>
        <tr>
          <th colspan="3">
            <i class="fa fa-eye fa-fw"></i>
            <span>${$.i18n('dashboard_componentbox_label_title')}</span>
          </th>
        </tr>
      </thead>
      <tbody>${componentRows}</tbody>
    </table>
  `;
}

function buildInstanceDashboardHtml(instanceRunningStatus, isInstanceEnabled, components) {
    const instanceButtonHtml = createSwitchHtml('instanceButton', isInstanceEnabled, !instanceRunningStatus);
    let html = createInstanceHeaderHtml(instanceButtonHtml);
    html += createDeviceInfoHtml();

    if (instanceRunningStatus) {
        html += createDashboardComponentsTable(components);
    }
    return html;
}

function bindInstanceComponentEvents(instanceRunningStatus, isInstanceEnabled, components) {
    $('#instanceButton').off('change').on('change', function () {
        requestSetComponentState('ALL', $(this).prop('checked'));
    });

    if (!instanceRunningStatus) {
        return;
    }

    components
        .filter((element) => !shouldSkipDashboardComponent(element.name))
        .forEach((element) => {
            const componentName = element.name;
            const selector = `#general_comp_${componentName}`;

            $(selector).prop("disabled", !isInstanceEnabled);
            $(selector).off('change').on('change', function () {
                requestSetComponentState(componentName, $(this).prop('checked'));
            });
        });
}

function updateInstanceComponents() {
    const instanceRunningStatus = isInstanceRunning(globalThis.currentHyperionInstance);
    const components = globalThis.comps;
    const isInstanceEnabled = instanceRunningStatus && components.some((obj) => obj.name === "ALL" && obj.enabled);

    const instancesHtml = buildInstanceDashboardHtml(instanceRunningStatus, isInstanceEnabled, components);
    $('#dash_instances').html(instancesHtml);

    bindInstanceComponentEvents(instanceRunningStatus, isInstanceEnabled, components);
    updateHyperionInstanceListing();
    updateUiOnInstance(globalThis.currentHyperionInstance);
}

function updateCaptureRow(available, enabled, valueSelector, rowSelector) {
    if (available) {
        $(valueSelector).html(getEnabledDisabledText(enabled));
    } else {
        $(rowSelector).hide();
    }
}

function updateCaptureHardwareSection() {
    const screenGrabberAvailable = globalThis.serverInfo.grabbers.screen.available.length !== 0;
    const videoGrabberAvailable = globalThis.serverInfo.grabbers.video.available.length !== 0;
    const audioGrabberAvailable = globalThis.serverInfo.grabbers.audio.available.length !== 0;

    if (!screenGrabberAvailable && !videoGrabberAvailable && !audioGrabberAvailable) {
        $("#dash_capture_hw").hide();
        return;
    }

    updateCaptureRow(screenGrabberAvailable, globalThis.serverConfig.framegrabber.enable, '#dash_screen_grabber', '#dash_screen_grabber_row');
    updateCaptureRow(videoGrabberAvailable, globalThis.serverConfig.grabberV4L2.enable, '#dash_video_grabber', '#dash_video_grabber_row');
    updateCaptureRow(audioGrabberAvailable, globalThis.serverConfig.grabberAudio.enable, '#dash_audio_grabber', '#dash_audio_grabber_row');
}

function updateServicePort(serviceName, isEnabled, portValue, valueSelector, rowSelector) {
    if (isServiceAvailable(serviceName)) {
        $(valueSelector).html(isEnabled ? portValue : $.i18n('general_disabled'));
    } else {
        $(rowSelector).hide();
    }
}

function updatePortsSection() {
    updateServicePort("flatbuffer", globalThis.serverConfig.flatbufServer.enable, globalThis.serverConfig.flatbufServer.port, '#dash_fbPort', '#dash_ports_flat_row');
    updateServicePort("protobuffer", globalThis.serverConfig.protoServer.enable, globalThis.serverConfig.protoServer.port, '#dash_pbPort', '#dash_ports_proto_row');

    if (isServiceAvailable("boblight") && globalThis.serverConfig.boblightServer) {
        const boblightPort = globalThis.serverConfig.boblightServer.enable ? globalThis.serverConfig.boblightServer.port : $.i18n('general_disabled');
        $('#dash_boblightPort').html(boblightPort);
    } else {
        $("#dash_ports_boblight_row").hide();
    }

    $('#dash_jsonPort').html(globalThis.serverConfig.jsonServer.port);
    $('#dash_wsPorts').html(`${globalThis.serverConfig.webConfig.port} | ${globalThis.serverConfig.webConfig.sslPort}`);
}

function updateVersionInfoMessage() {
    const container = document.getElementById('versioninforesult');
    if (!container) { return; }
    container.innerHTML = '';

    const alertDiv = document.createElement('div');
    alertDiv.role = 'alert';
    alertDiv.style.margin = '0px';

    if (semverLite.gt(globalThis.latestVersion.tag_name, globalThis.currentVersion)) {
        alertDiv.className = 'alert alert-warning';
        const link = document.createElement('a');
        link.target = '_blank';
        link.href = globalThis.latestVersion.html_url;
        link.className = 'alert-link';
        link.textContent = $.i18n('dashboard_infobox_message_updatewarning', globalThis.latestVersion.tag_name);
        alertDiv.appendChild(link);
    } else {
        alertDiv.className = 'alert alert-info';
        alertDiv.textContent = $.i18n('dashboard_infobox_message_updatesuccess');
    }

    container.appendChild(alertDiv);
}

function updateVersionSection() {
    $('#dash_currv').html(globalThis.currentVersion);
    $('#dash_watchedversionbranch').html(globalThis.serverConfig.general.watchedVersionBranch);

    getReleases(function (callback) {
        if (!callback) {
            return;
        }

        $('#dash_latev').html(globalThis.latestVersion.tag_name);
        updateVersionInfoMessage();
    });
}

function updateGlobalComponents() {
    updateCaptureHardwareSection();
    updatePortsSection();
    updateVersionSection();
}

function updateDashboard() {
    if (globalThis.serverInfo.instance.length !== 0) {
        updateInstanceComponents();
    }
    updateGlobalComponents();
}

