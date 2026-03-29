$(document).ready(function () {
  performTranslation();

  const BORDERDETECT_ENABLED = (jQuery.inArray("borderdetection", globalThis.serverInfo.services) !== -1);

  const editors = {}; // Store JSON editors in a structured way

  initializeUI();
  setupColorEditor();
  setupSmoothingEditor();
  setupBlockborderEditors();
  updateHyperionInstanceListing();

  removeOverlay();

  function initializeUI() {
    if (globalThis.showOptHelp) {
      createSection("color", "edt_conf_color_heading_title", globalThis.schema.color.properties, "fa-photo", "conf_colors_color_intro", "colorHelpPanelId");
      createSection("smoothing", "edt_conf_smooth_heading_title", globalThis.schema.smoothing.properties, "fa-photo", "conf_colors_smoothing_intro", "smoothingHelpPanelId");
      if (BORDERDETECT_ENABLED) {
        createSection("blackborder", "edt_conf_bb_heading_title", globalThis.schema.blackborderdetector.properties, "fa-photo", "conf_colors_blackborder_intro", "blackborderHelpPanelId");
      }
    }
    else {
      appendPanel("color", "edt_conf_color_heading_title", "fa-photo");
      appendPanel("smoothing", "edt_conf_smooth_heading_title", "fa-photo");
      if (BORDERDETECT_ENABLED) {
        appendPanel("blackborder", "edt_conf_bb_heading_title", "fa-photo");
      }
    }
  }

  function setupColorEditor() {
    createEditor(editors, 'color', 'color', '', {
      bindDefaultChange: true,
      bindSubmit: true
    });
  }

  function setupSmoothingEditor() {
    createEditor(editors, 'smoothing', 'smoothing', '', {
      bindDefaultChange: true,
      bindSubmit: true
    });

    editors["smoothing"].watch('root.smoothing.enable', () => {
      const smoothingEnable = editors["smoothing"].getEditor("root.smoothing.enable").getValue();
      if (smoothingEnable) {
        $('#smoothingHelpPanelId').show();
      } else {
        $('#smoothingHelpPanelId').hide();
      }
    });
  }

  function setupBlockborderEditors() {
    if (BORDERDETECT_ENABLED) {
      createEditor(editors, 'blackborder', 'blackborderdetector', '', {
        bindDefaultChange: true,
        bindSubmit: true
      });

      //Add wiki link on blackborder dection page
      const wikiElement = $(buildWL("user/advanced/Advanced.html#blackbar-detection", "edt_conf_bb_mode_title", true));
      wikiElement.attr('id', 'blackborderWikiLinkId');
      $('#editor_container_blackborder').append(wikiElement);

      editors["blackborder"].watch('root.blackborderdetector.enable', () => {
        const blackborderEnable = editors["blackborder"].getEditor("root.blackborderdetector.enable").getValue();
        if (blackborderEnable) {
          $('#blackborderHelpPanelId').show();
          $('#blackborderWikiLinkId').show();
        } else {
          $('#blackborderHelpPanelId').hide();
          $('#blackborderWikiLinkId').hide();
        }
      });
    }
  }

  });
