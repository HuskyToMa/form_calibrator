class Resolution {
    constructor(vm) {
        this.vm = vm;
        this.caclMap = {
            'div': '/',
            'times': '*',
            'isLessThanOrEqualTo': '<=',
            'isGreaterThanOrEqualTo': '>=',
            'isGreaterThan': '>',
            'isLessThan': '<',
            'eq': '==='
        };
    }
    resolutionCacl = (caclStr) => {
        const strArr = [],  // 分别取括号包括的内容
              indexArr = [];// 当前使用过的所有索引值
        strArr[0] = ''; // 给index为0的数组进行初始化
        indexArr.push(0);// 索引数组添加为0的索引
        // 使用栈的概念，使用索引数组保存当前存入的（ 之后使用的内容数组的索引值，遇到 ）之后便取出最后一个内容，进行（）闭合
        for (let i = 0, index = 0, useIndex = 0; i < caclStr.length; i++) {
            const curData = caclStr[i];
            // 逐字搜索当前的字符串，碰到（的时候转入
            if (curData === '(') {
                // 存储字符串的数组对应的索引值+1
                index++;
                // 当前使用过的索引值存入索引数组里面
                indexArr.push(index);
                // 将当前内容数组使用的索引指向当前添加的索引值
                useIndex = index;
                // 初始化
                strArr[useIndex] = '';
                // 由于有同一级别上多个括号存在，所以需要获取索引数组当中的前一个数组的索引，放入内容数组中
                // 括号放在前一个内容数组里面而不是当前添加过后的内容数组
                strArr[indexArr[indexArr.length - 2]] += curData;
                // 添加一个当前数组指向，用户后续解析之后替换
                strArr[indexArr[indexArr.length - 2]] += `strArr[${useIndex}]`;
            } else if (curData === ')') {
                // 遇到）的时候需要从索引数组里边pop最后一个内容出来，完成一个（）闭合
                indexArr.pop();
                useIndex = indexArr[indexArr.length - 1];
                strArr[useIndex] += curData;
            } else {
                // 其余不是（）的字符全部进去当前正在处理的内容数组中
                strArr[useIndex] += curData;
            }
        }
        // 最后生成的数组是以括号为区分的一位数组内容
        return this.resetCaclStr(this.resolutionCaclArr(strArr));
    }
    // 解析{xx}的名称
    replaceName = (str, dataName) => {
        let temp = str;
        while (/\{(.*?)\}/.test(temp)) {
            const name = RegExp.$1;
            temp = temp.replace(/\{(.*?)\}/, this.resolutionName(name, dataName)); 
        }
        return temp;
    }
    // 替换为当前form中存在的内容
    resolutionName = (name, dataName) => {
        const nameArr = name.split('.');
        let curName = dataName;
        nameArr.map((item) => {
            curName += `['${item}']`;
        });
        return curName;
    }
    // 将转换过后的公式数组，重新转换为公式
    resetCaclStr(arr, index = 0) {
        let curData = arr[index];
        // 循环校验当前字符串中是否还存在数组内容
        while (/strArr\[(\d*?)\]/.test(curData)) {
            // RegExp.$1 能够获取到正则第一个（）中匹配到的内容，使用递归完成内容替换
            curData = curData.replace(/strArr\[(\d*?)\]/, this.resetCaclStr(arr, RegExp.$1));
        }
        return curData;
    }
    // 解析公式生成的数组
    resolutionCaclArr = (arr) => {
        const temp = [];
        arr.map((item) => {
            // 替换max为bigNumber使用的方式
            item = item.replace('max', 'this.BG.max');
            // 替换min为bigNumber使用的方式
            item = item.replace('min', 'this.BG.min');
            // 处理加减法
            const plus = this.replacePlus(item);
            !!plus && (item = plus);
            // 处理乘除以及多个判断内容
            Object.keys(this.caclMap).map((key) => {
                const temp = this.replaceTAndD(item, key, this.caclMap[key]);
                !!temp && (item = temp);
            });
            temp.push(item);
        });
        return temp;
    }
    // 处理加法
    replacePlus = (str) => {
        // 优先将 - 号前面添加一个 + 号
        let curStr = str.replace(/-/g, '+-');
        // 将 + 号最为区分生成多个数组
        const plusStrArr = curStr.split('+');
        // 如果长度不为1 ， 即中间存在 + - 号，则使用this.BG.sum整合所有的内容
        if (plusStrArr.length !== 1) {
            return `this.BG.sum(${plusStrArr.toString()})`;
        }
        return str;
    }
    // 处理乘除法
    replaceTAndD = (str, type, flag) => {
        let curStr = '';
        // 逻辑与处理加法逻辑相同，唯一不同的是，乘法需要逐步累乘
        const timesStrArr = str.split(flag);
        if (timesStrArr.length !== 1) {
            curStr = `new this.BG(${timesStrArr[0]})`;
            timesStrArr.map((item, index) => {
                if (index > 0) {
                    curStr = `${curStr}.${type}(${item})`;
                }
            });
            return /\*|\//.test(flag) ? `${curStr}.toString()` : curStr;
        }
        return str;
    }
}

export default Resolution;
