function ensureHyperionAppendSupportInstalled() {
  const JE = globalThis.JSONEditor;
  if (!JE?.defaults?.editors) return;

  // install only once
  if (JE.defaults.__hyperion_append_installed) return;
  JE.defaults.__hyperion_append_installed = true;

  // Wrap the base editor hook (works for string/number/integer/etc editors that call it)
  const proto = JE.AbstractEditor?.prototype;
  if (!proto) return;

  const originalAfterInputReady = proto.afterInputReady;
  proto.afterInputReady = function (input) {
    // call original behavior first
    if (typeof originalAfterInputReady === 'function') {
      originalAfterInputReady.call(this, input);
    }

    if (!input || !this.schema) return;

    const appendKey = this.schema.append;
    if (!appendKey) return;

    // translate using JSONEditor translateProperty (you already set it)
    let appendText = appendKey;
    try {
      // many versions expose this.translate
      if (typeof this.translate === 'function') {
        appendText = this.translate(appendKey);
      } else if (this.jsoneditor && typeof this.jsoneditor.translate === 'function') {
        appendText = this.jsoneditor.translate(appendKey);
      } else if (globalThis.JSONEditor?.defaults?.translateProperty) {
        appendText = globalThis.JSONEditor.defaults.translateProperty(appendKey);
      } else if (typeof $ !== 'undefined' && typeof $.i18n === 'function') {
        appendText = $.i18n(appendKey);
      }
    } catch {
      // fallback to raw key if translation fails
      appendText = appendKey;
    }

    // Attach to the input so the theme can render it without schema lookups
    input.dataset.jeAppend = appendText;
  };
}

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

function countNumericDecimals(value) {
  const str = String(value);
  if (str.includes('e-')) {
    return Number.parseInt(str.split('e-')[1], 10) || 0;
  }

  const dotIndex = str.indexOf('.');
  return dotIndex === -1 ? 0 : str.length - dotIndex - 1;
}

function createPrecisionNormalizer(...values) {
  const precision = Math.max(...values.map((value) => countNumericDecimals(value)));
  const scale = 10 ** Math.min(precision, 12);

  const normalize = (val, fallback = 0) => {
    if (!Number.isFinite(val)) return Number(fallback);
    if (scale <= 1) return Math.round(val);
    return Math.round((val + Number.EPSILON) * scale) / scale;
  };

  return { scale, normalize };
}

function resolveEditorAppendText(editor, appendKey) {
  let text = appendKey;

  if (typeof editor.translate === 'function') {
    text = editor.translate(appendKey);
  }

  if (!text || text === appendKey) {
    text = editor.translateProperty(appendKey);
  }

  return text || appendKey;
}

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

