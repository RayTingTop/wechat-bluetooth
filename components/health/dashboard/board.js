/**
 * 仪表盘组件，根据高、低压旋转不同指针到指定角度
 */
//动画
const animation = wx.createAnimation({
  duration: 200,
  timingFunction: 'ease-out',
  delay: 0,
  transformOrigin: '94% center' //指针旋转中心位置，左右，上下
})

Component({
  properties: {
    low_press: { //低压
      type: Number,
      value: 0,
      observer(low_press) {
        this.lowAni(low_press); //调用低压动画
      }
    },
    high_press: { //高压
      type: Number,
      value: 0,
      observer(high_press) {
        this.highAni(high_press);//调用高压动画
      }
    },
    backImage:{ //背景图
      type: String,
      value: "/images/health/dash.png"
    },
    pointer1: { //指针1
      type: String,
      value: "/images/health/pointer1.png"
    },
    pointer2: { //指针1
      type: String,
      value: "/images/health/pointer2.png"
    },
    width: { //宽 宽/高=1.65
      type: Number,
      value: 750
    },
    height: { //高 宽/高=1.65
      type: Number,
      value: 455
    },
  },
  data: {
    lowAnimationData: null,
    highAnimationData: null
  },

  methods: {
    //低压动画
    lowAni(low) {
      let that = this;
      const deg = 180 * (low / 200);
      animation.rotate(deg, 100).step()
      that.setData({
        lowAnimationData: animation.export()
      })
    },
    //高压动画
    highAni(high){
      let that = this;
      const deg = 180 * (high / 200);
      animation.rotate(deg, 100).step()
      that.setData({
        highAnimationData: animation.export()
      })
    }
  },
});