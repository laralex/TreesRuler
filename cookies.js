// Partially borrowed from 
// https://learn.javascript.ru/cookie
// https://stackoverflow.com/questions/11557526/deserialize-query-string-to-json-object
// https://stackoverflow.com/questions/1714786/query-string-encoding-of-a-javascript-object
// https://stackoverflow.com/questions/179355/clearing-all-cookies-with-javascript

function serializeObj(obj, prefix) {
   var str = [],
      p;
   for (p in obj) {
      if (obj.hasOwnProperty(p)) {
         var k = prefix ? prefix + "[" + p + "]" : p,
         v = obj[p];
         var serializedKV = (v !== null && typeof v === "object") ?
            serializeObj(v, k) : encodeURIComponent(k) + '=' + v;
         str.push(serializedKV);
         // encodeURIComponent(k) + '=' + encodeURIComponent(v));
      }
   }
   return str.join("&");
}

function deserializeObj(queryString) {
   queryString = queryString || location.search.slice(1);
   var pairs = queryString.split('&');
   var result = {};
   const isNumeric = (num) => (typeof(num) === 'number' ||
      typeof(num) === "string" && num.trim() !== '') && !isNaN(num);
   pairs.forEach(function(p) {
       var pair = p.split('=');
       var key = pair[0];
       var value = decodeURIComponent(pair[1] || '');
       if (isNumeric(value)) {
         value = parseFloat(value);
       } else if (value == "true" || value == "false") {
         value = (value == "true");
       }
       if( result[key] ) {
           if( Object.prototype.toString.call( result[key] ) === '[object Array]' ) {
              result[key].push( value );
            } else {
               result[key] = [ result[key], value ];
           }
       } else {
          result[key] = value;
         }
   });
   return JSON.parse(JSON.stringify(result));
};

function getCookie(name) {
   let matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
   ));
   return matches ? deserializeObj(matches[1]) : undefined;
}

function setCookie(name, value, options = {}) {
   options = {
      path: '/',
      'max-age': 60*60*24*365,
      ...options
   };

   if (options.expires instanceof Date) {
      options.expires = options.expires.toUTCString();
   }

   let updatedCookie = encodeURIComponent(name) + "=" + serializeObj(value);

   for (let optionKey in options) {
      updatedCookie += "; " + optionKey;
      let optionValue = options[optionKey];
      if (optionValue !== true) {
         updatedCookie += "=" + optionValue;
      }
   }
   document.cookie = updatedCookie;
}

function deleteCookie(name) {
   setCookie(name, "", {
      'max-age': -1
   });
}

function deleteAllCookies() {
   var cookies = document.cookie.split("; ");
   for (var c = 0; c < cookies.length; c++) {
       var d = window.location.hostname.split(".");
       while (d.length > 0) {
           var cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
           var p = location.pathname.split('/');
           document.cookie = cookieBase + '/';
           while (p.length > 0) {
               document.cookie = cookieBase + p.join('/');
               p.pop();
           };
           d.shift();
       }
   }
}