# TreeMT: Trees Measuring Tool for Forest Taxonomy / Программа метрии деревьев
> ! Инструкция на русском внизу страницы \
> ! The description in Russian follows
## Description
* Makes easier the manual labor of trees measuring:
   * input: full-height images of trees
   * helps calculating heights and widths of tree crowns relative to tree height
   * helps calculating intermediate tree trunk diameters relative to the tree's base diamater
   * output: measurements as numbers in the interface, or as a text file
* The application is portable and runs in a web-browser (implemented with JavaScript / P5.js)
* The application is authored by: Alexey Larionov:
   * email: alxs.larionov@gmail.com
   * openreview: https://openreview.net/profile?id=~Alexey_Larionov1

## Installation:
1. Follow installation of p5.js
https://github.com/processing/p5.js/wiki/Local-server


## Measurement process:
1. Load arbitrary tree images
1. Select a single loaded image to start measurements
1. Select bounding box extents that would cover the base of the tree, and the extents of the crown
1. You can place lines on the image (their two endpoints). 
   * When in "Height mode", the lines are measured relative to the tree's height
   * When in "Diameter mode", the lines are measured relative to the trunk's base diameter. First place endpoints of this base diameter.
1. You can save the measurements in a text file

## License
* the license of p5.js library that was used in this project
> The p5.js library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, version 2.1.

* the license of TreeMT (this project)
> The "Trees Measuring Tool for Forest Taxonomy" is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, version 2.1.
* icons:
> <a target="_blank" href="https://icons8.com/icon/17593/forest">Forest</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>

---

## Описание
* Программа упрощает ручной труд по измерению параметров деревьев
   * входные данные: фотографии деревьев в полный рост
   * позволяет указать и посчитать параметры относительно высоты дерева, например высоту начало кроны, высоту наибольшей ширины кроны
   * позволяет указать и посчитать параметры относительно диаметра ствола
   * выходные данные: числа измерений отображающиеся внутри программы, или в виде текстового файла (что может помочь в последующей автоматической обработке)
* Программа работает внутри Интернет-браузера, поэтому проблемы не должно быть много проблем в совместимостью (программа написана на JavaScript на основе библиотеки p5.js)
* Автор программы: Алексей Ларионов
   * email: alxs.larionov@gmail.com
   * openreview: https://openreview.net/profile?id=~Alexey_Larionov1

## Процесс получения измерений
1. Загрузите изображения деревьев с компьютера (в полный рост)
1. Выберите одно изображение, на котором начать измерения
1. Расположите на изображении прямоугольник, который бы плотно прилегал к нужному дереву (нижний край у места выхода дерева из поверхности земли, верхний край у верхушки дерева, боковые края покрывают крону)
1. Расположите линии, которые собираетесь замерить (концы линий)
   * В режиме "Высоты", линии показывают длину, в пропрорции от полной высоты дерева
   * В режиме "Диаметра", линии показываю длину, в пропорции от диаметра основания дерева)
1. Можно дополнительно сохранить измерения в текстовый файл

## Лицензирование
Пожалуйста, следуйте лицензии, которая описана на английском выше [в секции License](#license)