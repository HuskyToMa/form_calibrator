import { Util } from 'etax-app';
import Resolution from './resolution';

class Validate {
    constructor(vm) {
        this.vm = vm;
        this.rules = [];
        this.resolutionRules = [];
        this.validData = void 0;
        this.resolution = new Resolution(vm);
        this.flag = false;
        this.BG = vm.BG;
        this.messageCacl = void 0;
    }

    setRules = (rules) => {
        if (!Util.isArray(rules)) {
            throw new Error('传入的规则不是数组类型');
        }
        this.rules = this.simpleCopy(rules);
        this.resolutionRules = [];
        this.rules.map((item) => {
            this.resolutionRules.push(this.resolutionArray(item));
        });
    }

    resolutionArray = (obj) => {
        if (!Util.isArray(obj.rule)) {
            throw new Error('传入的规则不是数组类型');
        }
        const temp = this.simpleCopy(obj);
        temp.rule = temp.rule.map((item) => {
            let cacl = this.resolution.resolutionCacl(item);
            cacl = this.resolution.replaceName(cacl, 'this.validData');
            return `this.flag=${cacl}`;
        });
        return temp;
    }

    setData = (data) => {
        this.validData = this.simpleCopy(data);
    }

    resolutionMessage = (message) => {
        let temp = message;
        while (/【(.*?)】/.test(temp)) {
            let name = RegExp.$1;
            let num = this.resolution.replaceName(this.resolution.resolutionCacl(name), 'this.validData');
            Function(`this.messageCacl=${num}`).call(this);
            temp = temp.replace(/【(.*?)】/, `[${this.messageCacl}]`);
        }
        return temp;
    }

    simpleCopy = data => JSON.parse(JSON.stringify(data))

    valid = async () => {
        let i = 0;
        for (; i < this.resolutionRules.length; i++) {
            if (!await this.doValid(this.resolutionRules[i])) {
                break;
            }
        }
        return i === this.resolutionRules.length ? Promise.resolve(true) : Promise.reject(false);
    }

    doValid = async (data) => {
        let i = 0;
        for (;i < data.rule.length; i++) {
            Function(data.rule[i]).call(this);
            if (this.flag) {
                if (data.type === 'confirm') {
                    let curFlag = true;
                    await this.vm.$dialog.confirm({
                        title: '提示',
                        message: this.resolutionMessage(data.message)
                    }).catch(() => {
                        curFlag = false;
                        Promise.reject(false);
                    });
                    if (!curFlag) {
                        break;
                    }
                } else if (data.type === 'tip') {
                    await this.vm.$dialog.alert({
                        title: '提示',
                        message: this.resolutionMessage(data.message)
                    });
                } else {
                    this.vm.$dialog.alert({
                        title: '提示',
                        message: this.resolutionMessage(data.message)
                    });
                    break;
                }
            }
        }
        return i === data.rule.length;
    }
}

export default Validate;