function ensureJsonEditorDefaultsConfigured() {
  const JE = globalThis.JSONEditor;
  if (!JE?.defaults?.editors) {
    return false;
  }

  if (JE.defaults.__hyperion_defaults_configured) {
    return true;
  }

  JE.defaults.__hyperion_defaults_configured = true;

  JE.defaults.translateProperty = function (key, variables) {
    let text;
    if (key !== null) {
      text = $.i18n(key, variables);
    }
    return text;
  };

  const createAppendEditor = (BaseEditor, { integer }) => class extends BaseEditor {
    build() {
      super.build();

      if (this.input) {
        this.input.type = 'number';
        if (integer) {
          this.input.step = '1';
        } else if (this.schema?.step !== undefined) {
          this.input.step = String(this.schema.step);
        }
      }

      if (!this.schema?.append || !this.input?.parentNode) {
        return;
      }

      const appendText = resolveEditorAppendText(this, this.schema.append);

      const parent = this.input.parentNode;
      if (parent.classList.contains('input-group')) {
        if (!parent.querySelector('.je-form-input-append')) {
          const appendEl = document.createElement('span');
          appendEl.classList.add('input-group-text', 'je-form-input-append');
          appendEl.textContent = appendText;
          parent.appendChild(appendEl);
        }
        return;
      }

      const group = document.createElement('div');
      group.classList.add('input-group');

      parent.replaceChild(group, this.input);
      group.appendChild(this.input);

      const appendEl = document.createElement('span');
      appendEl.classList.add('input-group-text', 'je-form-input-append');
      appendEl.textContent = appendText;
      group.appendChild(appendEl);
    }
  };

  JE.defaults.editors.integerWithAppend = createAppendEditor(JE.defaults.editors.integer, { integer: true });
  JE.defaults.editors.numberWithAppend = createAppendEditor(JE.defaults.editors.number, { integer: false });

  JE.defaults.resolvers.unshift(function (schema) {
    if ((schema?.type === 'number' || schema?.type === 'integer') && schema?.append) {
      return schema.type === 'integer' ? 'integerWithAppend' : 'numberWithAppend';
    }
    return undefined;
  });

  const createStepperEditor = (BaseEditor, { integer, withAppend }) => class extends BaseEditor {

    build() {
      super.build();

      const parent = this.input.parentNode;

      // --- wrapper ---
      const group = document.createElement('div');
      group.classList.add('input-group');

      parent.replaceChild(group, this.input);

      // --- buttons ---
      const btnMinus = document.createElement('button');
      btnMinus.type = 'button';
      btnMinus.classList.add('btn', 'btn-outline-secondary', 'btn-sm');
      btnMinus.textContent = '−';

      const btnPlus = document.createElement('button');
      btnPlus.type = 'button';
      btnPlus.classList.add('btn', 'btn-outline-secondary', 'btn-sm');
      btnPlus.textContent = '+';

      // --- input styling ---
      this.input.classList.add('form-control', 'form-control-sm', 'text-center');
      this.input.type = 'number';

      // --- append label ---
      let appendEl = null;
      if (withAppend && this.schema.append) {
        appendEl = document.createElement('span');
        appendEl.classList.add('input-group-text');
        appendEl.textContent = resolveEditorAppendText(this, this.schema.append);
      }

      // --- assemble ---
      group.appendChild(btnMinus);
      group.appendChild(this.input);
      if (appendEl) group.appendChild(appendEl);
      group.appendChild(btnPlus);

      // --- config ---
      const stepRaw = this.schema.step ?? 1;
      const parsedStep = Number(stepRaw);
      const step = Number.isFinite(parsedStep) && parsedStep !== 0 ? parsedStep : 1;
      const min = this.schema.minimum;
      const max = this.schema.maximum;
      const { normalize } = createPrecisionNormalizer(stepRaw, min ?? 0, max ?? 0);

      this.input.step = integer ? '1' : String(step);

      const clamp = (val) => {
        if (typeof min === 'number' && val < min) val = min;
        if (typeof max === 'number' && val > max) val = max;
        return val;
      };

      // --- update helper ---
      const updateValue = (newVal) => {
        newVal = normalize(clamp(newVal), min ?? 0);
        if (integer) {
          newVal = Math.round(newVal);
        }
        this.setValue(newVal);
        this.onChange(true);
      };

      const getCurrentValue = () => {
        const current = Number(this.getValue());
        return Number.isFinite(current) ? current : 0;
      };

      // --- button events ---
      btnMinus.addEventListener('click', () => {
        const val = getCurrentValue();
        updateValue(val - step);
      });

      btnPlus.addEventListener('click', () => {
        const val = getCurrentValue();
        updateValue(val + step);
      });

      // --- keyboard support ---
      this.input.addEventListener('keydown', (e) => {
        const val = getCurrentValue();

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          updateValue(val + step);
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          updateValue(val - step);
        }
      });
    }

    sanitize(value) {
      if (value === '' || value === null || value === undefined) return value;
      return integer ? Number.parseInt(String(value), 10) : Number(value);
    }

  };

  JE.defaults.editors.integerStepper = createStepperEditor(JE.defaults.editors.integer, { integer: true, withAppend: false });
  JE.defaults.editors.numberStepper = createStepperEditor(JE.defaults.editors.number, { integer: false, withAppend: false });
  JE.defaults.editors.integerStepperWithAppend = createStepperEditor(JE.defaults.editors.integer, { integer: true, withAppend: true });
  JE.defaults.editors.numberStepperWithAppend = createStepperEditor(JE.defaults.editors.number, { integer: false, withAppend: true });

  JE.defaults.resolvers.unshift(function (schema) {
    if ((schema?.type === 'integer' || schema?.type === 'number') && schema?.format === 'stepper') {
      if (schema?.append) {
        return schema.type === 'integer' ? 'integerStepperWithAppend' : 'numberStepperWithAppend';
      }
      return schema.type === 'integer' ? 'integerStepper' : 'numberStepper';
    }
    return undefined;
  });

  const createRangeWithAppendEditor = (BaseEditor, { integer }) => class extends BaseEditor {

    build() {
      super.build();

      const parent = this.input.parentNode;
      const min = this.schema.minimum ?? 0;
      const max = this.schema.maximum ?? 100;

      const stepRaw = this.schema.step ?? 1;
      const parsedStep = Number(stepRaw);
      const step = Number.isFinite(parsedStep) && parsedStep !== 0 ? parsedStep : 1;
      const { scale, normalize } = createPrecisionNormalizer(stepRaw, min, max);
      const minScaled = Math.round(Number(min) * scale);
      const maxScaled = Math.round(Number(max) * scale);
      const stepScaled = Math.max(1, Math.round(step * scale));

      const clamp = (val) => {
        if (val < min) val = min;
        if (val > max) val = max;
        return val;
      };

      const snapToStep = (val) => {
        const clamped = normalize(clamp(val), min);
        const valueScaled = Math.round(clamped * scale);

        if (valueScaled <= minScaled) {
          return Number(min);
        }

        if (valueScaled >= maxScaled) {
          return Number(max);
        }

        // Snap on a 0-based grid so step progression follows 0, step, 2*step, ...
        // then clamp to the configured [min, max] range.
        const snappedScaled = Math.round(valueScaled / stepScaled) * stepScaled;
        return normalize(clamp(snappedScaled / scale), min);
      };

      // --- range slider ---
      const range = document.createElement('input');
      range.type = 'range';
      range.classList.add('form-range', 'w-100', 'm-0');
      range.min = String(min);
      range.max = String(max);
      range.step = 'any';

      const rangeWrap = document.createElement('div');
      rangeWrap.classList.add('w-100');
      rangeWrap.appendChild(range);

      // --- number input styling ---
      this.input.classList.add('form-control', 'form-control-sm', 'text-center');
      this.input.style.maxWidth = '80px';
      this.input.style.minWidth = '60px';
      this.input.style.flex = '0 0 auto';
      this.input.type = 'number';
      this.input.step = integer ? '1' : String(step);


      // --- optional append label text ---
      let appendText = null;
      if (this.schema.append) {
        appendText = resolveEditorAppendText(this, this.schema.append);
      }

      // --- layout: two rows [value][unit?] + [full-width slider] ---
      const container = document.createElement('div');
      container.classList.add('w-100', 'd-flex', 'flex-column', 'gap-1');

      parent.replaceChild(container, this.input);

      if (appendText) {
        const outputEl = parent.querySelector('output');
        if (outputEl) {
          const existingAppend = parent.querySelector('.je-range-output-append');
          if (existingAppend) existingAppend.remove();
          const outputAppend = document.createElement('span');
          outputAppend.classList.add('je-range-output-append', 'ms-1');
          outputAppend.textContent = appendText;
          outputEl.after(outputAppend);
        }
      }

      container.appendChild(rangeWrap);

      // store ref for setValue sync
      this._rangeInput = range;

      // --- helpers ---
      const getCurrentValue = () => {
        const v = Number(this.getValue());
        return Number.isFinite(v) ? v : Number(min);
      };

      const updateValue = (newVal) => {
        newVal = snapToStep(newVal);
        range.value = String(newVal);
        this.setValue(newVal);
        this.onChange(true);
      };

      // range slider → value
      range.addEventListener('input', () => {
        updateValue(Number(range.value));
      });

      // range slider keyboard → value
      range.addEventListener('keydown', (e) => {
        const current = getCurrentValue();

        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          updateValue(current + step);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          updateValue(current - step);
        } else if (e.key === 'Home') {
          e.preventDefault();
          updateValue(min);
        } else if (e.key === 'End') {
          e.preventDefault();
          updateValue(max);
        }
      });

      // sync initial range position
      range.value = String(getCurrentValue());
    }

    setValue(value, initial, from_template) {
      super.setValue(value, initial, from_template);
      if (this._rangeInput) {
        const v = Number(this.getValue());
        if (Number.isFinite(v)) {
          this._rangeInput.value = String(v);
        }
      }
    }

    sanitize(value) {
      if (value === '' || value === null || value === undefined) return value;
      return integer ? Number.parseInt(String(value), 10) : Number(value);
    }

  };

  JE.defaults.editors.integerRangeWithAppend = createRangeWithAppendEditor(JE.defaults.editors.integer, { integer: true });
  JE.defaults.editors.numberRangeWithAppend = createRangeWithAppendEditor(JE.defaults.editors.number, { integer: false });

  // registered last → runs first among Hyperion resolvers
  JE.defaults.resolvers.unshift(function (schema) {
    if (
      (schema.type === "integer" || schema.type === "number") &&
      (schema.format === "range" || schema.format === "slider")
    ) {
      return schema.type === 'integer' ? 'integerRangeWithAppend' : 'numberRangeWithAppend';
    }
    return undefined;
  });

  return true;
}

