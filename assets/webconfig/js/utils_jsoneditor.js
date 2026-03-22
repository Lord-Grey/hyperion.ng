const getObjectProperty = (obj, path) => path.split(".").reduce((o, key) => o?.[key] === undefined ? undefined : o[key], obj);

const setObjectProperty = (object, path, value) => {
  const parts = path.split('.');
  const limit = parts.length - 1;
  for (let i = 0; i < limit; ++i) {
    const key = parts[i];
    if (key === "__proto__" || key === "constructor") continue;
    object = object[key] ?? (object[key] = {});
  }
  const key = parts[limit];
  object[key] = value;
};

function getLongPropertiesPath(path) {
  if (path) {
    // Remove 'root.' from the start of the path
    path = path.replace('root.', '');

    // Split the path into parts and append ".properties" to each part
    const parts = path.split('.');
    parts.forEach(function (part, index) {
      parts[index] += ".properties";
    });

    // Join the parts back together and append a final '.'
    path = parts.join('.') + '.';
  }
  return path;
}

function isAccessLevelCompliant(accessLevel) {
  if (!accessLevel) return true;

  switch (accessLevel) {
    case 'system':
      return false;
    case 'advanced':
      return storedAccess !== 'default';
    case 'expert':
      return storedAccess === 'expert';
    default:
      return true;
  }
}

function showInputOptions(path, elements, state) {

  if (!path.startsWith("root.")) {
    path = ["root", path].join('.');
  }

  for (const element of elements) {
    $('[data-schemapath="' + path + '.' + element + '"]').toggle(state);
  }
}

function showInputOptionForItem(editor, path, item, state) {
  // Get access level for the full path and item
  const accessLevel = getObjectProperty(editor.schema.properties, `${getLongPropertiesPath(path)}${item}.access`);

  // Enable the element only if access level is compliant
  if (!state || isAccessLevelCompliant(accessLevel)) {
    // If path is not provided, use the editor's path
    if (!path) {
      path = editor.path;
    }
    showInputOptions(path, [item], state);
  }
}

function showInputOptionsForKey(editor, item, showForKeys, state) {
  const elements = [];
  let keysToShow = [];

  // Determine keys to show based on input type
  if (Array.isArray(showForKeys)) {
    keysToShow = showForKeys;
  } else if (typeof showForKeys === 'string') {
    keysToShow.push(showForKeys);
  } else {
    return;
  }

  const itemProperties = editor.schema.properties[item].properties;

  for (const key in itemProperties) {
    // Skip the key if it is not in the list of keys to show
    if (!keysToShow.includes(key)) {
      const { access, options } = itemProperties[key];
      const hidden = options?.hidden || false;

      // Always disable all elements, but enable only if access level is compliant and not hidden
      if ((!state || isAccessLevelCompliant(access)) && !hidden) {
        elements.push(key);
      }
    }
  }

  showInputOptions(item, elements, state);
}

function isValidIPv4(value) {
  const parts = value.split('.')
  if (parts.length !== 4) {
    return false;
  }
  for (let part of parts) {
    if (Number.isNaN(part) || part < 0 || part > 255) {
      return false;
    }
  }
  return true;
}

function isValidIPv6(value) {
  return !!(value.match(
    '^(?:(?:(?:[a-fA-F0-9]{1,4}:){6}|(?=(?:[a-fA-F0-9]{0,4}:){2,6}(?:[0-9]{1,3}.){3}[0-9]{1,3}$)(([0-9a-fA-F]{1,4}:){1,5}|:)((:[0-9a-fA-F]{1,4}){1,5}:|:)|::(?:[a-fA-F0-9]{1,4}:){5})(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9]).){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])|(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|(?=(?:[a-fA-F0-9]{0,4}:){0,7}[a-fA-F0-9]{0,4}$)(([0-9a-fA-F]{1,4}:){1,7}|:)((:[0-9a-fA-F]{1,4}){1,7}|:)|(?:[a-fA-F0-9]{1,4}:){7}:|:(:[a-fA-F0-9]{1,4}){7})$'
  ));
}

function isValidHostname(value) {
  return !!(value.match(
    '^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])(.([a-zA-Z0-9]|[_a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]))*$'
  ));
}

