import React from "react";
import PropTypes from "prop-types";
import ShinyEffect from "./ShinyEffect.jsx";
import Utils from "../classes/Utils";

export default class ScoreDetailItem extends React.Component {

  static propTypes = {
    item: PropTypes.object,
    idx: PropTypes.number,
  };

  constructor(props) {
    super(props);
  }

  render() {
    const {item, idx} = this.props;

    return (
      <div className="score-detail-item inventory-slot-spawn"
           style={{backgroundColor: Utils.getItemRarityColor(item.rarity),
             "--slot-spawn-delay": ((0.1 * idx) + 's')}}>
        <div className="score-detail-item-score">{'+ ' + (item.score * item.amount)}</div>
        <div className="score-detail-item-amount">{'x' + item.amount}</div>
        <div className="score-detail-item-rarity">{Utils.getItemRarityCode(item.rarity)}</div>
        {
          (item.shiny) ?
            <div>
              <ShinyEffect/>
              <ShinyEffect/>
              <ShinyEffect/>
            </div> : null
        }
      </div>
    );
  }
}