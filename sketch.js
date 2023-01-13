'use strict';

// loaded once, not expected to change
const assets = new function() {
  this.font = null;
  this.localization = null;
}();

// updated from application actions (keyboard, or business logic)
let applicationGlobalState = new function() {
  this.nextGroupName = null;
  this.isCtrlButtonDown = false;
  this.isAltButtonDown = false;
  this.isShiftButtonDown = false;
  this.draggedEndpoints = null;
  this.imgView = null;
  this.measurementsGuiComposer = null;
  this.gui = null;
  this.loadedImage;
}();

// bound to be visualized in GUI, and receiving new values from GUI
let generalSettings = new function() {
  this.crosshairEnabled = true;
  this.language = 'Russian';
  this.languageGuiToId = {'Russian': 'RUS', 'English': 'ENG'};
  this.lineWidth = 15;
  this.textWidth = 20;
  this.textFloatPrecision = 3;
  this.guiOpacity = 0.9;
  this.guiWidth = 325;
  this.guiTheme = 'yorha';
  this.guiAskUnsaved = true;
  this.allowSnapping = true;
}();

let crosshairSettings = new function() {
  this.crosshairEnabled = true;
  this.crosshairLinesEnd = 15;
  this.crosshairRadius = 0;
  this.crosshairColor = '#ffff00';
  this.invertColor = true;
}();

let imageViewSettings = new function() {
  this.panX = 0;
  this.panY = 0;
  this.zoom = 1;
  this.zoomMin = 0.01;
  this.zoomMax = 100;
  this.zoomSensitivity = 0.0005;
}();

function getLocalized(key, localizationObj=assets.localization) {
  if (key in localizationObj) {
    return localizationObj[key][generalSettings.languageGuiToId[generalSettings.language]];
  }
  console.warn(key, ' missing localization');
  return key;
}

function pointToLinePerpVector(pointVec, beginVec, endVec, lineMagSq) {
  const lineVec = p5.Vector.sub(endVec, beginVec); //.div(lineMagSq);
  const beginToPoint = p5.Vector.sub(pointVec, beginVec);
  const projFromOrigin = lineVec.dot(beginToPoint) / lineMagSq;
  const projVec = lineVec.mult(projFromOrigin).add(beginVec);
  return projVec.sub(pointVec);
}

function pointToLineDistanceSq(pointVec, beginVec, endVec, lineMagSq) {
  if (lineMagSq === undefined) { // optional precomputed line magnitude
    lineMagSq = p5.Vector.sub(beginVec, endVec).magSq();
  }
  const numeratorSqr = ((endVec.x - beginVec.x)*(beginVec.y - pointVec.y) - (beginVec.x - pointVec.x)*(endVec.y - beginVec.y));
  return numeratorSqr*numeratorSqr/ lineMagSq;
}

class ImageAABBView {
  constructor() {
    this.screenBbox = null;
  }

  getScreenBbox() {
    return this.screenBbox
  }
  updateScreenBbox(imageWidth, imageHeight, screenWidth, screenHeight, zoom, panX, panY) {
    let bboxWidth = imageWidth*zoom;
    let bboxHeight = imageHeight*zoom;
    this.screenBbox = {
      left: screenWidth/2-bboxWidth/2 - panX*bboxWidth,
      width: bboxWidth,
      top: screenHeight/2-bboxHeight/2 - panY*bboxHeight,
      height: bboxHeight,
    }
  }
}

