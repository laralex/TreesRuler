'use strict';

let img;
let localization;
let gui;
let guiMeasureComposer;
var imgView;

let generalSettings = new function() {
  this.crosshairEnabled = true;
  this.language = 'Russian';
  this.languageGuiToId = {'Russian': 'RUS', 'English': 'ENG'};
  this.lineWidth = 10;
  this.guiOpacity = 0.9;
  this.guiWidth = 300;
  this.guiTheme = 'yorha';
  this.guiAskUnsaved = false;
  this.nextGroupName = null;
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

  constructor(imageWidth, imageHeight) {
    this.groups = [];
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    this.nextDefaultIndex = 0;
    this.viewGuiObjects = {};
    this.viewMeasureObjects = null;
    print(getLocalized('defaultGroupName'))
    generalSettings.nextGroupName = getLocalized('defaultGroupName')+0;
  }

  viewMeasurement(guiObjects, measurementBoundData) {
    print('Selected', measurementBoundData);
    for(const [key, guiObj] of Object.entries(this.viewGuiObjects)) {
      guiObj.bounding.object = measurementBoundData;
      guiObj.bounding.property = key;
    }
  }

  addViewGui(gui, viewFolder) {
    const definitions = {
      label: {
        type: 'display',
        label: '',
        initial: getLocalized('guiSelectedMeasure'),
      },
      x0 : {
        type: 'range',
        label: getLocalized('beginPointX'),
        min: 0, max: this.imageWidth, step: 1,
      },
      y0 : {
        type: 'range',
        label: getLocalized('beginPointY'),
        min: 0, max: this.imageHeight, step: 1,
      },
      x1 : {
        type: 'range',
        label: getLocalized('endPointX'),
        min: 0, max: this.imageWidth, step: 1,
      },
      y1 : {
        type: 'range',
        label: getLocalized('endPointY'),
        min: 0, max: this.imageHeight, step: 1,
      },
      relativeLength : {
        type: 'display',
        label: getLocalized('guiRelativeLength'),
      },
      absoluteLength : {
        type: 'display',
        label: getLocalized('guiAbsoluteLength'),
      },
      removeButton : {
            type: 'button',
            label: getLocalized('guiRemoveMeasure'),
            action: () => {
              if (this.viewMeasureObjects === null) { return; }
              this.viewMeasureObjects.forEach(obj => tryCatch(
                ()=>gui.Remove(obj),
                (e)=>{}
              ))
            },
      }
    };
    for (const [key, definition] of Object.entries(definitions)) {
      let guiObj = gui.Register(definition, { folder: viewFolder });
      if (key !== 'label' || key !== 'removeButton') {
        // guiObj.SetEnabled(false)
        this.viewGuiObjects.key = guiObj;
      }
    }
  }

  _newMeasure({gui=null, parentFolder=null, newFolderName=null, boundData=null}) {
    let definitions = [
      {
        type: 'button',
        label: newFolderName,
        folder: parentFolder,
        action: () => {
          this.viewMeasurement(objects, boundData);
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
        x0: Math.random()*1000,
        y0: Math.random()*1000,
        x1: Math.random()*1000,
        y1: Math.random()*1000,
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
      min: 1e-3, max: 1e6, step:1e-6,
      property: 'baseAbsoluteLength',
      object: groupBoundData, folder: groupFolder,
    }));

    guiObjects.push(gui.Register({
      type: 'button',
      label: getLocalized('guiNewMeasure'),
      folder: groupFolder,
      action: () => {
        let index = groupBoundData.measures.length;
        groupBoundData.measures.push({x0: Math.random()*1000, y0: Math.random()*1000, x1: 0, y1: 0, guiObjects: null});
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
}

function tryCatch(func, failFunc) {
  try { return func() }
  catch(e) { return failFunc(e) }
}

function setupGui(gui, panel) {
  if (gui !== undefined) {
    let guifyContainers = document.getElementsByClassName('guify-container');
    for (let element of guifyContainers) {
        element.remove();
    }
    print('Deleted GUI instances');
  }

  gui = new guify({
    title:  getLocalized('title'),
    theme: panel.guiTheme, // dark, light, yorha, or theme object
    align: 'right', // left, right
    width: panel.guiWidth,
    barMode: 'above', // none, overlay, above, offset
    panelMode: 'inner',
    panelOverflowBehavior: 'scroll',
    pollRateMS: 200,
    opacity: panel.guiOpacity,
    open: true
  });
  document.title = getLocalized('title');
  gui.Register([
    {
      type: 'select',
      options: ['Russian', 'English'],
      label: getLocalized('language'),
      object: panel,
      property: 'language',
      onChange: (data) => {
        setupGui(gui, panel);
      },
    },
    {
      type: 'checkbox',
      label: getLocalized('guiAskUnsaved'),
      property: 'guiAskUnsaved',
      object: panel,
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

  gui.Register([
    {
      type: 'range',
      label: getLocalized('guiOpacity'),
      min: 0.1, max: 1.0, step: 0.05,
      object: panel,
      property: 'guiOpacity',
      onChange: (data) => {
        document.getElementsByClassName('guify-panel-container')[0].style.opacity = data;
      }
    },

    {
      type: 'select',
      label: getLocalized('guiWidth'),
      options: [300, 375, 600],
      object: panel,
      property: 'guiWidth',
      onChange: (data) => {
        let value = data+'px';
        document.getElementsByClassName('guify-panel-container')[0].style.width = value;
      }
    },

    {
      type: 'select',
      label: getLocalized('guiTheme'),
      options: ['yorha', 'dark', 'light'],
      object: panel,
      property: 'guiTheme',
      onChange: (data) => {
        setupGui(gui, panel);
      }
    },
  ], { object: panel, folder: getLocalized('guiFolder') });

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

  guiMeasureComposer = new MeasureGroupGuiComposer(1, 1);
  guiMeasureComposer.addViewGui(gui, null);

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
    guiMeasureComposer = new MeasureGroupGuiComposer(img.width, img.height);
    print('Loaded image', uri.slice(0, 100));
  });
  
}

function preload() {
  localization = loadJSON('./localization.json');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  windowResized();
  gui = setupGui(gui, generalSettings);
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

function drawMeasurements(panX, panY, zoom) {
  push();
  strokeWeight(generalSettings.lineWidth*(log(zoom+1)));
  strokeCap(SQUARE);
  guiMeasureComposer.groups.forEach(group => {
    if (!group.data.isRendered) {
      return;
    }
    var measure = group.data.baseMeasure;
    stroke(group.data.color);
    line(measure.x0*zoom + panX,
      measure.y0*zoom + panY,
      measure.x1*zoom + panX,
      measure.y1*zoom + panY);
    // stroke(group.data.color);
    for (var measure of group.data.measures) {
      line(measure.x0*zoom + panX,
        measure.y0*zoom + panY,
        measure.x1*zoom + panX,
        measure.y1*zoom + panY);
    }
  });
  pop();
}

function draw() {
  clear();
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
  if (mouseButton === RIGHT) {
    zoomSettings.panX -= movedX/img.width/zoomSettings.zoom;
    zoomSettings.panY -= movedY/img.height/zoomSettings.zoom;
  }
}