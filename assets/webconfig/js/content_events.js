function findDuplicateEventsIndices(data) {
  const eventIndices = {};
  data.forEach((item, index) => {
    const event = item.event;
    if (eventIndices[event]) {
      eventIndices[event].push(index);
    } else {
      eventIndices[event] = [index];
    }
  });

  return Object.values(eventIndices).filter(indices => indices.length > 1);
}

$(document).ready(function () {
  performTranslation();

  const isGuiMode = globalThis.sysInfo.hyperion.isGuiMode;
  const CEC_ENABLED = (jQuery.inArray("cec", globalThis.serverInfo.services) !== -1);

  const editors = {}; // Store JSON editors in a structured way

  initializeUI();
  setupOsEventsEditor();
  setupSchedEventsEditor();
  setupCecEventsEditor();

  removeOverlay();

  function initializeUI() {
    if (globalThis.showOptHelp) {
      if (isGuiMode) {
        createSystemSection("os_events", "conf_os_events_heading_title", globalThis.schema.osEvents.properties, "fa-laptop", "conf_os_events_intro", "osEventsHelpPanelId");
      }
      createSystemSection("sched_events", "conf_sched_events_heading_title", globalThis.schema.schedEvents.properties, "fa-laptop", "conf_sched_events_intro", "schedEventsHelpPanelId");
      if (CEC_ENABLED) {
        createSystemSection("cec_events", "conf_cec_events_heading_title", globalThis.schema.cecEvents.properties, "fa-tv", "conf_cec_events_intro", "cecEventsHelpPanelId");
      }
    }
    else {
      if (isGuiMode) {
        appendSystemPanel("os_events", "conf_os_events_heading_title", "fa-laptop");
      }
      appendSystemPanel("sched_events", "conf_sched_events_heading_title", "fa-laptop");
      if (CEC_ENABLED) {
        appendSystemPanel("cec_events", "conf_cec_events_heading_title", "fa-tv");
      }
    }
  }

  JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
    let errors = [];
    if (schema.type === 'array' && Array.isArray(value)) {
      const duplicateEventIndices = findDuplicateEventsIndices(value);

      if (duplicateEventIndices.length > 0) {

        let recs;
        duplicateEventIndices.forEach(indices => {
          const displayIndices = indices.map(index => index + 1);
          recs = displayIndices.join(', ');
        });

        errors.push({
          path: path,
          message: $.i18n('edt_conf_action_record_validation_error', recs)
        });
      }
    }
    return errors;
  });

  function setupOsEventsEditor() {
    if (isGuiMode) {
      createEditor(editors, 'os_events', 'osEvents', '', {
        bindDefaultChange: true,
        bindSubmit: true,
        submitButtonId: 'btn_submit_os_events'
      });
    }
  }

  function setupSchedEventsEditor() {
    createEditor(editors, 'sched_events', 'schedEvents', '', {
      bindDefaultChange: true,
      bindSubmit: true,
      submitButtonId: 'btn_submit_sched_events'
    });

    editors["sched_events"].watch('root.schedEvents.enable', () => {
      const schedEventsEnable = editors["sched_events"].getEditor("root.schedEvents.enable").getValue();
      if (schedEventsEnable) {
        $('#schedEventsHelpPanelId').show();
      } else {
        $('#schedEventsHelpPanelId').hide();
      }
    });
  }

  function setupCecEventsEditor() {
    if (CEC_ENABLED) {
      createEditor(editors, 'cec_events', 'cecEvents', '', {
        bindDefaultChange: true,
        bindSubmit: true,
        submitButtonId: 'btn_submit_cec_events'
      });
    }

    editors["cec_events"].watch('root.cecEvents.enable', () => {
      const cecEventsEnable = editors["cec_events"].getEditor("root.cecEvents.enable").getValue();
      if (cecEventsEnable) {
        $('#cecEventsHelpPanelId').show();
      } else {
        $('#cecEventsHelpPanelId').hide();
      }
    });
  }

});

