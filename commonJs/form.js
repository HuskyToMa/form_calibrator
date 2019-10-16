const commonFormOption = {
    options: {
        labelWidth: '170',
        disabled: false,
        labelAlign: 'left',
        inputAlign: 'left',
        border: false
    }
};
/**
 * 获取单个简单的option
 * */
const getFormOptionData = (type, name, title, { ...args }) => ({
    type,
    name,
    title,
    decimal: 2,
    allowClear0: false,
    ...args
});

/**
 * 传入参数或者整个optionData
 * */
const getOpData = data => data.map(item => getFormOptionData(...item));
/**
 * 设置form的DataSource
* */
export const getFormData = (formName, data) => {
    const tempObj = {};
    data.map((item) => {
        tempObj[item[1]] = (!!item[3] && item[3].default) || ((item[0] === 'number' && (item[3] && (!item[3].syType || item[3].syType === 'number'))) ? 0 : '');
    });
    return tempObj;
};

/**
 * 返回生成的form的配置
 * */
export const getFormOption = (formName, data, commonOption = {}) => ({
    [`${formName}FormOption`]: {
        options: {
            ...commonFormOption.options,
            ...commonOption
        },
        data: getOpData(data)
    },
    [`${formName}`]: getFormData(formName, data)
});
