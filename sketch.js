'use strict';

// loaded once, not expected to change
const assets = new function() {
  this.font = null;
  this.localization = null;
  this.languageGuiToId = {'Russian': 'RUS', 'English': 'ENG'};
}();

// updated from application actions (keyboard, or business logic)
let applicationGlobalState = new function() {
  this.nextGroupName = null;
  this.isCtrlButtonDown = false;
  this.isAltButtonDown = false;
  this.isShiftButtonDown = false;
  this.draggedEndpoints = null;
  this.draggedGrid = null;
  this.imgView = null;
  this.measurementsGuiComposer = null;
  this.gui = null;
  this.loadedImage = null;
  this.loadedImageFilename = null;
  this.shownPopupElement = null;
}();

// bound to be visualized in GUI, and receiving new values from GUI
let generalSettings = new function() {
  this.language = 'Russian';
  this.lineWidth = 8;
  this.textWidth = 20;
  this.textLengthsEnabled = false;
  this.textFloatPrecision = 3;
  this.guiOpacity = 0.9;
  this.guiWidth = 400;
  this.guiTheme = 'yorha';
  this.guiAskUnsaved = true;
  this.allowSnapping = true;
}();
let generalSettingsDefaults = Object.assign({}, generalSettings);

let crosshairSettings = new function() {
  this.crosshairEnabled = true;
  this.crosshairLinesEnd = 15;
  this.crosshairRadius = 0;
  this.crosshairColor = '#ffff00';
  this.invertColor = true;
}();
let crosshairSettingsDefaults = Object.assign({}, crosshairSettings);

let gridSettings = new function() {
  this.gridEnabled = true;
  this.gridHeightInterval = [300, 2000];
  this.gridWidthInterval = [0, 1];
  this.gridTrunkWidthInterval = [0, 1];
  this.gridNumOfInnerLines = 5;
  this.gridNumOfVerticalLines = 1;
  this.gridColor = '#aaffff';
}();
let gridSettingsDefaults = Object.assign({}, gridSettings);

let imageViewSettings = new function() {
  this.panX = 0;
  this.panY = 0;
  this.zoom = 1;
  this.zoomMin = 0.01;
  this.zoomMax = 100;
  this.zoomSensitivity = 0.0005;
  this.rotationArrowsSensitivity = 0.5;
  this.rotationDegrees = 0;
  this.rotationIsClockwise = true;
}();

