import * as _ from "underscore";

export default class EventListener {
  constructor() {
    this.listeners = [];
  }

  addListener(listener) {
    if (listener && this.listeners.indexOf(listener) === -1){
      this.listeners.push(listener);
    }
  }

  removeListener(listener){
    if (listener) {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    }
  }

  triggerEvent(...args) {
    _.forEach(this.listeners, (x)=>{
      x(...args);
    });
  }
}