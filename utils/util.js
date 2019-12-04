/**
 * 工具类
 */
module.exports = {
  stringToBytes: stringToBytes,
  ab2hext: ab2hext,
  hexToString: hexToString,
  versionCompare: versionCompare,
  formatTime: function (e) {
    var n = e.getFullYear(), o = e.getMonth() + 1, r = e.getDate(), u = e.getHours(), i = e.getMinutes(), g = e.getSeconds();
    return [n, o, r].map(t).join("/") + " " + [u, i, g].map(t).join(":");
  },

  /**
   * scene解码
   */
  scene_decode: function(e) {
    if (e === undefined)
      return {};
    let scene = decodeURIComponent(e),
      params = scene.split(','),
      data = {};
    for (let i in params) {
      var val = params[i].split(':');
      val.length > 0 && val[0] && (data[val[0]] = val[1] || null)
    }
    return data;
  },

};

function t(t) {
  return (t = t.toString())[1] ? t : "0" + t;
}

// 字符串转byte
function stringToBytes(str) {
  var strArray = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) {
    strArray[i] = str.charCodeAt(i);
  }
  const array = new Uint8Array(strArray.length)
  strArray.forEach((item, index) => array[index] = item)
  return array.buffer;
}

// ArrayBuffer转16进制字符串
function ab2hext(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('');
}

//16进制转字符串
function hexToString(str) {
  var trimedStr = str.trim();
  var rawStr =
    trimedStr.substr(0, 2).toLowerCase() === "0x" ?
      trimedStr.substr(2) :
      trimedStr;
  var len = rawStr.length;
  if (len % 2 !== 0) {
    // alert("Illegal Format ASCII Code!");
    return "";
  }
  var curCharCode;
  var resultStr = [];
  for (var i = 0; i < len; i = i + 2) {
    curCharCode = parseInt(rawStr.substr(i, 2), 16); // ASCII Code Value
    resultStr.push(String.fromCharCode(curCharCode));
  }
  return resultStr.join("");
}

/*微信app版本比较*/
function versionCompare(ver1, ver2) {
  var version1pre = parseFloat(ver1)
  var version2pre = parseFloat(ver2)
  var version1next = parseInt(ver1.replace(version1pre + ".", ""))
  var version2next = parseInt(ver2.replace(version2pre + ".", ""))
  if (version1pre > version2pre)
    return true
  else if (version1pre < version2pre)
    return false
  else {
    if (version1next > version2next)
      return true
    else
      return false
  }
}