function getLocalized(key, localizationObj=assets.localization) {
  if (key in localizationObj) {
    return localizationObj[key][assets.languageGuiToId[generalSettings.language]];
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

async function showSaveFileDialog(suggestedName, saveSessionId) {
  const options = {
    id: saveSessionId,
    types: [
      {
        description: 'Text Files',
        accept: {
          'text/plain': ['.txt'],
        },
      },
    ],
    // startIn: startInFolder,
    suggestedName: suggestedName,
  };
  const handle = await window.showSaveFilePicker(options);
  return handle;
}

function clientSideDownload(textContent, filename, contentType) {
    if(!contentType) {
      contentType = 'application/octet-stream';
    }
    var a = document.createElement('a');
    var blob = new Blob([textContent], {'type':contentType});
    a.href = window.URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

function showOpenFileDialog(contentCallback) {
  // const options = {
  //   id: saveSessionId,
  //   types: [
  //     {
  //       description: 'Text Files',
  //       accept: {
  //         'text/plain': ['.txt', '.yaml'],
  //       },
  //     },
  //   ],
  // };
  // const handle = await window.showOpenFilePicker(options);
  // return handle;
  var input = document.createElement('input');
  input.type = 'file';
  input.accept=".txt,.yaml"
  input.onchange = e => { 
    var file = e.target.files[0]; 
    var reader = new FileReader();
    reader.readAsText(file,'UTF-8');
    reader.onload = readerEvent => {
        var content = readerEvent.target.result;
        contentCallback(content);
    }
  }

  input.click();
}

function makeCustomMessageBox(text, closeCallback) {
  if (applicationGlobalState.shownPopupElement) {
    applicationGlobalState.shownPopupElement.remove();
  }
  let div = createSpan();
  applicationGlobalState.shownPopupElement = div;
  div.elt.innerText = text;
  div.style('font-size', '16px');
  div.style('white-space', 'pre-wrap');
  div.style('background', '#f0f0f0');
  div.style('border', '5px solid #C2B280');
  div.style('padding', '5px');
  div.style('width', (windowWidth - generalSettings.guiWidth - 60)+'px');
  div.style('font-family', 'monospace');
  div.position(15, 30);
  let button = createButton('X');
  button.style('position', 'absolute');
  button.style('top', '15px');
  button.style('right', '15px');
  button.style('border', '3px solid #aa0000');
  button.style('color', '#aa0000');
  div.child(button);
  const removePopupElement = () => {
    if (closeCallback) {
      closeCallback();
    }
    div.remove();
    button.remove();
  }
  div.mousePressed(removePopupElement);
  button.mousePressed(removePopupElement);
}

function deleteGuify(guifyInstance) {
  if (guifyInstance) {
    delete guifyInstance.panel.container.mouseIsOverGui;
    // guifyInstance.panel.container.replaceWith(guifyInstance.panel.container.cloneNode(true));
    // guifyInstance.panel.container.onmouseover.onmouseover = () => {};
    // guifyInstance.panel.container.onmouseover.onmouseleave = () => {};
    // guifyInstance.panel.container.parentNode.removeChild(guifyInstance.panel.container);
    // guifyInstance.panel.container.remove();
    // guifyInstance.bar.element.parentNode.removeChild(guifyInstance.bar.element);
    // guifyInstance.bar.element.remove();

    let guifyContainers = document.getElementsByClassName('guify-container');
    for (let element of guifyContainers) {
        element.parentNode.removeChild(element);
        element.remove();
    }
    print(guifyInstance.panel.container);
    print('Deleted GUI instances');
  }
}

function setupGui(guifyInstance, measurementsGuiComposer) {
  deleteGuify(guifyInstance);
  guifyInstance = new guify({
    title:  getLocalized('title'),
    theme: generalSettings.guiTheme, // dark, light, yorha, or theme object
    align: 'right', // left, right
    width: generalSettings.guiWidth,
    barMode: 'above', // none, overlay, above, offset
    panelMode: 'inner',
    panelOverflowBehavior: 'scroll',
    pollRateMS: 100,
    opacity: generalSettings.guiOpacity,
    open: true
  });
  guifyInstance.panel.container.mouseIsOverGui = false;
  guifyInstance.panel.container.onmouseover = function()   {
    this.mouseIsOverGui = true;
  };
  guifyInstance.panel.container.onmouseleave = function()   {
    this.mouseIsOverGui = false;
    print('No longer mouse on GUI ');
  };
  document.title = getLocalized('title');
  guifyInstance.Register([
    {
      type: 'button',
      label: getLocalized('instructionsButton'),
      action: () => {
        makeCustomMessageBox(getLocalized('instructionsContent'));
      }
    },
    {
      type: 'select',
      options: ['Russian', 'English'],
      label: getLocalized('language'),
      object: generalSettings,
      property: 'language',
      onChange: () => {
        applicationGlobalState.gui = setupGui(guifyInstance, measurementsGuiComposer);
        setCookie('generalSettings', generalSettings);
      },
    },
    {
      type: 'checkbox',
      label: getLocalized('guiAskUnsaved'),
      property: 'guiAskUnsaved',
      object: generalSettings,
      onChange: () => setCookie('generalSettings', generalSettings)
    },
    {
      type: 'checkbox',
      label: getLocalized('allowSnapping'),
      property: 'allowSnapping',
      object: generalSettings,
      onChange: () => setCookie('generalSettings', generalSettings)
    },
  ]);
  let guiFile = guifyInstance.Register({
      type: 'file',
      label: getLocalized('openImageFiles'),
      object: this,
      onChange: (data) => {
        applicationGlobalState.loadedImageFilename = guiFile.fileLabel.innerText;
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
          gridSettings);
      }
  });
  guifyInstance.Register({
    type: 'button',
      label: getLocalized('guiSaveMeasurements'),
      action: () => {
        let fn = applicationGlobalState.loadedImageFilename;
        let fnBase = fn.substr(0, fn.lastIndexOf('.')) || fn;
        let newFileName = fnBase + '.txt';
        let imageRotationDegrees = imageViewSettings.rotationDegrees * (imageViewSettings.rotationIsClockwise ? 1 : -1);
        let measuresString = applicationGlobalState.measurementsGuiComposer.allMeasuresToString(
          {imageRotationDegrees: imageRotationDegrees},
        );
        let messageBoxCloseFunc = () => {
          if (confirm(getLocalized('saveMeasurementsDialog'))) {
            (async function() {
              try {
                let handle = await showSaveFileDialog(newFileName, 'save-measures');
                let writable = await handle.createWritable();
                await writable.write(measuresString);
                await writable.close();
              } catch {
                clientSideDownload(measuresString, newFileName, "text/plain")
              }
            })();
          }
        }
        if (!measuresString) {
          measuresString = getLocalized("noMeasuresMessage");
          messageBoxCloseFunc = null;
        }
        makeCustomMessageBox(measuresString, messageBoxCloseFunc);
      }
  });
  guifyInstance.Register({
    type: 'button',
      label: getLocalized('guiLoadMeasurements'),
      action: () => {
          showOpenFileDialog((fileContent) => {
            let parsedObj;
            // try {
              parsedObj = YAML.parse(fileContent);
            // } catch {
              // window.alert(getLocalized('measurementsFileParseFailDialog'))
            // }
            loadMeasurementsFromYamlDump(
              applicationGlobalState.gui,
              applicationGlobalState.measurementsGuiComposer,
              parsedObj);
            let rotation = 0;
            if (parsedObj.length > 0) {
              rotation = parsedObj[0][getLocalized('toStringRotation')] || 0;
            }
            imageViewSettings.rotationDegrees = abs(rotation);
            imageViewSettings.rotationIsClockwise = rotation >= 0;
          });
      }
  });
  guifyInstance.Register([
    { type: 'folder', label: getLocalized('settingsFolder'), open: false },
    {
      type: 'button',
      folder: getLocalized('settingsFolder'),
      label: getLocalized('resetSettings'),
      action: () => {
        deleteAllCookies();
        loadSettingsFromDefaults();
        applicationGlobalState.gui = setupGui(
          applicationGlobalState.gui,
          applicationGlobalState.measurementsGuiComposer);
        updateGridGui(
          applicationGlobalState.loadedImage.width,
          applicationGlobalState.loadedImage.height,
        );
        // window.alert(getLocalized('resetSettingsPopup'));
      }
    },
    { type: 'folder', label: getLocalized('imageViewFolder'),  folder: getLocalized('settingsFolder'), open: false },
    { type: 'folder', label: getLocalized('gridFolder'),  folder: getLocalized('settingsFolder'), open: false },
    { type: 'folder', label: getLocalized('lineFolder'),  folder: getLocalized('settingsFolder'), open: false },
    { type: 'folder', label: getLocalized('guiFolder'), folder: getLocalized('settingsFolder'), open: false },
    { type: 'folder', label: getLocalized('crosshairFolder'),  folder: getLocalized('settingsFolder'), open: false },
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
        setCookie('generalSettings', generalSettings);
      }
    },
    {
      type: 'select',
      label: getLocalized('guiWidth'),
      options: [250, 325, 400, 600],
      object: generalSettings,
      property: 'guiWidth',
      onInitialize: guiWidthInitFunc,
      onChange: (data) => {
        guiWidthInitFunc(data);
        setCookie('generalSettings', generalSettings);
      }
    },

    {
      type: 'select',
      label: getLocalized('guiTheme'),
      options: ['yorha', 'dark', 'light'],
      object: generalSettings,
      property: 'guiTheme',
      onChange: (data) => {
        applicationGlobalState.gui = setupGui(guifyInstance, measurementsGuiComposer);
        setCookie('generalSettings', generalSettings);
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
    {
      type: 'range', label: getLocalized('imageRotation'),
      property: 'rotationDegrees',
      min: 0, max: 45,
    },
    {
      type: 'checkbox', label: getLocalized('imageRotationClockwise'),
      property: 'rotationIsClockwise'
    }
  ], { object: imageViewSettings, folder: getLocalized('imageViewFolder') });

  guifyInstance.Register([
    {
      type: 'checkbox', label: getLocalized('gridEnabled'), 
      property: 'gridEnabled',
      onChange: (data) => {
        setCookie('gridSettings', gridSettings);
      }
    },
    {
      type: 'interval', label: getLocalized('gridHeightInterval'),
      property: 'gridHeightInterval',
      min: 0, max: 1000, precision: 0, step: 1,
      onChange: (data) => {
        setCookie('gridSettings', gridSettings);
      }
    },
    {
      type: 'interval', label: getLocalized('gridTrunkWidthInterval'),
      property: 'gridTrunkWidthInterval',
      min: 0, max: 1000, precision: 0, step: 1,
      onChange: (data) => {
        setCookie('gridSettings', gridSettings);
      }
    },
    {
      type: 'range',label: getLocalized('gridNumOfInnerLines'),
      property: 'gridNumOfInnerLines', min: 0, max: 50, step: 1,
      onChange: (data) => {
        setCookie('gridSettings', gridSettings);
      }
    },
    // {
    //   type: 'range',label: getLocalized('gridNumOfVerticalLines'),
    //   property: 'gridNumOfVerticalLines', min: 0, max: 50, step: 1,
    //   onChange: (data) => {
    //     setCookie('gridSettings', gridSettings);
    //   }
    // },
    {
      type: 'color', label: getLocalized('gridColor'),
      property: 'gridColor', format: 'hex',
      onChange: (data) => {
        setCookie('gridSettings', gridSettings);
      }
    },
  ], { object: gridSettings, folder: getLocalized('gridFolder') });

  guifyInstance.Register([
    {
      type: 'checkbox', label: getLocalized('crosshairEnabled'),
      property: 'crosshairEnabled',
      onChange: (data) => setCookie('crosshairSettings', crosshairSettings),
    },
    {
      type: 'range', label: getLocalized('crosshairRadius'),
      property: 'crosshairRadius', min: 0, max: 50, step: 1,
      onChange: (data) => setCookie('crosshairSettings', crosshairSettings),
    },

    {
      type: 'range', label: getLocalized('crosshairLinesEnd'),
      property: 'crosshairLinesEnd', min: 1, max: 50, step: 1,
      onChange: (data) => setCookie('crosshairSettings', crosshairSettings),
    },
    {
      type: 'color', label: getLocalized('crosshairColor'),
      property: 'crosshairColor', format: 'hex',
      onChange: (data) => setCookie('crosshairSettings', crosshairSettings),
    },
    {
      type: 'checkbox', label: getLocalized('crosshairInvertColor'),
      property: 'invertColor',
      onChange: (data) => setCookie('crosshairSettings', crosshairSettings)
    },
  ], { object: crosshairSettings, folder: getLocalized('crosshairFolder') });

  guifyInstance.Register({
    type: 'range',
    label: getLocalized('guiLineWidth'),
    folder: getLocalized('lineFolder'),
    min: 1, max: 100, step: 1,
    object: generalSettings,
    property: 'lineWidth',
    onChange: (data) => setCookie('generalSettings', generalSettings),
  });
  
  guifyInstance.Register({
    type: 'range',
    label: getLocalized('guiTextWidth'),
    folder: getLocalized('lineFolder'),
    min: 1, max: 100, step: 1,
    object: generalSettings,
    property: 'textWidth',
    onChange: (data) => setCookie('generalSettings', generalSettings),
  });
  guifyInstance.Register({
    type: 'checkbox',
    label: getLocalized('guiTextLengthsEnabled'),
    folder: getLocalized('lineFolder'),
    object: generalSettings,
    property: 'textLengthsEnabled',
    onChange: (data) => setCookie('generalSettings', generalSettings),
  })
  guifyInstance.Register({
    type: 'range',
    label: getLocalized('guiTextFloatPrecision'),
    folder: getLocalized('lineFolder'),
    min: 1, max: 25, step: 1,
    object: generalSettings,
    property: 'textFloatPrecision',
    onChange: (data) => setCookie('generalSettings', generalSettings),
  });

  guifyInstance.Register({
    type: 'text',
    listenMode: 'change',
    label: getLocalized('guiNewGroupName'),
    folder: getLocalized('measuresFolder'),
    property: 'nextGroupName',
    onInitialize: () => applicationGlobalState.nextGroupName = getLocalized('defaultGroupName')+1,
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

  measurementsGuiComposer.addViewGui(guifyInstance, null);
  const img = applicationGlobalState.loadedImage;
  if (img) {
    measurementsGuiComposer.updateViewGui(img.width, img.height);
    updateGridGui(img.width, img.height);
  }
  measurementsGuiComposer.groups.forEach(group => {
    measurementsGuiComposer._addGroupGui(guifyInstance, getLocalized('measuresFolder'), group);
  })

  let guifyBarButtons = document.getElementsByClassName('guify-bar-button');
  for (let element of guifyBarButtons) {
    if (element && element.ariaLabel && !element.ariaLabel.includes("screen")) {
        element.innerText = getLocalized('controls');
      }
  }

  return guifyInstance;
}



function loadTreeImage(uriOrBase64, isFilePath) {
  try {
    loadImage(uriOrBase64, newImg => {
      applicationGlobalState.loadedImage = newImg;
      if (isFilePath) {
        let fp = uriOrBase64.replace(/[\\/]+/g, '/'); // normalize slashes
        applicationGlobalState.loadedImageFilename = fp.substr(fp.lastIndexOf('/')+1) || fp;
      }
      resetZoom();
      if (applicationGlobalState.measurementsGuiComposer) {
        applicationGlobalState.nextGroupName = getLocalized('defaultGroupName')+1;
        applicationGlobalState.measurementsGuiComposer.removeAllGroups(applicationGlobalState.gui);
        let w = applicationGlobalState.loadedImage.width,
            h = applicationGlobalState.loadedImage.height
        applicationGlobalState.measurementsGuiComposer.updateViewGui(w, h);
        updateGridGui(w, h);
      }
      print('Loaded image', uriOrBase64.slice(0, 100));
    });
  } catch {
    window.alert(getLocalized('imageOpenErrorDialog'));
  }
}

function updateGridGui(imageWidth, imageHeight) {
  const updateIntervalComponent = (label, newMin, newMax, intervalArray) => {
    let intervalComponent = applicationGlobalState.gui.loadedComponents.find(
      component => component.opts.label == label);
    intervalComponent.min = intervalComponent.minPos = intervalComponent.input.min = newMin;
    intervalComponent.max = intervalComponent.maxPos = intervalComponent.input.max = newMax;
    intervalArray[0] = min(newMax, intervalArray[0]);
    intervalArray[1] = min(newMax, intervalArray[1]);
    intervalComponent.value = intervalArray;
    intervalComponent.SetValue(intervalArray);
    intervalComponent._RefreshHandles();
  }

  updateIntervalComponent(getLocalized('gridHeightInterval'), 
    0, imageHeight, gridSettings.gridHeightInterval);

  gridSettings.gridTrunkWidthInterval  = [imageWidth*0.49, imageWidth*0.51];
  updateIntervalComponent(getLocalized('gridTrunkWidthInterval'),
    0, imageWidth, gridSettings.gridTrunkWidthInterval);

  gridSettings.gridWidthInterval = [0, imageWidth];
}

function resetZoom() {
  imageViewSettings.panX = 0;
  imageViewSettings.panY = 0;
  imageViewSettings.zoom = min(
    windowHeight / applicationGlobalState.loadedImage.height,
    windowWidth  / applicationGlobalState.loadedImage.width);
  imageViewSettings.rotationDegrees = 0;
  imageViewSettings.rotationIsClockwise = true;
}

function loadSettingsFromCookies() {
  let settings = getCookie('generalSettings');
  if (settings !== undefined) {
    Object.assign(generalSettings, settings);
    print('Cookies: Loaded general settings');
  }
  settings = getCookie('crosshairSettings');
  if (settings !== undefined) {
    Object.assign(crosshairSettings, settings);
    print('Cookies: Loaded crosshair settings');
  }
  settings = getCookie('gridSettings');
  if (settings !== undefined) {
    Object.assign(gridSettings, settings);
    print('Cookies: Loaded crosshair settings');
  }
}

function loadSettingsFromDefaults() {
  if (generalSettingsDefaults !== undefined) {
    Object.assign(generalSettings, generalSettingsDefaults);
    print('Defaults: Loaded general settings');
  }
  if (crosshairSettingsDefaults !== undefined) {
    Object.assign(crosshairSettings, crosshairSettingsDefaults);
    print('Defaults: Loaded crosshair settings');
  }
  if (gridSettingsDefaults !== undefined) {
    Object.assign(gridSettings, gridSettingsDefaults);
    print('Defaults: Loaded grid settings');
  }
}

function preload() {
  assets.localization = loadJSON('./localization.json');
  assets.font = loadFont('./assets/fonts/jetbrainsmono/JetBrainsMono-Regular.ttf');
  applicationGlobalState.imgView = new ImageAABBView();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  loadSettingsFromCookies();
  windowResized();
  applicationGlobalState.measurementsGuiComposer = new MeasureGroupGuiComposer();
  applicationGlobalState.gui = setupGui(
    applicationGlobalState.gui,
    applicationGlobalState.measurementsGuiComposer);
  loadTreeImage('./assets/example_trees/000001.jpg', true);
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
  // if (isBaseMeasurement) {
  //   drawingContext.setLineDash([5, 10, 30, 5]);
  // }
  line(beginX, beginY, endX, endY);

  // endpoints dots
  stroke(0, 0, 0);
  strokeWeight(5);
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
  if (generalSettings.textLengthsEnabled) {
    if (!isBaseMeasurement) {
      lengthText += '=' + measurementData.relativeLength.toFixed(floatPrecision).toString();
    }
    if (abs(measurementData.relativeLength - measurementData.absoluteLength) > 0.001) {
      lengthText = lengthText + ' (' + measurementData.absoluteLength.toFixed(floatPrecision) + ')';
    }
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

function drawGrid(panX, panY, zoom) {
  push();
  let gridColor = color(gridSettings.gridColor);
  const colorReducer = 25;
  let accentuatedColor = color(
    gridColor._getRed()-colorReducer,
    gridColor._getGreen()-colorReducer,
    gridColor._getBlue()-colorReducer, 255);
  let lineWidth = generalSettings.lineWidth * (log(zoom+1)) / 3;
  textSize(generalSettings.textWidth);
  fill(gridColor);
  stroke(gridColor);
  strokeWeight(lineWidth);
  const drawBorder = (i, lineCoords) => {
    stroke(accentuatedColor);
    strokeWeight(2*lineWidth);
    drawingContext.setLineDash([10, 10]);
    line(...lineCoords);
  }
  const drawInner = (i, lineCoords) => {
    line(...lineCoords);
    textFont(assets.font);
    text(i.toString(), lineCoords[0] - 25, lineCoords[1]);
  }
  forEachGridLine(panX, panY, zoom, drawInner, drawBorder);
  pop();
}

function forEachGridLine(panX, panY, zoom, callbackInner, callbackBorder) {
  let hLow = (gridSettings.gridHeightInterval[0])*zoom + panY,// + panX,
      hHigh = (gridSettings.gridHeightInterval[1])*zoom + panY,
      wLow = (gridSettings.gridWidthInterval[0])*zoom + panX,
      wHigh = (gridSettings.gridWidthInterval[1])*zoom + panX;
  // horizontals
  let nLines = gridSettings.gridNumOfInnerLines + 1;
  let hDelta = (hHigh - hLow)/nLines;
  for (var i = 1; i < nLines; ++i) {
    let y = hLow + i*hDelta;
    callbackInner(i, [wLow, y, wHigh, y]);
  }
  if (callbackBorder) {
    callbackBorder(0, [wLow, hLow, wHigh, hLow]);
    callbackBorder(nLines, [wLow, hHigh, wHigh, hHigh]);
    // verticals
    // const nVerticals = gridSettings.gridNumOfVerticalLines;
    // const xDelta = (wHigh - wLow)/(nVerticals+1);
    const nVerticals = 2;
    const vwLow = gridSettings.gridTrunkWidthInterval[0]*zoom + panX,
          vwHigh = gridSettings.gridTrunkWidthInterval[1]*zoom + panX;
    const xDelta = vwHigh - vwLow;
    for (var i = 0; i < nVerticals; ++i) {
      let x = vwLow + i*xDelta;
      callbackBorder(0, [x, hLow, x, hHigh]);
    }
  }
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

function drawImage() {
  let imgViewBbox = applicationGlobalState.imgView.getScreenBbox();
  let dx = imgViewBbox.left+imgViewBbox.width / 2,
      dy = imgViewBbox.top+imgViewBbox.height / 2
      translate(dx, dy);
  let rotationRadians = imageViewSettings.rotationDegrees / 180 * PI
  rotate(rotationRadians * (imageViewSettings.rotationIsClockwise ? 1 : -1));
  translate(-dx, -dy);
  image(applicationGlobalState.loadedImage,
    imgViewBbox.left, imgViewBbox.top,
    imgViewBbox.width, imgViewBbox.height);
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
    push();
    drawImage();
    pop();
    let imgViewBbox = applicationGlobalState.imgView.getScreenBbox();
    if (gridSettings.gridEnabled && !applicationGlobalState.isCtrlButtonDown) {
      drawGrid(imgViewBbox.left, imgViewBbox.top, imageViewSettings.zoom);
    }
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
  if (applicationGlobalState.gui.panel.container.mouseIsOverGui == true) {
    print('Mouse over GUI');
    return;
  }
  let imgViewBbox = applicationGlobalState.imgView.getScreenBbox();
  if (mouseButton === RIGHT) {
    imageViewSettings.panX -= movedX/imgViewBbox.width;
    imageViewSettings.panY -= movedY/imgViewBbox.height;
  } else if (mouseButton === LEFT) {
    let mouseVec = createVector(
      (mouseX-imgViewBbox.left)/imageViewSettings.zoom,
      (mouseY-imgViewBbox.top)/imageViewSettings.zoom);
    if (applicationGlobalState.draggedEndpoints) {
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
        // snap to grid levels
        if (gridSettings.gridEnabled) {
          forEachGridLine(0, 0, 1.0,(lineIdx, lineCoords) =>
          computeSnapping(createVector(lineCoords[0], lineCoords[1])), null);
        }
        
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
    } else if (applicationGlobalState.draggedGrid != null) {
      // drag grid limits
      let draggedInterval = applicationGlobalState.draggedGrid.interval;
      let draggedCoord = applicationGlobalState.draggedGrid.intervalCoord;
      let isX = applicationGlobalState.draggedGrid.isX;
      let newVal = isX ? mouseVec.x : mouseVec.y;
      if (draggedCoord == 0) {
        draggedInterval[draggedCoord] = min(newVal, draggedInterval[draggedCoord + 1]);
      } else {
        draggedInterval[draggedCoord] = max(newVal, draggedInterval[draggedCoord - 1]);
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
    const targetPointDistanceSq = 15*generalSettings.lineWidth/imageViewSettings.zoom;
    const targetLineDistanceSq = generalSettings.lineWidth*generalSettings.lineWidth/imageViewSettings.zoom;
    var nearestEndpointDistanceSq = targetPointDistanceSq;
    var nearestLineDistanceSq = targetLineDistanceSq;
    var nearestEndpointMeasurement = null;
    var nearestEndpoint = null;
    var nearestLineMeasurement = null;
    var nearestLine = null;
    const checkNearestMeasure = function(measure) {
      const beginToMouse = p5.Vector.sub(measure.begin, mouseVec);
      const mouseToEnd = p5.Vector.sub(mouseVec, measure.end);
      const beginToEnd = p5.Vector.sub(measure.begin, measure.end);
      var beginDistance = beginToMouse.magSq();
      var endDistance = mouseToEnd.magSq();
      const perpendicularToLine = pointToLinePerpVector(mouseVec, measure.begin, measure.end, beginToEnd.magSq());
      const distanceToLine = perpendicularToLine.magSq();
      if (distanceToLine < nearestLineDistanceSq
          && beginToMouse.dot(beginToEnd) > 0
          && mouseToEnd.dot(beginToEnd) > 0) {
        nearestLineDistanceSq = distanceToLine;
        nearestLineMeasurement = measure;
        nearestLine = [mouseVec.add(perpendicularToLine), measure.begin, measure.end];
      }
      if (beginDistance <= nearestEndpointDistanceSq) {
        nearestEndpointDistanceSq = beginDistance;
        nearestEndpointMeasurement = measure;
        nearestEndpoint = [measure.begin];
      }
      if (endDistance <= nearestEndpointDistanceSq) {
        nearestEndpointDistanceSq = endDistance;
        nearestEndpointMeasurement = measure;
        nearestEndpoint = [measure.end];
      }
    }

    const onlyVisible = true;
    applicationGlobalState.measurementsGuiComposer.forEachMeasure(
      measure => checkNearestMeasure(measure), onlyVisible);
    applicationGlobalState.draggedEndpoints = null;
    applicationGlobalState.measurementsGuiComposer.viewMeasurement(null);
    applicationGlobalState.draggedGrid = null;
    if (nearestEndpoint !== null) { // drag endpoint of measurement
      applicationGlobalState.draggedEndpoints = nearestEndpoint;
      applicationGlobalState.measurementsGuiComposer.viewMeasurement(nearestEndpointMeasurement);
    } else if (nearestLine !== null) {// drag whole line of measurement
      applicationGlobalState.draggedEndpoints = nearestLine;
      applicationGlobalState.measurementsGuiComposer.viewMeasurement(nearestLineMeasurement);
    } else { // drag grid limi < targetLineDistancet
      const targetLineDistance = generalSettings.lineWidth/imageViewSettings.zoom;
      for (var i = 0; i < 2; ++i) {
        let sameYlevel = abs(gridSettings.gridHeightInterval[i] - mouseVec.y) < targetLineDistance;
        if (sameYlevel) {
          applicationGlobalState.draggedGrid = {
            interval: gridSettings.gridHeightInterval,
            intervalCoord: i,
            isX: false
          }
        }
      }
      for (var i = 0; i < 2; ++i) {
        const sameXlevel = abs(gridSettings.gridTrunkWidthInterval[i] - mouseVec.x) < targetLineDistance;
        const onGridY = gridSettings.gridHeightInterval[0] <= mouseVec.y && mouseVec.y <= gridSettings.gridHeightInterval[1];
        if (sameXlevel && onGridY) {
          applicationGlobalState.draggedGrid = {
            interval: gridSettings.gridTrunkWidthInterval,
            intervalCoord: i,
            isX: true,
          }
        }
      }
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
  if (applicationGlobalState.isShiftButtonDown && (keyCode == LEFT_ARROW || keyCode == RIGHT_ARROW)) {
    let delta = imageViewSettings.rotationArrowsSensitivity;
    let epsilon = 1e-6;
    if (keyCode == LEFT_ARROW) {
      delta *= -1;
    }
    if (!imageViewSettings.rotationIsClockwise) {
      delta *= -1;
    }
    if ((imageViewSettings.rotationDegrees + epsilon) * (imageViewSettings.rotationDegrees + delta - epsilon) < 0) {
      // went over 0, toggle clockwise
      imageViewSettings.rotationDegrees += delta;
      imageViewSettings.rotationIsClockwise = !imageViewSettings.rotationIsClockwise;
      imageViewSettings.rotationDegrees = abs(imageViewSettings.rotationDegrees);
    } else {
      imageViewSettings.rotationDegrees += delta;
    }
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
