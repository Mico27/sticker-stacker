import React from "react";
import PropTypes from "prop-types";
import * as _ from "underscore";
import ScoreDetailTheme from "./ScoreDetailTheme.jsx";
import ScoreDetailItem from "./ScoreDetailItem.jsx";
import LazyLoader from "./LazyLoader.jsx";

const SCOREDETAILS_PAGE_SIZE = 16;

export default class ScoreDetails extends React.Component {

  static contextTypes = {
    apiHandler: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
  };

  static propTypes = {
    userId: PropTypes.number,
  };

  constructor() {
    super();
    this.state= {
      items: [],
      themes: [],
    }
    this.onLoaded = this.onLoaded.bind(this);
    this.getPageData = this.getPageData.bind(this);
    this.onInventoryChanged = this.onInventoryChanged.bind(this);
  }

  componentDidMount() {
    this.context.apiHandler.onInventoryChangedEvent.addListener(this.onInventoryChanged);
    this.loadItems();
  }

  componentWillUnmount() {
    this.context.apiHandler.onInventoryChangedEvent.removeListener(this.onInventoryChanged);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.userId !== this.props.userId && this.lazyLoader){
      this.loadItems();
      this.lazyLoader.reset();
    }
  }

  loadItems(){
    this.context.apiHandler.getScoreItems(this.props.userId || this.context.currentUser.id).then((items)=>{
      this.setState({
        items: items,
      });
    });
  }

  getPageData(currentPage){
    return this.context.apiHandler.getScoreThemes(this.props.userId || this.context.currentUser.id,
      currentPage * SCOREDETAILS_PAGE_SIZE, SCOREDETAILS_PAGE_SIZE)
  }

  onLoaded(data){
    this.setState({
      themes: data,
    });
  }

  onInventoryChanged(userId){
    if (this.lazyLoader && (this.props.userId || this.context.currentUser.id) === userId) {
      this.loadItems();
      this.lazyLoader.reset();
    }
  }

  render() {
    const { items, themes } = this.state;
    return (
      <div className="score-details">
        <div className="score-details-header">
          <h1>Score Details</h1>
        </div>
        <div className="score-details-container">
          {
            (items)? _.map(items, (item, idx)=>{
              return <ScoreDetailItem item={item} idx={idx}/>
            }): null
          }
          {
            (themes)? _.map(themes, (theme)=>{
              return <ScoreDetailTheme theme={theme}/>
            }): null
          }
          <LazyLoader ref={(ref) => this.lazyLoader = ref} className="inventory-loader"
                      onLoaded={this.onLoaded} getPageData={this.getPageData}/>
        </div>
      </div>
    );
  }
}