function isValidServicename(value) {
  return !!(value.match(
    '^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9 -]{0,61}[a-zA-Z0-9])(.([a-zA-Z0-9]|[_a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]))*$'
  ));
}

function isValidHostnameOrIP4(value) {
  return (isValidHostname(value) || isValidIPv4(value));
}

function isValidHostnameOrIP(value) {
  return (isValidHostnameOrIP4(value) || isValidIPv6(value) || isValidServicename(value));
}

function validateUUIDSchema(schema, value, path) {
  if (!(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))) {
    return [{
      path,
      property: 'format',
      message: $.i18n('edt_msg_error_uuid')
    }]
  }
  return []
}

function createJsonEditor(container, schema, setconfig, useCard, arrayre = undefined) {
  $('#' + container).off();
  $('#' + container).html("");

  if (arrayre === undefined)
    arrayre = true;

  JSONEditor.defaults.translateProperty = function (key, variables) {
    let text;
    if (key !== null) {
      text = $.i18n(key, variables);
    }
    return text;
  };

  const startval = setconfig && globalThis.serverConfig
    ? Object.keys(schema).reduce((values, key) => {
      if (Object.hasOwn(globalThis.serverConfig, key)) {
        values[key] = globalThis.serverConfig[key];
      }
      return values;
    }, {})
    : undefined;

  let editor = new JSONEditor(document.getElementById(container),
    {
      theme: 'bootstrap5',
      iconlib: "fontawesome4",
      disable_collapse: true,
      form_name_root: 'root',
      disable_edit_json: true,
      disable_properties: true,
      disable_array_reorder: arrayre,
      no_additional_properties: true,
      disable_array_delete_all_rows: true,
      disable_array_delete_last_row: true,
      schema: {
        options: { titleHidden: true},
        properties: schema
      },
      startval
    });

  const applyCardLayout = () => {
    $('#' + container + ' .je-object__title, #' + container + ' .je-object__controls').remove();
    $('#' + container + ' .card').first().removeClass('card');
    $('#' + container + ' h4').first().remove();
  };

  if (useCard) {
    editor.on('ready', applyCardLayout);
  }

  return editor;
}

