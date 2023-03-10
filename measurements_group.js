
function tryCatch(func, failFunc) {
   try { return func() }
   catch(e) { return failFunc(e) }
}

function loadMeasurementsFromYamlDump(guifyInstance, measurementsGuiComposer, parsedContent) {
  measurementsGuiComposer.removeAllGroups(guifyInstance);
  const makeLine = function(measureYamlContent) {
     return {
      begin: createVector(...measureYamlContent[getLocalized('toStringBegin')]),
      end: createVector(...measureYamlContent[getLocalized('toStringEnd')]),
      denotationOverride: measureYamlContent[getLocalized('toStringDenotation')] || null,
     };
  }

  parsedContent.forEach(group => {
    let groupFolder = group[getLocalized('toStringGroup')];
    let baseMeasure = makeLine(group[getLocalized('toStringBaseMeasure')]);
    let measuresArray = group[getLocalized('toStringMeasures')];
    let baseAbsoluteLength = group[getLocalized('toStringAbsoluteLength')];
    if (!measuresArray) {
      measuresArray = [];
    }
    measuresArray = measuresArray.map(measureObj => makeLine(measureObj));
    print(measuresArray);
    let nTries = 30;
    while(nTries > 0) {
      --nTries;
      try {
        let newGroup = measurementsGuiComposer.newGroup(
          guifyInstance, getLocalized('measuresFolder'), groupFolder,
        (baseMeasure.denotationOverride || 'a')[0], // TODO: hack
        baseMeasure, measuresArray, baseAbsoluteLength);
        break;
      } catch (exception) {
        print('Error loading from file folder', groupFolder, exception);
        groupFolder = groupFolder + '0';
      }
    }
  });
}

