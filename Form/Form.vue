<template>
    <div>
        <div v-for="key in optionKeys" :key="formOption[key].title">
            <div class="panel-title-container" v-if="!!curOption[`${key}Title`]">
                <div class="panel-title">{{ curOption[`${key}Title`] }}</div>
            </div>
            <sy-form
                :options="curOption[`${key}FormOption`]"
                :dataSource="curForm[`${key}`]"
            />
        </div>
    </div>
</template>
<script>
import {
    syForm,
    Util
} from 'etax-app';
import { getFormOption, getFormData } from '../commonJs/form';
import Resolution from '../commonJs/resolution';
import Validate from '../commonJs/validate';
import Dep from './Dep/dep.js';

let keyPath = [];
export default {
    name: 'SbForm',
    components: {
        syForm
    },
    props: {
        formOption: {
            default() {
                return {};
            },
            type: Object
        },
        formCacl: {
            default() {
                return [];
            },
            type: Array
        },
        formChange: {
            default: () => {},
            type: Function
        },
        preMounted: {
            default: () => {},
            type: Function
        },
        formCommonOption: {
            default() {
                return {};
            },
            type: Object
        },
        rules: {
            default() {
                return [];
            },
            type: Array
        }
    },
    data() {
        return {
            curForm: {},
            curOption: {},
            curCacl: [],
            judgeFlag: false,
            resolute: new Resolution(this),
            validate: new Validate(this),
            changeOption: [],
            deps: {},
            changeKeyArr: [],
            decimalMap: {}
        };
    },
    created() {
        this.optionKeys.map((item) => {
            const options = getFormOption(item, this.formOption[item].option, this.formCommonOption);
            // this.$set(this.curOption, `${item}Title`, this.formOption[item].title);
            // this.$set(this.curOption, `${item}FormOption`, options[`${item}FormOption`]);
            this.$set(this.curForm, `${item}`, options[`${item}`]);
        });
        this.renderOption(this.formOption);
    },
    async mounted() {
        const data = await this.preMounted(this.getFormData());
        if (!!data) {
            this.setFormData(data);
        }
        this.renderCacl();
        this.resolveDep();
        this.cacl();
        this.validate.setRules(this.rules);
    },
    methods: {
        cacl() {
            this.curCacl.map((item) => {
                // 判断计算方式是数组还是字符串，运行对应的方法
                Util.isArray(item) ? this.runCaclArr(item): Function(item).call(this);
                this.formToFiexd();
            });
        },
        formToFiexd() {
           this.optionKeys.map((key) => {
                const options = this.curOption[`${key}FormOption`];
                options.data
                    .map(option => !!option.decimal && option.type === 'number' && (!option.syType || (!!option.syType && option.syType === 'number')) ?
                        (this.curForm[key][option.name] = new this.BG(this.curForm[key][option.name]).toFixed(option.decimal || 2)) :
                        option);
            });
        },
        // 运行计算数据的方法
        runCaclArr(arr) {
            for (let i = 0; i < arr.length; i++) {
                this.runArr(arr[i]);
                if (this.judgeFlag) {
                    break;
                }
            }
        },
        // 数组计算执行
        runArr(option) {
            let temp = 'this.judgeFlag=';
            const preCondition = option.preCondition;
            if (option.noCaclKeys && new Set(option.noCaclKeys.concat(this.changeKeyArr)).size !== (option.noCaclKeys.length + this.changeKeyArr.length)) {
                return ;
            }
            if (!preCondition) {
                Function(option.cacl).call(this);
                return ;
            }

            preCondition.map((item, index) => {
                temp = index === 0 ? `${temp}${item}` : `${temp} && ${item}`;
            });
            Function(temp).call(this);
            if (this.judgeFlag) {
                Function(option.cacl).call(this);
                if (!!option.message) {
                    this.$toast(option.message);
                }
            }
        },
        // 获取单个数据
        getCurFormByName(name) {
            const nameArr = name.split('.');
            let temp = this.curForm;
            nameArr.map((item) => {
                temp = temp[item];
            });
            return temp;
        },
        // 渲染公式的入口
        renderCacl() {
            this.curCacl = [];
            this.formCacl.map((item) => {
                this.curCacl.push(Util.isArray(item) ?
                this.resolutionArr(item) :
                this.resolution(item));
            });
        },
        // 解析公式内容为数组的情况
        resolutionArr(arr) {
            const temp = JSON.parse(JSON.stringify(arr));
            temp.map((item) => {
                item.cacl = this.resolution(item.cacl);
                item.preCondition = this.renderPreCondition(item.preCondition);
                return item;
            });
            return temp;
        },
        // 渲染前置校验
        renderPreCondition(arr) {
            if (!arr) {
                return null;
            }
            const temp = [];
            arr.map((item) => {
                let cacl = this.resolute.resolutionCacl(item);
                cacl = this.resolute.replaceName(cacl, 'this.curForm');
                temp.push(cacl);
            });
            return temp;
        },
        // 解析公式内容
        resolution(str) {
            const newStr = str.replace('=', '#');
            let curStr = this.resolute.resolutionCacl(newStr.split('#')[1]);
            const key = (/\{(([a-z]|[A-Z]|\d|\.)*)\}/g).exec(newStr.split('#')[0]);
            if (key) {
                const keys = key[1].split('.');
                const decimal = this.decimalMap[keys[keys.length - 2]][keys[keys.length - 1]] || 2;
                curStr = this.resolute.replaceName(`${newStr.split('#')[0]}=new this.BG(${curStr}).toFixed(${decimal})`, 'this.curForm');
            } else {
                curStr = this.resolute.replaceName(`${newStr.split('#')[0]}=new this.BG(${curStr}).toString()`, 'this.curForm');
            }
            return curStr;
        },
        // 解析公式对应依赖
        resolveDep() {
            this.curCacl.map((cacl) => {
                Util.isArray(cacl) ?
                this.resolveDepArray(cacl) :
                this.resolveDepStr(cacl);
            });
        },
        resolveDepArray(caclArr) {
            let name = '';
            caclArr.map((item) => {
                name = this.resolveDepStr(item.cacl);
            });
            this.deps[name].publish = () => this.runCaclArr(caclArr);
        },
        resolveDepStr(cacl) {
            const newStr = cacl.replace('=', '#');
            const caclArr = newStr.split('#');
            const depName = caclArr[0];
            if (!this.deps[depName]) {
                const dep = new Dep(depName, this);
                dep.publish = cacl;
                this.deps[depName] = dep;
            } else if (!this.deps[depName].publish) {
                this.deps[depName].publish = cacl;
            }
            this.resolveRelyOn(this.deps[depName], caclArr[1]);
            return depName;
        },
        resolveRelyOn(dep, cacl) {
            if (/this.curForm(\['([a-z]|[A-Z]|\d)*'\]){2,3}/.test(cacl)) {
                const arr = cacl.match(/this.curForm(\['([a-z]|[A-Z]|\d)*'\]){2,3}/g);
                arr.map((item) => {
                    if (this.deps[item]) {
                        this.deps[item].addChild(dep);
                    } else {
                        const curDep = new Dep(item, this);
                        curDep.addChild(dep);
                        this.deps[item] = curDep;
                    }
                });
            }
        },
        // 设置form中的内容
        setFormData(data) {
            this.curForm = {
                ...this.curForm,
                ...data
            };
        },
        setFormDataByKey(key, value) {
            let curData = this.getCurFormByName(key);
            curData = value;
        },
        // 获取到的是没有link的form数据
        getCurFormData() {
            const temp = {};
            this.optionKeys.map((item) => {
                temp[item] = this.curForm[item];
            });
            return JSON.parse(JSON.stringify(temp));
        },
        // 获取最开始传进来的option，可用于初始化
        getCurOption() {
            return JSON.parse(JSON.stringify(this.formOption));
        },
        // 获取修改后的option
        getChangeOption() {
            return JSON.parse(JSON.stringify(this.changeOption));
        },
        // 获取form中的内容，含有link的form数据
        getFormData() {
            return JSON.parse(JSON.stringify(this.curForm));
        },
        // 重置form的数据
        resetFormData() {
            const obj = {};
            this.optionKeys.map((item) => {
                obj[item] = getFormData(item, this.formOption[item].option);
            });
            this.curForm = {
                ...this.curForm,
                ...obj
            };
        },
        // 重新渲染option
        renderOption(value) {
            this.changeOption = value;
            this.optionKeys.map((item) => {
                const options = getFormOption(item, value[item].option, this.formCommonOption);
                this.$set(this.curOption, `${item}Title`, value[item].title);
                this.$set(this.curOption, `${item}FormOption`, options[`${item}FormOption`]);
            });
            for (const key in this.formOption) {
                if (!this.decimalMap[key]) {
                    this.decimalMap[key] = {};
                }
                if (this.formOption[key].option.length) {
                    this.formOption[key].option.map((item) => {
                        if (item[3] && item[3].decimal) {
                            this.decimalMap[key][item[1]] = item[3].decimal;
                        }
                    });
                }
            }
        },
        // 多个form表连接
        linkForm(name, data) {
            this.$set(this.curForm, name, data);
        },
        // 校验
        valid() {
            this.validate.setData(this.curForm);
            return this.validate.valid();
        },
        // 获取修改的key
        getKeyByChange(newValue, oldValue, parentKey = '') {
            if (oldValue === void 0) {
                return null;
            }
            const keys = Object.keys(newValue);
            let curKeyArr = [];

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const curVal = newValue[key];
                if (typeof curVal === 'object') {
                    curKeyArr = curKeyArr.concat(this.getKeyByChange(curVal, oldValue[key], !parentKey ? `['${key}']` : `${parentKey}['${key}']`));
                } else if (curVal !== oldValue[key] && typeof curVal !== 'object') {
                    curKeyArr.push(key);
                    keyPath.push(`${parentKey}['${key}']`);
                }
            }
            return curKeyArr;
        },
        judgeDep(key) {
            const length = this.curCacl.length;
            let curCaclOption = [];
            let flag = true;
            for (let i = 0; i < length; i++) {
                if (Array.isArray(this.curCacl[i]) && this.curCacl[i][0].cacl.indexOf(key) !== -1) {
                    curCaclOption = this.curCacl[i];
                    break;
                }
            }
            for (let i = 0; i < curCaclOption.length; i++) {
                if (!curCaclOption[i].preCondition) {
                    flag = false;
                    break;
                }
            }
            return flag;
        }
    },
    watch: {
        strCurForm: {
            deep: true,
            handler(value, oldValue) {
                const _this = this;
                if (value !== oldValue) {
                    setTimeout(() => {
                        _this.changeKeyArr = _this.getKeyByChange(JSON.parse(value), JSON.parse(oldValue));
                        if (keyPath.length) {
                            keyPath.forEach((key) => {
                                if (key && _this.deps[`this.curForm${key}`]) {
                                    const curDep = _this.deps[`this.curForm${key}`];
                                    // 依赖运行，自身改变，会引起依赖的变化
                                    curDep.run();
                                    // 如果自身存在precondition，则可以运行自身计算，不存在就不运行
                                    typeof curDep.publish !== 'string' && this.judgeDep(key) && curDep.depSelf();
                                }
                            });
                        } else {
                            this.cacl();
                        }
                        keyPath = [];
                        _this.changeKeyArr.map((key) => {
                            _this.formChange(JSON.parse(JSON.stringify(this.curForm)), JSON.parse(value), key);
                        });
                    });
                }
            }
        },
        strFormCacl: {
            deep: true,
            handler(val, oldVal) {
                if (val !== oldVal) {
                    this.renderCacl();
                    this.resolveDep();
                    this.cacl();
                }
            }
        }
    },
    computed: {
        optionKeys() {
            return Object.keys(this.formOption);
        },
        strCurForm() {
            return JSON.stringify(this.curForm);
        },
        strFormCacl() {
            return JSON.stringify(this.formCacl);
        }
    }
};
</script>