// Update the selection for JSON Editor
function updateJsonEditorSelection(rootEditor, path, options) {
  let { key, addElements = {}, newEnumVals = [], newTitleVals = [], newDefaultVal = undefined, addSelect = false, addCustom = false, addCustomAsFirst = false, customText = "edt_conf_enum_custom" } = options;

  // Coerce a primitive scalar to string; return undefined for null/undefined/object
  const toEnumString = (value) => {
    if (value == null) return undefined;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    return undefined;
  };

  // Callers are responsible for passing string arrays; ensure clean arrays
  newEnumVals = Array.isArray(newEnumVals) ? newEnumVals.filter(v => v != null) : [];
  newTitleVals = Array.isArray(newTitleVals) ? newTitleVals.filter(v => v != null) : [];

  // Fall back to enum values as titles if no title values were provided
  if (newTitleVals.length === 0 && newEnumVals.length > 0) {
    newTitleVals = [...newEnumVals];
  }

  // previousValue and newDefaultVal may come from JSONEditor internals or raw API data — normalize
  const previousValue = toEnumString(rootEditor.getEditor(path + "." + key)?.getValue());
  newDefaultVal = toEnumString(newDefaultVal);
  
  const editor = rootEditor.getEditor(path);
  const originalProperties = editor.schema.properties[key];
  const originalWatchFunctions = rootEditor.watchlist[path + "." + key];

  // Unwatch the existing path
  rootEditor.unwatch(path + "." + key);

  const newSchema = {
    [key]: {
      type: "string",
      enum: [],
      required: true,
      options: { enum_titles: [], infoText: "" },
      propertyOrder: 1,
      ...addElements, // Merge custom elements directly into schema
    }
  };

  // Retain original properties if available
  if (originalProperties) {
    const { title, options: originalOptions, propertyOrder } = originalProperties;
    newSchema[key].title = title || newSchema[key].title;
    newSchema[key].options.infoText = originalOptions?.infoText || newSchema[key].options.infoText;
    newSchema[key].propertyOrder = propertyOrder || newSchema[key].propertyOrder;
  }

  // Handle custom values
  if (addCustom) {
    if (newTitleVals.length === 0) newTitleVals = [...newEnumVals];

    const customPosition = addCustomAsFirst ? "unshift" : "push";
    newEnumVals[customPosition]("CUSTOM");
    newTitleVals[customPosition](customText);

    // Append custom infoText if exists
    if (newSchema[key].options.infoText) {
      newSchema[key].options.infoText += "_custom";
    }
  }

  // Handle Select options
  if (addSelect) {
    newEnumVals.unshift("SELECT");
    newTitleVals.unshift("edt_conf_enum_please_select");
    newDefaultVal = "SELECT";
  }

  // Set new values
  if (newEnumVals) newSchema[key].enum = newEnumVals;
  if (newTitleVals.length > 0 && newTitleVals.length < newSchema[key].enum.length) {
    newTitleVals = [...newTitleVals, ...newSchema[key].enum.slice(newTitleVals.length)];
  }
  if (newTitleVals.length > newSchema[key].enum.length) {
    newTitleVals = newTitleVals.slice(0, newSchema[key].enum.length);
  }
  if (newTitleVals) newSchema[key].options.enum_titles = newTitleVals;
  if (newDefaultVal) newSchema[key].default = newDefaultVal;

  // Update the editor schema
  editor.original_schema.properties[key] = originalProperties;
  editor.schema.properties[key] = newSchema[key];

  // Update schema for validation
  setObjectProperty(rootEditor.validator.schema.properties, getLongPropertiesPath(path) + key, newSchema[key]);

  // Re-apply changes to the editor
  editor.removeObjectProperty(key);
  delete editor.cached_editors[key];
  editor.addObjectProperty(key);

  const updatedEditor = rootEditor.getEditor(path + "." + key);
  const enumValues = Array.isArray(newSchema[key].enum) ? newSchema[key].enum : [];
  let resolvedValue;

  if (typeof previousValue === "string" && enumValues.includes(previousValue)) {
    resolvedValue = previousValue;
  } else if (typeof newDefaultVal === "string" && enumValues.includes(newDefaultVal)) {
    resolvedValue = newDefaultVal;
  } else if (addSelect && enumValues.includes("SELECT")) {
    resolvedValue = "SELECT";
  } else if (enumValues.length > 0) {
    resolvedValue = enumValues[0];
  }

  if (updatedEditor && resolvedValue !== undefined) {
    updatedEditor.setValue(resolvedValue);
  }

  // Reapply original watch functions
  if (originalWatchFunctions) {
    originalWatchFunctions.forEach(element => rootEditor.watch(path + "." + key, element));
  }

  // Notify watchers
  rootEditor.notifyWatchers(path + "." + key);
}


// Handle custom values logic for enum and title values
function handleCustomValues(newEnumVals, newTitleVals, customText, addCustomAsFirst) {
  if (newTitleVals.length === 0) {
    newTitleVals = [...newEnumVals];
  }

  if (!customText) {
    customText = "edt_conf_enum_custom";
  }

  if (addCustomAsFirst) {
    newEnumVals.unshift("CUSTOM");
    newTitleVals.unshift(customText);
  } else {
    newEnumVals.push("CUSTOM");
    newTitleVals.push(customText);
  }

  // Add infoText for custom options
  if (newSchema[key].options.infoText) {
    const customInfoText = newSchema[key].options.infoText + "_custom";
    newSchema[key].options.infoText = customInfoText;
  }
}