function setupGui(guifyInstance) {
  if (guifyInstance !== undefined) {
    let guifyContainers = document.getElementsByClassName('guify-container');
    for (let element of guifyContainers) {
        element.remove();
    }
    print('Deleted GUI instances');
  }

  guifyInstance = new guify({
    title:  getLocalized('title'),
    theme: generalSettings.guiTheme, // dark, light, yorha, or theme object
    align: 'right', // left, right
    width: generalSettings.guiWidth,
    barMode: 'above', // none, overlay, above, offset
    panelMode: 'inner',
    panelOverflowBehavior: 'scroll',
    pollRateMS: 200,
    opacity: generalSettings.guiOpacity,
    open: true
  });
  guifyInstance.panel.container.mouseIsOver = false;
  guifyInstance.panel.container.onmouseover = function()   {
    this.mouseIsOverGui = true;
  };
  guifyInstance.panel.container.onmouseleave = function()   {
    this.mouseIsOverGui = false;
    print('No longer mouse on GUI;')
  };
  document.title = getLocalized('title');
  guifyInstance.Register([
    {
      type: 'select',
      options: ['Russian', 'English'],
      label: getLocalized('language'),
      object: generalSettings,
      property: 'language',
      onChange: () => {
        setupGui(guifyInstance);
      },
    },
    {
      type: 'checkbox',
      label: getLocalized('guiAskUnsaved'),
      property: 'guiAskUnsaved',
      object: generalSettings,
    },
    {
      type: 'checkbox',
      label: getLocalized('allowSnapping'),
      property: 'allowSnapping',
      object: generalSettings,
    },
  ]);
  let guiFile = guifyInstance.Register({
      type: 'file',
      label: getLocalized('openImageFiles'),
      object: this,
      onChange: (data) => {
        if (!generalSettings.guiAskUnsaved || confirm(getLocalized('loosingUnsavedDialog'))) {
          loadTreeImage(data);
        } else {
          print('Cancel openning of file');
        }
      }
  });
  guiFile.container.lastChild.innerText = "";
  guifyInstance.Register({
      type: 'button',
      label: getLocalized('guiLoadMeasurementsPreset'),
      action: () => {
        if (applicationGlobalState.measurementsGuiComposer.groups.length > 0 
            && generalSettings.guiAskUnsaved
            && !confirm(getLocalized('loosingUnsavedDialog'))) {
          return;
        }
        loadMeasurementsPreset(guifyInstance,
          applicationGlobalState.measurementsGuiComposer,
          applicationGlobalState.loadedImage.width,
          applicationGlobalState.loadedImage.height)
      }
  });
  guifyInstance.Register([
    { type: 'folder', label: getLocalized('settingsFolder'), open: false },
    { type: 'folder', label: getLocalized('guiFolder'), folder: getLocalized('settingsFolder'), open: false },
    { type: 'folder', label: getLocalized('crosshairFolder'),  folder: getLocalized('settingsFolder'), open: false },
    { type: 'folder', label: getLocalized('zoomFolder'),  folder: getLocalized('settingsFolder'), open: false },
    { type: 'folder', label: getLocalized('lineFolder'),  folder: getLocalized('settingsFolder'), open: false },
    { type: 'folder', label: getLocalized('measuresFolder'), open: true },
  ]);

  const guiWidthInitFunc = function(data) {
    print('Resize GUI', data);
    let value = data+'px';
    document.getElementsByClassName('guify-panel-container')[0].style.width = value;
  };
  guiWidthInitFunc(generalSettings.guiWidth);

  guifyInstance.Register([
    {
      type: 'range',
      label: getLocalized('guiOpacity'),
      min: 0.1, max: 1.0, step: 0.05,
      object: generalSettings,
      property: 'guiOpacity',
      onChange: (data) => {
        document.getElementsByClassName('guify-panel-container')[0].style.opacity = data;
      }
    },
    {
      type: 'select',
      label: getLocalized('guiWidth'),
      options: [250, 325, 375, 600],
      object: generalSettings,
      property: 'guiWidth',
      onInitialize: guiWidthInitFunc,
      onChange: guiWidthInitFunc
    },

    {
      type: 'select',
      label: getLocalized('guiTheme'),
      options: ['yorha', 'dark', 'light'],
      object: generalSettings,
      property: 'guiTheme',
      onChange: (data) => {
        setupGui(guifyInstance);
      }
    },
  ], { object: generalSettings, folder: getLocalized('guiFolder') });

  guifyInstance.Register([
    { type: 'button',label: getLocalized('zoomReset'), action: resetZoom },
    {
      type: 'range', label: getLocalized('zoomX'),
      property: 'panX', min: -0.5, max: 0.5, step: 0.01,
    },
    {
      type: 'range',label: getLocalized('zoomY'),
      property: 'panY', min: -0.5, max: 0.5, step: 0.01,
    },
    {
      type: 'range', label: getLocalized('zoomLevel'),
      property: 'zoom', scale: 'log',
      min: imageViewSettings.zoomMin, max: imageViewSettings.zoomMax,
    },
  ], { object: imageViewSettings, folder: getLocalized('zoomFolder') });

  guifyInstance.Register([
    {
      type: 'checkbox', label: getLocalized('crosshairEnabled'),
      property: 'crosshairEnabled',
    },
    {
      type: 'range', label: getLocalized('crosshairRadius'),
      property: 'crosshairRadius', min: 0, max: 50, step: 1,
    },

    {
      type: 'range', label: getLocalized('crosshairLinesEnd'),
      property: 'crosshairLinesEnd', min: 1, max: 50, step: 1,
    },
    {
      type: 'color', label: getLocalized('crosshairColor'),
      property: 'crosshairColor', format: 'hex',
    },
    { type: 'checkbox', label: getLocalized('crosshairInvertColor'), property: 'invertColor', },
  ], { object: crosshairSettings, folder: getLocalized('crosshairFolder') });

  guifyInstance.Register({
    type: 'range',
    label: getLocalized('guiLineWidth'),
    folder: getLocalized('lineFolder'),
    min: 1, max: 100, step: 1,
    object: generalSettings,
    property: 'lineWidth',
  });

  guifyInstance.Register({
    type: 'range',
    label: getLocalized('guiTextWidth'),
    folder: getLocalized('lineFolder'),
    min: 1, max: 100, step: 1,
    object: generalSettings,
    property: 'textWidth',
  });
  guifyInstance.Register({
    type: 'range',
    label: getLocalized('guiTextFloatPrecision'),
    folder: getLocalized('lineFolder'),
    min: 1, max: 25, step: 1,
    object: generalSettings,
    property: 'textFloatPrecision',
  });

  guifyInstance.Register({
    type: 'text',
    listenMode: 'change',
    label: getLocalized('guiNewGroupName'),
    folder: getLocalized('measuresFolder'),
    property: 'nextGroupName',
    object: applicationGlobalState,
  });


  guifyInstance.Register({
    type: 'button',
    label: getLocalized('guiNewGroup'),
    folder: getLocalized('measuresFolder'),
    action: () => {
      let groupFolder = applicationGlobalState.nextGroupName;
      let nextNameMatch = applicationGlobalState.nextGroupName.match(/(.*?)(\d*)$/);
      applicationGlobalState.nextGroupName = nextNameMatch[1] + (parseInt(nextNameMatch[2])+1 || 1);
      applicationGlobalState.measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'), groupFolder);
    }
  });

  applicationGlobalState.measurementsGuiComposer = new MeasureGroupGuiComposer();
  applicationGlobalState.measurementsGuiComposer.addViewGui(guifyInstance, null, 1, 1);

  let guifyBarButtons = document.getElementsByClassName('guify-bar-button');
  for (let element of guifyBarButtons) {
    if (element.ariaLabel === null || !element.ariaLabel.includes("screen")) {
        element.innerText = getLocalized('controls');
      }
  }

  return guifyInstance;
}



