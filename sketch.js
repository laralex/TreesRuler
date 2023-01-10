//'use strict';

let img;
let localization;
let gui;
let font;
let guiMeasureComposer;
var imgView;
var draggedEndpoints;
var mouseIsOverGui;

let generalSettings = new function() {
  this.crosshairEnabled = true;
  this.language = 'Russian';
  this.languageGuiToId = {'Russian': 'RUS', 'English': 'ENG'};
  this.lineWidth = 10;
  this.textWidth = 20;
  this.textFloatPrecision = 3;
  this.guiOpacity = 0.9;
  this.guiWidth = 300;
  this.guiTheme = 'yorha';
  this.guiAskUnsaved = false;
  this.nextGroupName = null;
  this.isCtrlButtonDown = false;
  this.isAltButtonDown = false;
  this.isShiftButtonDown = false;
}();

function openImageFiles(){
   document.getElementById('file-input').click()
}

let crosshairSettings = new function() {
  this.crosshairEnabled = true;
  this.crosshairLinesEnd = 15;
  this.crosshairRadius = 0;
  this.crosshairColor = '#ffff00';
  this.invertColor = true;
}();

let zoomSettings = new function() {
  this.panX = 0;
  this.panY = 0;
  this.zoom = 1;
  this.zoomMin = 0.01;
  this.zoomMax = 100;
  this.zoomSensitivity = 0.0005;
}();

let imageInfo = new function() {
  this.imageSizeStr = "";
}();

function getLocalized(key) {
  if (key in localization) {
    return localization[key][generalSettings.languageGuiToId[generalSettings.language]];
  }
  console.warn(key, ' missing localization');
  return key;
}

class ImageAABBView {
  constructor(imageWidth, imageHeight) {
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
  }

  toScreenBbox(screenWidth, screenHeight, zoom, panX, panY) {
    let width = this.imageWidth*zoom;
    let height = this.imageHeight*zoom;
    return {
      left: screenWidth/2-width/2 - panX*width,
      width: width,
      top: screenHeight/2-height/2 - panY*height,
      height: height,
    }
  }
}

class MeasureGroupGuiComposer {
  static groupsDefaults = [
    { color: '#ff5e5e', denotation: 'a' },
    { color: '#fda703', denotation: 'b' },
    { color: '#0cff03', denotation: 'c' },
    { color: '#03b4ff', denotation: 'd' },
    { color: '#ff5ce4', denotation: 'e' },
    { color: '#ff0000', denotation: 'A' },
    { color: '#00ffff', denotation: 'B' },
    { color: '#0000ff', denotation: 'C' },
    { color: '#aaaaaa', denotation: 'D' },
    { color: '#ffffff', denotation: 'E' },
  ];

  constructor() {
    this.groups = [];
    this.nextDefaultIndex = 0;
    this.viewGuiObjects = {};
    this.viewMeasure = null;
    this.dummyVariable = null;
    generalSettings.nextGroupName = getLocalized('defaultGroupName')+0;
  }

  getViewedMeasurement() {
    return this.viewMeasure;
  }

  viewGuiSetEnabled(isEnabled){
    Object.values(this.viewGuiObjects).forEach(guiObj => guiObj.SetEnabled(isEnabled));
  }

  viewMeasurement(measurementBoundData) {
    this.viewMeasure = measurementBoundData;
    print('Selected', measurementBoundData);

    if (measurementBoundData === null) {
      this.viewGuiSetEnabled(false);
      return;
    }
    
    this.viewGuiSetEnabled(true);
    const boundMap = {
      x0: {object: measurementBoundData.begin, property: 'x'},
      y0: {object: measurementBoundData.begin, property: 'y'},
      x1: {object: measurementBoundData.end, property: 'x'},
      y1: {object: measurementBoundData.end, property: 'y'},
      relativeLength: {object: measurementBoundData, property: 'relativeLength'},
      absoluteLength: {object: measurementBoundData, property: 'absoluteLength'},
    }
    for(const [key, mapping] of Object.entries(boundMap)) {
      this.viewGuiObjects[key].binding.object = mapping.object;
      this.viewGuiObjects[key].binding.property = mapping.property;
    }
  }

