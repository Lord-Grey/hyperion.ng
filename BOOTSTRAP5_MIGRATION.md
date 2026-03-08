# Bootstrap 5.3.8 Migration Guide for Hyperion Web Configuration

## Overview
This document outlines all changes made to migrate the Hyperion Web Configuration from Bootstrap 3 to Bootstrap 5.3.8.

## Files Modified

### 1. **assets/webconfig/js/ui_utils.js**
#### Key Changes:
- **Modal API**: 
  - Changed `data-dismiss="modal"` → `data-bs-dismiss="modal"`
  - Updated modal initialization from jQuery plugin to native Bootstrap 5 API:
    ```javascript
    // Old (Bootstrap 3)
    $(selector).modal({ backdrop: "static", keyboard: false, show: true });
    
    // New (Bootstrap 5)
    const modal = new bootstrap.Modal(modalElement, {
      backdrop: "static",
      keyboard: false
    });
    modal.show();
    ```

- **Panel → Card Conversion** in `createPanel()`:
  - `panel` → `card`
  - `panel-heading` → `card-header`
  - `panel-body` → `card-body`
  - `panel-footer` → `card-footer`
  - `panel-default` → `card-default`

- **Table Classes**:
  - `borderless` → `table-borderless`

- **Form Controls**:
  - `form-control` for selects → `form-select`

- **Text Alignment**:
  - `text-left` → `text-start`
  - `text-right` → `text-end`

- **Close Button**:
  - `class="close"` → `class="btn-close"`

- **JSONEditor Theme**:
  - `theme: 'bootstrap3'` → `theme: 'bootstrap5'`

### 2. **assets/webconfig/index.html**
#### Key Changes:
- **CDN Links**: Updated to Bootstrap 5.3.8 CDN
  ```html
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
  ```

- **Navbar**:
  - `navbar-default` → `navbar-light bg-light`
  - `navbar-static-top` → `sticky-top`
  - Added `navbar-expand-lg` for responsive behavior
  - `navbar-toggle` → `navbar-toggler`
  - Updated collapse target with `data-bs-toggle` and `data-bs-target`

- **Dropdown Menus**:
  - `data-toggle="dropdown"` → `data-bs-toggle="dropdown"`
  - `dropdown-menu dropdown-alerts` → `dropdown-menu`
  - `<li class="divider">` → `<li><hr class="dropdown-divider"></li>`
  - Dropdown items wrapped in `<li>` tags with `dropdown-item` class on `<a>` tags

- **Sidebar Navigation**:
  - Converted from custom sidebar to Bootstrap 5 grid-based layout
  - Added proper `nav-item` and `nav-link` classes
  - Nested menus use `data-bs-toggle="collapse"` with collapse divs
  - Responsive column classes: `col-md-3 col-lg-2 d-md-block`

- **Page Layout**:
  - Wrapped content in Bootstrap 5 grid: `container-fluid` > `row`
  - Sidebar: `col-md-3 col-lg-2`
  - Main content: `col-md-9 ms-sm-auto col-lg-10`
  - Used `<main>` semantic element for page content

- **Modals**:
  - Added `tabindex="-1"` to modal divs
  - Added `modal-dialog-centered` for centering
  - Removed deprecated `<center>` tags
  - Applied `text-center` and `justify-content-center` utility classes

### 3. **assets/webconfig/js/lib/sb-admin-2.js**
#### Key Changes:
- **Class Names**:
  - `navbar-toggle` → `navbar-toggler`
  - `.bind()` → `.on()` for event binding
  - `addClass('in')` → `addClass('show')` for active collapse states
  - `#page-wrapper` → `main` element selector

- **Animation**:
  - Updated jQuery animate() calls for consistency

### 4. **assets/webconfig/css/hyperion.css**
#### Key Changes:
- **Navbar Classes**: `navbar-toggle` → `navbar-toggler`, `navbar-default` → `navbar-light`
- **Panel to Card Migration**: Updated panel references to use card classes
- **Editor Container**: `.well` → `.card` for JSONEditor
- **Grid System**: Removed obsolete push/pull classes, updated for flexbox
- **See [HYPERION_CSS_CLEANUP.md](HYPERION_CSS_CLEANUP.md) for detailed changes**

## Bootstrap 5 Breaking Changes Addressed

### 1. **Data Attributes**
All Bootstrap data attributes now require the `data-bs-` prefix:
- `data-toggle` → `data-bs-toggle`
- `data-dismiss` → `data-bs-dismiss`
- `data-target` → `data-bs-target`

### 2. **JavaScript API**
- Modals now use native JavaScript instead of jQuery plugin
- Requires `new bootstrap.Modal(element, options)` initialization

### 3. **Component Changes**
- **Panels**: Completely removed, replaced with Cards
- **Wells**: Removed, no direct replacement
- **Glyphicons**: Removed (already using Font Awesome)
- **Dropdown Structure**: Requires proper list structure

### 4. **Grid System**
- Removed `.col-*-offset-*` in favor of margin utilities
- Added compatibility classes in bootstrap5-compat.css

### 5. **Form Controls**
- `.form-control` on `<select>` should use `.form-select`
- Maintained backward compatibility

### 6. **Utility Classes**
- `text-left` → `text-start`
- `text-right` → `text-end`
- `float-left` → `float-start`
- `float-right` → `float-end`

## Testing Checklist

### Essential Tests:
- [ ] Modal dialogs open and close properly
- [ ] Dropdown menus function correctly
- [ ] Sidebar navigation collapses on mobile
- [ ] All forms render correctly
- [ ] Tables display properly
- [ ] Color picker works
- [ ] Language selector functions
- [ ] Wizard dialogs operate correctly
- [ ] LED simulator displays
- [ ] Dark mode still works
- [ ] All buttons respond to clicks
- [ ] Responsive behavior on mobile devices
- [ ] Instance switching works
- [ ] Settings save/load properly

### Browser Compatibility:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers

## Additional Recommendations

### 1. **Consider Upgrading Third-Party Libraries**
Some libraries may have Bootstrap 5 compatible versions:
- `bootstrap-select`: Check for Bootstrap 5 version
- `bootstrap-toggle`: May need replacement with Bootstrap 5 switches
- `bootstrap-colorpicker`: Verify Bootstrap 5 compatibility

### 2. **Review Custom CSS**
- Check `hyperion.css` for Bootstrap 3-specific overrides
- Check `darkMode.css` and `darkModeBlack.css` for panel/well references
- Update any hardcoded Bootstrap 3 class names

### 3. **JavaScript Review**
- Search for other files using `data-toggle`, `data-dismiss`
- Look for `.modal()` jQuery calls
- Check for panel/well related JavaScript

### 4. **Future Improvements**
- Consider migrating from jQuery to vanilla JavaScript
- Update to Bootstrap 5 native form validation
- Replace deprecated plugins with Bootstrap 5 equivalents

## Rollback Plan
If issues arise:
1. Revert `index.html` to use Bootstrap 3 CDN
2. Revert changes to `ui_utils.js`
3. Revert `sb-admin-2.js`
4. Remove `bootstrap5-compat.css`

## Support Resources
- [Bootstrap 5 Migration Guide](https://getbootstrap.com/docs/5.3/migration/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.3/)
- [Bootstrap 5 Examples](https://getbootstrap.com/docs/5.3/examples/)

## Notes
- The compatibility CSS file provides a safety net for gradual migration
- Some third-party plugins may require updates or replacements
- Test thoroughly across all pages and features
- Monitor browser console for JavaScript errors
- Check network tab for any broken resource links