function loadTreeImage(uri) {
  loadImage(uri, newImg => {
    applicationGlobalState.loadedImage = newImg;
    resetZoom();
    if (applicationGlobalState.measurementsGuiComposer) {
      applicationGlobalState.nextGroupName = getLocalized('defaultGroupName')+0;
      applicationGlobalState.measurementsGuiComposer.removeAllGroups(applicationGlobalState.gui);
      applicationGlobalState.measurementsGuiComposer.updateViewGui(
        applicationGlobalState.loadedImage.width, 
        applicationGlobalState.loadedImage.height);
    }
    print('Loaded image', uri.slice(0, 100));
  });
}

function resetZoom() {
  imageViewSettings.panX = 0;
  imageViewSettings.panY = 0;
  imageViewSettings.zoom = min(
    windowHeight / applicationGlobalState.loadedImage.height,
    windowWidth  / applicationGlobalState.loadedImage.width);
}

function preload() {
  assets.localization = loadJSON('./localization.json');
  assets.font = loadFont('./assets/fonts/inconsolata/Inconsolata-Regular.ttf');
  applicationGlobalState.imgView = new ImageAABBView();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  windowResized();
  applicationGlobalState.gui = setupGui(applicationGlobalState.gui);
  loadTreeImage('./assets/example_trees/000001.jpg');
}