  updateViewGui(imageWidth, imageHeight) {
    this.viewGuiObjects.x0.max = this.viewGuiObjects.x0.maxPos = this.viewGuiObjects.x0.input.max = imageWidth;
    this.viewGuiObjects.x1.max = this.viewGuiObjects.x1.maxPos = this.viewGuiObjects.x1.input.max = imageWidth;
    this.viewGuiObjects.y0.max = this.viewGuiObjects.y0.maxPos = this.viewGuiObjects.y0.input.max = imageHeight;
    this.viewGuiObjects.y1.max = this.viewGuiObjects.y1.maxPos = this.viewGuiObjects.y1.input.max = imageHeight;
  }

  addViewGui(gui, viewFolder, imageWidth, imageHeight) {
    const definitions = {
      label: {
        type: 'display',
        label: '',
        initial: getLocalized('guiSelectedMeasure'),
      },
      x0 : {
        type: 'range',
        label: getLocalized('beginPointX'),
        min: 0, max: imageWidth, step: 1,
        object: this, property: 'dummyVariable',
        onChange: (data) => {},
        onInitialize: (data) => {},
      },
      y0 : {
        type: 'range',
        label: getLocalized('beginPointY'),
        min: 0, max: imageHeight, step: 1,
        object: this, property: 'dummyVariable'
      },
      x1 : {
        type: 'range',
        label: getLocalized('endPointX'),
        min: 0, max: imageWidth, step: 1,
        object: this, property: 'dummyVariable'
      },
      y1 : {
        type: 'range',
        label: getLocalized('endPointY'),
        min: 0, max: imageHeight, step: 1,
        object: this, property: 'dummyVariable'
      },
      relativeLength : {
        type: 'display',
        label: getLocalized('guiRelativeLength'),
        object: this, property: 'dummyVariable'
      },
      absoluteLength : {
        type: 'display',
        label: getLocalized('guiAbsoluteLength'),
        object: this, property: 'dummyVariable'
      },
      removeButton : {
            type: 'button',
            label: getLocalized('guiRemoveMeasure'),
            action: () => {
              if (this.viewMeasureGuiObjects === null) { return; }
              Object.values(this.viewGuiObjects).forEach(obj => tryCatch(
                ()=>gui.Remove(obj),
                (e)=>{}
              ))
              // TODO delete from arrays
            },
      }
    };
    for (const [key, definition] of Object.entries(definitions)) {
      let guiObj = gui.Register(definition, { folder: viewFolder });
      this.viewGuiObjects[key] = guiObj;
    }
    this.viewGuiSetEnabled(false);
  }

  _newMeasure({gui=null, parentFolder=null, newFolderName=null, boundData=null}) {
    let definitions = [
      {
        type: 'button',
        label: newFolderName,
        folder: parentFolder,
        action: () => {
          this.viewMeasurement(boundData);
        }
      },
    ];
    let objects = [];
    for (let definition of definitions) {
      objects.push(gui.Register(definition));
    }
    return objects;
  }

  // _setGroupDenotation(groupFolder, newDenotation) {
  //   const group = this.groups.find((group) => group.groupFolder == groupFolder);
  //   for (element of group.guiObjects) {
  //     if (element.classList.contains('baseMeasure')) {
        
  //     } else if (element.classList.contains('measure')) {

  //     }
  //   }
  // }
  _addFloatNoSlider(gui, definition) {
    let obj = gui.Register(definition);
    obj.container.querySelectorAll('.guify-value-input').forEach(
      el => { el.style.width = "56%"; }
    );
    return obj;
  }

