$(document).ready(function () {
  // Perform translation on page load
  performTranslation();

  let importedConf;
  let confName;
  const editors = {};

  initializeUI();
  setupEditors();
  addHints();
  buildInstanceList();
  removeOverlay();

  function initializeUI() {
    // Initialize the configuration card
    $('#conf_cont').append(createOptPanel('fa-wrench', $.i18n("edt_conf_gen_heading_title"), 'editor_container_container', 'btn_submit_container', 'card-system'));

    // Show help if needed
    if (globalThis.showOptHelp) {
      $('#conf_cont').append(createHelpTable(globalThis.schema.general.properties, $.i18n("edt_conf_gen_heading_title")));
    } else {
      $('#conf_imp').appendTo('#conf_cont');
    }

    // Create instance table structure
    createTable('ithead', 'itbody', 'itable');
    if ($('#ithead').length === 0) {
      $('.ithead').html(createTableRow([$.i18n('conf_general_inst_namehead'), "", $.i18n('conf_general_inst_actionhead'), ""], true, true));
    }
  }

  function addHints() {
    // Create introduction hints if help is shown
    if (globalThis.showOptHelp) {
      createHint("intro", $.i18n('conf_general_intro'), "editor_container_container");
      createHint("intro", $.i18n('conf_general_inst_desc'), "inst_desc_cont");
      createHint("intro", $.i18n('conf_general_impexp_l1') + " " + $.i18n('conf_general_impexp_l2'), "imp_desc_cont");
    }
  }

  function setupEditors() {
    createEditor(editors, 'container', 'general', handleGeneralChange, {
      bindDefaultChange: false,
      bindSubmit: false,
      submitButtonId: 'btn_submit_container'
    });

    $('#btn_submit_container').off().on('click', function () {
      globalThis.showOptHelp = editors["container"].getEditor("root.general.showOptHelp").getValue();
      requestWriteConfig(editors["container"].getValue());
    });
  }

  function handleGeneralChange(editor) {
    editor.on('change', function () {
      onGeneralEditorChange(editor);
    });
  }

  function onGeneralEditorChange(editor) {
    if (!editor.ready) {
      return;
    }
    const isValid = !editor.validate().length && !globalThis.readOnlyMode;
    $('#btn_submit_container').prop('disabled', !isValid);
  }


  // Instance handling functions
  function handleInstanceRename(instance) {
    showInfoDialog('renInst', $.i18n('conf_general_inst_renreq_t'), getInstanceName(instance));

    // Rename button click handler
    $("#id_btn_ok").off().on('click', function () {
      requestInstanceRename(instance, encodeHTML($('#renInst_name').val()));
    });

    // Input handler for rename field
    $('#renInst_name').off().on('input', function (e) {
      const isValid = e.currentTarget.value.length >= 5 && e.currentTarget.value !== getInstanceName(instance);
      $('#id_btn_ok').prop('disabled', !isValid);
    });
  }

  function handleInstanceDelete(instance) {
    showInfoDialog('delInst', $.i18n('conf_general_inst_delreq_h'), $.i18n('conf_general_inst_delreq_t', getInstanceName(instance)));

    // Delete button click handler
    $("#id_btn_yes").off().on('click', function () {
      requestInstanceDelete(instance);
    });
  }

  // Build the instance list
  function buildInstanceList() {

    const $itbody = $('.itbody');
    if ($itbody.length === 0) {
      console.warn("Element '.itbody' does not exist. Aborting instance list build.");
      return;
    }

    const data = globalThis.serverInfo.instance;
    if (data) {
      const instances = Object.values(data);

      // Sort instances by friendly_name (case-insensitive)
      instances.sort((a, b) => a.friendly_name.toLowerCase().localeCompare(b.friendly_name.toLowerCase()));

      $itbody.empty(); // Explicitly clear the content before adding new rows

      // Collect rows in a document fragment for efficient DOM updates
      const $rows = $(document.createDocumentFragment());

      // Build all instance rows
      for (const instance of instances) {
        const instanceID = instance.instance;
        const renameBtn = document.createElement('button');
        renameBtn.type = 'button';
        renameBtn.className = 'btn btn-outline-primary';
        renameBtn.id = `instren_${instanceID}`;
        const renameIcon = document.createElement('i');
        renameIcon.className = 'mdi mdi-lead-pencil';
        renameBtn.appendChild(renameIcon);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn btn-outline-danger';
        delBtn.id = `instdel_${instanceID}`;
        const delIcon = document.createElement('i');
        delIcon.className = 'mdi mdi-delete-forever';
        delBtn.appendChild(delIcon);

        const startBtn = document.createElement('div');
        startBtn.className = 'form-check form-switch form-switch-md';
        const startInput = document.createElement('input');
        startInput.className = 'form-check-input';
        startInput.type = 'checkbox';
        startInput.setAttribute('role', 'switch');
        startInput.id = `inst_${instanceID}`;
        startInput.setAttribute('switch', '');
        startInput.checked = instance.running;
        startBtn.appendChild(startInput);

        const $row = createTableRow(
          [instance.friendly_name, startBtn, renameBtn, delBtn],
          false,
          true
        );

        $rows.append($row);
      }

      $itbody.append($rows);

      // Apply Bootstrap toggles and event handlers
      for (const instance of instances) {
        const instanceID = instance.instance;
        const readOnly = globalThis.readOnlyMode;

        $('#instren_' + instanceID).prop('disabled', readOnly).off().on('click', function () {
          handleInstanceRename(instanceID);
        });

        $('#instdel_' + instanceID).prop('disabled', readOnly).off().on('click', function () {
          handleInstanceDelete(instanceID);
        });

        const $toggle = $('#inst_' + instanceID);
        $toggle.prop('disabled', readOnly);
        $toggle.off('change').on('change', function () {
          const isChecked = $(this).prop('checked');
          requestInstanceStartStop(instanceID, isChecked);
        });
      }
    }
  }

  // Instance name input validation
  $('#instance_name').off().on('input', function (e) {
    const isValid = e.currentTarget.value.length >= 5 && !globalThis.readOnlyMode;
    $('#btn_create_inst').prop('disabled', !isValid);

    const charsNeeded = 5 - e.currentTarget.value.length;
    $('#instance_chars_needed').html(charsNeeded >= 1 && charsNeeded <= 4 ? `${charsNeeded} ${$.i18n('general_chars_needed')}` : "<br />");
  });

  // Instance creation button click handler
  $('#btn_create_inst').off().on('click', function (e) {
    requestInstanceCreate(encodeHTML($('#instance_name').val()));
    $('#instance_name').val("");
    $('#btn_create_inst').prop('disabled', true);
  });

  // Instance updated event listener
  $(hyperion).off("instance-updated").on("instance-updated", function (event) {
    buildInstanceList();
  });

  // Import handling functions
  function dis_imp_btn(state) {
    $('#btn_import_conf').prop('disabled', state || globalThis.readOnlyMode);
  }

  async function readFile(evt) {
    const f = evt.target.files[0];
    if (f) {
      try {
        let content = await f.text();
        content = content.replaceAll(/[^:]?\/\/.*/g, ''); // Remove comments

        // Check if the content is valid JSON
        const check = isJsonString(content);
        if (check.length === 0) {
          content = JSON.parse(content);
          if (content.global === undefined || content.instances === undefined) {
            showInfoDialog('error', "", $.i18n('infoDialog_import_version_error_text', f.name));
            dis_imp_btn(true);
          } else {
            dis_imp_btn(false);
            importedConf = content;
            confName = f.name;
          }
        } else {
          showInfoDialog('error', "", $.i18n('infoDialog_import_jsonerror_text', f.name, JSON.stringify(check.message)));
          dis_imp_btn(true);
        }
      } catch (error) {
        console.error("Error reading file:", error);
        showInfoDialog('error', "", $.i18n('infoDialog_import_comperror_text'));
        dis_imp_btn(true);
      }
    }
  }

  // Import button click handler
  $('#btn_import_conf').off().on('click', function () {
    showInfoDialog('import', $.i18n('infoDialog_import_confirm_title'), $.i18n('infoDialog_import_confirm_text', confName));

    $('#id_btn_import').off().on('click', function () {
      requestRestoreConfig(importedConf);
    });
  });

  // Import file selection change handler
  $('#select_import_conf').off().on('change', function (e) {
    if (globalThis.File && globalThis.FileReader && globalThis.FileList && globalThis.Blob) {
      readFile(e);
    } else {
      showInfoDialog('error', "", $.i18n('infoDialog_import_comperror_text'));
    }
  });

  // Export configuration
  $('#btn_export_conf').off().on('click', async () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const timestamp = `${d.getFullYear()}-${month}-${day}`;

    const configBackup = await requestServerConfig.async();
    if (configBackup.success) {
      download(JSON.stringify(configBackup.info, null, "\t"), `HyperionBackup-${timestamp}_v${globalThis.currentVersion}.json`, "application/json");
    }
  });

});

// Command for restoring config
$(globalThis.hyperion).on("cmd-config-restoreconfig", function () {
  setTimeout(initRestart, 100);
});