function drawCrosshair({x=0, y=0, beginOffset=0, endOffset=0, colorHexStr="#00000000", blendingMode=BLEND}) {
  push();
  blendMode(blendingMode);
  noFill();
  stroke(colorHexStr);
  strokeWeight(3);
  strokeCap(SQUARE);
  if (beginOffset == 0) {
    line(x - endOffset, y - endOffset, x + endOffset, y + endOffset);
    line(x + endOffset, y - endOffset, x - endOffset, y + endOffset);
  } else {
    line(x + beginOffset, y + beginOffset, x + endOffset, y + endOffset);
    line(x - beginOffset, y + beginOffset, x - endOffset, y + endOffset);
    line(x - beginOffset, y - beginOffset, x - endOffset, y - endOffset);
    line(x + beginOffset, y - beginOffset, x + endOffset, y - endOffset);
    circle(x, y, beginOffset*2);
  }
  pop();
}

function drawMeasurement(lineColor, groupDenotation, measurementData, panX, panY,
  zoom, markWeight, textWeight, floatPrecision, isBaseMeasurement) {
  const beginX = measurementData.begin.x*zoom + panX,
        beginY = measurementData.begin.y*zoom + panY,
        endX = measurementData.end.x*zoom + panX,
        endY = measurementData.end.y*zoom + panY;
  push();

  // compute perpendicular marks
  var perpX = beginY - endY, perpY = endX - beginX;
  const norm = sqrt(perpX*perpX + perpY*perpY);
  const markSize = 2.5*markWeight / norm; 
  perpX *= markSize;
  perpY *= markSize;

  const colorReducer = 25;
  let accentuationColor = color(
    lineColor._getRed()-colorReducer,
    lineColor._getGreen()-colorReducer,
    lineColor._getBlue()-colorReducer, 255);
  push();
  if (isBaseMeasurement) {
    fill(accentuationColor);
    circle(beginX + (endX - beginX)*0.5, beginY + (endY - beginY)*0.5, 15);
  }
  pop();
  line(beginX - perpX, beginY - perpY, beginX + perpX, beginY + perpY);
  line(endX - perpX, endY - perpY, endX + perpX, endY + perpY);

  // main line
  line(beginX, beginY, endX, endY);

  // endpoints dots
  stroke(0, 0, 0);
  point(beginX, beginY);
  point(endX, endY);

  // textboxes color
  if (measurementData == applicationGlobalState.measurementsGuiComposer.getViewedMeasurement()) {
    lineColor.setAlpha(175)
    fill(lineColor);
  } else {
    fill(255, 255, 255, 175);
  }

  // draw measurements text
  textSize(textWeight);
  // print(measurementData.denotationOverride)
  var lengthText = measurementData.denotationOverride || groupDenotation;
  if (!isBaseMeasurement) {
    lengthText += '=' + measurementData.relativeLength.toFixed(floatPrecision).toString();
  }
  if (abs(measurementData.relativeLength - measurementData.absoluteLength) > 0.001) {
    lengthText = lengthText + ' (' + measurementData.absoluteLength.toFixed(floatPrecision) + ')';
  }
  strokeWeight(0);
  let textX = endX + 15*zoom, textY = endY, textPadding = textWeight*0.2;
  let bbox = assets.font.textBounds(lengthText, textX, textY, textWeight);
  rect(bbox.x-textPadding, bbox.y, bbox.w + 2*textPadding, bbox.h);
  fill(0);
  textFont(assets.font);
  text(lengthText, textX, textY);

  pop();
};

