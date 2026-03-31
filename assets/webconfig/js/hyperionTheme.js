(function (global) {
	function resolveSchemaByPath(schema, path) {
		if (!(schema && path?.startsWith('root'))) {
			return null;
		}

		const parts = path.split('.').slice(1);
		let current = schema;

		for (const part of parts) {
			if (!current?.properties?.[part]) {
				return null;
			}
			current = current.properties[part];
		}

		return current;
	}

	global.createHyperionTheme = function createHyperionTheme(BaseTheme) {
		return class HyperionTheme extends BaseTheme {
			getFormInputAppend(text) {
				const append = document.createElement('span');
				append.classList.add('input-group-text', 'je-form-input-append');
				append.textContent = text;
				return append;
			}

			getAppendTextForInput(input) {
				const schemaPath = input?.closest('[data-schemapath]')?.dataset?.schemapath;
				const schemaNode = resolveSchemaByPath(this.jsoneditor?.schema, schemaPath);
				const appendKey = schemaNode?.append;

				if (!appendKey) {
					return null;
				}

				if (typeof $ !== 'undefined' && typeof $.i18n === 'function') {
					return $.i18n(appendKey);
				}

				return appendKey;
			}

			getFormControl(label, input, description, infoText) {

				const control = super.getFormControl(label, input, description, infoText);

				if (!input || input.type === 'checkbox' || input.type === 'radio') {
					return control;
				}

				const appendText = this.getAppendTextForInput(input);
				if (!appendText) {
					return control;
				}

				const inputParent = input.parentNode;
				if (!inputParent) {
					return control;
				}

				if (inputParent.classList.contains('input-group')) {
					inputParent.appendChild(this.getFormInputAppend(appendText));
					return control;
				}

				const nextSibling = input.nextSibling;
				const inputGroup = this.getInputGroup(input, [this.getFormInputAppend(appendText)]);
				if (!inputGroup) {
					inputParent.insertBefore(this.getFormInputAppend(appendText), nextSibling);
					return control;
				}

				inputParent.insertBefore(inputGroup, nextSibling);
				return control;
			}
		};
	};
})(globalThis);