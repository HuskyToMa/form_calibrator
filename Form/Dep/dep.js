class Dep {
    constructor(name, vm) {
        this.name = name;
        this.child = [];
        this.caclNumber = 0;
        this.publish = void 0;
        this.vm = vm;
    }

    reset() {
        this.caclNumber = 0;
    }

    addChild(dep) {
        if (this.repeatDep(dep)) {
            return;
        }
        this.child.push(dep);
    }

    repeatDep = dep => this.child.filter(item => item.name === dep.name).length > 0

    run() {
        this.child.map((item) => {
            typeof item.publish !== 'string' ? item.publish.call(this.vm) : Function(item.publish).call(this.vm);
        });
    }

    depSelf() {
        this.publish && this.publish.call(this.vm);
    }
}

export default Dep;
