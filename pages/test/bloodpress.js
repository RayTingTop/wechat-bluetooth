// pages/health/bluetest.js
let App = getApp();
var utils = require("../../../utils/util.js");
Page({

  // 页面的初始数据
  data: {

    textLog: "",//日志
    isopen: false, //蓝牙适配器是否已打开
    connected: false,//是否连接
    isdiscovery: false,//是否在扫描设备
    istest:false,//是否正在检测

    startcolor: '#8E8E8E', //开始按钮的背景颜色
    
    device: { //血压计数据
      device_name: "FSRKB_BT-001",//血压计设备名称
      DEVICE_UUID: "",//设备id
      SERVICE_UUID: "0000FFF0-0000-1000-8000-00805F9B34FB",//服务id
      CHARACTERISTIC_UUID: "0000FFF6-0000-1000-8000-00805F9B34FB",//使用的特征值
      START_ORDER: [-66, -80, 1, -64, 54],//开始检测指令
      STOP_ORDER: [-66, -80, 1, -63, 104],//结束检测指令
      
      // BE B0 01 B0 ce 握手指令； 
      //BE B0 01 c0 36 启动测试命令；
      //BE B0 01 c1 68 测试过程中停止命令；
      // BE B0 01 d0 ab 系统休眠命令。
    },

    result: {//检测结果
      high_press: '000', //高压
      low_press: '000', //低压
      heart_rate: '000',  //心率
      state: 0 //状态
    },

    userInfo:{},//用户信息
    
    userBind: { //绑定信息
      pmw_member_id:0,
      pmw_member_username:0,
      pmw_member_mobile:0
    }
  },

  //生命周期函数--监听页面加载
  onLoad: function (options) {
    var that = this;
    console.log('绑定信息:',options);
    that.setData({userBind:options});
    that.getUserDetail(); // 获取当前用户信息
  },

  //生命周期函数--监听页面卸载
  onUnload: function () {
    this.closeBluetooth(); //关闭蓝牙模块，使其进入未初始化状态。
  },

  /**
   * 获取当前用户信息
   */
  getUserDetail: function () {
    let that = this;
    App._get('user.index/detail', {}, function (result) {
      console.log("获取用户信息:",result.data);
      that.setData(result.data);
    });
  },

  //重置连接
  reStartScan: function () {
    var that = this;
    that.closeBluetooth()
    that.startScan();
  },

  //1.开始流程
  startScan: function () {
    var that = this;
    if (that.data.isdiscovery) {
      that.addLog("1.已经在扫描...");
      return;
    }
    if (that.data.connected) {
      that.addLog("1.连接已建立...");
      return;
    }
    that.addLog("1.开始流程,打开蓝牙适配器..");
    // that.setData({ isdiscovery:false })
    if (that.data.isopen) {
      that.getBluetoothAdapterState(); /* 已经打开则直获取状态，进行扫描 */
    } else {
      that.openBluetoothAdapter();/* 初始化小程序蓝牙模块 */
    }
  },

  //2.初始化小程序蓝牙模块
  openBluetoothAdapter: function () {
    var that = this;
    wx.openBluetoothAdapter({
      success: function (res) {
        that.addLog("2.打开蓝牙适配器成功！");
        that.setData({ isopen: true })
        that.getBluetoothAdapterState();/* 获取状态 */
      },
      fail: function (err) {
        App.showModal1("手机蓝牙开关未开启");
        that.addLog("2.蓝牙开关未开启..");
        that.setData({ isopen: false })
      }
    })

    // 监听蓝牙适配器状态变化事件（如连接时关闭蓝牙等）
    wx.onBluetoothAdapterStateChange(function (res) {
      console.log('监听蓝牙适配器状态变化事件:', res)
      var isDvailable = res.available; //蓝牙适配器是否可用
      if (!isDvailable) {
        that.closeBluetooth();//关闭
        App.showModal1("手机蓝牙开关未开启");
      }
    })
  },

  //3.获取本机蓝牙适配器状态
  getBluetoothAdapterState: function () {
    var that = this;
    //获取本机蓝牙适配器状态。
    wx.getBluetoothAdapterState({
      success: function (res) {
        var isDiscov = res.discovering; //是否正在搜索设备
        var isDvailable = res.available; //蓝牙适配器是否可用
        if (isDvailable) {
          that.addLog("3.获取本机蓝牙适配器状态：可用");
          if (!isDiscov) {
            that.startBluetoothDevicesDiscovery();/* 开始扫描 */
          } else {
            that.addLog("已在搜索设备...重启搜索");
            that.stopBluetoothDevicesDiscovery();/*停止搜索*/
            that.startBluetoothDevicesDiscovery();/*重新开始搜索*/
          }
        }
      },
      fail(res) {
        that.addLog("3.获取蓝牙适配器状态失败");
      }
    })
  },

  //4.开始扫描附近的蓝牙外围设备
  startBluetoothDevicesDiscovery: function () {
    var that = this;
    wx.showToast({
      title: '正在连接...',
      icon: 'loading',
      duration: 10000
    })
    setTimeout(function () {  //小程序蓝牙需要延迟
      wx.hideLoading(); //隐藏loading
    }, 3000);

    wx.startBluetoothDevicesDiscovery({ //开始搜寻附近的蓝牙外围设备
      allowDuplicatesKey: false,//不允许重复上报同一设备
      success: function (res) {
        that.addLog("4.扫描设备成功，准备匹配血压计");
        console.log("  扫描设备成功", res);

        that.getBluetoothDevices();/*获取附近设备列表 */
      },
      fail(res) {
        that.setData({ isdiscovery: false });
        that.addLog("4.扫描失败[" + that.data.isdiscovery + "]...");
      }
    })
  },

  //5.获取蓝牙设备列表，匹配血压计
  getBluetoothDevices: function () {
    var that = this;
    if (!that.data.isopen) {
      that.addLog("蓝牙设备未初始化，停止获取设备...");
      return;
    }
    that.loopGetDivece = setInterval(() => {
      //获取蓝牙设备列表
      wx.getBluetoothDevices({
        services: [],
        allowDuplicatesKey: false,
        interval: 0,
        success: function (res) {
          that.addLog("5.获取蓝牙设备列表成功");
          if (res.devices.length > 0) {
            if (JSON.stringify(res.devices).indexOf(that.data.device.device_name) !== -1) { //根据设备名称匹配设备
              for (let i = 0; i < res.devices.length; i++) {
                if (that.data.device.device_name == res.devices[i].name) {

                  that.data.device.DEVICE_UUID = res.devices[i].deviceId; //保存获取到的设备uuid

                  that.addLog("--匹配血压计uuid：" + that.data.device.DEVICE_UUID);
                  that.addLog("--匹配血压计name：" + res.devices[i].name);

                  clearInterval(that.loopGetDivece);
                  that.createBLEConnection(); //建立连接
                }
              }
            } else {
              that.addLog(" 5.0未匹配到血压计-再次扫描");
              that.setData({ connected: false, startcolor: '#8E8E8E' });//未连接
              // that.getBluetoothDevices();
            }
          } else {
            that.addLog(" 5.1附近没有设备-再次扫描");
            that.setData({ connected: false, startcolor: '#8E8E8E' });//未连接
            // that.getBluetoothDevices();
          }
        },
        fail(res) {
          that.addLog('5.获取蓝牙设备列表失败')
          that.setData({ connected: false, startcolor: '#8E8E8E' });//未连接
        }
      })
    }, 2000)
  },

  //6.连接设备
  createBLEConnection: function () {
    var that = this;
    if (that.data.connected) {
      return;
    }
    wx.createBLEConnection({
      deviceId: that.data.device.DEVICE_UUID,
      success: function (res) {
        that.addLog("6.连接设备成功");
        that.setData({ connected: true, startcolor: '#3CB66F' });//设置图连接
        that.stopBluetoothDevicesDiscovery();/*停止搜索设备*/
        //that.getBLEDeviceServices(); // 获取连接设备的service服务 

        that.loopDetectionConnection();/*循环检测连接*/
        that.notifyBLECharacteristicValueChange();/*连接设备打开notify*/
      },
      fail: function (res) {
        console.log("6.连接设备失败！");
        that.setData({ connected: false, startcolor: '#8E8E8E' });//未连接
      }
    })
  },

  //8.直接启用低功耗蓝牙设备特征值变化时的 notify 功能，
  //已有血压计的设备uuid、服务uuid、特征值uuid
  //获取特征值变化
  notifyBLECharacteristicValueChange: function () {
    var that = this;
    that.addLog("8.启用低功耗蓝牙设备特征值变化时的 notify 功能");
    wx.hideLoading();//隐藏正在连接框

    wx.showToast({
      title: '血压计连接成功',
      icon: 'success',
      duration: 1000
    })

    wx.notifyBLECharacteristicValueChange({
      state: true,

      deviceId: that.data.device.DEVICE_UUID,
      serviceId: that.data.device.SERVICE_UUID,
      characteristicId: that.data.device.CHARACTERISTIC_UUID,

      complete(res) {
        /*用来监听手机蓝牙设备的数据变化*/
        wx.onBLECharacteristicValueChange(function (res) {
          console.log("特征值变化", res);

          that.convertData(res.value); //转换和截取数据
        })
      },
      fail(res) {
        console.log(res, '启用低功耗蓝牙设备监听失败')
      }
    })
  },

  //9.执行检测
  doTest: function (e) {
    var that = this;
    var opr = e.currentTarget.dataset.opr;
    var orderArr =""; //指令
    if (opr == "start"){
      if (!that.data.connected) {//点击了开始按钮
        App.showModal1("血压计未连接，请先连接后再检测！");
        return false;
      }
      orderArr = that.data.device.START_ORDER;//开始检测指令
      that.setData({ istest: true });//正在测量
    } else if (opr == "stop") {
      orderArr = that.data.device.STOP_ORDER;//停止检测指令
      that.setData({ istest: false });//停止测量
    }

    let order = new ArrayBuffer(5);
    let dataView = new DataView(order);

    for (var i = 0; i < orderArr.length; i++) {
      dataView.setUint8(i, orderArr[i])
    }
    that.writeBLECharacteristicValue(order);//发送指令
  },

  //10.向蓝牙设备发送数据
  writeBLECharacteristicValue: function (order) {
    var that = this;
    let byteLength = order.byteLength;
    that.addLog("当前执行指令的字节长度:" + byteLength);

    wx.writeBLECharacteristicValue({

      deviceId: that.data.device.DEVICE_UUID,
      serviceId: that.data.device.SERVICE_UUID,
      characteristicId: that.data.device.CHARACTERISTIC_UUID,

      value: order.slice(0, 20),// 这里的value是ArrayBuffer类型
      success: function (res) {
        if (byteLength > 20) {
          setTimeout(function () {
            that.writeBLECharacteristicValue(order.slice(20, byteLength));//如果超过20字节截取20字节
          }, 150);
        }
        that.addLog("写入成功：" + res.errMsg);
      },

      fail: function (res) {
        console.log(res);
        that.addLog("写入失败" + res.errMsg);
      }
    })
  },

  //循环检测已经连接设备
  loopDetectionConnection: function () {
    var that = this;
    that.loopDetection = setInterval(function () {
      wx.getConnectedBluetoothDevices({
        success: function (res) {
          console.log();
          if (JSON.stringify(res).indexOf(that.data.device.DEVICE_UUID) != -1) {
            console.log("**已连接血压计");
            that.setData({ connected: true, startcolor: '#3CB66F'});
          } else {
            console.log("**未检测到血压计连接");
            that.setData({ connected: false, startcolor: '#8E8E8E' });
          }
        },
        fail: function (res) {
          console.log("**检测是否连接失败");
          that.setData({ connected: false, startcolor: '#8E8E8E' });
        }
      })
    }, 3000)
  },

  //停止搜索设备
  stopBluetoothDevicesDiscovery: function () {
    var that = this;
    that.addLog("**停止搜索蓝牙设备");
    wx.stopBluetoothDevicesDiscovery();
    that.setData({ isdiscovery: false });
  },

  //断开连接并关闭蓝牙模块
  closeBluetooth() {
    var that = this;
    that.cleanLogs();
    that.setData({
      isopen: false,
      connected: false,
      isdiscovery: false,
      istest: false,
      startcolor: '#8E8E8E'
    });

    that.stopBluetoothDevicesDiscovery();//停止搜索
    clearInterval(that.loopGetDivece);//停止 匹配血压计的循环
    clearInterval(that.loopDetection);//停止 设备是否连接的循环


    if (that.data.device.DEVICE_UUID) {
      wx.closeBLEConnection({
        deviceId: that.data.device.DEVICE_UUID,
        success: function (res) {
          console.log("**断开连接成功");
        },
        fail(res) {
          console.log("**断开连接失败,可能因为设备已关闭");
        }
      })
      that.data.device.DEVICE_UUID=""; //清空保存的设备信息
    }

    wx.closeBluetoothAdapter(); //关闭蓝牙模块
    console.log("**关闭蓝牙模块");

  },

  //添加日志
  addLog: function (str) {
    var that = this;
    console.log(str);
    var log = that.data.textLog + "--" + str + "\n";
    that.setData({
      textLog: log
    });
  },
  //清空log日志
  cleanLogs: function () {
    var that = this;
    that.setData({
      textLog: ""
    });
  },

  //转换与截取数据
  convertData: function (resValue) {
    var that = this;
    var str = utils.ab2hext(resValue); //z转成16进制字符串
  
    if (str.length == 12) {
      if (str.indexOf("d0c20200002f") == -1) {
        //showMessage("开始测量...");
      }
    }

    var high = parseInt(str.substring(8, 10), 16);
    var low = parseInt(str.substring(10, 12), 16);
    var heart = parseInt(str.substring(12, 14), 16);

    if (str.length == 16) {
      var result = {
        high_press: high,
        low_press: low,
        heart_rate: heart,
        state: 0,
      }
      that.setData({
        result: result
      })
      that.addLog("    测量中:" + result);
    }

    if (str.length == 18) {
      var result = {
        high_press: high,
        low_press: low,
        heart_rate: heart,
        state: that.calState(high, low)
      }
      that.setData({
        result: result
      })
      that.addLog("    测量完成:" + result);
      that.setData({ istest: false });//停止测量
      that.savegetBloodPress();//测量完成保存到数据库！
    }
  },

  /*测试*/
  test: function () {
    var that = this;
    var high = 0;
    var low = 0;
    var result ={};
    setInterval(function () {
      result = {
        high_press: high++,
        low_press: low+=2,
        heart_rate: 60,
        state: 4
      }
      that.setData({
        result: result
      })
      if (low >= 190) {
        low = 0;
      }
      if (high >= 199) {
        high = 0;
      }
      
    }, 100)
 
    console.log(result);
    //that.savegetBloodPress();//测试保存后台
  },

  //保存数据到数据库
  savegetBloodPress: function () {
    var that = this;
    App._post_form('health.bloodpress/add', {
      pmw_member_id: that.data.userBind.pmw_member_id, //绑定会员id
      high_press: that.data.result.high_press,
      low_press: that.data.result.low_press,
      heart_rate: that.data.result.heart_rate,
      state: that.data.result.state,
      uuid: that.data.device.DEVICE_UUID
    }, function (result) {
      if (result.code === 1) {
        App.showSuccess(result.msg, function () {
          console.log("**保存成功!");
        });
      } else {
        App.showError(result.msg);
      }
    },
      false,
      function () {
        wx.hideLoading();
      });
  },

  //返回一个状态
  calState: function (high_press, low_press) {
    if (high_press >= 180) {
      return 5;
    } else if (high_press >= 160) {
      if (low_press >= 110) {
        return 5;
      }
      return 4;
    } else if (high_press >= 140) {
      if (low_press >= 110) {
        return 5;
      } else if (low_press >= 100) {
        return 4;
      }
      return 3;
    } else if (high_press >= 130) {
      if (low_press >= 110) {
        return 5;
      } else if (low_press >= 100) {
        return 4;
      } else if (low_press >= 90) {
        return 3;
      }
      return 2;
    } else if (high_press >= 120) {
      if (low_press >= 110) {
        return 5;
      } else if (low_press >= 100) {
        return 4;
      } else if (low_press >= 90) {
        return 3;
      } else if (low_press >= 85) {
        return 2;
      }
      return 1;
    }
    if (low_press >= 110) {
      return 5;
    } else if (low_press >= 100) {
      return 4;
    } else if (low_press >= 90) {
      return 3;
    } else if (low_press >= 85) {
      return 2;
    } else if (low_press >= 80) {
      return 1;
    }
    return 0;
  }

})