function drawMeasurements(panX, panY, zoom) {
  push();
  const lineWeight = generalSettings.lineWidth*(log(zoom+1));
  const markWeight = lineWeight;
  const textWeight = generalSettings.textWidth - zoom*(generalSettings.textWidth - 10)/imageViewSettings.zoomMax;
  strokeCap(SQUARE);
  strokeWeight(lineWeight);
  applicationGlobalState.measurementsGuiComposer.groups.forEach(group => {
    if (!group.data.isRendered) {
      return;
    }
    const groupColor = color(group.data.color);
    stroke(groupColor);
    drawMeasurement(groupColor, group.data.denotation + 0, group.data.baseMeasure,
      panX, panY, zoom, markWeight, textWeight, generalSettings.textFloatPrecision,
      true);
    for (const [idx, measure] of group.data.measures.entries()) {
      drawMeasurement(groupColor, group.data.denotation + (idx + 1), measure, 
      panX, panY, zoom, markWeight, textWeight, generalSettings.textFloatPrecision,
      false);
    }
  });
  pop();
}


function updateMeasurementsLengths() {
  applicationGlobalState.measurementsGuiComposer.groups.forEach(group => {
    const base = group.data.baseMeasure;
    base.pixelLength = p5.Vector.sub(base.end, base.begin).mag();
    base.relativeLength = 1.0;
    base.absoluteLength = group.data.baseAbsoluteLength;
    for (var measure of group.data.measures) {
      measure.pixelLength = p5.Vector.sub(measure.end, measure.begin).mag();
      measure.relativeLength = measure.pixelLength / base.pixelLength;
      measure.absoluteLength = measure.relativeLength * group.data.baseAbsoluteLength;
    }
  });
}

function draw() {
  clear();
  updateMeasurementsLengths();
  if (applicationGlobalState.loadedImage) {
    applicationGlobalState.imgView.updateScreenBbox(
      applicationGlobalState.loadedImage.width,
      applicationGlobalState.loadedImage.height,
      windowWidth, windowHeight,
      imageViewSettings.zoom, imageViewSettings.panX, imageViewSettings.panY);
    let imgViewBbox = applicationGlobalState.imgView.getScreenBbox(); 
    image(applicationGlobalState.loadedImage,
      imgViewBbox.left, imgViewBbox.top,
      imgViewBbox.width, imgViewBbox.height);
    if (!applicationGlobalState.isCtrlButtonDown) {
      drawMeasurements(imgViewBbox.left, imgViewBbox.top, imageViewSettings.zoom);
    }
  }

  if (crosshairSettings.crosshairEnabled) {
    drawCrosshair({
      x: mouseX, y: mouseY,
      beginOffset: crosshairSettings.crosshairRadius,
      endOffset: crosshairSettings.crosshairLinesEnd,
      colorHexStr: crosshairSettings.crosshairColor,
      blendingMode: crosshairSettings.invertColor ? DIFFERENCE : BLEND,
    });
    if (crosshairSettings.invertColor) {
      drawCrosshair({
        x: mouseX, y: mouseY,
        beginOffset: crosshairSettings.crosshairRadius,
        endOffset: crosshairSettings.crosshairLinesEnd,
        colorHexStr: "#eeeeee",
        blendingMode: OVERLAY,
      });
    }
    blendMode(BLEND);
  }
}

function windowResized() {
  print(`Resize ${windowWidth}, ${windowHeight}`)
  resizeCanvas(windowWidth, windowHeight);
}

