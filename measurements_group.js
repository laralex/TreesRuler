
function tryCatch(func, failFunc) {
   try { return func() }
   catch(e) { return failFunc(e) }
}

function loadMeasurementsPreset(guifyInstance, measurementsGuiComposer, imageWidth, imageHeight) {
   measurementsGuiComposer.removeAllGroups(guifyInstance);
   const w = imageWidth, h = imageHeight;
   const w2 = imageWidth / 2, h2 = imageHeight / 2;
   const wd = imageWidth*0.05, hd = imageHeight*0.05; // deltas
   const makeLine = function(x0, y0, x1, y1, denotation, boundBegin, boundEnd) {
      return {
      begin: createVector(x0, y0),
      end: createVector(x1, y1),
      denotationOverride: denotation || null,
      boundBegin: boundBegin || null,
      boundEnd: boundEnd || null,
      };
   }

   const hRoot = h-2*hd, h13 = h-3*hd, hDk = h*0.4, hD0 = h*0.75;
   const heightDefaultMeasures = [
      makeLine(0+1*wd    , hRoot  , 0+1*wd   , hd      , 'H'   ), // full height
      makeLine(0+2*wd    , hRoot  , 0+2*wd   , hDk     , 'h_Dk'), // height to crown max
      makeLine(0+3*wd    , hRoot  , 0+3*wd   , hD0     , 'h_D0'), // height to crown beginning
      makeLine(0+4*wd    , hRoot  , 0+4*wd   , h13  , 'h_d1.3'), // height to 1.3 m
   ];
   const crownDefaultMeasures = [
      makeLine(w2-6*wd   , hDk-0*hd , w2+6*wd  , hDk-0*hd    , 'Dk'), // crown max
   ];
   const trunkDefaultMeasures = [
     makeLine(w2-1*wd   , h13 , w2+1*wd  , h13  , 'd1.3'), // trunk at height 1.3m
     makeLine(w2-1*wd   , hD0 , w2+1*wd  , hD0  , 'd_D0'), // trunk at crown beginning
     makeLine(w2-1*wd   , hDk , w2+1*wd  , hDk  , 'd_Dk'), // trunk at crown max
   ];
   let newGroup = measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'),
      getLocalized('heightMeasurementsGroup'),
      'H', heightDefaultMeasures[0], heightDefaultMeasures.slice(1));
   newGroup.data.measuresAddedCounter = 0;
   newGroup = measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'),
      getLocalized('crownDiameterMeasurementsGroup'),
      'D', crownDefaultMeasures[0], crownDefaultMeasures.slice(1));
   newGroup.data.measuresAddedCounter = 0;
   newGroup = measurementsGuiComposer.newGroup(guifyInstance, getLocalized('measuresFolder'),
      getLocalized('truckDiameterMeasurementsGroup'),
      'd', trunkDefaultMeasures[0], trunkDefaultMeasures.slice(1));
   newGroup.data.measuresAddedCounter = 0;
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
     this.viewGuiSetEnabled(true, isRemovable);
     const boundMap = {
       x0: {object: measurementBoundData.begin, property: 'x'},
       y0: {object: measurementBoundData.begin, property: 'y'},
       x1: {object: measurementBoundData.end, property: 'x'},
       y1: {object: measurementBoundData.end, property: 'y'},
       relativeLength: {object: measurementBoundData, property: 'relativeLength'},
       absoluteLength: {object: measurementBoundData, property: 'absoluteLength'},
       denotationOverride: {object: measurementBoundData, property: 'denotationOverride'},
     }
     print(measurementBoundData.denotationOverride);
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
 
   addViewGui(guifyInstance, viewFolder, imageWidth, imageHeight) {
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
         onChange: (data) => {},
         onInitialize: (data) => {},
       },
       x0 : {
         type: 'range',
         label: getLocalized('beginPointX'),
         min: 0, max: imageWidth, step: 1,
         object: this, property: 'dummyVariable',
         onChange: (data) => {},
         onInitialize: (data) => {},
       },
       x1 : {
        type: 'range',
        label: getLocalized('endPointX'),
        min: 0, max: imageWidth, step: 1,
        object: this, property: 'dummyVariable'
      },
       y0 : {
         type: 'range',
         label: getLocalized('beginPointY'),
         min: 0, max: imageHeight, step: 1,
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
               if (!this.viewMeasure.guiObjects) { return; }
               // let measurementGroup = this.groups.find(group => group.groupFolder == this.viewGuiObjects[0].folder);
               // let measurementIndex = measurementGroup.measures.findIndex(measure => measure == this.viewMeasure);
               // measurementGroup.measures.splice(measurementIndex, 1);
               let measureGroup, measureIndex;
               this.groups.forEach(group => {
                  let foundIdx = group.data.measures.findIndex(measure => measure == this.viewMeasure);
                  print(foundIdx);
                  if (foundIdx >= 0) {
                     measureGroup = group;
                     measureIndex = foundIdx;
                     return;
                  }
               })
               measureGroup.data.measures.splice(measureIndex, 1);
               Object.values(this.viewMeasure.guiObjects).forEach(obj => tryCatch(
                 ()=>{ guifyInstance.Remove(obj); },
                 (e)=>{}
               ))
               this.viewMeasurement(null);
               // TODO delete from boundMap
             },
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
 
   _addFloatNoSlider(guifyInstance, definition) {
     let obj = guifyInstance.Register(definition);
     obj.container.querySelectorAll('.guify-value-input').forEach(
       el => { el.style.width = "56%"; }
     );
     return obj;
   }
 
   addMeasure(guifyInstance, groupFolder, groupBoundData, destinationGuiObjects, measureOverrideData) {
     let index = groupBoundData.measuresAddedCounter;
     let defaults = {
        begin: createVector(0, 0),
       end: createVector(Math.random()*1000, Math.random()*1000),
       denotationOverride: null,
     };
     Object.assign(defaults, measureOverrideData);
     groupBoundData.measures.push(defaults);
     let measureGuiObjects = this._addMeasureGui({
       guifyInstance: guifyInstance, parentFolder: groupFolder,
       label: defaults.denotationOverride || `${getLocalized('measure')} ${index+1}`,
       boundData: groupBoundData.measures[groupBoundData.measures.length-1],
       groupFolder: groupFolder,
     });
     defaults.guiObjects = measureGuiObjects;
     destinationGuiObjects.push(...measureGuiObjects);
     groupBoundData.measuresAddedCounter += 1;
     this.viewMeasurement(defaults, true);
   }
 
   bindMeasures(observerMeasure, isObserverBegin, isObserverEnd, sourceMeasure, isSourceBegin, isSourceEnd) {
     if (this.boundMeasures.has(observerMeasure)) {
       let state = this.boundMeasures.get(observerMeasure);
       if (isObserverBegin) {
         state.begin = isSourceBegin ? sourceMeasure.begin : sourceMeasure.end;
       }
       if (isObserverEnd) {
         state.end = isSourceBegin ? sourceMeasure.begin : sourceMeasure.end;
       }
     } else {
       this.boundMeasures.set(observerMeasure, { 
         begin: isObserverBegin ? (isSourceBegin ? sourceMeasure.begin : sourceMeasure.end) : null,
         end: isObserverEnd ? (isSourceBegin ? sourceMeasure.begin : sourceMeasure.end) : null,
       })
     }
   }
 
   newGroup(guifyInstance, parentFolder, groupFolder, groupDenotation, baseDefaultCoords, measuresDefaultCoords) {
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
       defaults = { color: randomColor, denotation: groupDenotation }
     }
     if (groupDenotation !== undefined) {
       defaults.denotation = groupDenotation;
     }
     let groupBoundData = {
       ...defaults,
       opacity: 1.0,
       isRendered: true,
       baseMeasure: {
         begin: createVector(Math.random()*1000, Math.random()*1000),
         end: createVector(Math.random()*1000, Math.random()*1000),
         denotationOverride: null,
         guiObjects: null},
       baseAbsoluteLength: 1.0,
       measuresAddedCounter: 0,
       measures: []
     };
     if (baseDefaultCoords !== undefined) {
       Object.assign(groupBoundData.baseMeasure, baseDefaultCoords);
     }
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
       action: () => this.addMeasure(guifyInstance, groupFolder, groupBoundData, guiObjects),
     }));
     const baseGuiObjects = this._addMeasureGui({
       guifyInstance: guifyInstance, parentFolder: groupFolder,
       label: (groupBoundData.baseMeasure.denotationOverride || getLocalized('baseMeasurePrefix')) + getLocalized('baseMeasureSuffix'),
       boundData: groupBoundData.baseMeasure,
       isRemovable: false,
     });
     guiObjects.push(...baseGuiObjects);
     groupBoundData.baseMeasure.guiObjects = baseGuiObjects;
     const group = {guiObjects: guiObjects, data: groupBoundData, groupFolder: groupFolder};
     this.groups.push(group);
     if (measuresDefaultCoords !== undefined) {
       measuresDefaultCoords.forEach(measureOverride => {
         this.addMeasure(guifyInstance, groupFolder, groupBoundData, guiObjects, measureOverride);
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
 }