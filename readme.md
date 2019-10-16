## 基于业务封装的form表单

> 暂无单元测试，开发业务过程中完成此组件，暂时没有独立出来维护

### 项目内容

1. 通过json配置表单
2. 通过formCacl配置表单中各单元格的计算方式
3. 通过提交按钮封装表单中的数据校验

### 文件管理

1. Form/form.vue 主要form的核心文件
2. Form/Dep/dep.js 计算公式多项处理，进行依赖收集，其中一项内容改变，只触发他相关的数据变更
3. commonJs/form.js 处理json，转换成底层form需要的json格式
4. commonJs/resolution.js 解析公式用的主要类
5. commonJs/validate.js 校验当前form中的规则所用的类

### 使用方式

``` javascript
// 表单json
sbxx: {
    option: [
        ['number', 'test1', '测试内容1', { default: '0.00' }],
        ['number', 'test2', '测试内容2', { default: '0.00' }],
        ['number', 'test3', '测试内容3', { default: '0.00' }]
    ],
    title: '测试'
}
// formCacl配置
[
    [
        // 前置校验，通过就运行当前运算法则，不通过就往后继续查找
        {
            preCondition: [`${this.tsnsr} === 3`],
            // 写上message，只要前置校验通过必定会触发弹窗提示
            message: '测试不通过',
            cacl: '{sbxx.test1}=max(({sbxx.test2}*{sbxx.test3}*0.5),0)'
        },
        {
            cacl: '{sbxx.test1}=max(({sbxx.test2}*{sbxx.test3}),0)'
        }
    ],
    // 没有任何前置内容的直接可以写成字符串
    '{sbxx.test1}=max(({sbxx.test2}*{sbxx.test3}),0)'
]
// rules 配置
[
    {
        // 可直接在rule中写一条内容并加上|| 或者 &&符号
        rule: ['({jd.jd.jczcze}===0) || ({jd.jd.jmzcze}===0)'],
        type: 'confirm',
        message: '校验失败'
    },
     {
        // 也可以直接在数组中写两份，代表&&的符号 
        rule: ['({jd.jd.jczcze}===0)','({jd.jd.jmzcze}===0)'],
        type: 'confirm',
        message: '校验失败'
    },
]
```

### 计算方式写法

``` javascript
// 加法
"{sbxx.test3}={sbxx.test1}+{sbxx.test2}"
// 减法
"{sbxx.test3}={sbxx.test1}-{sbxx.test2}"
// 乘法
"{sbxx.test3}={sbxx.test1}*{sbxx.test2}"
// 除法
"{sbxx.test3}={sbxx.test1}/{sbxx.test2}"
// 混合运算, 运算符之间要用（）分隔，约定，存在max跟min方法
"{sbxx.test3}=({sbxx.test1}+{sbxx.test2})+({sbxx.test1}*{sbxx.test2})"
```