function loadMeasurementsPreset(guifyInstance, measurementsGuiComposer, gridSettings) {
   measurementsGuiComposer.removeAllGroups(guifyInstance);
   const wLow = gridSettings.gridWidthInterval[0], wHigh = gridSettings.gridWidthInterval[1];
   const hLow = gridSettings.gridHeightInterval[0], hHigh = gridSettings.gridHeightInterval[1];
   const w = wHigh - wLow, h = hHigh - hLow;
   const w2 = w*0.5, h2 = h*0.5;
   const wd = w*0.02, hd = h/gridSettings.gridNumOfInnerLines; // deltas
   const makeLine = function(x0, y0, x1, y1, denotation, boundBegin, boundEnd) {
      return {
      begin: createVector(x0, y0),
      end: createVector(x1, y1),
      denotationOverride: denotation || null,
      boundBegin: boundBegin || null,
      boundEnd: boundEnd || null,
      };
   }

   const hRoot = hHigh, h13 = hHigh-h*0.1, hDk = hHigh - h2 - hd*0.5, hD0 = hHigh-h*0.4;
   const dlow = gridSettings.gridTrunkWidthInterval[0], dhigh = gridSettings.gridTrunkWidthInterval[1];
   const Dlow = dlow - w*0.4, Dhigh = dhigh + w*0.4;
   const heightDefaultMeasures = [
      makeLine(1*wd     , hHigh  , 1*wd    , hLow      , 'H'   ), // full height
      makeLine(2*wd    , hHigh  , 0+2*wd   , hDk     , 'h_Dk'), // height to crown max
      makeLine(3*wd    , hHigh  , 0+3*wd   , hD0     , 'h_D0'), // height to crown beginning
      makeLine(4*wd    , hHigh  , 0+4*wd   , h13  , 'h_d1.3'), // height to 1.3 m
   ];
   const crownDefaultMeasures = [
      makeLine(Dlow   , hDk, Dhigh  , hDk , 'Dk'), // crown max
   ];
   const trunkDefaultMeasures = [
     makeLine(dlow   , h13 , dhigh  , h13  , 'd1.3'), // trunk at height 1.3m
     makeLine(dlow   , hD0 , dhigh  , hD0  , 'd_D0'), // trunk at crown beginning
     makeLine(dlow   , hDk , dhigh  , hDk  , 'd_Dk'), // trunk at crown max
   ];

   // add measurements for each horizontal grid line
   forEachGridLine(0, 0, 1.0, (i, gridLine) => {
     heightDefaultMeasures.push(makeLine(w + (i+1)*wd, hHigh, w + (i+1)*wd, gridLine[1], 'h' + i));
     crownDefaultMeasures.push(makeLine(Dlow, gridLine[1], Dhigh, gridLine[1], 'D' + i));
     trunkDefaultMeasures.push(makeLine(dlow, gridLine[1], dhigh, gridLine[1], 'd' + i));
   }, null)
   let newGroup = measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'),
      getLocalized('heightMeasurementsGroup'),
      'h', heightDefaultMeasures[0], heightDefaultMeasures.slice(1));
   newGroup.data.measuresAddedCounter = gridSettings.gridNumOfInnerLines+1;
   newGroup = measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'),
      getLocalized('crownDiameterMeasurementsGroup'),
      'D', crownDefaultMeasures[0], crownDefaultMeasures.slice(1));
   newGroup.data.measuresAddedCounter = gridSettings.gridNumOfInnerLines+1;
   newGroup = measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'),
      getLocalized('truckDiameterMeasurementsGroup'),
      'd', trunkDefaultMeasures[0], trunkDefaultMeasures.slice(1));
   newGroup.data.measuresAddedCounter = gridSettings.gridNumOfInnerLines+1;
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
     this.dummyString = '<STUB>';
     this.boundMeasures = new Map();
     this.removeAllGroups();
   }
 
   getViewedMeasurement() {
     return this.viewMeasure;
   }
 
   viewGuiSetEnabled(isEnabled, isRemoveEnabled){
     Object.values(this.viewGuiObjects).forEach(guiObj => guiObj.SetEnabled(isEnabled));
     this.viewGuiObjects.removeButton.SetEnabled(isRemoveEnabled);
   }
 
   viewMeasurement(measurementBoundData, isRemovable) {
     this.viewMeasure = measurementBoundData;
     print('Selected measurement');
 
     if (measurementBoundData === null) {
       this.viewGuiSetEnabled(false);
       return;
     }
     if (isRemovable === undefined) {
       let location = this._locateMeasurementObj(measurementBoundData);
       isRemovable = location.measureGroup !== null && location.measureIndex != -1;
     }
     this.viewGuiSetEnabled(true, isRemovable);
     const boundMap = {
       x0: {object: measurementBoundData.begin, property: 'x'},
       y0: {object: measurementBoundData.begin, property: 'y'},
       x1: {object: measurementBoundData.end, property: 'x'},
       y1: {object: measurementBoundData.end, property: 'y'},
       relativeLength: {object: measurementBoundData, property: 'relativeLength'},
       absoluteLength: {object: measurementBoundData, property: 'absoluteLength'},
       denotationOverride: {
        object: measurementBoundData, 
        property: 'denotationOverride',
        onChange: (data) => {
          this._changeMeasureDenotation(this.viewMeasure, data);
        }
      },
     }
     for(const [key, mapping] of Object.entries(boundMap)) {
       this.viewGuiObjects[key].binding.object = mapping.object;
       this.viewGuiObjects[key].binding.property = mapping.property;
       this.viewGuiObjects[key].removeAllListeners('input');
       this.viewGuiObjects[key].on("input", (data) => {
         if(mapping.object && mapping.property) {
            mapping.object[mapping.property] = data;
         }
         if(mapping.onChange) {
            mapping.onChange(data);
         }
      });
     }
   }
 
   updateViewGui(imageWidth, imageHeight) {
     this.viewGuiObjects.x0.max = this.viewGuiObjects.x0.maxPos = this.viewGuiObjects.x0.input.max = imageWidth;
     this.viewGuiObjects.x1.max = this.viewGuiObjects.x1.maxPos = this.viewGuiObjects.x1.input.max = imageWidth;
     this.viewGuiObjects.y0.max = this.viewGuiObjects.y0.maxPos = this.viewGuiObjects.y0.input.max = imageHeight;
     this.viewGuiObjects.y1.max = this.viewGuiObjects.y1.maxPos = this.viewGuiObjects.y1.input.max = imageHeight;
   }
 
   _locateMeasurementObj(measurement) {
      let measureGroup = null, measureIndex = null;
      if (measurement) {
        this.groups.forEach(group => {
          let foundIdx = group.data.measures.findIndex(measure => measure == measurement);
          if (foundIdx >= 0) {
              measureGroup = group;
              measureIndex = foundIdx;
          } else if (group.data.baseMeasure == measurement) {
            measureGroup = group;
            measureIndex = -1;
          }
        });
      }
      return { measureIndex: measureIndex, measureGroup: measureGroup };
   }

   duplicateViewedMeasurement(guifyInstance) {
      let location = this._locateMeasurementObj(this.viewMeasure);
      if (location.measureGroup) {
        this.addMeasure(guifyInstance, location.measureGroup,
          {denotationOverride: location.measureGroup.data.denotation + location.measureGroup.data.measuresAddedCounter});
      }
   }

   removeViewedMeasurement(guifyInstance) {
      if (!this.viewMeasure) { return; }
      if (!this.viewMeasure.guiObjects) { return; }
      let location = this._locateMeasurementObj(this.viewMeasure);
      console.assert(location.measureIndex !== null && location.measureIndex != -1);
      location.measureGroup.data.measures.splice(location.measureIndex, 1);
      Object.values(this.viewMeasure.guiObjects).forEach(obj => tryCatch(
        ()=>{ guifyInstance.Remove(obj); },
        (e)=>{}
      ))
      this.viewMeasurement(null);
      // TODO delete from boundMap
   }

   addViewGui(guifyInstance, viewFolder) {
     const definitions = {
       label: {
         type: 'display',
         label: '',
         initial: getLocalized('guiSelectedMeasure'),
       },
       denotationOverride: {
         type: 'text',
         label: getLocalized('measureDenotation'),
         object: this, property: 'dummyString',
       },
       x0 : {
         type: 'range',
         label: getLocalized('beginPointX'),
         min: 0, max: 1, step: 1,
         object: this, property: 'dummyVariable',
       },
       x1 : {
        type: 'range',
        label: getLocalized('endPointX'),
        min: 0, max: 1, step: 1,
        object: this, property: 'dummyVariable'
      },
       y0 : {
         type: 'range',
         label: getLocalized('beginPointY'),
         min: 0, max: 1, step: 1,
         object: this, property: 'dummyVariable'
       },
       y1 : {
         type: 'range',
         label: getLocalized('endPointY'),
         min: 0, max: 1, step: 1,
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
       duplicateButton : {
          type: 'button',
          label: getLocalized('guiDuplicateMesure'),
          action: () => this.duplicateViewedMeasurement(guifyInstance),
       },
       removeButton : {
             type: 'button',
             label: getLocalized('guiRemoveMeasure'),
             action: () => this.removeViewedMeasurement(guifyInstance),
       }
     };
     for (const [key, definition] of Object.entries(definitions)) {
       let guiObj = guifyInstance.Register(definition, { folder: viewFolder });
       this.viewGuiObjects[key] = guiObj;
     }
     this.viewGuiSetEnabled(false);
   }
 
   _addMeasureGui({guifyInstance=null, parentFolder=null, label=null, boundData=null, isRemovable=true}) {
     let definitions = [
       {
         type: 'button',
         label: label,
         folder: parentFolder,
         action: () => {
           this.viewMeasurement(boundData, isRemovable);
         }
       },
     ];
     let objects = [];
     for (let definition of definitions) {
       objects.push(guifyInstance.Register(definition));
     }
     return objects;
   }

   _changeMeasureDenotation(measure, newDenotation) {
      if (measure && measure.guiObjects && measure.guiObjects.length > 0) {
        print('change denotation', newDenotation);
        measure.guiObjects[0].input.textContent = newDenotation;
      }
   }

   _changeGroupName(group, newName) {
      if (group && group.guiObjects && group.guiObjects.length > 0) {
        let folderObj = group.guiObjects.find(obj => obj.opts.type == 'folder');
        folderObj.label.innerText = newName;
        group.data.displayName = newName;
        // group.groupFolder = newName;
        // group.guiObjects.forEach(obj => {
        //   if (obj == folderObj) return;
        //   obj.opts.folder = newName;
        // })
      }
   }
 
   _addFloatNoSlider(guifyInstance, definition) {
     let obj = guifyInstance.Register(definition);
     obj.container.querySelectorAll('.guify-value-input').forEach(
       el => { el.style.width = "56%"; }
     );
     return obj;
   }
 
   makeNeighborMeasure(measureData, offsetScale) {
      const direction = p5.Vector.sub(measureData.begin, measureData.end).normalize();
      const perpendicular = createVector(direction.y, -direction.x).mult(offsetScale);
      return {
        begin: measureData.begin.copy().add(perpendicular),
        end:   measureData.end.copy().add(perpendicular)
      }
   }
   addMeasure(guifyInstance, group, measureOverrideData) {
     let index = group.data.measuresAddedCounter;
     let defaults = {
       begin: createVector(Math.random()*1000, Math.random()*1000),
       end: createVector(Math.random()*1000, Math.random()*1000),
       denotationOverride: null,
     };
     if (this.viewMeasure) {
        Object.assign(defaults, this.makeNeighborMeasure(this.viewMeasure, 60));
     }
     Object.assign(defaults, measureOverrideData);
     group.data.measures.push(defaults);
     let measureGuiObjects = this._addMeasureGui({
       guifyInstance: guifyInstance, parentFolder: group.groupFolder,
       label: defaults.denotationOverride || `${getLocalized('measure')} ${index+1}`,
       boundData: group.data.measures[group.data.measures.length-1],
       groupFolder: group.groupFolder,
     });
     defaults.guiObjects = measureGuiObjects;
     group.guiObjects.push(...measureGuiObjects);
     group.data.measuresAddedCounter += 1;
     this.viewMeasurement(defaults, true);
   }
 
  //  bindMeasures(observerMeasure, isObserverBegin, isObserverEnd, sourceMeasure, isSourceBegin, isSourceEnd) {
  //    if (this.boundMeasures.has(observerMeasure)) {
  //      let state = this.boundMeasures.get(observerMeasure);
  //      if (isObserverBegin) {
  //        state.begin = isSourceBegin ? sourceMeasure.begin : sourceMeasure.end;
  //      }
  //      if (isObserverEnd) {
  //        state.end = isSourceBegin ? sourceMeasure.begin : sourceMeasure.end;
  //      }
  //    } else {
  //      this.boundMeasures.set(observerMeasure, { 
  //        begin: isObserverBegin ? (isSourceBegin ? sourceMeasure.begin : sourceMeasure.end) : null,
  //        end: isObserverEnd ? (isSourceBegin ? sourceMeasure.begin : sourceMeasure.end) : null,
  //      })
  //    }
  //  }
 
  _addGroupGui(guifyInstance, parentFolder, group) {
    let groupBoundData = group.data;
    let groupFolder = group.groupFolder;
    let guiObjects = group.guiObjects;
    this._removeGuiObjects(guifyInstance, guiObjects); // remove old
    guiObjects.push(guifyInstance.Register({
      type: 'folder',
      label: groupFolder,
      folder: parentFolder,
    }))
    guiObjects.push(guifyInstance.Register({
      type: 'button',
      label: getLocalized('guiRemoveGroup'),
      folder: groupFolder,
      action: () => {
        if (this.groups.length == 1 || confirm(getLocalized('removeGroupDialog') + ' ' + groupFolder)) {
          this.removeGroup(guifyInstance, groupFolder);
        } else {
          print('Cancel removing of group');
        }
      }
    }));
    guifyInstance.Register({
      type: 'text',
      listenMode: 'change',
      label: getLocalized('guiGroupName'),
      property: 'displayName',
      object: groupBoundData, folder: groupFolder,
      onChange: (data) => {
        this._changeGroupName(group, data);
      }
    });
    guiObjects.push(guifyInstance.Register({
      type: 'checkbox',
      label: getLocalized('guiGroupIsRendered'),
      property: 'isRendered',
      object: groupBoundData, folder: groupFolder,
    }));
    guiObjects.push(guifyInstance.Register({
        type: 'color',
        label: getLocalized('guiGroupColor'),
        format: 'hex',
        property: 'color',
        object: groupBoundData, folder: groupFolder
    }));
    guiObjects.push(guifyInstance.Register({
        type: 'text',
        label: getLocalized('guiGroupDenotation'),
        property: 'denotation',
        object: groupBoundData, folder: groupFolder,
    }));
    guiObjects.push(this._addFloatNoSlider(guifyInstance, {
      type: 'range',
      label: getLocalized('guiBaseAbsoluteValue'),
      min: 1e-3, max: 1e6, step:1e-6, precision: 20,
      property: 'baseAbsoluteLength',
      object: groupBoundData, folder: groupFolder,
    }));

    guiObjects.push(guifyInstance.Register({
      type: 'button',
      label: getLocalized('guiNewMeasure'),
      folder: groupFolder,
      action: () => this.addMeasure(guifyInstance, group,
        {denotationOverride: group.data.denotation + group.data.measuresAddedCounter}),
    }));
    const baseGuiObjects = this._addMeasureGui({
      guifyInstance: guifyInstance, parentFolder: groupFolder,
      label: (groupBoundData.baseMeasure.denotationOverride || getLocalized('baseMeasurePrefix')) + getLocalized('baseMeasureSuffix'),
      boundData: groupBoundData.baseMeasure,
      isRemovable: false,
    });
    guiObjects.push(...baseGuiObjects);
    groupBoundData.baseMeasure.guiObjects = baseGuiObjects;

    for(var [index, measureData] of groupBoundData.measures.entries()) {
        let measureGuiObjects = this._addMeasureGui({
          guifyInstance: guifyInstance, parentFolder: groupFolder,
          label: measureData.denotationOverride || `${getLocalized('measure')} ${index+1}`,
          boundData: measureData,
          groupFolder: groupFolder,
        });
        guiObjects.push(...measureGuiObjects);
        measureData.guiObjects = measureGuiObjects;
    }
  }
   newGroup(guifyInstance, parentFolder, groupFolder, groupDenotation, baseDefaultCoords, measuresDefaultCoords, baseAbsoluteLength) {
     for (var existingGroup of this.groups) {
      if (existingGroup.groupFolder == groupFolder) {
        throw new Error("Not unique group folder name");
      }
     }
     let guiObjects = [];
     guiObjects.push(guifyInstance.Register({
       type: 'folder',
       label: groupFolder,
       folder: parentFolder,
       open: false
     }));
     let defaults;
     if (this.nextDefaultIndex < this.constructor.groupsDefaults.length) {
       defaults = this.constructor.groupsDefaults[this.nextDefaultIndex];
       ++this.nextDefaultIndex;
     } else {
       const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
       const characters       = 'FGHIJKLMNOPQRSTUVWXYZfghijklmnopqrstuvwxyz';
       const charactersLength = characters.length;
       const randomDenotation = characters.charAt(Math.floor(Math.random() * charactersLength))
       defaults = { color: randomColor, denotation: randomDenotation };
     }
     if (groupDenotation !== undefined) {
       defaults.denotation = groupDenotation;
     }
     let denotationOverride = null;
     if (defaults.denotation) {
       denotationOverride = defaults.denotation;
     }
     let groupBoundData = {
       ...defaults,
       opacity: 1.0,
       isRendered: true,
       baseMeasure: {
         begin: createVector(Math.random()*300, Math.random()*300),
         end: createVector(300+Math.random()*700, 300+Math.random()*700),
         denotationOverride: denotationOverride,
         guiObjects: null,
        },
       displayName: groupFolder,
       baseAbsoluteLength: baseAbsoluteLength || 1.0,
       measuresAddedCounter: 0,
       measures: []
     };
     if (this.viewMeasure) {
        Object.assign(groupBoundData.baseMeasure, 
          this.makeNeighborMeasure(this.viewMeasure, 50));
     }
     if (baseDefaultCoords !== undefined) {
       Object.assign(groupBoundData.baseMeasure, baseDefaultCoords);
     }
     const group = {guiObjects: guiObjects, data: groupBoundData, groupFolder: groupFolder};
     this._addGroupGui(guifyInstance, parentFolder, group);
     this.groups.push(group);
     if (measuresDefaultCoords !== undefined) {
       measuresDefaultCoords.forEach(measureOverride => {
         this.addMeasure(guifyInstance, group, measureOverride);
       })
     }
     this.viewMeasurement(groupBoundData.baseMeasure, false);
     return group;
   }
 
   _removeGuiObjects(guifyInstance, guiObjects) {
     guiObjects.forEach(
       obj => tryCatch(
         () => { guifyInstance.Remove(obj) },
         (e) => { print('Error deleting', e, obj); }
       )
     )
     guiObjects.splice(0, guiObjects.length);
   }
   removeGroup(guifyInstance, groupFolder) {
     let groupIndex = this.groups.findIndex(group => group.groupFolder == groupFolder);
     this._removeGuiObjects(guifyInstance, this.groups[groupIndex].guiObjects);
     this.groups.splice(groupIndex, 1);
     this.viewMeasurement(null);
   }
 
   removeAllGroups(guifyInstance) {
     while(this.groups.length > 0) {
       print(this.groups[this.groups.length - 1].groupFolder);
       this.removeGroup(guifyInstance, this.groups[this.groups.length - 1].groupFolder);
     }
     this.nextDefaultIndex = 0;
   }
 
   forEachMeasure(func, onlyVisible) {
     this.groups.forEach(group => {
        if(onlyVisible && !group.data.isRendered) {
          return;
        }
       func(group.data.baseMeasure);
       group.data.measures.forEach(measure => {
         func(measure);
       })
     });
   }
 
   forEachPoint(func, onlyVisible) {
     this.forEachMeasure(measure => {
       func(measure.begin);
       func(measure.end);
     }, onlyVisible);
   }

   allMeasuresToString({imageRotationDegrees=0}) {
      if (this.groups.length == 0) {
        return null;
      }
      let lines = [];
      this.groups.forEach(group => {
        this._groupToYaml(group, lines, imageRotationDegrees);
      });
      return lines.join('');
   }

   _groupToYaml(group, destinationArray, imageRotationDegrees) {
    let groupFolder = group.groupFolder;
    let guiObjects = group.guiObjects;
    let groupBoundData = group.data;
    const measureToString = (measure, prefix, firstPrefix) => {
      destinationArray.push(firstPrefix + getLocalized('toStringDenotation'), ': ',measure.denotationOverride, '\n');
      destinationArray.push(prefix + getLocalized('toStringBegin'), ': [',
        measure.begin.x, ',', measure.begin.y, ']\n');
      destinationArray.push(prefix + getLocalized('toStringEnd'), ': [',
        measure.end.x, ',', measure.end.y, ']\n');
    }
    destinationArray.push('- ' + getLocalized('toStringGroup'), ': "', group.data.displayName, '"\n');

    // reproducibility meta info
    destinationArray.push('  ' + getLocalized('toStringNumMeasurements'), ': ', groupBoundData.measures.length + 1, '\n');
    destinationArray.push('  ' + getLocalized('toStringAbsoluteLength'), ': ', groupBoundData.baseAbsoluteLength, '\n');
    destinationArray.push('  ' + getLocalized('toStringRotation'), ': ', imageRotationDegrees, '\n');
    destinationArray.push('  ' + getLocalized('toStringBaseMeasure'), ':\n');
    measureToString(groupBoundData.baseMeasure, '    ', '    ');
    destinationArray.push('  ' + getLocalized('toStringMeasures'), ':\n');
    groupBoundData.measures.forEach(measure => {
      measureToString(measure, '    ', '  - ');
    });

    // table
    destinationArray.push('  ' + getLocalized('toStringTableView'), ': >\n');
    let tableBegin = destinationArray.length;
    this._groupToStringArray(group, destinationArray, '    ');
    let tableEnd = destinationArray.length;
    for(var i = tableBegin; i < tableEnd; ++i) {
      destinationArray[i] = '    ' + destinationArray[i];
    }

    destinationArray.push('\n')
   }

   _groupToStringArray(group, destinationArray) {
    let groupBoundData = group.data;
    let measuresSorted = groupBoundData.measures.slice(0)
      .sort(function(a, b) { 
        if (a.relativeLength < b.relativeLength) return 1;
        else if (a.relativeLength > b.relativeLength) return -1;
        return 0;
      });
    
    let padName = max(getLocalized('toStringMeasurementName').length + 1, 20);
    let padLength = max(getLocalized('toStringRelativeLengthTable').length + 1, 7);
    let padAbsLength = max(getLocalized('toStringAbsoluteLengthTable').length + 1, 7);
    destinationArray.push(getLocalized('toStringMeasurementName').padEnd(padName));
    destinationArray.push(getLocalized('toStringRelativeLengthTable').padEnd(padLength));
    destinationArray.push(getLocalized('toStringAbsoluteLengthTable').padEnd(padAbsLength));
    destinationArray.push('\n');
    const measureToString = (measure) => {
      destinationArray.push((measure.denotationOverride || "").padEnd(padName));
      destinationArray.push(measure.relativeLength.toString().substr(0, padLength-1).padEnd(padLength));
      destinationArray.push(measure.absoluteLength.toString().substr(0, padAbsLength-1).padEnd(padAbsLength));
      destinationArray.push('\n');
    }
    measureToString(groupBoundData.baseMeasure);
    measuresSorted.forEach(measure => measureToString(measure));
    // destinationArray.push(getLocalized('toStringBeginX').padEnd(padCoord));
    // destinationArray.push(getLocalized('toStringBeginY').padEnd(padCoord));
    // destinationArray.push(getLocalized('toStringEndX').padEnd(padCoord));
    // destinationArray.push(getLocalized('toStringEndY').padEnd(padCoord), '\n');
   }
 }