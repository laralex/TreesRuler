// currently unused, because detected edges are too noisy for trees
// thus not very useful for user experience

function detectEdges(source, threshold, amplify) {
   // Learning Processing
   // Daniel Shiffman
   // http://www.learningprocessing.com
 
   let destination = createImage(source.width, source.height);
 
   // Temporary-ish fix for retina machines
   let oldPixelDensity = pixelDensity();
   pixelDensity(1);
 
   // We are going to look at both image's pixels
   source.loadPixels();
   destination.loadPixels();
   
   // Since we are looking at left neighbors
   // We skip the first column
   for (var x = 1; x < source.width; x++ ) {
     for (var y = 0; y < source.height; y++ ) {
       var loc = (x + y * source.width) * 4;
       // The functions red(), green(), and blue() pull out the three color components from a pixel.
       var r = source.pixels[loc   ]; 
       var g = source.pixels[loc + 1];
       var b = source.pixels[loc + 2];
       
       // Pixel to the left location and color
       var leftLoc = ((x - 1) + y * source.width) * 4;
       var rleft = source.pixels[leftLoc   ]; 
       var gleft = source.pixels[leftLoc + 1];
       var bleft = source.pixels[leftLoc + 2];      
       // New color is difference between pixel and left neighbor
       destination.pixels[loc    ] = amplify*(max(abs(r - rleft) - threshold, 0));
       destination.pixels[loc + 1] = amplify*(max(abs(g - gleft) - threshold, 0));
       destination.pixels[loc + 2] = amplify*(max(abs(b - bleft) - threshold, 0));
       destination.pixels[loc + 3] = 255; // Always have to set alpha
     }
   }
   
   // We changed the pixels in destination
   destination.updatePixels();
 
   pixelDensity(oldPixelDensity);
   return destination;
 }