function mouseDragged() {
  if (applicationGlobalState.gui.panel.container.mouseIsOverGui) {
    print('Mouse over GUI');
    return;
  }
  let imgViewBbox = applicationGlobalState.imgView.getScreenBbox();
  if (mouseButton === RIGHT) {
    imageViewSettings.panX -= movedX/imgViewBbox.width;
    imageViewSettings.panY -= movedY/imgViewBbox.height;
  } else if (mouseButton === LEFT) {
    if (applicationGlobalState.draggedEndpoints) {
      let mouseVec = createVector(
        (mouseX-imgViewBbox.left)/imageViewSettings.zoom,
        (mouseY-imgViewBbox.top)/imageViewSettings.zoom);
      var snapDistancePx = 10/imageViewSettings.zoom;
      var lineDistancePx = 5/imageViewSettings.zoom;
      const computeOffsetToNearsetPoint = function(fromPoint, ignorePoints) {
        var offsetToNearestX = -1e6, offsetToNearestY = -1e6;
        const computeSnapping = function(otherPoint) {
          if (ignorePoints && ignorePoints.indexOf(otherPoint) >= 0) {
            return;
          }
          const delta = p5.Vector.sub(otherPoint, fromPoint);
          if (abs(delta.x) <= 1 || abs(delta.y) <= 1) {
            return;
          }
          if (abs(delta.x) < abs(offsetToNearestX)) {
            offsetToNearestX = delta.x;
          }
          if (abs(delta.y) < abs(offsetToNearestY)) {
            offsetToNearestY = delta.y;
          }
        }
        applicationGlobalState.measurementsGuiComposer.forEachPoint(computeSnapping, true);
        // snap to image borders
        computeSnapping(createVector(0, 0));
        computeSnapping(createVector(
          applicationGlobalState.loadedImage.width,
          applicationGlobalState.loadedImage.height));
        return createVector(offsetToNearestX, offsetToNearestY);
      }
      if (applicationGlobalState.draggedEndpoints.length == 1) {
        let draggedPoint = applicationGlobalState.draggedEndpoints[0];
        draggedPoint.x = mouseVec.x;
        draggedPoint.y = mouseVec.y;
        if (applicationGlobalState.isShiftButtonDown || !generalSettings.allowSnapping) { return; } // no snapping
        let offset = computeOffsetToNearsetPoint(draggedPoint);
        if (abs(offset.x) < snapDistancePx) {
          draggedPoint.x = mouseVec.x + offset.x;
        }
        if (abs(offset.y) < snapDistancePx) {
          draggedPoint.y = mouseVec.y + offset.y;
        }
      } else {
        const mouseDelta = createVector(movedX/imageViewSettings.zoom, movedY/imageViewSettings.zoom);
        // let lineOffset = createVector(0, 0);
        // let snappedEndpoint = applicationGlobalState.draggedEndpoints[0];
        // let mouseToBegin = p5.Vector.sub(
        //   applicationGlobalState.draggedEndpoints[1],
        //   snappedEndpoint);
        // let mouseToEnd = p5.Vector.sub(
        //   applicationGlobalState.draggedEndpoints[2],
        //   snappedEndpoint);
        // if (!applicationGlobalState.isShiftButtonDown) { // no snap with ALT
        //   let offset = computeOffsetToNearsetPoint(snappedEndpoint);
        //   if (abs(offset.x) < lineDistancePx) {
        //     lineOffset.x += offset.x;
        //   }
        //   if (abs(offset.y) < lineDistancePx) {
        //     lineOffset.y += offset.y;
        //   }
        // }
        // if (lineOffset.magSq() <= 0) {
        //   snappedEndpoint.set(mouseVec);
        // } else {
        //   snappedEndpoint.add(lineOffset);
        // }
        // applicationGlobalState.draggedEndpoints[1].set(snappedEndpoint).add(mouseToBegin);
        // applicationGlobalState.draggedEndpoints[2].set(snappedEndpoint).add(mouseToEnd);
        applicationGlobalState.draggedEndpoints[1].add(mouseDelta);
        applicationGlobalState.draggedEndpoints[2].add(mouseDelta);
      }
    }
  }
}

function mouseWheel(event) {
  var zoomDelta = -imageViewSettings.zoomSensitivity*exp(imageViewSettings.zoom)*event.delta;
  zoomDelta = constrain(zoomDelta, -imageViewSettings.zoom/5, imageViewSettings.zoom/5);
  imageViewSettings.zoom += zoomDelta;
  imageViewSettings.zoom = constrain(imageViewSettings.zoom, imageViewSettings.zoomMin, imageViewSettings.zoomMax);
  return false;
}