  newGroup(gui, parentFolder) {
    let uniqueSpaces = ' '.repeat(this.groups.length);
    let groupFolder = generalSettings.nextGroupName;
    generalSettings.nextGroupName = generalSettings.nextGroupName.match(/(.*?)(\d*)$/)[1] + (this.groups.length+1);
    let groupFolderObj = gui.Register({
      type: 'folder',
      label: groupFolder,
      folder: parentFolder,
      open: false
    });
    let guiObjects = [groupFolderObj];
    let defaults;
    if (this.nextDefaultIndex < this.constructor.groupsDefaults.length) {
      defaults = this.constructor.groupsDefaults[this.nextDefaultIndex];
      ++this.nextDefaultIndex;
    } else {
      const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
      const denotation = String.fromCharCode('A'.charCodeAt(0) + this.groups.length);
      defaults = { color: randomColor, denotation: denotation }
    }
    let groupBoundData = {
      ...defaults,
      opacity: 1.0,
      isRendered: true,
      baseMeasure: {
        begin: createVector(Math.random()*1000, Math.random()*1000),
        end: createVector(Math.random()*1000, Math.random()*1000),
        guiObjects: null},
      baseAbsoluteLength: 1.0,
      measures: []
    };
    guiObjects.push(gui.Register({
      type: 'button',
      label: getLocalized('guiRemoveGroup'),
      folder: groupFolder,
      action: () => {
        if (!generalSettings.guiAskUnsaved || this.groups.length == 1 || confirm(getLocalized('removeGroupDialog') + ' ' + groupFolder)) {
          this.removeGroup(gui, groupFolder);
        } else {
          print('Cancel removing of group');
        }
      }
    }));
    guiObjects.push(gui.Register({
      type: 'checkbox',
      label: getLocalized('guiGroupIsRendered'),
      property: 'isRendered',
      object: groupBoundData, folder: groupFolder,
    }));
    guiObjects.push(gui.Register({
        type: 'color',
        label: getLocalized('guiGroupColor'),
        format: 'hex',
        property: 'color',
        object: groupBoundData, folder: groupFolder
    }));
    // guiObjects.push(gui.Register({
    //     type: 'range',
    //     label: getLocalized('guiGroupColorOpacity'),
    //     min: 0.0, max: 1.0, step:0.05,
    //     property: 'opacity',
    //     object: groupBoundData, folder: groupFolder,
    // }));

    guiObjects.push(gui.Register({
        type: 'text',
        label: getLocalized('guiGroupDenotation'),
        property: 'denotation',
        object: groupBoundData, folder: groupFolder,
    }));

    guiObjects.push(this._addFloatNoSlider(gui, {
      type: 'range',
      label: getLocalized('guiBaseAbsoluteValue'),
      min: 1e-3, max: 1e6, step:1e-6, precision: 20,
      property: 'baseAbsoluteLength',
      object: groupBoundData, folder: groupFolder,
    }));

    guiObjects.push(gui.Register({
      type: 'button',
      label: getLocalized('guiNewMeasure'),
      folder: groupFolder,
      action: () => {
        let index = groupBoundData.measures.length;
        groupBoundData.measures.push({
          begin: createVector(0, 0),
          end: createVector(Math.random()*1000, Math.random()*1000),
          guiObjects: null});
        let measureGuiObjects = this._newMeasure({
          gui: gui, parentFolder: groupFolder,
          newFolderName: `${getLocalized('measure')} ${index+1}${uniqueSpaces}`,
          boundData: groupBoundData.measures[index],
        });
        groupBoundData.measures.guiObjects = measureGuiObjects;
        guiObjects.push(...measureGuiObjects);
      }
    }));
    const baseGuiObjects = this._newMeasure({
      gui: gui, parentFolder: groupFolder,
      newFolderName: `${getLocalized('baseMeasurePrefix')} 0 ${getLocalized('baseMeasureSuffix')}${uniqueSpaces}`,
      boundData: groupBoundData.baseMeasure,
    });
    guiObjects.push(...baseGuiObjects);
    groupBoundData.baseMeasure.guiObjects = baseGuiObjects;
    this.groups.push({guiObjects: guiObjects, data: groupBoundData, groupFolder: groupFolder});
  }

  _removeGuiObjects(gui, guiObjects) {
    guiObjects.forEach(
      obj => tryCatch(
        () => gui.Remove(obj),
        (e) => {}
      )
    )
  }
  removeGroup(gui, groupFolder) {
    let groupIndex = this.groups.findIndex(group => group.groupFolder == groupFolder);
    this._removeGuiObjects(gui, this.groups[groupIndex].guiObjects);
    this.groups.splice(groupIndex, 1)
  }
  removeAllGroups(gui) {
    this.groups.forEach(group => this.removeGroup(gui, group.groupFolder));
  }

  forEachMeasure(func) {
    this.groups.forEach(group => {
      func(group.data.baseMeasure);
      group.data.measures.forEach(measure => {
        func(measure);
      })
    });
  }

