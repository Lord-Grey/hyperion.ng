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

function createJsonEditor(container, schema, setconfig, useCard, options = undefined) {
  const JE = globalThis.JSONEditor;
  if (!JE) {
    throw new Error('JSONEditor failed to load before createJsonEditor()');
  }

  ensureJsonEditorDefaultsConfigured();

  $('#' + container).off();
  $('#' + container).html("");

  const hasOptionsObject = options != null && typeof options === 'object' && !Array.isArray(options);
  const arrayre = hasOptionsObject ? options.arrayre : options;
  const startvalOverride = hasOptionsObject ? options.startval : undefined;
  const disableArrayReorder = arrayre === undefined ? true : arrayre;

  const defaultStartval = setconfig && globalThis.serverConfig
    ? Object.keys(schema).reduce((values, key) => {
      if (Object.hasOwn(globalThis.serverConfig, key)) {
        values[key] = globalThis.serverConfig[key];
      }
      return values;
    }, {})
    : undefined;

  const startval = startvalOverride === undefined ? defaultStartval : startvalOverride;

  let editor = new JE(document.getElementById(container),
    {
      theme: 'bootstrap5',
      iconlib: "fontawesome4",
      disable_collapse: true,
      form_name_root: 'root',
      disable_edit_json: true,
      disable_properties: true,
      disable_array_reorder: disableArrayReorder,
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
    arrayre = undefined,
    startval = undefined
  } = options;

  const schemaDefinition = (typeof schemaKey === 'string')
    ? { [schemaKey]: globalThis.schema[schemaKey] }
    : schemaKey;

  editors[container] = createJsonEditor(
    `editor_container_${container}`,
    schemaDefinition,
    setconfig,
    useCard,
    { arrayre, startval }
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
function sanitizeSelectionValues(values) {
  return Array.isArray(values) ? values.filter((v) => v != null) : [];
}

function createSelectionSchemaEntry(key, addElements, originalProperties) {
  const schemaEntry = {
    key,
    type: "string",
    enum: [],
    options: { enum_titles: [], infoText: "", dependencies: {} },
    propertyOrder: 1,
    ...addElements,
  };

  if (!schemaEntry.options) {
    schemaEntry.options = { enum_titles: [], infoText: "", dependencies: {} };
  }

  if (!originalProperties) {
    return schemaEntry;
  }

  const { title, options: originalOptions, propertyOrder } = originalProperties;
  schemaEntry.title = title || schemaEntry.title;
  schemaEntry.options.infoText = originalOptions?.infoText || schemaEntry.options.infoText;
  schemaEntry.options.dependencies = originalOptions?.dependencies || schemaEntry.options.dependencies;
  schemaEntry.propertyOrder = propertyOrder || schemaEntry.propertyOrder;

  return schemaEntry;
}

function applyCustomSelectionValues(schemaEntry, enumVals, titleVals, customText, addCustomAsFirst) {
  const updatedTitles = titleVals.length === 0 ? [...enumVals] : titleVals;
  const customPosition = addCustomAsFirst ? "unshift" : "push";

  enumVals[customPosition]("CUSTOM");
  updatedTitles[customPosition](customText);

  if (schemaEntry.options.infoText) {
    schemaEntry.options.infoText += "_custom";
  }

  return { enumVals, titleVals: updatedTitles };
}

function applySelectSelectionValues(enumVals, titleVals) {
  enumVals.unshift("SELECT");
  titleVals.unshift("edt_conf_enum_please_select");
}

function alignSelectionTitles(enumVals, titleVals) {
  if (titleVals.length > 0 && titleVals.length < enumVals.length) {
    return [...titleVals, ...enumVals.slice(titleVals.length)];
  }

  if (titleVals.length > enumVals.length) {
    return titleVals.slice(0, enumVals.length);
  }

  return titleVals;
}

function resolveJsonEditorSelectionValue(previousValue, newDefaultVal, enumValues, addSelect) {
  if (typeof previousValue === "string" && enumValues.includes(previousValue)) {
    return previousValue;
  }

  if (typeof newDefaultVal === "string" && enumValues.includes(newDefaultVal)) {
    return newDefaultVal;
  }

  if (addSelect && enumValues.includes("SELECT")) {
    return "SELECT";
  }

  return enumValues.length > 0 ? enumValues[0] : undefined;
}

function reapplySelectionWatchers(rootEditor, watchPath, originalWatchFunctions) {
  if (!originalWatchFunctions) {
    return;
  }

  originalWatchFunctions.forEach((element) => rootEditor.watch(watchPath, element));
}

function createMultiSelectionSchemaEntry(key, addElements, originalProperties) {
  const schemaEntry = {
    key,
    type: "array",
    items: {
      type: "string",
      enum: [],
      options: { enum_titles: [] }
    },
    options: { infoText: "" },
    default: [],
    propertyOrder: 1,
    ...addElements,
  };

  if (!schemaEntry.items) {
    schemaEntry.items = { type: "string", enum: [], options: { enum_titles: [] } };
  }

  if (!schemaEntry.items.options) {
    schemaEntry.items.options = { enum_titles: [] };
  }

  if (!Array.isArray(schemaEntry.items.enum)) {
    schemaEntry.items.enum = [];
  }

  if (!Array.isArray(schemaEntry.items.options.enum_titles)) {
    schemaEntry.items.options.enum_titles = [];
  }

  if (!schemaEntry.options) {
    schemaEntry.options = { infoText: "" };
  }

  if (!Array.isArray(schemaEntry.default)) {
    schemaEntry.default = [];
  }

  if (!originalProperties) {
    return schemaEntry;
  }

  const { title, format, options: originalOptions, propertyOrder } = originalProperties;
  schemaEntry.title = title || schemaEntry.title;
  schemaEntry.format = format || schemaEntry.format;
  schemaEntry.options.infoText = originalOptions?.infoText || schemaEntry.options.infoText;
  schemaEntry.propertyOrder = propertyOrder || schemaEntry.propertyOrder;

  return schemaEntry;
}

function resolveJsonEditorMultiSelectionValues(previousValue, newDefaultVal, enumValues, hasExplicitDefault) {
  const normalizeArrayValues = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((val) => val != null && (typeof val === "string" || typeof val === "number" || typeof val === "boolean"))
      .map(String)
      .filter((val) => enumValues.includes(val));
  };

  const preservedValues = normalizeArrayValues(previousValue);
  if (preservedValues.length > 0) {
    return preservedValues;
  }

  if (hasExplicitDefault) {
    return normalizeArrayValues(newDefaultVal);
  }

  const fallbackDefault = normalizeArrayValues(newDefaultVal);
  if (fallbackDefault.length > 0) {
    return fallbackDefault;
  }

  return [];
}

function updateJsonEditorSelection(rootEditor, path, options) {
  let { key, addElements = {}, newEnumVals = [], newTitleVals = [], newDefaultVal = undefined, addSelect = false, addCustom = false, addCustomAsFirst = false, customText = "edt_conf_enum_custom" } = options;
  const watchPath = path + "." + key;

  // Coerce a primitive scalar to string; return undefined for null/undefined/object
  const toEnumString = (value) => {
    if (value == null) return undefined;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    return undefined;
  };

  // Callers are responsible for passing string arrays; ensure clean arrays
  newEnumVals = sanitizeSelectionValues(newEnumVals);
  newTitleVals = sanitizeSelectionValues(newTitleVals);

  // Fall back to enum values as titles if no title values were provided
  if (newTitleVals.length === 0 && newEnumVals.length > 0) {
    newTitleVals = [...newEnumVals];
  }

  // previousValue and newDefaultVal may come from JSONEditor internals or raw API data — normalize
  const previousValue = toEnumString(rootEditor.getEditor(watchPath)?.getValue());
  newDefaultVal = toEnumString(newDefaultVal);

  const editor = rootEditor.getEditor(path);
  const originalProperties = editor.schema.properties[key];
  const originalWatchFunctions = rootEditor?.watchlist?.[watchPath];

  // Unwatch the existing path
  rootEditor.unwatch(watchPath);

  const schemaEntry = createSelectionSchemaEntry(key, addElements, originalProperties);

  // Handle custom values
  if (addCustom) {
    const updatedValues = applyCustomSelectionValues(schemaEntry, newEnumVals, newTitleVals, customText, addCustomAsFirst);
    newEnumVals = updatedValues.enumVals;
    newTitleVals = updatedValues.titleVals;
  }

  // Handle Select options
  if (addSelect) {
    applySelectSelectionValues(newEnumVals, newTitleVals);
    newDefaultVal = "SELECT";
  }

  // Set new values
  schemaEntry.enum = newEnumVals;
  newTitleVals = alignSelectionTitles(schemaEntry.enum, newTitleVals);
  schemaEntry.options.enum_titles = newTitleVals;
  if (newDefaultVal) schemaEntry.default = newDefaultVal;

  const newSchema = { [key]: schemaEntry };

  // Update the editor schema
  editor.original_schema.properties[key] = originalProperties;
  editor.schema.properties[key] = newSchema[key];

  // Update schema for validation
  setObjectProperty(rootEditor.validator.schema.properties, getLongPropertiesPath(path) + key, newSchema[key]);

  // Re-apply changes to the editor
  editor.removeObjectProperty(key);
  delete editor.cached_editors[key];
  editor.addObjectProperty(key);

  const updatedEditor = rootEditor.getEditor(watchPath);
  const enumValues = Array.isArray(newSchema[key].enum) ? newSchema[key].enum : [];
  const resolvedValue = resolveJsonEditorSelectionValue(previousValue, newDefaultVal, enumValues, addSelect);

  if (updatedEditor && resolvedValue !== undefined) {
    updatedEditor.setValue(resolvedValue);
  }

  // Reapply original watch functions
  reapplySelectionWatchers(rootEditor, watchPath, originalWatchFunctions);

  // Notify watchers
  rootEditor.notifyWatchers(watchPath);
}

// Update the JSON Editor for multi-selection fields
function updateJsonEditorMultiSelection(rootEditor, path, options) {
  let {
    key,
    addElements = {},
    newEnumVals = [],
    newTitleVals = [],
    newDefaultVal = undefined
  } = options;
  const watchPath = path + "." + key;
  const hasExplicitDefault = Object.hasOwn(options, "newDefaultVal");

  newEnumVals = sanitizeSelectionValues(newEnumVals).map(String);
  newTitleVals = sanitizeSelectionValues(newTitleVals).map(String);

  if (newTitleVals.length === 0 && newEnumVals.length > 0) {
    newTitleVals = [...newEnumVals];
  }

  const editor = rootEditor.getEditor(path);
  const originalProperties = editor.schema.properties[key];
  const originalWatchFunctions = rootEditor?.watchlist?.[watchPath];
  const previousValue = rootEditor.getEditor(watchPath)?.getValue();

  // Unwatch the existing path
  rootEditor.unwatch(watchPath);

  const schemaEntry = createMultiSelectionSchemaEntry(key, addElements, originalProperties);
  schemaEntry.items.enum = newEnumVals;
  schemaEntry.items.options.enum_titles = alignSelectionTitles(schemaEntry.items.enum, newTitleVals);
  schemaEntry.default = resolveJsonEditorMultiSelectionValues(previousValue, newDefaultVal, schemaEntry.items.enum, hasExplicitDefault);

  const newSchema = { [key]: schemaEntry };

  // Update the editor schema
  editor.original_schema.properties[key] = originalProperties;
  editor.schema.properties[key] = newSchema[key];

  // Update schema for validation
  setObjectProperty(rootEditor.validator.schema.properties, getLongPropertiesPath(path) + key, newSchema[key]);

  // Re-apply changes to the editor
  editor.removeObjectProperty(key);
  delete editor.cached_editors[key];
  editor.addObjectProperty(key);

  const updatedEditor = rootEditor.getEditor(watchPath);
  if (updatedEditor) {
    updatedEditor.setValue(newSchema[key].default);
  }

  // Reapply original watch functions
  reapplySelectionWatchers(rootEditor, watchPath, originalWatchFunctions);

  // Notify watchers
  rootEditor.notifyWatchers(watchPath);
}

function createRangeSchemaEntry(originalProperties, rangeOptions) {
  const { minimum, maximum, defaultValue, step, clear } = rangeOptions || {};
  const schemaEntry = { ...originalProperties };

  if (clear) {
    delete schemaEntry.minimum;
    delete schemaEntry.maximum;
    delete schemaEntry.default;
    delete schemaEntry.step;
  }

  if (minimum !== undefined) {
    schemaEntry.minimum = minimum;
  }

  if (maximum !== undefined) {
    schemaEntry.maximum = maximum;
  }

  if (defaultValue !== undefined) {
    schemaEntry.default = defaultValue;
  }

  if (step !== undefined) {
    schemaEntry.step = step;
  }

  return schemaEntry;
}

function resolveJsonEditorRangeValue(currentValue, defaultValue) {
  return defaultValue === undefined ? currentValue : defaultValue;
}

// Update JSON Editor Range with min, max, and step values
function updateJsonEditorRange(rootEditor, path, key, rangeOptions) {
  const watchPath = path + "." + key;
  const editor = rootEditor.getEditor(path);
  const currentValue = rootEditor.getEditor(watchPath).getValue();
  const originalProperties = editor.schema.properties[key];
  const { defaultValue } = rangeOptions || {};

  const schemaEntry = createRangeSchemaEntry(originalProperties, rangeOptions);
  const newSchema = { [key]: schemaEntry };

  // Update the editor schema
  editor.original_schema.properties[key] = originalProperties;
  editor.schema.properties[key] = newSchema[key];

  // Update schema for validation
  setObjectProperty(rootEditor.validator.schema.properties, getLongPropertiesPath(path) + key, newSchema[key]);

  // Re-apply changes to the editor
  editor.removeObjectProperty(key);
  delete editor.cached_editors[key];
  editor.addObjectProperty(key);

  const updatedEditor = rootEditor.getEditor(watchPath);
  if (updatedEditor) {
    updatedEditor.setValue(resolveJsonEditorRangeValue(currentValue, defaultValue));
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