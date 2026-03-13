const ledLayout = (() => {
  function round(number) {
    let factor = Math.pow(10, 4);
    let tempNumber = number * factor;
    let roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
  };

  function createFinalArray(array) {
    let finalLedArray = [];
    for (let i = 0; i < array.length; i++) {
      const hmin = array[i].hmin;
      const hmax = array[i].hmax;
      const vmin = array[i].vmin;
      const vmax = array[i].vmax;
      finalLedArray[i] = { hmax, hmin, vmax, vmin }
    }
    return finalLedArray;
  }

  function rotateArray(array, times) {
    if (times > 0) {
      while (times--) {
        array.push(array.shift())
      }
      return array;
    }
    else {
      while (times++) {
        array.unshift(array.pop())
      }
      return array;
    }
  }

  function valScan(val) {
    if (val > 1)
      return 1;
    if (val < 0)
      return 0;
    return val;
  }

  function ovl(scan, val, overlap) {
    if (scan === "+")
      return valScan(val + overlap);
    else
      return valScan(val - overlap);
  }

  function addClassicLedElement(hmin, hmax, vmin, vmax) {
    hmin = round(hmin);
    hmax = round(hmax);
    vmin = round(vmin);
    vmax = round(vmax);
    return { hmin, hmax, vmin, vmax };
  }

  function addMatrixLedElement(x, y, left, hblock, top, vblock) {
    const hscanMin = left + (x * hblock)
    const hscanMax = left + (x + 1) * hblock
    const vscanMin = top + y * vblock
    const vscanMax = top + (y + 1) * vblock

    let hmin = round(hscanMin);
    let hmax = round(hscanMax);
    let vmin = round(vscanMin);
    let vmax = round(vscanMax);
    return { hmin, hmax, vmin, vmax };
  }

  function createTopLeds(params) {
    let ledLayoutElements = [];
    const edgeHGap = params.edgeVGap / (16 / 9);
    const steph = (params.pttrh - params.pttlh - (2 * edgeHGap)) / params.ledstop;
    const stepv = (params.pttrv - params.pttlv) / params.ledstop;

    for (let i = 0; i < params.ledstop; i++) {
      const hmin = ovl("-", params.pttlh + (steph * Number([i])) + edgeHGap, params.overlap);
      const hmax = ovl("+", params.pttlh + (steph * Number([i + 1])) + edgeHGap, params.overlap);
      const vmin = params.pttlv + (stepv * Number([i]));
      const vmax = vmin + params.ledsHDepth;
      ledLayoutElements.push(addClassicLedElement(hmin, hmax, vmin, vmax));
    }
    return ledLayoutElements;
  }

  function createRightLeds(params) {
    let ledLayoutElements = [];
    const steph = (params.ptbrh - params.pttrh) / params.ledsright;
    const stepv = (params.ptbrv - params.pttrv - (2 * params.edgeVGap)) / params.ledsright;

    for (let i = 0; i < params.ledsright; i++) {
      const hmax = params.pttrh + (steph * Number([i + 1]));
      const hmin = hmax - params.ledsVDepth;
      const vmin = ovl("-", params.pttrv + (stepv * Number([i])) + params.edgeVGap, params.overlap);
      const vmax = ovl("+", params.pttrv + (stepv * Number([i + 1])) + params.edgeVGap, params.overlap);
      ledLayoutElements.push(addClassicLedElement(hmin, hmax, vmin, vmax));
    }
    return ledLayoutElements;
  }

  function createBottomLeds(params) {
    let ledLayoutElements = [];
    const edgeHGap = params.edgeVGap / (16 / 9);
    const steph = (params.ptbrh - params.ptblh - (2 * edgeHGap)) / params.ledsbottom;
    const stepv = (params.ptbrv - params.ptblv) / params.ledsbottom;

    for (let i = params.ledsbottom - 1; i > -1; i--) {
      const hmin = ovl("-", params.ptblh + (steph * Number([i])) + edgeHGap, params.overlap);
      const hmax = ovl("+", params.ptblh + (steph * Number([i + 1])) + edgeHGap, params.overlap);
      const vmax = params.ptblv + (stepv * Number([i]));
      const vmin = vmax - params.ledsHDepth;
      ledLayoutElements.push(addClassicLedElement(hmin, hmax, vmin, vmax));
    }
    return ledLayoutElements;
  }

  function createLeftLeds(params) {
    let ledLayoutElements = [];
    const steph = (params.ptblh - params.pttlh) / params.ledsleft;
    const stepv = (params.ptblv - params.pttlv - (2 * params.edgeVGap)) / params.ledsleft;

    for (let i = params.ledsleft - 1; i > -1; i--) {
      const hmin = params.pttlh + (steph * Number([i]));
      const hmax = hmin + params.ledsVDepth;
      const vmin = ovl("-", params.pttlv + (stepv * Number([i])) + params.edgeVGap, params.overlap);
      const vmax = ovl("+", params.pttlv + (stepv * Number([i + 1])) + params.edgeVGap, params.overlap);
      ledLayoutElements.push(addClassicLedElement(hmin, hmax, vmin, vmax));
    }
    return ledLayoutElements;
  }

  function calculateStartAndEnd(start, isVertical, ledshoriz, ledsvert) {
    const [posY, posX] = start.split('-');
    let [startA, endA] = posX === 'right' ? [ledshoriz - 1, 0] : [0, ledshoriz - 1];
    let [startB, endB] = posY === 'bottom' ? [ledsvert - 1, 0] : [0, ledsvert - 1];

    if (!isVertical) {
      [startA, endA, startB, endB] = [startB, endB, startA, endA];
    }

    return { startA, endA, startB, endB };
  }
  function createMatrixLayout(startEnd, isParallel, isVertical, left, hblock, top, vblock) {

    let { startA, endA, startB, endB } = startEnd;
    const directionA = startA < endA;
    let directionB = startB < endB;
    let stepA = directionA ? 1 : -1

    let layout = [];
    for (let a = startA; (directionA ? a <= endA : a >= endA); a += stepA) {

      let stepB = directionB ? 1 : -1
      for (let b = startB; (directionB ? b <= endB : b >= endB); b += stepB) {
        const [x, y] = isVertical ? [a, b] : [b, a];
        layout.push(addMatrixLedElement(x, y, left, hblock, top, vblock));
      }
      if (!isParallel) {
        directionB = !directionB;
        [startB, endB] = [endB, startB];
      }
    }
    return layout;
  }

  return {
    createClassicLedLayoutSimple: function (ledstop, ledsleft, ledsright, ledsbottom, position, reverse) {
      let params = {
        ledstop: 0, ledsleft: 0, ledsright: 0, ledsbottom: 0,
        ledsglength: 0, ledsgpos: 0, position: 0,
        ledsHDepth: 0.08, ledsVDepth: 0.05, overlap: 0,
        edgeVGap: 0,
        ptblh: 0, ptblv: 1, ptbrh: 1, ptbrv: 1,
        pttlh: 0, pttlv: 0, pttrh: 1, pttrv: 0,
        reverse: false
      };

      params.ledstop = ledstop;
      params.ledsleft = ledsleft;
      params.ledsright = ledsright;
      params.ledsbottom = ledsbottom;
      params.position = position;
      params.reverse = reverse;

      return createClassicLedLayout(params);
    },

    createClassicLedLayout: function (params) {

      let ledLayout = [
        ...createTopLeds(params),
        ...createRightLeds(params),
        ...createBottomLeds(params),
        ...createLeftLeds(params)
      ];

      //check led gap pos
      if (params.ledsgpos + params.ledsglength > ledLayout.length) {
        const mpos = Math.max(0, ledLayout.length - params.ledsglength);
        params.ledsgpos = mpos;
      }

      //check led gap length
      if (params.ledsglength >= ledLayout.length) {
        params.ledsglength = ledLayout.length - params.ledsglength - 1;
      }

      if (params.ledsglength != 0) {
        ledLayout.splice(params.ledsgpos, params.ledsglength);
      }

      if (params.position != 0) {
        rotateArray(ledLayout, params.position);
      }

      if (params.reverse)
        ledLayout.reverse();

      return createFinalArray(ledLayout);
    },
    createMatrixLayout: function (ledshoriz, ledsvert, cabling, start, direction, gap) {
      // Big thank you to RanzQ (Juha Rantanen) from Github for this script
      // https://raw.githubusercontent.com/RanzQ/hyperion-audio-effects/master/matrix-config.js

      let isParallel = cabling === "parallel";

      let isVertical = direction === 'vertical'
      let ledLayout = [];
      const hblock = (1.0 - gap.left - gap.right) / ledshoriz;
      const vblock = (1.0 - gap.top - gap.bottom) / ledsvert;

      const startEnd = calculateStartAndEnd(start, isVertical, ledshoriz, ledsvert);
      ledLayout = createMatrixLayout(startEnd, isParallel, isVertical, gap.left, hblock, gap.top, vblock);

      return ledLayout;
    },

    getBlackListLeds: function (nonBlacklistLedArray, blackList) {
      let blacklistedLedArray = [...nonBlacklistLedArray];

      if (blackList && blackList.length > 0) {
        const layoutSize = blacklistedLedArray.length;

        for (let item of blackList) {
          const { start, num } = item;

          if (start >= 0 && start < layoutSize) {
            const end = Math.min(start + num, layoutSize);

            for (let i = start; i < end; i++) {
              blacklistedLedArray[i] = { hmax: 0, hmin: 0, vmax: 0, vmin: 0 };
            }
          }
        }
      }
      return blacklistedLedArray;
    }
  };

})();

export { ledLayout };
