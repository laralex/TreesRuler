# TreeMT: Trees Measuring Tool for Forest Taxonomy / Программа метрии деревьев
> ! Инструкция на русском внизу страницы \
> ! The instructions in Russian and GIF animations follow
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

## Some implementation features
* Fully client-side (nothing is sent anywhere)
* Saving and loading settings preferences in Cookies 
* Full switcheable localization for English and Russian
* Dynamic configuration of all parameters from the menu, including colors
* Mouse interaction for placing measurements, snapping them to each other, and placing a measurement grid, zooming into the image and panning over the image
* Rotating the image (SHIFT + arrows)
* Saving results to a file and loading from a file to continue the work (YAML text format)

![Main page](readme/mainscreen.png)

## Example output YAML file
```
- group_name: "Height - H"
  number_of_measurements: 9
  unit_absolute_length: 15.2
  image_rotation_degrees: 0
  unit_measurement:
    denotation: H
    begin_point_px: [46.08,3105.6023335176355]
    end_point_px: [46.08,91.0996597208443]
  measurements:
  - denotation: h_Dk
    begin_point_px: [92.16,3105.6023335176355]
    end_point_px: [92.16,1449.7169035370705]
  - denotation: h_D0
    begin_point_px: [138.24,3105.6023335176355]
    end_point_px: [138.24,2181.365400177257]
  - denotation: h_d1.3
    begin_point_px: [184.32,3105.6023335176355]
    end_point_px: [184.32,2804.1520661379564]
  - denotation: h1
    begin_point_px: [2396.16,3105.6023335176355]
    end_point_px: [2396.16,593.5167720203095]
  - denotation: h2
    begin_point_px: [2442.24,3105.6023335176355]
    end_point_px: [2442.24,1095.9338843197747]
  - denotation: h3
    begin_point_px: [2488.32,3105.6023335176355]
    end_point_px: [2488.32,1598.35099661924]
  - denotation: h4
    begin_point_px: [2534.4,3105.6023335176355]
    end_point_px: [2534.4,2100.7681089187054]
  - denotation: h5
    begin_point_px: [2580.48,3105.6023335176355]
    end_point_px: [2580.48,2603.18522121817]
  pretty_table: >
    Measurement             RelativeLength     AbsoluteLength     
    H                       1                  15.2               
    h1                      0.833333333333     12.66666666666     
    h2                      0.666666666666     10.13333333333     
    h_Dk                    0.549306339773     8.349456364556     
    h3                      0.499999999999     7.599999999999     
    h4                      0.333333333333     5.066666666666     
    h_D0                    0.306596819891     4.660271662350     
    h5                      0.166666666666     2.533333333333     
    h_d1.3                  0.100000000000     1.520000000000
```

## Running the application:

There might be my web-site running with this application, try:
 * [http://www.graphicsfore.pics/eng](http://www.graphicsfore.pics/eng)
 * [http://95.85.71.64](http://95.85.71.64)

## Running the application locally

### Option 1:

1. Follow installation process of `p5.js`, install or activate a local HTTP server in some way:
https://github.com/processing/p5.js/wiki/Local-server

2. Download this repository's source code, and configure the chosen server, so that it serves the repository root.

3. The application should be available. Try opening the next link in your browser, substituting the `<port_number>` with the port number from the configuration of your running server
   ```
   http://127.0.0.1:<port_number>/index.html
   ```

### Option 2 (Windows)
You can try to launch executable [./libs/bin/RebexTinyWebServer.exe](./libs/bin/RebexTinyWebServer.exe) from this repository, it should automatically start a server. Then open in the browser: [http://127.0.0.1:5501/index.html](http://127.0.0.1:5501/index.html)

## Application usage

Please press button (Application Manual) in the menu window (on the right), to see the most relevant state of the instructions. Here's a shorter version:

### Key mapping
* `Mouse wheel`: zoom in/out
* `Right mouse btn` (press and hold): move the photo
* `Left mouse btn` (click): select a measurement:
	- (hold and move a measurement's endpoint): move the endpoint
  - (press and move a measurement line): move the whole line
* `SHIFT` (hold): the endpoints won't snap to parallel X/Y coordinates of other measurements 
* `CTRL` (hold): the lines will be hidden (should help to place the measurements more accurately)
* `ESCAPE`: duplicate the selected measurement
* `DELETE`: delete the selected measurement (can't delete the unit measurement, delete the group instead)
### Example usage
1. Press `Upload photo` button and select a file
2. The application menu has folders and sub-folders. Press a folder name to reveal its content (e.g. folder `Settings`)
3. Folder `All measurements` is divided into groups of measurements. New groups can be created with a corresponding button `New measurement group`. A unit measurement will be placed on the photo, its length will be considered 1.0, and all other measurements in the groups will compte their length relative to this unit.
4. Settings of a particular group are located in the corresponding group folder. You can change: 
   - group color
   - group denotation (e.g. with group denotation 'a', all measurements in the group will be called by default 'a0', 'a1', etc.
   - absolute length of the unit (e.g. if a group measures relative to the tree height, and you know the tree height in meters, you can enter it here, and other measurements in the group will additionally have absolute lengths).
5. In the group folder, try using button `Add measurement`.
6. Notice, that under this button, there are buttons corresponding to all the created measurements. Pressing those buttons, the measurement info will appear in the bottom section of the mnu with mark `🔍 Selected measurement`. In this section you can change sliders of coordinates (in case you can't do so on the photo), and you can give a special denotation for this particular measurement.
7. Create groups and measurements, place them with mouse on the photo (drag lines or endpoints, for convenience the latter will snap to parallel endpoints). The measurements of a single group are denoted with a single color, the unit measurement additionally has a circle in the line's center. Near the line there is denotation of the measurement and its relative (and/or absolute length in parentheses)
1. Additionally you can place a grid on the photo (look around in `Settings`-`Grid settings` folder. You can adjust the grid from the menu, or by dragging the dashed grid lines on the photo.
1. For convenience, use button `Load measurements preset`, to quickly greate common groups (for measuing tree height, crown diameter, trunk diameter). The measurements are generated according to the grid location.
1. Measurements can be saved in a file; and later loaded from a file (and displayed on the photo)

## Licenses of used materials

* the license of [`p5.js`](https://p5js.org/) can be found at https://github.com/processing/p5.js/blob/main/license.txt
> Copyright notice:
>
> The p5.js library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, version 2.1.

* the license of [`guify`](https://github.com/colejd/guify) by  Jonathan Cole
> Copyright 2019 Jonathan Cole (jons.website)
> 
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

* the license of [`yaml.js`](https://github.com/jeremyfa/yaml.js) by Jeremy Faivre
> Copyright (c) 2010 Jeremy Faivre
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

* the license of [`RebexTinyWebServer`](https://github.com/rebexnet/RebexTinySftpServer) by 
Rebex.NET

> Rebex Sample Code License
> 
> Copyright (c) 2015-2020, Rebex CR s.r.o. www.rebex.net, 
> All rights reserved.
> 
> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

* icons:
> Downloaded from https://icons8.com/icon/17593/forest
> 
> Forest icon by "https://icons8.com"

* font: Jetbrains Mono
> Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)
>
> This Font Software is licensed under the SIL Open Font License, Version 1.1.
>
> This license is available with a FAQ at: https://scripts.sil.org/OFL

* example images:
> The images were downloaded from this http://www.forestryimages.org/.
>
> All the rights on this photographs are reserved by the web-site http://www.forestryimages.org/ and the photographers that shot them.

---

## Описание
* Программа упрощает ручной труд по измерению параметров деревьев
   * входные данные: фотографии деревьев в полный рост
   * программа позволяет расставлять базовые замеры (их длина берется за единицу 1.0), и расставлять другие замеры, длина которых будет считаться относительно базового
   * выходные данные: числа измерений отображающиеся внутри программы, или в виде текстового файла (что может помочь в последующей автоматической обработке)
* Программа работает внутри Интернет-браузера, поэтому проблемы не должно быть много проблем в совместимостью (программа написана на JavaScript на основе библиотеки p5.js)
* Автор программы: Алексей Ларионов
   * email: alxs.larionov@gmail.com
   * openreview: https://openreview.net/profile?id=~Alexey_Larionov1

### Запуск программы

Возможно, будет доступен один из моих сайтов с этим приложением, попробуйте открыть в браузере одну из ссылок:

- [http://95.85.71.64](http://95.85.71.64)
- [http://www.graphicsfore.pics](http://www.graphicsfore.pics)

## Запуск программы локально

Если сайты не работают, программу можно запустить на собственном компьютере.

### Вариант 1:

1. Нужно запустить локальный HTTP сервер на своем компьютере, вот несколько вариантов (на английском языке):
https://github.com/processing/p5.js/wiki/Local-server

1. Скачайте архив с кодом этого приложения:
   - через программу `git` в консоли:
   ```
      git clone https://github.com/laralex/TreesRuler.git
   ```
   - или со [страницы с релизами](https://github.com/laralex/TreesRuler/releases)
1. Разархивируйте в какую-то папку, и сконфигурируйте сервер на эту папку.

1. Программа должна стать доступна. Попробуйте открыть в браузере ссылку вида
   ```
   http://127.0.0.1:<port_number>/index.html
   ```
   (заменив `<port_number>` на номер порта из конфигурации сервера)

### Вариант 2 (Windows)
Скачайте архив с кодом как в варианте 1, разархивируйте и запустите программу, находящуюся в [./libs/bin/RebexTinyWebServer.exe](./libs/bin/RebexTinyWebServer.exe), это должно запустить сервер, и можно будет открыть ссылку в браузере: [http://127.0.0.1:5501/index.html](http://127.0.0.1:5501/index.html)

## Использование

> Более подробную текстовую инструкцию можно найти в меню программе: кнопка `Справка по использованию`.

![Manual button](readme/manual.png)
Основные шаги:
1. Загрузите фотографию с компьютера (кнопка `Загрузить фото`)
1. По фото можно перемещаться зажатием+перемещением правой кнопки мыши, и колесиком мыши (приближение)
1. Настройте сетку (папка `Настройки` -> `Настройки сетки`). Переместите пунктирные линии сетки по высоте дерава и примерно по диаметру ствола (также можно менять ползунок в меню). Настройте количество горизонтальных разделений в сетке
![Using grid](readme/grid_usage.gif)
1. Необязательно, но можно поворачивать фото, чтобы ствол выглядел более вертикальным относительно сетки. Используйте меню (`Настройки` -> `Настройки просмотра фото` -> `Поворот`), или SHIFT+стрелки
![Using rotations](readme/rotations.gif)
1. Нажмите кнопку `Поставить шаблонные замеры`, она расставит некоторые группы замеров: высот (красный) относительно высоты дерева `H`, диаметра кроны (желтый) относительно диаметра кроны `Dk` и диаметра ствола (зеленый), относительно диаметра ствола на уровне 1.3 метра. Каждый отдельный замер можно редактировать (для этого кликните на замер мышкой, и меняйте настройки в нижней части меню с пометкой `Выделенный замер`). Там можно точнее выставить координаты, поменять обозначение
![Using preset](readme/preset_usage.gif)
1. Перемещайте замеры по фото (перетягивая мышью за одну из точек или целиком за линию), чтобы они точнее соответствовали стволу/кроне. По умолчанию замеры "прилипают" параллельно точкам сетки и другим замерам. Прилипание работает только при перемещении КОНЦОВ замеров, а не целых линий. Прилипание можно временно отключить, пока нажата кнопка SHIFT.
1. Установить специальные замеры на свое место (их нужно подкорректировать и вертикально и горизонтально):
   - `Dk` - максимальный диаметр кроны
   - `h_Dk` и `d_Dk` - соответствующая `Dk` высота и диаметр ствола
   - `d0` - диаметр ствола у основания кроны (и соответственно `h_d0`) 
   - `d1.3` - диаметр ствола на высоте 1.3 метра (и соответственно `h_1.3`)
1. После манипуляций убедитесь, что замеры высоты (красные) том же уровне, что и их соответствующие желтые/зеленые замеры. Когда на фото слишком много посторонних линий, их можно отключать в настройках (сетку - в настройках сетки, группы замеров - в настройках конкретной группы `Все замеры` -> `<Какое-то имя группы>` -> `Показать`). Также полезно временно скрыть все линии, зажимая CONTROL на клавиатуре (позволяет точнее выставлять маленькие замеры)
![Using ctrl](readme/ctrl_usage.gif)
1. Можно дублировать и удалять замеры. Выберите замер (клик на фото по замеру, или на кнопку замера из меню группы). На фото офозначение замера должно сменить цвет с белого на цвет группы. Внизу меню нажимайте кнопку `Дублировать замер` (или с клавиатуры ESCAPE) или `Удалить замер` (или с клавиатуры DELETE). При этом удалить
![Using duplicate or delete](readme/duplicate_delete.gif)
1. Всегда можно менять группы замеров (из меню) или добавить новые группы замеров, нажатием кнопки `Все замеры` -> `Добавить группу замеров`. Заметьте, что для группы можно определить абсолютное значение базисного замера (который берется за единицу длины). Например, зная высоту дерева в метрах, можно указать это значение для группы замеров высоты, и тогда позже все замеры также будут пересчитаны и в абсолютных единицах.
![Using group menu](readme/group_settings.gif)
1. Можно менять настройки отображения (в папке `Настройки линий`, `Настройки курсора` и пр.)
![Using line settings](readme/line_settings.gif)
1. Закончив расставлять замеры, нажмите кнопку в верху меню `Сохранить замеры в файл`. Появится всплывающее окно с текстом, содержащим техническую информацию для работы программы (положение замеров в пикселях на фото), а также графу `оформленная_таблица` для каждой группы замеров. Убедитесь что содержимое этих таблиц имеет смысл, обозначения верны и понятны, длина замеров имеет смысл (таблица перечисляет сначала базовый замер, потом остальные замеры от большего к меньшему)
1. Закрыв всплывающее меню вам предложат сохранить этот текст в файл. Если позже появится необходимость, можно снова загрузить теже самые замеры из этого файла кнопкой `Загрузить замеры из файла`
1. Программа запоминает настройки даже при закрытии окна или браузера. Если вам понадобится сбросить настройки, используйте кнопку `Сбросить настройки` или меню `Настройки`

### Назначение клавиш
* `Колесо мыши`: приближение - отдаление
* `Правая кнопка мыши` (удерживать и перемещать): перемещение фото
* `Левая кнопка мыши` (нажатие): выбрать замер
	- (тянуть конец замера): переместить конец замера
   - (тянуть линию замера): переместить весь замер (прилипание не будет работать)
* `SHIFT` (держать): концы замеров НЕ будут прилипать к X/Y координатам других замеров и сетки
* `CTRL` (держать): все пометки НЕ будут отображаться на фото (должно помочь расставлять замеры точнее)
* `ESCAPE`: дублировать выбранный замер
* `DELETE`: удалить выбранный замер (нельзя удалить базисный замер, но можно удалить всю группу замеров кнопкой `Удалить группу` в меню)

## Лицензирование
Пожалуйста, следуйте лицензии, которая описана на английском выше в секции "Licenses of used materials", а также в файле [LICENSE.md](LICENSE.md)
