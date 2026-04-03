$(document).ready(function () {

  const editors = {};
  let isScroll = true;
  const LOG_MAX_HEIGHT = 'clamp(180px, 55dvh, 70dvh)';

  performTranslation();

  globalThis.addEventListener('hashchange', function (event) {
    requestLoggingStop();
  });

  initializeUI();
  requestLoggingStart();
  setupEditors();
  setupLoggingHandler();
  setupSettingsHandler();

  removeOverlay();

  function initializeUI() {
    if (globalThis.showOptHelp) {
      createSystemSection("logger", "edt_conf_log_heading_title", globalThis.schema.logger.properties, 'fa-reorder', "conf_logging_label_intro", "loggingHelpPanelId");
    } else {
      appendSystemPanel("logger", "edt_conf_log_heading_title", 'fa-reorder');
    }
    createLogContainer();
  }

  function setupEditors() {
    createEditor(editors, 'logger', 'logger', '', {
      bindDefaultChange: true,
      bindSubmit: true
    });
  }

  function createLogContainer() {
    const header = createLogHeader();
    const body = createLogBodyElement(LOG_MAX_HEIGHT);
    const footer = createLogFooterElement(isScroll);

    $('#container_logoutput').append(createPanelWide(header, body, footer, '', 'card-system'));

    $('.fullscreen-btn').mousedown(function (e) {
      e.preventDefault();
    });

    $('.fullscreen-btn').click(function (e) {
      e.preventDefault();
      $(this).children('i')
        .toggleClass('fa-expand')
        .toggleClass('fa-compress');
      $('#conf_cont').toggle();
      const currentMaxHeight = $('#logmessages').css('max-height');
      const nextMaxHeight = currentMaxHeight === 'none' ? LOG_MAX_HEIGHT : 'none';
      $('#logmessages').css('max-height', nextMaxHeight);
    });

    $('#btn_scroll').on('change', e => {
      if (e.currentTarget.checked) {
        //Scroll to end of log
        isScroll = true;
        if ($('#logmessages').length > 0) {
          $('#logmessages')[0].scrollTop = $('#logmessages')[0].scrollHeight;
        }
      } else {
        isScroll = false;
      }
    });

    $('#btn_clipboard').off().on('click', function () {
      const text = infoSummary();
      navigator.clipboard.writeText(text).catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
    });
  }

  function scrollLogToBottom() {
    if (isScroll && $('#logmessages').length > 0) {
      $('#logmessages').stop().animate({
        scrollTop: $('#logmessages')[0].scrollHeight
      }, 800);
    }
  }

  function updateLogOutput(messages) {
    if (messages.length === 0) {
      return;
    }

    const logMessages = document.getElementById('logmessages');
    if (!logMessages) {
      return;
    }

    for (const message of messages) {
      const newLogLine = createLogLine(message);
      const logLineElement = document.createElement('span');
      const levelClass = getLogLevelTextClass(message.levelString);
      logLineElement.className = levelClass ? `logging-logline ${levelClass}` : 'logging-logline';
      logLineElement.textContent = newLogLine;
      logMessages.appendChild(logLineElement);
    }

    scrollLogToBottom();
  }

  function setupLoggingHandler() {
    if (!globalThis.loggingHandlerInstalled) {
      globalThis.loggingHandlerInstalled = true;

      $(globalThis.hyperion).on('cmd-logmsg-update', function (event) {

        const messages = (event.response.data.messages);
        updateLogOutput(messages);
      });
    }
  }

  function setupSettingsHandler() {
    $(globalThis.hyperion).on('cmd-settings-update', function (event) {

      const settingsUpdate = event.response.data;
      if (settingsUpdate.logger) {
        Object.getOwnPropertyNames(settingsUpdate).forEach(function (val) {
          globalThis.serverConfig[val] = settingsUpdate[val];
        });

        const currentLogLevel = globalThis.serverConfig.logger.level;
        editors['logger'].getEditor('root.logger.level').setValue(currentLogLevel);
        location.reload();
      }

    });
  }

});

function createLogHeader() {
  const header = document.createElement('div');

  const bookIcon = document.createElement('i');
  bookIcon.className = 'fa fa-book fa-fw';

  const title = document.createTextNode($.i18n('conf_logging_logoutput'));

  const fullscreenLink = document.createElement('a');
  fullscreenLink.href = '#';
  fullscreenLink.className = 'fullscreen-btn logging-fullscreen-btn float-end';
  fullscreenLink.setAttribute('role', 'button');
  fullscreenLink.title = 'Toggle fullscreen';

  const fullscreenIcon = document.createElement('i');
  fullscreenIcon.className = 'fa fa-expand fa-fw';

  fullscreenLink.appendChild(fullscreenIcon);

  header.appendChild(bookIcon);
  header.appendChild(title);
  header.appendChild(fullscreenLink);

  return header;
}

function createLogBodyElement(logMaxHeight) {
  const logMessages = document.createElement('div');
  logMessages.id = 'logmessages';
  logMessages.className = 'logging-logmessages';
  logMessages.style.maxHeight = logMaxHeight;
  return logMessages;
}

