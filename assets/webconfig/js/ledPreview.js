
const ledPreview = (() => {

  let configPanelType = "text";

let imageCanvasNodeCtx;

let toggleKeystoneCorrectionArea = false;
let topLeftPoint = null;
let topRightPoint = null;
let bottomRightPoint = null;
let bottomLeftPoint = null;
let topLeft2topRight = null;
let topRight2bottomRight = null;
let bottomRight2bottomLeft = null;
let bottomLeft2topLeft = null;

  function createLedPreview(leds, configPanel) {

    if (configPanel) {
      configPanelType = configPanel;
    }

    console.log("createLedPreview - configPanelType: ", configPanelType);

    if (configPanelType == "classic") {
    $('#previewcreator').html($.i18n('conf_leds_layout_preview_originCL'));
    $('#leds_preview').css("padding-top", "56.25%");
  }
    else if (configPanelType == "text") {
    $('#previewcreator').html($.i18n('conf_leds_layout_preview_originTEXT'));
    $('#leds_preview').css("padding-top", "56.25%");
  }
    else if (configPanelType == "matrix") {
    $('#previewcreator').html($.i18n('conf_leds_layout_preview_originMA'));
    $('#leds_preview').css("padding-top", "100%");
  }

  $('#previewledcount').html($.i18n('conf_leds_layout_preview_totalleds', leds.length));
  $('#previewledpower').html($.i18n('conf_leds_layout_preview_ledpower', ((leds.length * 0.06) * 1.1).toFixed(1)));

  $('.st_helper').css("border", "8px solid grey");

  const canvas_height = $('#leds_preview').innerHeight();
  const canvas_width = $('#leds_preview').innerWidth();

  imageCanvasNodeCtx = document.getElementById("image_preview").getContext("2d");
  $('#image_preview').css({ "width": canvas_width, "height": canvas_height });

  let leds_html = "";
  for (let idx = leds.length - 1; idx >= 0; idx--) {
    const led = leds[idx];
    const led_id = 'ledc_' + [idx];
    const bgcolor = "background-color:hsla(" + (idx * 360 / leds.length) + ",100%,50%,0.75);";
    const pos = "left:" + (led.hmin * canvas_width) + "px;" +
      "top:" + (led.vmin * canvas_height) + "px;" +
      "width:" + ((led.hmax - led.hmin) * (canvas_width - 1)) + "px;" +
      "height:" + ((led.vmax - led.vmin) * (canvas_height - 1)) + "px;";
    leds_html += '<div id="' + led_id + '" class="led" style="' + bgcolor + pos + '" title="' + idx + '"><span id="' + led_id + '_num" class="led_prev_num">' + ((led.name) ? led.name : idx) + '</span></div>';
  }

  $('#leds_preview').html(leds_html);
  $('#ledc_0').css({ "background-color": "black", "z-index": "12" });
  $('#ledc_1').css({ "background-color": "grey", "z-index": "11" });
  $('#ledc_2').css({ "background-color": "#A9A9A9", "z-index": "10" });

  if ($('#leds_prev_toggle_num').hasClass('btn-success')) {
    $('.led_prev_num').css("display", "inline");
  }

    //if (onLedLayoutTab && configPanelType == "classic" && toggleKeystoneCorrectionArea) {

    if (configPanelType == "classic" && toggleKeystoneCorrectionArea) {

    // Calculate corner size (min/max:10px/18px)
    const size = Math.min(Math.max(canvas_width / 100 * 2, 10), 18);
    const corner_size = "width:" + size + "px; height:" + size + "px;";

    const corners = '<div id="top_left_point" class="keystone_correction_corners cursor_nwse" style="' + corner_size + '"></div>' +
      '<div id="top_right_point" class="keystone_correction_corners cursor_nesw" style="' + corner_size + '"></div>' +
      '<div id="bottom_right_point" class="keystone_correction_corners cursor_nwse" style="' + corner_size + '"></div>' +
      '<div id="bottom_left_point" class="keystone_correction_corners cursor_nesw" style="' + corner_size + '"></div>';
    $('#keystone_correction_area').html(corners).css({ "width": canvas_width, "height": canvas_height });

    const top_left_point = document.getElementById('top_left_point'), top_right_point = document.getElementById('top_right_point'), bottom_right_point = document.getElementById('bottom_right_point'), bottom_left_point = document.getElementById('bottom_left_point');

    const maxWidth = $('#keystone_correction_area').innerWidth(), maxHeight = $('#keystone_correction_area').innerHeight();

    // Deactivate build-in cursor
    PlainDraggable.draggableCursor = false;
    PlainDraggable.draggingCursor = false;

    // Top Left Point
    topLeftPoint = new PlainDraggable(top_left_point, {
      containment: {
        left: parseInt($('#keystone_correction_area').offset().left - size / 2),
        top: parseInt($('#keystone_correction_area').offset().top - size / 2),
        width: parseInt(maxWidth + $('#top_left_point').outerWidth()),
        height: parseInt(maxHeight + $('#top_left_point').outerHeight()),
      },
      onMove: function (newPosition) {
        const keystone_correction_area_offsets = $('#keystone_correction_area').offset();
        const left = newPosition.left - keystone_correction_area_offsets.left + size / 2;
        const top = newPosition.top - keystone_correction_area_offsets.top + size / 2;
        const ptlh = Math.min(Math.max((((left * 1) / maxWidth).toFixed(2) * 100).toFixed(0), 0), 100);
        const ptlv = Math.min(Math.max((((top * 1) / maxHeight).toFixed(2) * 100).toFixed(0), 0), 100);

        $('#ip_cl_ptlh').val(ptlh);
        $('#ip_cl_ptlv').val(ptlv);
        $("#ip_cl_ptlh, #ip_cl_ptlv").trigger("change");
      }
    });

    // Initialize position
    topLeftPoint.left = $('#keystone_correction_area').offset().left + maxWidth / 100 * $('#ip_cl_ptlh').val() - size / 2;
    topLeftPoint.top = $('#keystone_correction_area').offset().top + maxHeight / 100 * $('#ip_cl_ptlv').val() - size / 2;

    // Top right point
    topRightPoint = new PlainDraggable(top_right_point, {
      containment: {
        left: parseInt($('#keystone_correction_area').offset().left - $('#top_right_point').outerWidth() + size / 2),
        top: parseInt($('#keystone_correction_area').offset().top - size / 2),
        width: parseInt(maxWidth + $('#top_right_point').outerWidth()),
        height: parseInt(maxHeight + $('#top_right_point').outerHeight())
      },
      onMove: function (newPosition) {
        const keystone_correction_area_offsets = $('#keystone_correction_area').offset();
        const left = newPosition.left - keystone_correction_area_offsets.left + $('#top_right_point').outerWidth() - size / 2;
        const top = newPosition.top - keystone_correction_area_offsets.top + size / 2;
        const ptrh = Math.min(Math.max((((left * 1) / maxWidth).toFixed(2) * 100).toFixed(0), 0), 100);
        const ptrv = Math.min(Math.max((((top * 1) / maxHeight).toFixed(2) * 100).toFixed(0), 0), 100);

        $('#ip_cl_ptrh').val(ptrh);
        $('#ip_cl_ptrv').val(ptrv);
        $("#ip_cl_ptrh, #ip_cl_ptrv").trigger("change");
      }
    });

    // Initialize position
    topRightPoint.left = $('#keystone_correction_area').offset().left + maxWidth / 100 * $('#ip_cl_ptrh').val() - size / 2;
    topRightPoint.top = $('#keystone_correction_area').offset().top + maxHeight / 100 * $('#ip_cl_ptrv').val() - size / 2;

    // Bottom right point
    bottomRightPoint = new PlainDraggable(bottom_right_point, {
      containment: {
        left: parseInt($('#keystone_correction_area').offset().left - $('#bottom_right_point').outerWidth() + size / 2),
        top: parseInt($('#keystone_correction_area').offset().top - $('#bottom_right_point').outerHeight() + size / 2),
        width: parseInt(maxWidth + $('#bottom_right_point').outerWidth()),
        height: parseInt(maxHeight + $('#bottom_right_point').outerHeight())
      },
      onMove: function (newPosition) {
        const keystone_correction_area_offsets = $('#keystone_correction_area').offset();
        const left = newPosition.left - keystone_correction_area_offsets.left + $('#bottom_right_point').outerWidth() - size / 2;
        const top = newPosition.top - keystone_correction_area_offsets.top + $('#bottom_right_point').outerHeight() - size / 2;
        const pbrh = Math.min(Math.max((((left * 1) / maxWidth).toFixed(2) * 100).toFixed(0), 0), 100);
        const pbrv = Math.min(Math.max((((top * 1) / maxHeight).toFixed(2) * 100).toFixed(0), 0), 100);

        $('#ip_cl_pbrh').val(pbrh);
        $('#ip_cl_pbrv').val(pbrv);
        $("#ip_cl_pbrh, #ip_cl_pbrv").trigger("change");
      }
    });

    // Initialize position
    bottomRightPoint.left = $('#keystone_correction_area').offset().left + maxWidth / 100 * $('#ip_cl_pbrh').val() - size / 2;
    bottomRightPoint.top = $('#keystone_correction_area').offset().top + maxHeight / 100 * $('#ip_cl_pbrv').val() - size / 2;

    // Bottom left point
    bottomLeftPoint = new PlainDraggable(bottom_left_point, {
      containment: {
        left: parseInt($('#keystone_correction_area').offset().left - size / 2),
        top: parseInt($('#keystone_correction_area').offset().top - $('#bottom_left_point').outerHeight() + size / 2),
        width: parseInt(maxWidth + $('#bottom_left_point').outerWidth()),
        height: parseInt(maxHeight + $('#bottom_left_point').outerHeight())
      },
      onMove: function (newPosition) {
        const keystone_correction_area_offsets = $('#keystone_correction_area').offset();
        const left = newPosition.left - keystone_correction_area_offsets.left + size / 2;
        const top = newPosition.top - keystone_correction_area_offsets.top + $('#bottom_left_point').outerHeight() - size / 2;
        const pblh = Math.min(Math.max((((left * 1) / maxWidth).toFixed(2) * 100).toFixed(0), 0), 100);
        const pblv = Math.min(Math.max((((top * 1) / maxHeight).toFixed(2) * 100).toFixed(0), 0), 100);

        $('#ip_cl_pblh').val(pblh);
        $('#ip_cl_pblv').val(pblv);
        $("#ip_cl_pblh, #ip_cl_pblv").trigger("change");
      }
    });

    // Initialize position
    bottomLeftPoint.left = $('#keystone_correction_area').offset().left + maxWidth / 100 * $('#ip_cl_pblh').val() - size / 2;
    bottomLeftPoint.top = $('#keystone_correction_area').offset().top + maxHeight / 100 * $('#ip_cl_pblv').val() - size / 2;

    // Remove existing lines
    if (topLeft2topRight != null) {
      topLeft2topRight.remove();
    }

    if (topRight2bottomRight != null) {
      topRight2bottomRight.remove();
    }

    if (bottomRight2bottomLeft != null) {
      bottomRight2bottomLeft.remove();
    }

    if (bottomLeft2topLeft != null) {
      bottomLeft2topLeft.remove();
    }

    // Get border color from keystone correction corners
    const lineColor = $(".keystone_correction_corners").css("border-color");

    // Add lines
    topLeft2topRight = new LeaderLine(LeaderLine.pointAnchor(top_left_point, { x: '50%', y: '50%' }), LeaderLine.pointAnchor(top_right_point, { x: '50%', y: '50%' }), { path: 'straight', size: 1, color: lineColor, endPlug: 'behind' });
    topRight2bottomRight = new LeaderLine(LeaderLine.pointAnchor(top_right_point, { x: '50%', y: '50%' }), LeaderLine.pointAnchor(bottom_right_point, { x: '50%', y: '50%' }), { path: 'straight', size: 1, color: lineColor, endPlug: 'behind' });
    bottomRight2bottomLeft = new LeaderLine(LeaderLine.pointAnchor(bottom_right_point, { x: '50%', y: '50%' }), LeaderLine.pointAnchor(bottom_left_point, { x: '50%', y: '50%' }), { path: 'straight', size: 1, color: lineColor, endPlug: 'behind' });
    bottomLeft2topLeft = new LeaderLine(LeaderLine.pointAnchor(bottom_left_point, { x: '50%', y: '50%' }), LeaderLine.pointAnchor(top_left_point, { x: '50%', y: '50%' }), { path: 'straight', size: 1, color: lineColor, endPlug: 'behind' });
  } else {
    $('#keystone_correction_area').html("").css({ "width": 0, "height": 0 });

    // Remove existing lines
    if (topLeft2topRight != null) {
      topLeft2topRight.remove();
      topLeft2topRight = null;
    }

    if (topRight2bottomRight != null) {
      topRight2bottomRight.remove();
      topRight2bottomRight = null;
    }

    if (bottomRight2bottomLeft != null) {
      bottomRight2bottomLeft.remove();
      bottomRight2bottomLeft = null;
    }

    if (bottomLeft2topLeft != null) {
      bottomLeft2topLeft.remove();
      bottomLeft2topLeft = null;
    }
  }

  // Change on window resize. Is this correct?
  $(window).off("resize.createLedPreview");
    $(window).on("resize.createLedPreview", (function () {
      console.log("ledPreview -on resize.createLedPreview ");
    createLedPreview(leds);
  }));
}

// toggle keystone correction area
$('#leds_prev_toggle_keystone_correction_area').off().on("click", function () {
  toggleKeystoneCorrectionArea = !toggleKeystoneCorrectionArea
  toggleClass('#leds_prev_toggle_keystone_correction_area', "btn-success", "btn-danger");
  window.dispatchEvent(new Event('resize'));
});

$(window.hyperion).on("cmd-ledcolors-imagestream-update", function (event) {
  //Only update Image, if LED Layout Tab is visible
  //if (onLedLayoutTab && window.imageStreamActive) {

    if (window.imageStreamActive) {
    setClassByBool('#leds_prev_toggle_live_video', window.imageStreamActive, "btn-danger", "btn-success");
    const imageData = (event.response.result.image);

    let image = new Image();
    image.onload = function () {
      imageCanvasNodeCtx.drawImage(image, 0, 0, imageCanvasNodeCtx.canvas.width, imageCanvasNodeCtx.canvas.height);
    };
    image.src = imageData;
  }
});

// toggle fullscreen button in led preview
$(".fullscreen-btn").mousedown(function (e) {
  e.preventDefault();
});

$(".fullscreen-btn").click(function (e) {
  e.preventDefault();
  $(this).children('i')
    .toggleClass('fa-expand')
    .toggleClass('fa-compress');
  $('#layout_type').toggle();
  $('#layout_preview').toggleClass('col-lg-6 col-lg-12');
  window.dispatchEvent(new Event('resize'));
});

// toggle led numbers
$('#leds_prev_toggle_num').off().on("click", function () {
  $('.led_prev_num').toggle();
  toggleClass('#leds_prev_toggle_num', "btn-danger", "btn-success");
});

// toggle live video
$('#leds_prev_toggle_live_video').off().on("click", function () {
  setClassByBool('#leds_prev_toggle_live_video', window.imageStreamActive, "btn-success", "btn-danger");

  //if (onLedLayoutTab && window.imageStreamActive) {
    if (window.imageStreamActive) {
    imageCanvasNodeCtx.clear();
    if (!$('#leds_toggle_live_video').hasClass("btn-success")) {
      requestLedImageStop();
    }
  }
  else {
    requestLedImageStart();
  }
});

// open checklist
$('#leds_prev_checklist').off().on("click", function () {
  const liList = [$.i18n('conf_leds_layout_checkp1'), $.i18n('conf_leds_layout_checkp3'), $.i18n('conf_leds_layout_checkp2'), $.i18n('conf_leds_layout_checkp4')];
  let ul = document.createElement("ul");
  ul.className = "checklist"

  for (let item of liList) {
    let li = document.createElement("li");
    li.innerHTML = item;
    ul.appendChild(li);
  }

  showInfoDialog('checklist', "", ul);
});

  return {

    createLedPreview: function (leds, type) {
      createLedPreview(leds, type);
    }
  };

})();

export { ledPreview };
