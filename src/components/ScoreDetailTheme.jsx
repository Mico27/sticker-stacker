import React from "react";
import PropTypes from "prop-types";
import ShinyEffect from "./ShinyEffect.jsx";
import Utils from "../classes/Utils";
import * as _ from "underscore";

export default class ScoreDetailTheme extends React.Component {

  static propTypes = {
    theme: PropTypes.object,
  };

  constructor(props) {
    super(props);
  }

  render() {
    const {theme} = this.props;
    return (
      <div className="score-detail-theme">
        <div className="score-detail-theme-name">{theme.name}</div>
        <div className="score-detail-theme-amount">{theme.amount + '/' + theme.reqCount}</div>
        <div className="score-detail-theme-items">
          {
            _.map(theme.items, (item, idx)=>{
              return <div className="score-detail-theme-item inventory-slot-spawn" style={{"--slot-spawn-delay": ((0.1 * idx) + 's')}}>
                {
                  (item.amount > 0)?
                    <div className="score-detail-theme-item-inner">
                      <img className="score-detail-theme-item-img" src={Utils.getItemImage(item.uid)}/>
                      <div className="score-detail-theme-item-amount">{'x' + item.amount}</div>
                      {
                        (item.shiny) ?
                          <div>
                            <ShinyEffect minX={4} maxX={60} minY={4} maxY={60} minScale={0.3} maxScale={0.6}/>
                            <ShinyEffect minX={4} maxX={60} minY={4} maxY={60} minScale={0.3} maxScale={0.6}/>
                            <ShinyEffect minX={4} maxX={60} minY={4} maxY={60} minScale={0.3} maxScale={0.6}/>
                          </div> : null
                      }
                    </div>: null
                }
              </div>
            })
          }
        </div>
        <div className="score-detail-theme-score">{(theme.amount === theme.reqCount) ? '+ ' + theme.score: ''}</div>
      </div>
    );
  }
}