  forEachPoint(func) {
    this.forEachMeasure(measure => {
      func(measure.begin);
      func(measure.end);
    })
  }
}

function tryCatch(func, failFunc) {
  try { return func() }
  catch(e) { return failFunc(e) }
}

function setupGui(gui) {
  if (gui !== undefined) {
    let guifyContainers = document.getElementsByClassName('guify-container');
    for (let element of guifyContainers) {
        element.remove();
    }
    print('Deleted GUI instances');
  }

  gui = new guify({
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
  gui.panel.container.mouseIsOver = false;
  gui.panel.container.onmouseover = function()   {
    this.mouseIsOverGui = true;
  };
  gui.panel.container.onmouseleave = function()   {
    this.mouseIsOverGui = false;
  };
  document.title = getLocalized('title');
  gui.Register([
    {
      type: 'select',
      options: ['Russian', 'English'],
      label: getLocalized('language'),
      object: generalSettings,
      property: 'language',
      onChange: (data) => {
        setupGui(gui);
      },
    },
    {
      type: 'checkbox',
      label: getLocalized('guiAskUnsaved'),
      property: 'guiAskUnsaved',
      object: generalSettings,
    },
  ]);
  let guiFile = gui.Register({
      type: 'file',
      label: getLocalized('openImageFiles'),
      object: this,
      onChange: (data) => {
        if (!generalSettings.guiAskUnsaved || confirm(getLocalized('loosingUnsavedDialog'))) {
          myLoadImage(data);
        } else {
          print('Cancel openning of file');
        }
      }
  });
  guiFile.container.lastChild.innerText = "";
  gui.Register({
      type: 'display',
      label: getLocalized('imageSize'),
      object: imageInfo, property: 'imageSizeStr',
      listenMode: 'change',
  });
  gui.Register([
    {
      type: 'folder',
      label: getLocalized('guiFolder'),
      open: false
    },

    {
      type: 'folder',
      label: getLocalized('crosshairFolder'),
      open: false
    },

    {
      type: 'folder',
      label: getLocalized('zoomFolder'),
      open: false
    },

    {
      type: 'folder',
      label: getLocalized('measuresFolder'),
      open: true
    },
  ]);

  const guiWidthInitFunc = function(data) {
    print('Resize GUI', data);
    let value = data+'px';
    document.getElementsByClassName('guify-panel-container')[0].style.width = value;
  };
  guiWidthInitFunc(generalSettings.guiWidth);

  gui.Register([
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
      options: [300, 375, 600],
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
        setupGui(gui);
      }
    },
  ], { object: generalSettings, folder: getLocalized('guiFolder') });

  gui.Register([
    {
      type: 'button',
      label: getLocalized('zoomReset'),
      action: resetZoom
    },
    {
      type: 'range',
      label: getLocalized('zoomX'),
      min: -0.5, max: 0.5, step: 0.01,
      property: 'panX'
    },
    {
      type: 'range',
      label: getLocalized('zoomY'),
      min: -0.5, max: 0.5, step: 0.01,
      property: 'panY'
    },
    {
      type: 'range',
      label: getLocalized('zoomLevel'),
      scale: 'log',
      min: zoomSettings.zoomMin, max: zoomSettings.zoomMax,
      property: 'zoom'
    },
  ], { object: zoomSettings, folder: getLocalized('zoomFolder') });

  gui.Register([
    {
      type: 'checkbox',
      label: getLocalized('crosshairEnabled'),
      property: 'crosshairEnabled',
    },
    {
      type: 'range',
      label: getLocalized('crosshairRadius'),
      min: 0, max: 50, step: 1,
      property: 'crosshairRadius'
    },

    {
      type: 'range',
      label: getLocalized('crosshairLinesEnd'),
      min: 1, max: 50, step: 1,
      property: 'crosshairLinesEnd'
    },
    {
      type: 'color',
      label: getLocalized('crosshairColor'),
      format: 'hex',
      property: 'crosshairColor'
    },
    {
      type: 'checkbox',
      label: getLocalized('crosshairInvertColor'),
      property: 'invertColor',
    },
  ], { object: crosshairSettings, folder: getLocalized('crosshairFolder') });

  gui.Register({
    type: 'range',
    label: getLocalized('guiLineWidth'),
    folder: getLocalized('measuresFolder'),
    min: 1, max: 100, step: 1,
    object: generalSettings,
    property: 'lineWidth',
  });

  gui.Register({
    type: 'range',
    label: getLocalized('guiTextWidth'),
    folder: getLocalized('measuresFolder'),
    min: 1, max: 100, step: 1,
    object: generalSettings,
    property: 'textWidth',
  });
  gui.Register({
    type: 'range',
    label: getLocalized('guiTextFloatPrecision'),
    folder: getLocalized('measuresFolder'),
    min: 1, max: 25, step: 1,
    object: generalSettings,
    property: 'textFloatPrecision',
  });

  gui.Register({
    type: 'text',
    listenMode: 'change',
    label: getLocalized('guiNewGroupName'),
    folder: getLocalized('measuresFolder'),
    property: 'nextGroupName',
    object: generalSettings,
  });


  gui.Register({
    type: 'button',
    label: getLocalized('guiNewGroup'),
    folder: getLocalized('measuresFolder'),
    action: () => {
      guiMeasureComposer.newGroup(gui, getLocalized('measuresFolder'));
    }
  });

  guiMeasureComposer = new MeasureGroupGuiComposer();
  guiMeasureComposer.addViewGui(gui, null, 1, 1);

  let guifyBarButtons = document.getElementsByClassName('guify-bar-button');
  for (let element of guifyBarButtons) {
    if (element.ariaLabel === null || !element.ariaLabel.includes("screen")) {
        element.innerText = getLocalized('controls');
      }
  }

  return gui;
}

