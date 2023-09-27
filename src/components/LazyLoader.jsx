import React from "react";
import PropTypes from "prop-types";
import * as _ from "underscore";

const LOAD_DELAY_MS = 100;

export default class LazyLoader extends React.Component {

  static propTypes = {
    className: PropTypes.string,
    getPageData: PropTypes.func,
    onLoaded: PropTypes.func,
  };

  constructor(props, context) {
    super(props);
    this.state = {
      loading: false,
    }
    this.setTriggerRef = this.setTriggerRef.bind(this);
    this.observer = new IntersectionObserver(_.debounce(this.onTriggerRefIntersect.bind(this), LOAD_DELAY_MS));
    this.data = [];
    this.currentPage = 0;
    this.loading = false;
    this.disabled = false;
  }

  onTriggerRefIntersect([entry]){
    if (entry.isIntersecting){
      this.load();
    }
  }

  load(){
    const {getPageData, onLoaded} = this.props;
    if (!this.disabled && !this.loading) {
      this.loading = true;
      this.setState({
        loading: this.loading,
      });
      getPageData(this.currentPage).then(({data, offset}) => {
        if (data && data.length){
          for (let i = 0; i < data.length; i++){
            this.data[offset + i] = data[i];
          }
          this.resetObserver();
        } else {
          this.disabled = true;
        }
        onLoaded(this.data);
        this.loading = false;
        this.setState({
          loading: this.loading,
        });
      });
      this.currentPage++;
    }
  }

  setTriggerRef(triggerRef){
    if (triggerRef){
      this.triggerRef = triggerRef;
      this.observer.observe(triggerRef);
    } else {
      this.triggerRef = undefined;
      this.observer.disconnect();
    }
  }

  resetObserver(){
    if (this.triggerRef) {
      this.observer.unobserve(this.triggerRef);
      this.observer.observe(this.triggerRef);
    }
  }

  reset() {
    this.data = [];
    this.disabled = false;
    this.currentPage = 0;
    this.loading = false;
    this.load();
  }

  render() {
    const {className} = this.props;
    const {loading} = this.state;
    return (
      <div className={className} ref={this.setTriggerRef}>
        {
          (loading)? "Loading...": ""
        }
      </div>
    );
  }
}