// Update the JSON Editor for multi-selection fields
function updateJsonEditorMultiSelection(rootEditor, path, options) {
  const {
    key,
    addElements = {},
    newEnumVals = [],
    newTitleVals = [],
    newDefaultVal = undefined
  } = options;

  const editor = rootEditor.getEditor(path);
  const originalProperties = editor.schema.properties[key];
  const originalWatchFunctions = rootEditor.watchlist[path + "." + key];

  // Unwatch the existing path
  rootEditor.unwatch(path + "." + key);

  const newSchema = {
    [key]: {
      type: "array",
      format: "select",
      items: {
        type: "string",
        enum: [],
        options: { enum_titles: [] }
      },
      options: { infoText: "" },
      default: [],
      propertyOrder: 1
    }
  };

  // Overwrite default properties with additional elements
  Object.assign(newSchema[key], addElements);

  // Retain original properties
  if (originalProperties) {
    if (originalProperties.title) newSchema[key].title = originalProperties.title;
    if (originalProperties?.options?.infoText) newSchema[key].options.infoText = originalProperties.options.infoText;
    if (originalProperties.propertyOrder) newSchema[key].propertyOrder = originalProperties.propertyOrder;
  }

  // Set new enum and title values
  if (newEnumVals) newSchema[key].items.enum = newEnumVals;
  if (newTitleVals) newSchema[key].items.options.enum_titles = newTitleVals;
  if (newDefaultVal) newSchema[key].default = newDefaultVal;

  // Update the editor schema
  editor.original_schema.properties[key] = originalProperties;
  editor.schema.properties[key] = newSchema[key];

  // Update schema for validation
  setObjectProperty(rootEditor.validator.schema.properties, getLongPropertiesPath(path) + key, newSchema[key]);

  // Re-apply changes to the editor
  editor.removeObjectProperty(key);
  delete editor.cached_editors[key];
  editor.addObjectProperty(key);

  // Reapply original watch functions
  if (originalWatchFunctions) {
    originalWatchFunctions.forEach((element) => {
      rootEditor.watch(path + "." + key, element);
    });
  }

  // Notify watchers
  rootEditor.notifyWatchers(path + "." + key);
}

// Update JSON Editor Range with min, max, and step values
function updateJsonEditorRange(rootEditor, path, key, rangeOptions) {
  const editor = rootEditor.getEditor(path);
  const currentValue = rootEditor.getEditor(path + "." + key).getValue();
  const originalProperties = editor.schema.properties[key];
  const { minimum, maximum, defaultValue, step, clear } = rangeOptions || {};

  // Initialize the new schema with original properties
  const newSchema = { [key]: { ...originalProperties } };

  // Clear range-related properties if needed
  if (clear) {
    delete newSchema[key].minimum;
    delete newSchema[key].maximum;
    delete newSchema[key].default;
    delete newSchema[key].step;
  }

  // Set the range values
  if (minimum !== undefined) newSchema[key].minimum = minimum;
  if (maximum !== undefined) newSchema[key].maximum = maximum;
  if (defaultValue !== undefined) {
    newSchema[key].default = defaultValue;
  }
  if (step !== undefined) newSchema[key].step = step;

  // Update the editor schema
  editor.original_schema.properties[key] = originalProperties;
  editor.schema.properties[key] = newSchema[key];

  // Update schema for validation
  setObjectProperty(rootEditor.validator.schema.properties, getLongPropertiesPath(path) + key, newSchema[key]);

  // Re-apply changes to the editor
  editor.removeObjectProperty(key);
  delete editor.cached_editors[key];
  editor.addObjectProperty(key);

  // restore the current value, if no default value given
  if (defaultValue === undefined) {
    rootEditor.getEditor(path + "." + key).setValue(currentValue);
  } else {
    rootEditor.getEditor(path + "." + key).setValue(defaultValue);
  }
}

function validateHostFormat(schema, value, path, errors) {
  const validationMap = {
    'hostname_or_ip': { validator: isValidHostnameOrIP, message: 'edt_msgcust_error_hostname_ip' },
    'hostname_or_ip4': { validator: isValidHostnameOrIP4, message: 'edt_msgcust_error_hostname_ip4' },
    'ipv4': { validator: isValidIPv4, message: 'edt_msg_error_ipv4' },
    'ipv6': { validator: isValidIPv6, message: 'edt_msg_error_ipv6' },
    'hostname': { validator: isValidHostname, message: 'edt_msg_error_hostname' }
  };

  const validation = validationMap[schema.format];
  if (validation && !validation.validator(value)) {
    errors.push({ path, property: 'format', message: $.i18n(validation.message) });
  } else if (schema.format === 'uuid') {
    errors.push(...validateUUIDSchema(schema, value, path));
  }
}

// Add custom host validation to JSON Editor
function addJsonEditorHostValidation() {
  JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
    const errors = [];

    if (!jQuery.isEmptyObject(value)) {
      validateHostFormat(schema, value, path, errors);
    }

    return errors;
  });
}