function resetZoom() {
  zoomSettings.panX = 0;
  zoomSettings.panY = 0;
  zoomSettings.zoom = min(windowHeight / img.height, windowWidth / img.width);
}

function mouseWheel(event) {
  var zoomDelta = -zoomSettings.zoomSensitivity*exp(zoomSettings.zoom)*event.delta;
  zoomDelta = constrain(zoomDelta, -zoomSettings.zoom/5, zoomSettings.zoom/5);
  zoomSettings.zoom += zoomDelta;
  zoomSettings.zoom = constrain(zoomSettings.zoom, zoomSettings.zoomMin, zoomSettings.zoomMax);
  return false;
}

function myLoadImage(uri) {
  loadImage(uri, newImg => {
    img = newImg;
    imgView = new ImageAABBView(img.width, img.height);
    imageInfo.imageSizeStr = `${img.width} x ${img.height}`;
    resetZoom();
    if (guiMeasureComposer !== undefined) {
      guiMeasureComposer.removeAllGroups(gui);
    }
    guiMeasureComposer.updateViewGui(img.width, img.height);
    print('Loaded image', uri.slice(0, 100));
  });
  
}

function preload() {
  localization = loadJSON('./localization.json');
  font = loadFont('./assets/fonts/inconsolata/Inconsolata-Regular.ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  windowResized();
  gui = setupGui(gui);
  myLoadImage('./assets/example_trees/000006.jpg');
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

function drawMeasurement(measurementData, panX, panY, zoom, markWeight, textWeight, floatPrecision) {
  const beginX = measurementData.begin.x*zoom + panX,
        beginY = measurementData.begin.y*zoom + panY,
        endX = measurementData.end.x*zoom + panX,
        endY = measurementData.end.y*zoom + panY;
  if (measurementData == guiMeasureComposer.getViewedMeasurement()) {
    fill(255, 100, 100, 175);
    tint(100, 255);
  } else {
    fill(255, 175);
  }

  line(beginX, beginY, endX, endY);
  var perpX = beginY - endY, perpY = endX - beginX;
  const norm = sqrt(perpX*perpX + perpY*perpY);
  perpX = perpX * markWeight / norm;
  perpY = perpY * markWeight / norm;

  // perpendicular marks
  line(beginX - perpX, beginY - perpY, beginX + perpX, beginY + perpY);
  line(endX - perpX, endY - perpY, endX + perpX, endY + perpY);
  
  // draw measurements text
  push();
  textSize(textWeight);
  var lengthText = measurementData.relativeLength.toFixed(floatPrecision).toString();
  if (abs(measurementData.relativeLength - measurementData.absoluteLength) > 0.001) {
    lengthText = lengthText + ' (' + measurementData.absoluteLength.toFixed(floatPrecision) + ')';
  }
  strokeWeight(0);
  let textX = endX + 20*zoom, textY = endY, textPadding = textWeight*0.2;
  let bbox = font.textBounds(lengthText, textX, textY, textWeight);

  rect(bbox.x-textPadding, bbox.y, bbox.w + 2*textPadding, bbox.h);
  fill(0);
  textFont(font);
  text(lengthText, textX, textY);

  pop();
};

function drawMeasurements(panX, panY, zoom) {
  push();
  const lineWeight = generalSettings.lineWidth*(log(zoom+1));
  const markWeight = lineWeight * 3;
  const textWeight = generalSettings.textWidth - zoom*(generalSettings.textWidth - 10)/zoomSettings.zoomMax;
  strokeCap(SQUARE);
  strokeWeight(lineWeight);
  guiMeasureComposer.groups.forEach(group => {
    if (!group.data.isRendered) {
      return;
    }
    stroke(group.data.color);
    drawMeasurement(group.data.baseMeasure, panX, panY, zoom, markWeight, textWeight, generalSettings.textFloatPrecision);
    for (var measure of group.data.measures) {
      drawMeasurement(measure, panX, panY, zoom, markWeight, textWeight, generalSettings.textFloatPrecision);
    }
  });
  pop();
}


function updateMeasurementsLengths() {
  guiMeasureComposer.groups.forEach(group => {
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
  if (imgView !== undefined) {
    let zoomScreenBbox = imgView.toScreenBbox(
      windowWidth, windowHeight,
      zoomSettings.zoom, zoomSettings.panX, zoomSettings.panY);
    image(img,
      zoomScreenBbox.left, zoomScreenBbox.top,
      zoomScreenBbox.width, zoomScreenBbox.height);
    // const panX = zoomSettings.panX * img.width / zoomSettings.zoom;
    // const panY = zoomSettings.panY * img.height / zoomSettings.zoom;p
    drawMeasurements(zoomScreenBbox.left, zoomScreenBbox.top, zoomSettings.zoom);
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
  const css = getComputedStyle(canvas.parentElement),
        mw = float(css.marginLeft) + float(css.marginRight),
        mh = float(css.marginTop)  + float(css.marginBottom),
        ww = float(css.width)  || windowWidth,
        wh = float(css.height) || windowHeight,
        w = ceil(ww - mw) | 0, h = ceil(wh - mh) | 0;
  print(`Resize ${windowWidth}, ${windowHeight}`)
  resizeCanvas(windowWidth, windowHeight);
}

function mouseDragged() {
  if (gui.panel.container.mouseIsOverGui) {
    print('Mouse over GUI');
    return;
  }
  let zoomScreenBbox = imgView.toScreenBbox(
    windowWidth, windowHeight,
    zoomSettings.zoom, zoomSettings.panX, zoomSettings.panY);
  if (mouseButton === RIGHT) {
    zoomSettings.panX -= movedX/zoomScreenBbox.width;
    zoomSettings.panY -= movedY/zoomScreenBbox.height;
  } else if (mouseButton === LEFT) {
    if (draggedEndpoints) {
      let mouseVec = createVector(
        (mouseX-zoomScreenBbox.left)/zoomSettings.zoom,
        (mouseY-zoomScreenBbox.top)/zoomSettings.zoom);
      var offsetToNearestX = -1e6, offsetToNearestY = -1e6, snapDistancePx = 10/zoomSettings.zoom;
      if (draggedEndpoints.length == 1) {
        point = draggedEndpoints[0];
        point.x = mouseVec.x; // movedX/zoomSettings.zoom;
        point.y = mouseVec.y; // movedY/zoomSettings.zoom;
        if (generalSettings.isAltButtonDown) { print('ALT'); return; } // no snapping
        const computeSnapping = function(otherPoint) {
          if (otherPoint == point) {
            return;
          }
          if (abs(otherPoint.x - mouseVec.x) < abs(offsetToNearestX)) {
            offsetToNearestX = otherPoint.x - mouseVec.x;
          }
          if (abs(otherPoint.y - mouseVec.y) < abs(offsetToNearestY)) {
            offsetToNearestY = otherPoint.y - mouseVec.y;
          }
        }
        guiMeasureComposer.forEachPoint(computeSnapping);
        // snap to image borders
        computeSnapping({x: 0, y: 0});
        computeSnapping({x: img.width, y: img.height});
        if (abs(offsetToNearestX) < snapDistancePx) {
          print('X', mouseVec.x, point.x);
          point.x = mouseVec.x + offsetToNearestX;
          // print('Snap X', snapDistancePx, offsetToNearestX);
        } 
        if (abs(offsetToNearestY) < snapDistancePx) {
          print('Y', mouseVec.y, point.y);
          point.y = mouseVec.y + offsetToNearestY;
          // print('Snap Y', snapDistancePx, offsetToNearestY);
        }
      } else {
        draggedEndpoints.forEach(point => {
          point.x += movedX/zoomSettings.zoom;
          point.y += movedY/zoomSettings.zoom;
        });
      }
    }
  }
}

function pointToLineDistanceSq(pointVec, beginVec, endVec, lineMagSq) {
  if (lineMagSq === undefined) {
    lineMagSq = p5.Vector.sub(beginVec, endVec).magSq();
  }
  const numeratorSqr = ((endVec.x - beginVec.x)*(beginVec.y - pointVec.y) - (beginVec.x - pointVec.x)*(endVec.y - beginVec.y));
  return numeratorSqr*numeratorSqr/ lineMagSq;
}

function mousePressed() {
  if (mouseButton === LEFT) {
    if (gui.panel.container.mouseIsOverGui) {
      print('Mouse over GUI');
      return;
    }
    let zoomScreenBbox = imgView.toScreenBbox(
      windowWidth, windowHeight,
      zoomSettings.zoom, zoomSettings.panX, zoomSettings.panY);

    let mouseVec = createVector(mouseX-zoomScreenBbox.left, mouseY-zoomScreenBbox.top);
    mouseVec.div(zoomSettings.zoom);
    var nearestDistanceSq = 1e6;
    var nearestEndpointMeasurement = null;
    var nearestEndpoint = null;
    var nearestLineMeasurement = null;
    var nearestLine = null;
    const checkMeasure = function(measure, targetPointDistanceSq, targetLineDistanceSq) {
      const beginToMouse = p5.Vector.sub(measure.begin, mouseVec);
      const mouseToEnd = p5.Vector.sub(mouseVec, measure.end);
      const beginToEnd = p5.Vector.sub(measure.begin, measure.end);
      var beginDistance = beginToMouse.magSq();
      var endDistance = mouseToEnd.magSq();
      const distanceToLine = pointToLineDistanceSq(mouseVec, measure.begin, measure.end, beginToEnd.magSq());
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
        nearestLine = [measure.begin, measure.end];
      }
    }
    const targetPointDistanceSq = 120*generalSettings.lineWidth;
    const targetLineDistanceSq = generalSettings.lineWidth*generalSettings.lineWidth;
    guiMeasureComposer.forEachMeasure(
      measure => checkMeasure(measure, targetPointDistanceSq, targetLineDistanceSq));
    if (nearestEndpoint !== null) {
      draggedEndpoints = nearestEndpoint;
      guiMeasureComposer.viewMeasurement(nearestEndpointMeasurement);
    } else {
      draggedEndpoints = nearestLine;
      guiMeasureComposer.viewMeasurement(nearestLineMeasurement);
    }
  }
}

function keyPressed() {
  if (keyCode == ALT) {
    generalSettings.isAltButtonDown = true;
  } else if (keyCode == CONTROL) {
    generalSettings.isCtrlButtonDown = true;
  } else if (keyCode == SHIFT) {
    generalSettings.isShiftButtonDown = true;
  }
  print('Alt', generalSettings.isAltButtonDown,
    'Ctrl', generalSettings.isCtrlButtonDown,
    'Shift', generalSettings.isShiftButtonDown);
}

function keyReleased() {
  if (keyCode == ALT) {
    generalSettings.isAltButtonDown = false;
  } else if (keyCode == CONTROL) {
    generalSettings.isCtrlButtonDown = false;
  } else if (keyCode == SHIFT) {
    generalSettings.isShiftButtonDown = false;
  }
  print('Alt', generalSettings.isAltButtonDown,
    'Ctrl', generalSettings.isCtrlButtonDown,
    'Shift', generalSettings.isShiftButtonDown);
}