function createLogFooterElement(isScrollEnabled) {
  const footerContainer = document.createElement('div');
  footerContainer.className = 'logging-footer d-flex align-items-center justify-content-between w-100';

  const scrollControlContainer = document.createElement('div');
  scrollControlContainer.className = 'form-check form-switch form-switch-md d-inline-flex align-items-center gap-2 mb-0';

  const scrollInput = document.createElement('input');
  scrollInput.className = 'form-check-input';
  scrollInput.setAttribute('role', 'switch');
  scrollInput.id = 'btn_scroll';
  scrollInput.type = 'checkbox';
  scrollInput.setAttribute('switch', '');
  scrollInput.checked = isScrollEnabled;

  const scrollLabel = document.createElement('label');
  scrollLabel.className = 'form-check-label';
  scrollLabel.setAttribute('for', 'btn_scroll');
  scrollLabel.textContent = $.i18n('conf_logging_btn_autoscroll');

  scrollControlContainer.appendChild(scrollInput);
  scrollControlContainer.appendChild(scrollLabel);

  const clipboardButton = document.createElement('button');
  clipboardButton.className = 'btn btn-primary';
  clipboardButton.id = 'btn_clipboard';

  const clipboardIcon = document.createElement('i');
  clipboardIcon.className = 'fa fa-fw fa-clipboard';

  clipboardButton.appendChild(clipboardIcon);
  clipboardButton.appendChild(document.createTextNode(' ' + $.i18n('conf_logging_btn_clipboard')));

  footerContainer.appendChild(scrollControlContainer);
  footerContainer.appendChild(clipboardButton);

  return footerContainer;
}

function getDebugText(message) {
  if (message.levelString !== 'DEBUG') {
    return '';
  }
  return '(' + message.fileName + ':' + message.line + ':' + message.function + '()) ';
}

function getLogSubComponent(loggerSubName) {
  const instances = globalThis.serverInfo.instance;
  if (instances.length === 0 || !loggerSubName.startsWith('I')) {
    return '';
  }

  const instanceNum = loggerSubName.substring(1);
  if (instances[instanceNum]) {
    return instances[instanceNum].friendly_name;
  }
  return instanceNum;
}

function getLogLevelTextClass(levelString) {
  switch (levelString) {
    case 'ERROR':
      return 'text-danger-emphasis bg-danger-subtle';
    case 'WARNING':
    case 'WARN':
      return 'text-warning-emphasis bg-warning-subtle';
    case 'DEBUG':
      return 'text-primary-emphasis bg-primary-subtle';
    default:
      return '';
  }
}

function createLogLine(message) {
  const date = new Date(Number.parseInt(message.utime));
  const loggerName = message.loggerName;
  const subComponent = getLogSubComponent(message.loggerSubName);
  const level = message.levelString;
  const debugText = getDebugText(message);
  const msg = encodeHTML(message.message);

  return date.toISOString() + ' [' + loggerName + (subComponent ? '|' + subComponent : '') + '] (' + level + ') ' + debugText + msg;
}

function formatInstancesList(instances) {
  return instances.map(inst =>
    `${inst.instance ?? 'Unknown Instance'}: ${inst.friendly_name ?? 'Unnamed'}, Running: ${inst.running ?? 'Unknown'}`
  ).join('\n') + '\n';
}

function formatPriorities(priorities) {
  if (priorities.length === 0) {
    return 'The current priority list is empty or unavailable!\n';
  }

  return priorities.map(prio => {
    const priorityStr = prio.priority?.toString().padStart(3, '0') ?? 'N/A';
    return `${priorityStr}: ${prio.visible ? 'VISIBLE   -' : 'INVISIBLE -'} (${prio.componentId ?? 'Unknown Component'})`
      + (prio.owner ? ` (Owner: ${prio.owner})` : '');
  }).join('\n') + '\n';
}

function formatComponents(components) {
  if (components.length === 0) {
    return 'No components found or unavailable!\n';
  }

  return components.map(comp =>
    `${comp.name} - ${comp.enabled ?? 'Unknown'}`
  ).join('\n') + '\n';
}

function getLogMessagesText() {
  const logMessages = document.getElementById('logmessages')?.textContent.trim() ?? '';
  return logMessages.length > 0 ? logMessages : 'Log is empty!';
}

function infoSummary() {
  const serverConfig = globalThis.serverConfig ?? {};
  const currentServerInfo = globalThis.serverInfo ?? {};
  const currentInstance = globalThis.currentHyperionInstance;
  const currentInstanceName = globalThis.currentHyperionInstanceName ?? 'Unknown';
  const instances = currentServerInfo.instance ?? [];

  let info = '';

  info += `Hyperion System Summary Report (${serverConfig.general?.name ?? 'Unknown'})\n`;

  if (currentInstance !== null) {
    info += `Reported instance: [${currentInstance}] - ${currentInstanceName}\n`;
  }

  info += `\n< ----- System information -------------------- >\n`;
  info += `${getSystemInfo()}\n`;

  info += `\n< ----- Configured Instances ------------------ >\n`;

  if (instances.length > 0) {
    info += formatInstancesList(instances);

    info += `\n< ----- This instance's priorities ------------ >\n`;
    const priorities = currentServerInfo.priorities ?? [];
    info += formatPriorities(priorities);

    info += `Autoselect: ${currentServerInfo.priorities_autoselect ?? 'N/A'}\n`;

    info += `\n< ----- This instance components' status ------->\n`;
    const components = currentServerInfo.components ?? [];
    info += formatComponents(components);
  } else {
    info += `No instances are configured!\n`;
  }

  const config = transformConfig(serverConfig, currentInstance);
  info += `\n< ----- Global configuration items------------- >\n`;
  info += `${JSON.stringify(config.global, null, 2)}\n`;

  if (instances.length > 0) {
    info += `\n< ----- Selected Instance configuration items-- >\n`;
    info += `${JSON.stringify(config.instances, null, 2)}\n`;
  }

  info += `\n< ----- Current Log --------------------------- >\n`;
  info += getLogMessagesText();

  return info;
}