function mousePressed() {
  if (applicationGlobalState.gui.panel.container.mouseIsOverGui) {
    print('Mouse over GUI');
    return;
  }
  if (mouseButton === LEFT) {
    let imgViewBbox = applicationGlobalState.imgView.getScreenBbox();
    let mouseVec = createVector(mouseX-imgViewBbox.left, mouseY-imgViewBbox.top);
    mouseVec.div(imageViewSettings.zoom);
    var nearestDistanceSq = 1e6;
    var nearestEndpointMeasurement = null;
    var nearestEndpoint = null;
    var nearestLineMeasurement = null;
    var nearestLine = null;
    const checkNearestMeasure = function(measure, targetPointDistanceSq, targetLineDistanceSq) {
      const beginToMouse = p5.Vector.sub(measure.begin, mouseVec);
      const mouseToEnd = p5.Vector.sub(mouseVec, measure.end);
      const beginToEnd = p5.Vector.sub(measure.begin, measure.end);
      var beginDistance = beginToMouse.magSq();
      var endDistance = mouseToEnd.magSq();
      const perpendicularToLine = pointToLinePerpVector(mouseVec, measure.begin, measure.end, beginToEnd.magSq());
      const distanceToLine = perpendicularToLine.magSq();
      targetPointDistanceSq = min(targetPointDistanceSq, nearestDistanceSq);
      if (beginDistance <= targetPointDistanceSq || endDistance <= targetPointDistanceSq) {
        if (beginDistance <= targetPointDistanceSq) {
          nearestDistanceSq = beginDistance;
          nearestEndpointMeasurement = measure;
          nearestEndpoint = [measure.begin];
        } else {
          nearestDistanceSq = endDistance;
          nearestEndpointMeasurement = measure;
          nearestEndpoint = [measure.end];
        }
      } else if (distanceToLine < min(targetLineDistanceSq, nearestDistanceSq)
          && beginToMouse.dot(beginToEnd) > 0 
          && mouseToEnd.dot(beginToEnd) > 0) {
        nearestDistanceSq = distanceToLine;
        nearestLineMeasurement = measure;
        nearestLine = [mouseVec.add(perpendicularToLine), measure.begin, measure.end];
      }
    }
    const targetPointDistanceSq = 15*generalSettings.lineWidth/imageViewSettings.zoom;
    const targetLineDistanceSq = generalSettings.lineWidth*generalSettings.lineWidth/imageViewSettings.zoom;
    const onlyVisible = true;
    applicationGlobalState.measurementsGuiComposer.forEachMeasure(
      measure => checkNearestMeasure(measure, targetPointDistanceSq, targetLineDistanceSq), onlyVisible);
    if (nearestEndpoint !== null) {
      applicationGlobalState.draggedEndpoints = nearestEndpoint;
      applicationGlobalState.measurementsGuiComposer.viewMeasurement(nearestEndpointMeasurement);
    } else {
      applicationGlobalState.draggedEndpoints = nearestLine;
      applicationGlobalState.measurementsGuiComposer.viewMeasurement(nearestLineMeasurement);
    }
  }
}

function keyPressed() {
  if (keyCode == ALT) {
    applicationGlobalState.isAltButtonDown = true;
  } else if (keyCode == CONTROL) {
    applicationGlobalState.isCtrlButtonDown = true;
  } else if (keyCode == SHIFT) {
    applicationGlobalState.isShiftButtonDown = true;
  }
}

function keyReleased() {
  if (keyCode == ALT) {
    applicationGlobalState.isAltButtonDown = false;
  } else if (keyCode == CONTROL) {
    applicationGlobalState.isCtrlButtonDown = false;
  } else if (keyCode == SHIFT) {
    applicationGlobalState.isShiftButtonDown = false;
  } else if (keyCode == ESCAPE) {
    applicationGlobalState.measurementsGuiComposer
      .duplicateViewedMeasurement(applicationGlobalState.gui);
  } else if (keyCode == DELETE) {
    applicationGlobalState.measurementsGuiComposer
      .removeViewedMeasurement(applicationGlobalState.gui);
  }
}