function createJsonEditor(container, schema, setconfig, useCard, arrayre = undefined) {
  const JE = globalThis.JSONEditor;
  if (!JE) {
    throw new Error('JSONEditor failed to load before createJsonEditor()');
  }

  ensureJsonEditorDefaultsConfigured();

  $('#' + container).off();
  $('#' + container).html("");

  if (arrayre === undefined)
    arrayre = true;

  const startval = setconfig && globalThis.serverConfig
    ? Object.keys(schema).reduce((values, key) => {
      if (Object.hasOwn(globalThis.serverConfig, key)) {
        values[key] = globalThis.serverConfig[key];
      }
      return values;
    }, {})
    : undefined;

  let editor = new JE(document.getElementById(container),
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
        options: { titleHidden: true },
        properties: schema
      },
      startval
    });

  const applyCardLayout = () => {
    $('#' + container + ' .je-object__title, #' + container + ' .je-object__controls').remove();
  };

  if (useCard) {
    editor.on('ready', applyCardLayout);
  }

  return editor;
}

function createEditor(editors, container, schemaKey, changeHandler, options = {}) {
  const {
    bindDefaultChange = true,
    bindSubmit = true,
    submitButtonId = `btn_submit_${container}`,
    onSubmit = null,
    setconfig = true,
    useCard = true,
    arrayre = undefined
  } = options;

  const schemaDefinition = (typeof schemaKey === 'string')
    ? { [schemaKey]: globalThis.schema[schemaKey] }
    : schemaKey;

  editors[container] = createJsonEditor(
    `editor_container_${container}`,
    schemaDefinition,
    setconfig,
    useCard,
    arrayre
  );

  const editor = editors[container];

  if (bindDefaultChange) {
    editor.on('change', function () {

      const errors = editor.validate();
      const isValid = errors.length === 0 && !globalThis.readOnlyMode;
      $(`#${submitButtonId}`).prop('disabled', !isValid);

      if (!isValid) {
        console.warn(`Validation errors in ${container} editor:`, errors);
      }
    });
  }

  if (bindSubmit) {
    $(`#${submitButtonId}`).off().on('click', function () {
      if (typeof onSubmit === 'function') {
        onSubmit(editor, container);
        return;
      }
      requestWriteConfig(editor.getValue());
    });
  }

  if (typeof changeHandler === 'function') {
    changeHandler(editor, container);
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
  const originalWatchFunctions = rootEditor?.watchlist?.[path + "." + key];

  // Unwatch the existing path
  rootEditor.unwatch(path + "." + key);

  const newSchema = {
    [key]: {
      key,
      type: "string",
      enum: [],
      options: { enum_titles: [], infoText: "", dependencies: {} },
      propertyOrder: 1,
      ...addElements, // Merge custom elements directly into schema
    }
  };

  // Retain original properties if available
  if (originalProperties) {
    const { title, options: originalOptions, propertyOrder } = originalProperties;
    newSchema[key].title = title || newSchema[key].title;
    newSchema[key].options.infoText = originalOptions?.infoText || newSchema[key].options.infoText;
    newSchema[key].options.dependencies = originalOptions?.dependencies || newSchema[key].options.dependencies;
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
  if (!ensureJsonEditorDefaultsConfigured()) {
    return;
  }

  if (globalThis.JSONEditor.defaults.__hyperion_host_validation_installed) {
    return;
  }

  globalThis.JSONEditor.defaults.__hyperion_host_validation_installed = true;

  globalThis.JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
    const errors = [];

    if (!jQuery.isEmptyObject(value)) {
      validateHostFormat(schema, value, path, errors);
    }

    return errors;
  });
}